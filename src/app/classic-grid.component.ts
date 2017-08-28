import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ToolService } from './tool.service';
import { PanZoomConfig } from './panzoom/panzoom-config';
import { DataService } from './data.service';
import { Content } from './content';
import { ModalService } from './modal/modal.service';
import { ContentCount } from './contentcount';
import { ContentMask } from './contentmask';
import { Search } from './search';
declare var log: any;

@Component({
  selector: 'classic-grid-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div style="position:absolute; left: 0; right: 0; bottom: 0; top: 30px;">
  <panzoom id="abc" addStyle="width: 100%; height: 100%; background-color: black;" [config]="panzoomConfig">
    <div class="bg noselect items" style="position: relative; width: 2400px;" *ngIf="content && sessionsDefined && displayedContent && !destroyView">
      <classic-tile *ngFor="let item of displayedContent" [highResSession]="hoveredContentSession" (openPDFViewer)="openPdfViewer()" [content]="item" [apiServerUrl]="apiServerUrl" [session]="sessions[item.session]"></classic-tile>
    </div>
  </panzoom>
  <classic-control-bar *ngIf="panzoomConfig" [panzoomConfig]="panzoomConfig" [canvasWidth]="canvasWidth" [initialZoomHeight]="initialZoomHeight" ></classic-control-bar>
  <pdf-viewer-modal [apiServerUrl]="apiServerUrl" id="pdf-viewer"></pdf-viewer-modal>
  <classic-session-popup [enabled]="sessionWidgetEnabled" [sessionId]="hoveredContentSession" #sessionWidget></classic-session-popup>
</div>
`,
  styles: [`

  classic-tile {
    display: inline-block;
  }

  `]
})

export class ClassicGridComponent implements OnInit, OnDestroy {

  constructor(  private dataService: DataService,
                private renderer: Renderer2,
                private elRef: ElementRef,
                private modalService: ModalService,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService ) {} // (<any>$).expr.cacheLength = 1;

  public panzoomConfig = new PanZoomConfig();
  public content: Content[] = [];
  private contentCount = new ContentCount;
  public sessionWidgetEnabled = false;
  public hoveredContentSession: number;
  public apiServerUrl: string = '//' + window.location.hostname;
  private deviceNumber: number;
  private panzoomModel: any = {};
  private panZoomAPI: any;
  private search: Search[] = [];
  public canvasWidth = 2400;
  public initialZoomHeight = 1080;
  public displayedContent: Content[] = [];

  public sessions: any;
  private pdfFile: string;
  private imagesHidden = false;
  private pdfsHidden = false;
  private caseSensitiveSearch = false;
  private showOnlyImages: any = [];
  private lastSearchTerm = '';
  private selectedCollectionType: string;
  private collectionId: number;
  public sessionsDefined = false;
  public destroyView = true;
  private dodgyArchivesIncludedTypes: any = [ 'encryptedRarEntry', 'encryptedZipEntry', 'unsupportedZipEntry', 'encryptedRarTable' ];
  private lastMask = new ContentMask;
  private searchBarOpen = false;

  // Subscription holders
  private searchBarOpenSubscription: any;
  private caseSensitiveSearchChangedSubscription: any;
  private searchTermsChangedSubscription: any;
  private maskChangedSubscription: any;
  private noCollectionsSubscription: any;
  private selectedCollectionChangedSubscription: any;
  private collectionStateChangedSubscription: any;
  private sessionsChangedSubscription: any;
  private sessionPublishedSubscription: any;
  private contentChangedSubscription: any;
  private contentPublishedSubscription: any;
  private searchChangedSubscription: any;
  private searchPublishedSubscription: any;
  private sessionsPurgedSubscription: any;
  private modelChangedSubscription: any;
  private newApiSubscription: any;


  ngOnDestroy(): void {
    log.debug('ClassicGridComponent: ngOnDestroy()');
    this.searchBarOpenSubscription.unsubscribe();
    this.caseSensitiveSearchChangedSubscription.unsubscribe();
    this.searchTermsChangedSubscription.unsubscribe();
    this.maskChangedSubscription.unsubscribe();
    this.noCollectionsSubscription.unsubscribe();
    this.selectedCollectionChangedSubscription.unsubscribe();
    this.collectionStateChangedSubscription.unsubscribe();
    this.sessionsChangedSubscription.unsubscribe();
    this.sessionPublishedSubscription.unsubscribe();
    this.contentChangedSubscription.unsubscribe();
    this.contentPublishedSubscription.unsubscribe();
    this.searchChangedSubscription.unsubscribe();
    this.searchPublishedSubscription.unsubscribe();
    this.sessionsPurgedSubscription.unsubscribe();
    this.modelChangedSubscription.unsubscribe();
    this.newApiSubscription.unsubscribe();
  }

  ngOnInit(): void {
    log.debug('ClassicGridComponent: ngOnInit()');

    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'black');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'overflow', 'hidden');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'margin', '0');


    this.panzoomConfig.invertMouseWheel = true;
    this.panzoomConfig.useHardwareAcceleration = true;
    this.panzoomConfig.chromeUseTransform = true;
    this.panzoomConfig.zoomLevels = 10;
    this.panzoomConfig.scalePerZoomLevel = 2.0;
    this.panzoomConfig.zoomStepDuration = 0.2;
    this.panzoomConfig.initialZoomToFit = {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight };
    this.panzoomConfig.haltSpeed = 100;
    this.modelChangedSubscription = this.panzoomConfig.modelChanged.subscribe( (model: any) => {
      this.panzoomModel = model;
      this.sessionWidgetDecider();
    });
    this.newApiSubscription = this.panzoomConfig.newApi.subscribe( (api: any) => {
      log.debug('ClassicGridComponent: newApiSubscription: Got new API');
      this.panZoomAPI = api;
    });
    // this.panzoomConfig.zoomLevels = 20;
    // this.panzoomConfig.scalePerZoomLevel = 1.1;
    // this.panzoomConfig.neutralZoomLevel = 5;
    // this.panzoomConfig.zoomStepDuration = 0.01;
    // this.panzoomConfig.keepInBounds = true;


    // Take subscriptions

    this.searchBarOpenSubscription = this.toolService.searchBarOpen.subscribe( (state: boolean) => {
      this.searchBarOpen = state;
    });

    this.caseSensitiveSearchChangedSubscription = this.toolService.caseSensitiveSearchChanged.subscribe( () => this.toggleCaseSensitiveSearch() );

    this.searchTermsChangedSubscription = this.toolService.searchTermsChanged.subscribe( (event: any) => this.searchTermsChanged(event) );

    this.maskChangedSubscription = this.toolService.maskChanged.subscribe( (event: any) => this.maskChanged(event) );

    this.noCollectionsSubscription = this.toolService.noCollections.subscribe( () => {
      log.debug('ClassicGridComponent: noCollectionsSubscription');
      this.destroyView = true;
      this.sessionsDefined = false;
      this.resetContent();
      this.resetContentCount();
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (collection: any) => { // this triggers whenever we choose a new collection
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

    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (collection: any) => { // this triggers when a monitoring collection refreshes
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

    this.sessionsChangedSubscription = this.dataService.sessionsChanged.subscribe( (s: any) => {
      log.debug('ClassicGridComponent: sessionsChangedSubscription: sessionsChanged:', s); // when an a whole new collection is selected
      this.sessionsDefined = true;
      this.sessions = s;
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.sessionPublishedSubscription = this.dataService.sessionPublished.subscribe( (s: any) => {
      log.debug('ClassicGridComponent: sessionPublishedSubscription: sessionPublished', s); // when an individual session is pushed from a building collection (or monitoring or rolling)
      let sessionId = s.id;
      this.sessionsDefined = true;
      this.sessions[sessionId] = s;
    });

    this.contentChangedSubscription = this.dataService.contentChanged.subscribe( (i: any) => {
      log.debug('ClassicGridComponent: contentChangedSubscription: contentChanged:', i); // when a new collection is selected
      this.destroyView = true;
      i.sort(this.sortContent);
      this.content = i;
      this.displayedContent = i.sort(this.sortContent);
      this.search = [];
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


    this.contentPublishedSubscription = this.dataService.contentPublished.subscribe( (newContent: any) =>  { // when content are pushed from a still-building, rolling, or monitoring collection
      log.debug('ClassicGridComponent: contentPublishedSubscription: contentPublished:', newContent);

      // update content counts here to save cycles not calculating image masks
      for (let i = 0; i < newContent.length; i++) {
        this.content.push(newContent[i]);
        if (newContent[i].contentType === 'image' ) {
          this.contentCount.images++;
        }
        else if (newContent[i].contentType === 'pdf' ) {
          this.contentCount.pdfs++;
        }
        else if (newContent[i].contentType === 'hash' ) {
          this.contentCount.hashes++;
        }
        else if ( this.dodgyArchivesIncludedTypes.includes(newContent[i].contentType) ) {
            this.contentCount.dodgyArchives++;
        }
      }
      this.contentCount.total = this.content.length;
      this.toolService.contentCount.next( this.contentCount );

      if (this.searchBarOpen) { this.searchTermsChanged( { searchTerms: this.lastSearchTerm } ); }
      // this.changeDetectionRef.detectChanges();
      // this.changeDetectionRef.markForCheck();
    });

    this.searchChangedSubscription = this.dataService.searchChanged.subscribe( (s: Search[]) =>  { // this receives complete search term data from complete collection
      this.search = s;
      log.debug('ClassicGridComponent: searchChangedSubscription: searchChanged:', this.search);
      // this.changeDetectionRef.detectChanges();
      // this.changeDetectionRef.markForCheck();
    });


    this.searchPublishedSubscription = this.dataService.searchPublished.subscribe( (s: Search[]) => { // this receives a partial search term data from a building collection
      log.debug('ClassicGridComponent: searchPublishedSubscription: searchPublished:', s);
      for (let i = 0; i < s.length; i++) {
        this.search.push(s[i]);
      }
      // log.debug("ClassicGridComponent: searchPublishedSubscription: this.search:", this.search);
      // this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.sessionsPurgedSubscription = this.dataService.sessionsPurged.subscribe( (sessionsToPurge: number[]) =>  {
      log.debug('ClassicGridComponent: sessionsPurgedSubscription: sessionsPurged:', sessionsToPurge);

      let searchRemoved = this.purgeSessions(sessionsToPurge);

// !!! this displayedContent line should be revisited so that it takes in to account last mask and search!!!
      // this.displayedContent = this.content.sort(this.sortContent);
// !!!

      this.maskChanged(this.lastMask);
      this.countContent();
      if (searchRemoved > 0 && this.searchBarOpen) {
        this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
      }
      // this.changeDetectionRef.detectChanges();
      // this.changeDetectionRef.markForCheck();
    });

  }

  sortNumber(a: number, b: number): number {
      return b - a;
  }

  sortContent(a: any, b: any): number {
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

  /*oldmaskChanged(e: ContentMask): void {
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
    // log.debug('ClassicGridComponent: maskChanged: this.shownBricks:', this.shownBricks);
  }*/

  maskChanged(e: ContentMask): void {
    this.lastMask = e;
    log.debug('MasonryGridComponent: maskChanged():', e);

    if (e.showImage && e.showPdf && e.showHash && e.showDodgy) {
      this.displayedContent = this.content.sort(this.sortContent);
      return;
    }

    let tempDisplayedContent: Content[] = [];

    if (e.showImage) {
      // tempFilter.push('[contentType="image"]');
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('image'));
    }
    if (e.showPdf) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('pdf'));
    }
    if (e.showHash) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('hash'));
    }
    if (e.showDodgy) {
      // tempFilter.push('[contentType="unsupportedZipEntry"],[contentType="encryptedZipEntry"],[contentType="encryptedRarEntry"],[contentType="encryptedRarTable"]');
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('unsupportedZipEntry'));
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('encryptedZipEntry'));
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('encryptedRarEntry'));
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('encryptedRarTable'));
    }
    if (tempDisplayedContent.length > 0) {
      this.displayedContent = tempDisplayedContent.sort(this.sortContent);
    }
    else {
      this.displayedContent = [];
    }
  }

  testsessionWidgetDecider(): void {
  }

  sessionWidgetDecider(): void {
    log.debug('ClassicGridComponent: sessionWidgetDecider():', this.panzoomModel.zoomLevel);
    let transitionZoomLevel = 3.9;
    // let height = this.windowRef.nativeWindow.innerHeight;
    let height = window.innerHeight;
    // let width = this.windowRef.nativeWindow.innerWidth;
    let width = window.innerWidth;
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

  /*isElementInViewport(el: any): any {
      // special bonus for those using jQuery
      if (typeof jQuery === 'function' && el instanceof jQuery) {
          el = el[0];
      }

      let rect = el.getBoundingClientRect();

      return (
          rect.top >= 0 &&
          rect.left >= 0 && // panzoom
          rect.bottom <= ( $('.pan-zoom-frame').innerHeight || document.documentElement.clientHeight) && // or $(window).height()
          rect.right <= ( $('.pan-zoom-frame').innerWidth || document.documentElement.clientWidth) // or $(window).width()
      );
  }*/

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
      if (this.content[x].session === o.session && this.pathToFilename(this.content[x].contentFile) === o.contentFile) {
        return this.content[x];
      }
    }
  }

  /*oldsearchTermsChanged(e: any): void {
    // log.debug('ClassicGridComponent: searchTermsChanged()');
    let searchTerms = e.searchTerms;
    this.lastSearchTerm = searchTerms;
    // log.debug('ClassicGridComponent: searchTermsChanged(): searchTerms:', searchTerms);
    let matchedContent = [];

    if (searchTerms === '') {
      // if our search terms are null, then we set shownBricks to equal all bricks
      this.maskChanged(this.lastMask);
      return;
    }

    if (this.search.length > 0) {
      // Ok, we have a search term to do something with.  This block will generate matchedContent[]
      // log.debug('ClassicGridComponent: searchTermsChanged: this.search:', this.search);
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
      // log.debug('ClassicGridComponent: searchTermsChanged: Length of matchedContent:', matchedContent.length);
      // log.debug('ClassicGridComponent: searchTermsChanged: matchedContent:', matchedContent);
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
  }*/

  searchTermsChanged(e: any): void {
    let searchTerms = e.searchTerms;
    this.lastSearchTerm = searchTerms;
    let matchedIds = [];


    if (searchTerms === '') {
      this.maskChanged(this.lastMask);
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
      return;
    }

    if (this.search.length > 0) {
      for (let i = 0; i < this.search.length; i++) {
        if (!this.caseSensitiveSearch && this.search[i].searchString.toLowerCase().indexOf(searchTerms.toLowerCase()) >= 0) { // case-insensitive search
          // we found a match!
          let matchedId = this.search[i].id;
          matchedIds.push(matchedId);
        }
        else if (this.caseSensitiveSearch && this.search[i].searchString.indexOf(searchTerms) >= 0) { // case-sensitive search
          // we found a match!
          let matchedId = this.search[i].id;
          matchedIds.push(matchedId);
        }
      }
    }

    let tempDisplayedContent: Content[] = [];

    if (matchedIds.length === 0) {
      this.displayedContent = [];
    }
    else {
      // this.filter = matchedIds.join(',');
      for (let i = 0; i < this.content.length; i++) {
        let item = this.content[i];
        if (matchedIds.includes(item.id) ) {
          tempDisplayedContent.push(item);
        }
      }
      this.displayedContent = tempDisplayedContent.sort(this.sortContent);
    }

    this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
  }


  pathToFilename(s: string): string {
    const RE = /([^/]*)$/;
    let match = RE.exec(s);
    return match[0];
  }

  resetContentCount(): void {
    this.contentCount = new ContentCount;
    this.toolService.contentCount.next( this.contentCount );
  }

  countContent(): void {
    this.contentCount = new ContentCount;

    for (let i = 0; i < this.content.length; i++) {
      if (this.content[i].contentType === 'image') {
        this.contentCount.images++;
      }
      if (this.content[i].contentType === 'hash') {
        this.contentCount.hashes++;
      }
      if (this.content[i].contentType === 'pdf') {
        this.contentCount.pdfs++;
      }
      if (this.dodgyArchivesIncludedTypes.includes(this.content[i].contentType)) {
        this.contentCount.dodgyArchives++;
      }
    }
    this.contentCount.total = this.content.length;
    this.toolService.contentCount.next( this.contentCount );
  }

  /*oldresetContent(): void {
    this.displayedContent = [];
    this.search = [];
    this.sessions = {};

    this.content = [];
    this.pdfContent = [];
    this.imageContent = [];
    this.dodgyArchiveContent = [];
    this.hashContent = [];
  }*/

  resetContent(): void {
    this.displayedContent = [];
    this.search = [];
    this.sessions = {};
    this.content = [];
  }

  private getContentByType(type: string): Content[] {
    let temp: Content[] = [];
    for (let i = 0; i < this.content.length; i++) {
      let item = this.content[i];
      if (item.contentType === type) {
        temp.push(item);
      }
    }
    return temp;
  }

  private purgeSessions(sessionsToPurge: number[]): number {
    let searchRemoved = 0;
    while (sessionsToPurge.length !== 0) {
      let sessionToPurge = sessionsToPurge.shift();

      let contentsToPurge = [];
      for (let i = 0; i < this.content.length; i++) {
        // Purge content
        let content = this.content[i];
        if (content.session === sessionToPurge) {
          contentsToPurge.push(content);
        }
      }
      while (contentsToPurge.length !== 0) {
        let contentToPurge = contentsToPurge.shift();
        for (let i = 0; i < this.content.length; i++) {
          let content = this.content[i];
          if (contentToPurge.session === content.session && contentToPurge.contentFile === content.contentFile && contentToPurge.contentType === content.contentType) {
            // Purge content
            log.debug('MasonryGridComponent: purgeSessions(): purging content', content.session);
            this.content.splice(i, 1);
            break;
          }
        }
      }

      let searchesToPurge: Search[] = [];
      for (let i = 0; i < this.search.length; i++) {
        let search = this.search[i];
        if (search.session === sessionToPurge) {
          searchesToPurge.push(search);
        }
      }
      while (searchesToPurge.length !== 0) {
        let searchToPurge = searchesToPurge.shift();
        for (let i = 0; i < this.search.length; i++) {
          let search = this.search[i];
          if (searchToPurge.session === search.session && searchToPurge.contentFile === search.contentFile) {
            // Purge search
            log.debug('MasonryGridComponent: purgeSessions(): purging search', search.session);
            this.search.splice(i, 1);
            break;
          }
        }
      }

    }
    return searchRemoved;
  }

  // count = 0;
  /*calculateContentMasks(): void {
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
  }*/

}
