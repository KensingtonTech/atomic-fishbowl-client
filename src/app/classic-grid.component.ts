import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ToolService } from './tool.service';
import { PanZoomConfigService } from './panzoom/panzoom-config.service';
import { PanZoomModelService } from './panzoom/panzoom-model.service';
import { PanZoomApiService } from './panzoom/panzoom-api.service';
import { WindowRefService } from './panzoom/panzoom-windowref.service';
import { DataService } from './data.service';
import { Content } from './content';
import { ModalService } from './modal/modal.service';
import { ContentCount } from './contentcount';
import { ContentMask } from './contentmask';
import 'rxjs/add/operator/takeWhile';
declare var log: any;

@Component({
  selector: 'classic-grid-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div style="position:absolute; left: 0; right: 0; bottom: 0; top: 30px;">
  <panzoom id="abc" addStyle="width: 100%; height: 100%; background-color: black;">
    <div class="bg noselect items" style="position: relative; width: 2400px;" *ngIf="content && sessionsDefined && displayedContent && !destroyView">
      <classic-tile *ngFor="let item of displayedContent" [highResSession]="hoveredContentSession" (openPDFViewer)="openPdfViewer()" [content]="item" [apiServerUrl]="apiServerUrl" [session]="sessions[item.session]"></classic-tile>
    </div>
  </panzoom>
  <grid-control-bar [canvasWidth]="canvasWidth" [initialZoomHeight]="initialZoomHeight" ></grid-control-bar>
  <pdf-viewer-modal [apiServerUrl]="apiServerUrl" id="pdf-viewer"></pdf-viewer-modal>
  <classic-session-popup [enabled]="sessionWidgetEnabled" [sessionId]="hoveredContentSession" #sessionWidget></classic-session-popup>
</div>
`,
  styles: [`

  classic-tile {
    display: inline-block;
  }

  .noselect {
    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
    -khtml-user-select: none; /* Konqueror HTML */
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* Internet Explorer/Edge */
    user-select: none; /* Non-prefixed version, currently supported by Chrome and Opera */
  }

  `]
})

export class ClassicGridComponent implements OnInit, OnDestroy {

  constructor(  private panzoomConfig: PanZoomConfigService,
                private panZoomApiService: PanZoomApiService,
                private modelService: PanZoomModelService,
                private dataService: DataService,
                private renderer: Renderer,
                private windowRef: WindowRefService,
                private elRef: ElementRef,
                private modalService: ModalService,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService ) {}

  @ViewChild('sessionWidget') sessionWidget: ElementRef;

  private content: Content[] = [];
  private imageContent: Content[] = [];
  private pdfContent: Content[] = [];
  private dodgyArchiveContent: Content[] = [];
  private hashContent: Content[] = [];
  private contentCount = new ContentCount;

  public sessionWidgetEnabled = false;
  public hoveredContentSession: number;
  public apiServerUrl: string = '//' + window.location.hostname;
  private deviceNumber: number;
  private panzoomModel = this.modelService.model;
  private panZoomAPI: any;
  private search: any = [];
  public canvasWidth = 2400;
  public initialZoomHeight = 1080;
  private displayedContent: any = [];

  public sessions: any;
  private alive = true;
  private pdfFile: string;
  private imagesHidden = false;
  private pdfsHidden = false;
  private hoveredContentSessions: number[];
  private caseSensitiveSearch = false;
  private showOnlyImages: any = [];
  private lastSearchTerm = '';
  private selectedCollectionType: string;
  private collectionId: number;
  private sessionsDefined = false;
  private destroyView = true;
  private dodgyArchivesIncludedTypes: any = [ 'encryptedRarEntry', 'encryptedZipEntry', 'unsupportedZipEntry', 'encryptedRarTable' ];
  private lastMask = new ContentMask;

  ngOnDestroy(): void {
    log.debug('ClassicGridComponent: ngOnDestroy()');
    this.alive = false;
  }

  ngOnInit(): void {
    log.debug('ClassicGridComponent: ngOnInit()');

    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'black');
    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'overflow', 'hidden');
    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'margin', '0');
    this.panzoomConfig.invertMouseWheel = true;
    this.panzoomConfig.useHardwareAcceleration = true;
    this.panzoomConfig.chromeUseTransform = true;
    this.panzoomConfig.zoomLevels = 10;
    this.panzoomConfig.scalePerZoomLevel = 2.0;
    this.panzoomConfig.zoomStepDuration = 0.2;
    this.panzoomConfig.initialZoomToFit = {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight };
    this.panzoomConfig.haltSpeed = 100;
    this.panzoomConfig.modelChangedCallback = (model: any) => this.sessionWidgetDecider();
    this.panZoomApiService.getAPI('abc').then( (v: any) => {this.panZoomAPI = v; });
    // this.panzoomConfig.zoomLevels = 20;
    // this.panzoomConfig.scalePerZoomLevel = 1.1;
    // this.panzoomConfig.neutralZoomLevel = 5;
    // this.panzoomConfig.zoomStepDuration = 0.01;
    // this.panzoomConfig.keepInBounds = true;


    // Take subscriptions
    this.toolService.caseSensitiveSearchChanged.takeWhile(() => this.alive).subscribe( () => this.toggleCaseSensitiveSearch() );
    this.toolService.searchTermsChanged.takeWhile(() => this.alive).subscribe( ($event: any) => this.searchTermsChanged($event) );
    this.toolService.maskChanged.takeWhile(() => this.alive).subscribe( ($event: any) => this.maskChanged($event) );

    this.toolService.noCollections.takeWhile(() => this.alive).subscribe( () => {
      log.debug('MasonryGridComponent: noCollectionsSubscription');
      this.destroyView = true;
      this.sessionsDefined = false;
      this.resetContent();
      this.resetContentCount();
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.selectedCollectionChanged.takeWhile(() => this.alive).subscribe( (collection: any) => { // this triggers whenever we choose a new collection
      log.debug('ClassicGridComponent: selectedCollectionChangedSubscription: selectedCollectionChanged:', collection);
      this.destroyView = true;
      this.sessionsDefined = false;
      this.resetContent();
      this.resetContentCount();
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
      this.selectedCollectionType = collection.type;
      this.collectionId = collection.id;
      /*if (this.selectedCollectionType === 'monitoring' || this.selectedCollectionType === 'rolling') { // not needed in classic view
        this.loadAllBeforeLayout = false;
      }
      else {
        this.loadAllBeforeLayout = true;
      }*/
    });

    this.dataService.collectionStateChanged.takeWhile(() => this.alive).subscribe( (collection: any) => { // this triggers when a monitoring collection refreshes
      log.debug('ClassicGridComponent: collectionStateChangedSubscription: collectionStateChanged:', collection.state);
      if (collection.state === 'refreshing')  {
        this.destroyView = true;
        this.changeDetectionRef.detectChanges();
        this.changeDetectionRef.markForCheck();
        this.resetContent();
        this.sessionsDefined = false;
        this.resetContentCount();
        this.toolService.changingCollections.next(false);
        this.destroyView = false;
        this.changeDetectionRef.detectChanges();
        this.changeDetectionRef.markForCheck();
      }
    });

    this.dataService.sessionsChanged.takeWhile(() => this.alive).subscribe( (s: any) => {
      log.debug('ClassicGridComponent: sessionsChangedSubscription: sessionsChanged:', s); // when an a whole new collection is selected
      this.sessionsDefined = true;
      this.sessions = s;
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.sessionPublished.takeWhile(() => this.alive).subscribe( (s: any) => {
      log.debug('ClassicGridComponent: sessionPublishedSubscription: sessionPublished', s); // when an individual session is pushed from a building collection (or monitoring or rolling)
      let sessionId = s.id;
      this.sessionsDefined = true;
      this.sessions[sessionId] = s;
    });

    /*this.dataService.contentChanged.takeWhile(() => this.alive).subscribe( (i: any) => { log.debug('images:', i); // when a new collection is selected
                                                            i.sort(this.sortImages);
                                                            this.images = i;
                                                            this.displayedContent = i;
                                                            this.pdfImages = [];
                                                            this.imageImages = [];
                                                            this.search = []; // testing this
                                                            for (let x = 0; x < this.images.length; x++) {  // pre-calculate image masks
                                                              if (this.images[x].contentType === 'pdf') {
                                                                this.pdfImages.push(this.images[x]);
                                                              }
                                                              if (this.images[x].contentType === 'image') {
                                                                this.imageImages.push(this.images[x]);
                                                              }
                                                            }
                                                            this.contentCount = { images: this.imageImages.length, pdfs: this.pdfImages.length, dodgyArchives: this.dodgyArchiveContent.length, hashes: this.hashContent.length, total: this.images.length };
                                                            this.toolService.contentCount.next( this.contentCount );
                                                            this.sessionWidgetDecider();
                                                            this.panZoomAPI.zoomToFit( {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight });
                                                          });*/

    this.dataService.contentChanged.takeWhile(() => this.alive).subscribe( (i: any) => {
      log.debug('ClassicGridComponent: contentChangedSubscription: contentChanged:', i); // when a new collection is selected
      this.destroyView = true;
      i.sort(this.sortImages);
      this.content = i;
      this.displayedContent = i;
      this.search = [];
      this.calculateContentMasks();
      this.countContent();
      this.destroyView = false;
// !!! not sure if we need this first set of detectors here - test it later !!!
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
      this.sessionWidgetDecider();
      this.panZoomAPI.zoomToFit( {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight });
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });


    this.dataService.contentPublished.takeWhile(() => this.alive).subscribe( (newContent: any) =>  { // when content are pushed from a still-building, rolling, or monitoring collection
      log.debug('ClassicGridComponent: contentPublishedSubscription: contentPublished:', newContent);

      // update content counts here to save cycles not calculating image masks
      for (let i = 0; i < newContent.length; i++) {
        this.content.push(newContent[i]);
        if (newContent[i].contentType === 'image' ) {
          this.contentCount.images = this.contentCount.images + 1;
        }
        else if (newContent[i].contentType === 'pdf' ) {
          this.contentCount.pdfs = this.contentCount.pdfs + 1;
        }
        else if (newContent[i].contentType === 'hash' ) {
          this.contentCount.hashes = this.contentCount.hashes + 1;
        }
        else if ( this.dodgyArchivesIncludedTypes.includes(newContent[i].contentType) ) {
            this.contentCount.dodgyArchives = this.contentCount.dodgyArchives + 1;
        }
      }
      this.contentCount.total = this.content.length;
      this.toolService.contentCount.next( this.contentCount );

      this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.searchChanged.takeWhile(() => this.alive).subscribe( (s: any) =>  { // this receives complete search term data from complete collection
      this.search = s;
      log.debug('ClassicGridComponent: searchChangedSubscription: searchChanged:', this.search);
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });


    this.dataService.searchPublished.takeWhile(() => this.alive).subscribe( (s: any) => { // this receives a partial search term data from a building collection
      log.debug('ClassicGridComponent: searchPublishedSubscription: searchPublished:', s);
      for (let i = 0; i < s.length; i++) {
        this.search.push(s[i]);
      }
      // log.debug("ClassicGridComponent: searchPublishedSubscription: this.search:", this.search);
      this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.sessionsPurged.takeWhile(() => this.alive).subscribe( (sessionsToPurge: number[]) =>  {
      log.debug('ClassicGridComponent: sessionsPurgedSubscription: sessionsPurged:', sessionsToPurge);
      // log.debug("content", this.content);
      // log.debug("content length:",this.content.length);
      // log.debug("content:",JSON.parse(JSON.stringify(this.content)));
      let c = 0;

      let purgedImagePositions = [];
      let purgedSearchPositions = [];

      for (let x = 0; x < sessionsToPurge.length; x++) {
        let sidToPurge = sessionsToPurge[x];

        for (let i = 0; i < this.content.length; i++) {
          if (this.content[i].session === sidToPurge) {
            log.debug('ClassicGridComponent: sessionsPurgedSubscription: Removing image with session id', sidToPurge);
            purgedImagePositions.push(i);
          }
        }

        for (let i = 0; i < this.search.length; i++) {
          if (this.search[i].session === sidToPurge) {
            log.debug('ClassicGridComponent: sessionsPurgedSubscription: Removing search text with session id', sidToPurge);
            purgedSearchPositions.push(i);
            c++;
          }
        }
      }

      // log.debug("purgedImagePositions:",purgedImagePositions);
      // log.debug("purgedSearchPositions:",purgedSearchPositions);
      purgedImagePositions.sort(this.sortNumber);
      for (let i = 0; i < purgedImagePositions.length; i++) {
        this.content.splice(purgedImagePositions[i], 1);
      }
      purgedSearchPositions.sort(this.sortNumber);
      for (let i = 0; i < purgedSearchPositions.length; i++) {
        this.search.splice(purgedSearchPositions[i], 1);
      }
// !!! this displayedContent line should be revisited so that it takes in to account last mask and search!!!
      this.displayedContent = this.content;
// !!!
      this.maskChanged(this.lastMask);
      this.pdfContent = [];
      this.imageContent = [];
      this.hashContent = [];
      this.dodgyArchiveContent = [];
      this.calculateContentMasks();
      this.countContent();
      if (c > 0) {
        this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
      }
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

  }

  sortNumber(a: number, b: number): number {
      return b - a;
  }

  sortImages(a: any, b: any): number {
   if (a.session < b.session) {
    return -1;
   }
   if (a.session > b.session) {
    return 1;
   }
   return 0;
  }


  openPdfViewer(e: any): void {
    log.debug('ClassicGridComponent: openPdfViewer()');
    this.modalService.open('pdf-viewer');
  }

  /*
  oldmaskChanged(e: any): void {
    // e = { showPdf: boolean, showImage: boolean }
    let showPdf = e.showPdf;
    let showImage = e.showImage;
    if (showPdf && showImage) {
      this.displayedContent = this.images;
    }
    else if ( showPdf && !showImage ) {
      // log.debug("got to 1");
      this.displayedContent = this.pdfImages;
    }
    else if ( !showPdf && showImage ) {
      // log.debug("got to 2");
      this.displayedContent = this.imageImages;
    }
    else if ( !showPdf && !showImage ) {
      // log.debug("got to 3");
      this.displayedContent = [];
    }
  }
  */

  maskChanged(e: ContentMask): void {
    this.lastMask = e;
    log.debug('ClassicGridComponent: maskChanged():', e);
    // e = { showPdf: boolean, showImage: boolean, showDodgy: boolean, showHash: boolean }

    this.calculateContentMasks();
    let tempShownBricks = [];

    if (e.showImage && this.imageContent.length !== 0) {
      for (let i = 0; i < this.imageContent.length; i++) {
        tempShownBricks.push( this.imageContent[i] );
      }
    }

    if (e.showPdf && this.pdfContent.length !== 0) {
      for (let i = 0; i < this.pdfContent.length; i++) {
        tempShownBricks.push( this.pdfContent[i] );
      }
    }

    if (e.showDodgy && this.dodgyArchiveContent.length !== 0) {
      for (let i = 0; i < this.dodgyArchiveContent.length; i++) {
        tempShownBricks.push( this.dodgyArchiveContent[i] );
      }
    }

    if (e.showHash && this.hashContent.length !== 0) {
      for (let i = 0; i < this.hashContent.length; i++) {
        tempShownBricks.push( this.hashContent[i] );
      }
    }

    this.displayedContent = tempShownBricks;
    // log.debug('MasonryGridComponent: maskChanged: this.shownBricks:', this.shownBricks);
  }

  sessionWidgetDecider(): void {
    log.debug('ClassicGridComponent: sessionWidgetDecider():', this.panzoomModel.zoomLevel);
    let transitionZoomLevel = 3.9;
    let height = this.windowRef.nativeWindow.innerHeight;
    let width = this.windowRef.nativeWindow.innerWidth;
    let center: any = {};
    center.x = width / 2;
    center.y = height / 2;
    let e = document.elementFromPoint(center.x, center.y);
    let je: any = $(e);
    if (!$(je).hasClass('thumbnail')) {
      this.hideSessionWidget();
    }
    if (this.panzoomModel.zoomLevel <= transitionZoomLevel) {
      this.hideSessionWidget();
    }
    if (this.panzoomModel.zoomLevel >= transitionZoomLevel && $(je).hasClass('thumbnail')) {
      if (je[0].attributes.sessionid) {
        this.showSessionWidget(je[0].attributes.sessionid.value);
      }
    }

/*
    //at around a zoomLevel of 4 (3.9) or greater, we want to show high res images for all onscreen
    if (this.panzoomModel.zoomLevel >= transitionZoomLevel) {
      let thumbnails = $(".image-gallery-thumbnail")
      //log.debug("thumbnails:", thumbnails);
      let onscreenThumbnails = [];
      for (let t=0; t < thumbnails.length; t++) {
        //log.debug("thumbnails[t]:", thumbnails[t]);
        if ( this.isElementInViewport(thumbnails[t])) {
          onscreenThumbnails.push(thumbnails[t]);
        }

      }
      //let onscreenElements = $(":onScreen")
      log.debug("onscreenThumbnails:", onscreenThumbnails);
    }
*/

  }

  isElementInViewport(el: any): any {
      // special bonus for those using jQuery
      if (typeof jQuery === 'function' && el instanceof jQuery) {
          el = el[0];
      }

      let rect = el.getBoundingClientRect();

      return (
          rect.top >= 0 &&
          rect.left >= 0 && // panzoom
          rect.bottom <= ( $('.pan-zoom-frame').innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
          rect.right <= ( $('.pan-zoom-frame').innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
      );
  }

  showSessionWidget(i: number): void {
    // log.debug("ClassicGridComponent: showSessionWidget()", i);
    this.hoveredContentSession = i;
    // this.sessionWidgetEnabled = true;
    this.sessionWidgetEnabled = true;
    this.changeDetectionRef.detectChanges();
  }

  hideSessionWidget(): void {
    // log.debug("ClassicGridComponent: hideSessionWidget()");
    // this.sessionWidgetEnabled = false;
    this.sessionWidgetEnabled = false;
    this.changeDetectionRef.detectChanges();
  }

  toggleCaseSensitiveSearch(): void {
    log.debug('ClassicGridComponent: toggleCaseSensitiveSearch()');
    this.caseSensitiveSearch = !this.caseSensitiveSearch;
    this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
  }

  getContentBySessionAndContentFile(o: any): any {
    for (let x = 0; x < this.content.length; x++) {
      if (this.content[x].session === o.session && this.reduceContentFile(this.content[x].contentFile) === o.contentFile) {
        return this.content[x];
      }
    }
  }

  /*oldsearchTermsChanged(e: any): void {
    let searchTerms = e.searchTerms;
    this.lastSearchTerm = searchTerms;
    log.debug('searchTerms update:', searchTerms);
    let matchedSessions = [];
    let matchedSessionIds = [];
    if (searchTerms === '') {
      // log.debug("matched!");
      this.showOnlyImages = [];
      this.displayedContent = this.images;
      return;
    }
    if (this.search.length > 0) {
      for (let i = 0; i < this.search.length; i++) {
        // all searches are case-insensitive for now
        if (!this.caseSensitiveSearch && this.search[i].searchString.toLowerCase().indexOf(searchTerms.toLowerCase()) >= 0) {
          log.debug('case insensitive');
          let sessionId = this.search[i].session;
          log.debug('matched session', sessionId);
          matchedSessions.push(this.search[i]);
          matchedSessionIds.push(sessionId);
        }
        else if (this.caseSensitiveSearch && this.search[i].searchString.indexOf(searchTerms) >= 0) {
          log.debug('case sensitive');
          let sessionId = this.search[i].session;
          log.debug('matched session', sessionId);
          matchedSessions.push(this.search[i]);
          matchedSessionIds.push(sessionId);
        }
      }
    }
    if ( matchedSessions.length !== 0 ) {
      log.debug('matchedSessions:', matchedSessions);
      log.debug('matchedSessionIds:', matchedSessionIds);
      this.showOnlyImages = matchedSessions;
      this.displayedContent = [];
      for (let x = 0; x < matchedSessionIds.length; x++) {
        this.displayedContent.push(this.getImageById(matchedSessionIds[x]));
      }
      log.debug('displayedContent:', this.displayedContent);
    }
    else {
      log.debug('no matches');
      this.showOnlyImages = [ 'none' ];
      this.displayedContent = [];
    }
  }*/

  searchTermsChanged(e: any): void {
    // log.debug('MasonryGridComponent: searchTermsChanged()');
    let searchTerms = e.searchTerms;
    this.lastSearchTerm = searchTerms;
    // log.debug('MasonryGridComponent: searchTermsChanged(): searchTerms:', searchTerms);
    let matchedContent = [];

    if (searchTerms === '') {
      // if our search terms are null, then we set shownBricks to equal all bricks
      this.maskChanged(this.lastMask);
      return;
    }

    if (this.search.length > 0) {
      // Ok, we have a search term to do something with.  This block will generate matchedContent[]
      // log.debug('MasonryGridComponent: searchTermsChanged: this.search:', this.search);
      for (let i = 0; i < this.search.length; i++) {
        if (!this.caseSensitiveSearch && this.search[i].searchString.toLowerCase().indexOf(searchTerms.toLowerCase()) >= 0) { // case-insensitive search
          // we found a match!
          let matchedSession = {
            session: this.search[i].session,
            contentFile: this.search[i].contentFile
          };
          matchedContent.push(matchedSession);
        }
        else if (this.caseSensitiveSearch && this.search[i].searchString.indexOf(searchTerms) >= 0) { // case-sensitive search
          // we found a match!
          let matchedSession = {
            session: this.search[i].session,
            contentFile: this.search[i].contentFile
          };
          matchedContent.push(matchedSession);
        }
      }
    }

    if ( matchedContent.length !== 0 ) {
      // Let's now turn our matched session id's into shownBricks[]
      // log.debug('MasonryGridComponent: searchTermsChanged: Length of matchedContent:', matchedContent.length);
      // log.debug('MasonryGridComponent: searchTermsChanged: matchedContent:', matchedContent);
      let localShownBricks = [];
      for (let x = 0; x < matchedContent.length; x++) {
        let img = this.getContentBySessionAndContentFile(matchedContent[x]);
        // let brick = this.contentToBricks( [img] );
        localShownBricks.push( img );
      }
      this.displayedContent = localShownBricks;
    }
    else {
      // There were no matches
      this.displayedContent = [];
    }
    this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
  }


  reduceContentFile(s: string): string {
    const RE = /([^/]*)$/;
    let match = RE.exec(s);
    return match[0];
  }

  resetContentCount(): void {
    this.contentCount = {
      images: 0,
      pdfs: 0,
      dodgyArchives: 0,
      hashes: 0,
      total: 0
    };
    this.toolService.contentCount.next( this.contentCount );
  }

  countContent(): void {
    this.contentCount = {
      images: this.imageContent.length,
      pdfs: this.pdfContent.length,
      dodgyArchives: this.dodgyArchiveContent.length,
      hashes: this.hashContent.length,
      total: this.content.length
    };
    this.toolService.contentCount.next( this.contentCount );
  }

  resetContent(): void {
    this.displayedContent = [];
    this.search = [];
    this.sessions = {};

    this.content = [];
    this.pdfContent = [];
    this.imageContent = [];
    this.dodgyArchiveContent = [];
    this.hashContent = [];
  }

  // count = 0;
  calculateContentMasks(): void {
    // this.count = this.count + 1;
    // log.debug('count:', this.count)
    this.imageContent = [];
    this.pdfContent = [];
    this.dodgyArchiveContent = [];
    this.hashContent = [];
    for (let x = 0; x < this.content.length; x++) {  // pre-calculate content masks
      if (this.content[x].contentType === 'image') {
        this.imageContent.push(this.content[x]);
      }
      if (this.content[x].contentType === 'pdf') {
        this.pdfContent.push(this.content[x]);
      }
      if (this.content[x].contentType === 'hash') {
        this.hashContent.push(this.content[x]);
      }
      if ( this.dodgyArchivesIncludedTypes.includes(this.content[x].contentType)) {
        this.dodgyArchiveContent.push(this.content[x]);
      }
    }
  }

}
