import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList, ComponentRef, ElementRef, Renderer, ChangeDetectorRef, AfterViewInit, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { NgStyle } from '@angular/common';
import { Observable } from 'rxjs/Observable';
import { ToolService } from './tool.service';
import { DataService } from './data.service';
import { Content } from './content';
import { ContentCount } from './contentcount';
import { ModalService } from './modal/modal.service';
import { MasonryOptions } from './masonry/masonry-options';
import { MasonryComponent } from './masonry/masonry.component';
import { ContentMask } from './contentmask';
import { Brick } from './brick';
import 'rxjs/add/operator/takeWhile';
declare var log: any;

@Component({
  selector: 'masonry-grid-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div style="position:absolute; left: 0; right: 0; bottom: 0; top: 30px; background-color: black;">
  <div style="position: absolute; left: 0; width: 100px; height: 100%;">
    <masonry-control-bar></masonry-control-bar>
    <div *ngIf="selectedCollectionType == 'monitoring'" style="position: absolute; left: 15px; top: 100px; color: white; z-index: 100;">
      <i *ngIf="!pauseMonitoring" class="fa fa-pause-circle-o fa-4x" (click)="suspendMonitoring()"></i>
      <i *ngIf="pauseMonitoring" class="fa fa-play-circle-o fa-4x" (click)="resumeMonitoring()"></i>
    </div>
  </div>
  <div *ngIf="!destroyView" class="scrollContainer noselect" style="position: absolute; left: 100px; right: 0; top: 0; bottom: 0; overflow-y: scroll;">
    <masonry #masonry tabindex="-1" class="grid" *ngIf="content && sessionsDefined && masonryKeys && masonryColumnSize" [options]="masonryOptions" [shownBricks]="shownBricks" [loadAllBeforeLayout]="loadAllBeforeLayout" style="width: 100%; height: 100%;">
      <masonry-tile class="brick" [ngStyle]="{'width.px': masonryColumnSize}" *ngFor="let image of content" [image]="image" [apiServerUrl]="apiServerUrl" (openSessionDetails)="openSessionDetails()" (openPDFViewer)="openPdfViewer()" [session]="sessions[image.session]" [attr.contentFile]="image.contentFile" [attr.sessionid]="image.session" [attr.contentType]="image.contentType" [attr.hashType]="image.hashType" [masonryKeys]="masonryKeys" [masonryColumnSize]="masonryColumnSize"></masonry-tile>
    </masonry>
    <div class="scrollTarget"></div>
  </div>
</div>
<pdf-viewer-modal [apiServerUrl]="apiServerUrl" id="pdf-viewer"></pdf-viewer-modal>
<session-details-modal [apiServerUrl]="apiServerUrl" id="sessionDetails"></session-details-modal>
`,

  styles: [`

    .brick {
      margin-top: 20px;
    }

    masonry:focus {
      outline-width: 0;
    }

  `]
})

export class MasonryGridComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(  private dataService: DataService,
                private renderer: Renderer,
                private elRef: ElementRef,
                private modalService: ModalService,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService,
                private ngZone: NgZone ) {}

  @ViewChildren('masonry') masonryRef: QueryList<any>;
  @ViewChild(MasonryComponent) private masonryComponentRef: MasonryComponent;
  private hoveredImageSession: number;
  public apiServerUrl: string = '//' + window.location.hostname;
  private deviceNumber: number;
  private search: any = []; // 'search' is an array containing text extracted from PDF's which can be searched

  private content: Content[] = [];
  private imageContent: Content[] = [];
  private pdfContent: Content[] = [];
  private dodgyArchiveContent: Content[] = [];
  private hashContent: Content[] = [];
  private contentCount = new ContentCount; // { images: number, pdfs: number, dodgyArchives: number, hashes: number, total: number }

  private caseSensitiveSearch = false;
  private lastSearchTerm = '';
  private pauseMonitoring = false;
  private masonryColumnSize = 350; // default is 350
  private masonryOptions: MasonryOptions =  {
                                    layoutMode: 'masonry',
                                    itemSelector: '.brick',
                                    initLayout: false,
                                    resize: true,
                                    masonry: {
                                                columnWidth: this.masonryColumnSize,
                                                gutter: 20,
                                                horizontalOrder: true,
                                                fitWidth: true,
                                    }
                                  };
  private sessions: any;
  private sessionsDefined = false;
  public selectedCollectionType: string;
  private collectionId: string;
  public destroyView = true;
  private shownBricks: Brick[] = []; // shownBricks is bound to MasonryComponent so it knows which tiles to hide
  private pixelsPerSecond = 200;
  // @ViewChild('scrollTarget') scrollTarget: ElementRef;
  // @ViewChild('scrollContainer') scrollContainer: ElementRef;
  private loadAllBeforeLayout = true;
  private dodgyArchivesIncludedTypes: any = [ 'encryptedRarEntry', 'encryptedZipEntry', 'unsupportedZipEntry', 'encryptedRarTable' ];
  private masonryKeys: any;
  private alive = true;
  private autoScrollRunning = false; // this tracks autoscroller state
  private autoScrollerStopped = false; // this is for when a user stops the autoscroller
  private lastMask = new ContentMask;
  private lastWindowHeight = $('masonry').height();

  ngOnDestroy(): void {
    log.debug('MasonryGridComponent: ngOnDestroy()');
    this.alive = false;
  }

  ngOnInit(): void {
    log.debug('MasonryGridComponent: ngOnInit()');

    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'black');
    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'overflow', 'hidden');
    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'margin', '0');

    // Take subscriptions

    this.dataService.preferencesChanged.takeWhile(() => this.alive).subscribe( (prefs: any) =>  {
      this.masonryKeys = prefs.masonryKeys;
      // log.debug('masonryKeys:', this.masonryKeys)
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();

      if (this.masonryColumnSize !== prefs.masonryColumnSize) {
        log.debug('MasonryGridComponent: preferencesChangedSubscription: Changing masonry column size to prefs.masonryColumnSize');
        this.masonryColumnSize = prefs.masonryColumnSize;
        this.changeDetectionRef.detectChanges();
        this.changeDetectionRef.markForCheck();
        let newMasonryOptions: MasonryOptions = Object.assign({}, this.masonryOptions); // deep copy so that the reference is changed and can thus be detected
        newMasonryOptions.masonry.columnWidth = this.masonryColumnSize;
        this.masonryOptions = newMasonryOptions;
      }
      else {
        if (this.masonryComponentRef) { this.masonryComponentRef.layout(); } // we don't execute the layout after changing masonry meta key preferences if we're changing the column size, so that layout is only triggered once
      }
    });

    this.toolService.caseSensitiveSearchChanged.takeWhile(() => this.alive).subscribe( () => this.toggleCaseSensitiveSearch() );
    this.toolService.searchTermsChanged.takeWhile(() => this.alive).subscribe( ($event: any) => this.searchTermsChanged($event) );
    this.toolService.maskChanged.takeWhile(() => this.alive).subscribe( ($event: ContentMask) => this.maskChanged($event) );

    this.toolService.noCollections.takeWhile(() => this.alive).subscribe( () => {
      log.debug('MasonryGridComponent: noCollectionsSubscription');
      if (this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); }
      this.destroyView = true;
      this.sessionsDefined = false;
      this.resetContent();
      this.resetContentCount();
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.selectedCollectionChanged.takeWhile(() => this.alive).subscribe( (collection: any) => { // this triggers whenever we choose a new collection
      log.debug('MasonryGridComponent: selectedCollectionChangedSubscription: selectedCollectionChanged:', collection);
      if (this.masonryComponentRef) {this.masonryComponentRef.destroyMe(); }
      this.destroyView = true;
      this.sessionsDefined = false;
      this.resetContent();
      this.resetContentCount();
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
      this.selectedCollectionType = collection.type;
      this.collectionId = collection.id;
      if (this.selectedCollectionType === 'monitoring' || this.selectedCollectionType === 'rolling') {
        this.loadAllBeforeLayout = false;
      }
      else {
        this.loadAllBeforeLayout = true;
      }
    });

    this.dataService.collectionStateChanged.takeWhile(() => this.alive).subscribe( (collection: any) => { // this triggers when a monitoring collection refreshes
      log.debug('MasonryGridComponent: collectionStateChangedSubscription: collectionStateChanged:', collection.state);
      // this.stopAutoScroller();
      if (collection.state === 'refreshing')  {
        // this.masonryComponentRef.loadAllBeforeLayout = false;
        if (this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); }
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
      log.debug('MasonryGridComponent: sessionsChangedSubscription: sessionsChanged:', s); // when an a whole new collection is selected
      this.sessionsDefined = true;
      this.sessions = s;
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.sessionPublished.takeWhile(() => this.alive).subscribe( (s: any) => {
      log.debug('MasonryGridComponent: sessionPublishedSubscription: sessionPublished', s); // when an individual session is pushed from a building collection (or monitoring or rolling)
      let sessionId = s.id;
      this.sessionsDefined = true;
      this.sessions[sessionId] = s;
    });

    this.dataService.contentChanged.takeWhile(() => this.alive).subscribe( (i: any) => {
      log.debug('MasonryGridComponent: contentChangedSubscription: contentChanged:', i); // when a new collection is selected
      this.stopAutoScroller();
      if (i.length === 0 && this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); } // we need this when we remove the only collection and it is biggish.  Prevents performance issues
      this.destroyView = true;
      i.sort(this.sortImages);
      this.content = i;
      this.shownBricks = this.contentToBricks(this.content);
      this.search = [];
      this.calculateContentMasks();
      this.countContent();
      this.destroyView = false;
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();

      setTimeout( () => {
        if (this.content && this.sessionsDefined && this.masonryKeys && this.masonryColumnSize && !this.destroyView) {
          log.debug('this.masonryRef', this.masonryRef);
          this.masonryRef.first.el.nativeElement.focus();
        }
      }, 50);
    });

    this.dataService.contentPublished.takeWhile(() => this.alive).subscribe( (newContent: any) =>  { // when content are pushed from a still-building, rolling, or monitoring collection
        log.debug('MasonryGridComponent: contentPublishedSubscription: contentPublished:', newContent);

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
      log.debug('MasonryGridComponent: searchChangedSubscription: searchChanged:', this.search);
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.searchPublished.takeWhile(() => this.alive).subscribe( (s: any) => { // this receives a partial search term data from a building collection
      log.debug('MasonryGridComponent: searchPublishedSubscription: searchPublished:', s);
      for (let i = 0; i < s.length; i++) {
        this.search.push(s[i]);
      }
      // log.debug("MasonryGridComponent: searchPublishedSubscription: this.search:", this.search);
      this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.sessionsPurged.takeWhile(() => this.alive).subscribe( (sessionsToPurge: number[]) =>  {
      log.debug('MasonryGridComponent: sessionsPurgedSubscription: sessionsPurged:', sessionsToPurge);
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
            log.debug('MasonryGridComponent: sessionsPurgedSubscription: removing image with session id', sidToPurge);
            purgedImagePositions.push(i);
          }
        }

        for (let i = 0; i < this.search.length; i++) {
          if (this.search[i].session === sidToPurge) {
            log.debug('MasonryGridComponent: sessionsPurgedSubscription: removing search text with session id', sidToPurge);
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

// !!! this shownBricks line should be revisited so that it takes in to account last mask and search!!!
      this.shownBricks = this.contentToBricks(this.content);
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


    this.toolService.scrollToBottom.takeWhile(() => this.alive).subscribe( () => {
      // runs autoScroller() when someone clicks the arrow button on the toolbar
      this.autoScrollerStopped = false;
      this.autoScroller();
    });

    this.toolService.stopScrollToBottom.takeWhile(() => this.alive).subscribe( () =>  {
      // stops the autoScroller with stopAutoScroller() when someone clicks the stop button on the toolbar
      this.autoScrollerStopped = true;
      this.stopAutoScroller();
    });

    this.toolService.layoutComplete.takeWhile(() => this.alive).subscribe( () => {
      log.debug('MasonryGridComponent: layoutCompleteSubscription: layoutComplete');
      // log.debug(`MasonryGridComponent: layoutCompleteSubscription: lastWindowHeight: ${this.lastWindowHeight}`)
      let windowHeight = $('masonry').height();
      // log.debug(`MasonryGridComponent: layoutCompleteSubscription: windowHeight: ${windowHeight}`)
      if (this.selectedCollectionType === 'monitoring' && !this.autoScrollerStopped && windowHeight > this.lastWindowHeight ) {
        this.autoScroller();
      }
      this.lastWindowHeight = windowHeight;
      this.changeDetectionRef.markForCheck();
    });

  }

  stopAutoScroller(): void {
    log.debug('MasonryGridComponent: stopAutoScroller(): Stopping scroller');
    $('.scrollContainer').stop(true, false);
    this.autoScrollRunning = false;
    this.toolService.scrollToBottomStopped.next();
  }

  autoScroller(): void {
    if (this.autoScrollRunning) {
      $('.scrollContainer').stop(true, false);
      this.autoScrollRunning = false;
    }
    if (!this.autoScrollRunning) {
      this.toolService.scrollToBottomRunning.next();
      this.autoScrollRunning = true;
      let scrollTop = $('.scrollContainer').scrollTop();  // the number of pixels hidden from view above the scrollable area
      // let offset = $('.scrollTarget').offset().top; // orig
      let offset = $('.scrollTarget').position().top; // how far the scrolltarget is from the top
      // log.debug('scrollTop:', scrollTop);
      // log.debug('offset:', offset);

      // let distance = Math.abs($('.scrollContainer').scrollTop() - $('.scrollTarget').offset().top);
      // let distance = $('.scrollContainer').scrollTop() - $('.scrollTarget').offset().top;
      // let distance = Math.abs( scrollTop - offset );
      let distance = Math.ceil(offset) - $('.scrollContainer').height();
      // log.debug('distance:', distance);

      let scroll_duration = ( distance / this.pixelsPerSecond ) * 1000;
      // log.debug('scroll_duration:', scroll_duration);

      // $('.scrollContainer').animate({ 'scrollTop':   $('.scrollTarget').offset().top }, scroll_duration, 'linear');
      // $('.scrollContainer').animate( { scrollTop: offset }, scroll_duration, 'linear'); // orig
      $('.scrollContainer').animate( { scrollTop: `+=${offset}` }, scroll_duration, 'linear', () => { this.toolService.scrollToBottomStopped.next(); } );
      // $('body, html').animate({ 'scrollTop':   offset }, scroll_duration, 'linear');
      // $('.scrollContainer').animate({ 'scrollTop':   distance }, scroll_duration, 'linear');
    }
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

  togglePauseMonitoring(): void {
    this.pauseMonitoring = !this.pauseMonitoring;
    if (this.pauseMonitoring) {
      this.dataService.abortGetBuildingCollection();
      this.stopAutoScroller();
    }
    else {
      this.dataService.getRollingCollection(this.collectionId);
    }
  }

  suspendMonitoring(): void {
    this.pauseMonitoring = true;
    this.dataService.abortGetBuildingCollection();
    this.stopAutoScroller();
  }

  resumeMonitoring(): void {
    this.pauseMonitoring = false;
    this.dataService.getRollingCollection(this.collectionId);
    this.toolService.scrollToBottomRunning.next();
  }

  ngAfterViewInit(): void {
    window.dispatchEvent(new Event('resize'));
  }

  openPdfViewer(): void {
    log.debug('MasonryGridComponent: openPdfViewer()');
    this.modalService.open('pdf-viewer');
  }


  openSessionDetails(): void {
    log.debug('MasonryGridComponent: openSessionDetails()');
    this.modalService.open('sessionDetails');
  }

  maskChanged(e: ContentMask): void {
    this.lastMask = e;
    log.debug('MasonryGridComponent: maskChanged():', e);
    // e = { showPdf: boolean, showImage: boolean, showDodgy: boolean, showHash: boolean }

    this.calculateContentMasks();
    let tempShownBricks = [];

    if (e.showImage && this.imageContent.length !== 0) {
      let tmpcontentToBricks = this.contentToBricks(this.imageContent);
      for (let i = 0; i < tmpcontentToBricks.length; i++) {
        tempShownBricks.push( tmpcontentToBricks[i] );
      }
    }

    if (e.showPdf && this.pdfContent.length !== 0) {
      let tmpcontentToBricks = this.contentToBricks(this.pdfContent);
      for (let i = 0; i < tmpcontentToBricks.length; i++) {
        tempShownBricks.push( tmpcontentToBricks[i] );
      }
    }

    if (e.showDodgy && this.dodgyArchiveContent.length !== 0) {
      let tmpcontentToBricks = this.contentToBricks(this.dodgyArchiveContent);
      for (let i = 0; i < tmpcontentToBricks.length; i++) {
        tempShownBricks.push( tmpcontentToBricks[i] );
      }
    }

    if (e.showHash && this.hashContent.length !== 0) {
      let tmpcontentToBricks = this.contentToBricks(this.hashContent);
      for (let i = 0; i < tmpcontentToBricks.length; i++) {
        tempShownBricks.push( tmpcontentToBricks[i] );
      }
    }

    this.shownBricks = tempShownBricks;
    // log.debug('MasonryGridComponent: maskChanged: this.shownBricks:', this.shownBricks);
  }

  toggleCaseSensitiveSearch(): void {
    log.debug('MasonryGridComponent: toggleCaseSensitiveSearch()');
    this.caseSensitiveSearch = !this.caseSensitiveSearch;
    this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
  }

  getContentBySession(n: number): any {
    for (let x = 0; x < this.content.length; x++) {
      if (this.content[x].session === n) {
        return this.content[x];
      }
    }
  }

  getContentBySessionAndContentFile(o: any): any {
    for (let x = 0; x < this.content.length; x++) {
      if (this.content[x].session === o.session && this.reduceContentFile(this.content[x].contentFile) === o.contentFile) {
        return this.content[x];
      }
    }
  }

  contentToBricks(content: Content[]): any {
    // log.debug('MasonryGridComponent: contentTocontent: content:', content);
    let retBricks = new Array<Brick>();
    for (let i = 0; i < content.length; i++) {
      let brick: Brick = {
                    contentFile: content[i].contentFile,
                    session: content[i].session,
                    type: content[i].contentType
                  };
      if ('hashType' in content[i]) {
        brick['hashType'] = content[i].hashType;
      }
      retBricks.push(brick);
    }
    // if (retBricks.length === 1) { return retBricks[0]; }
    return retBricks;
  }

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
      let localShownBricks: Brick[] = [];
      for (let x = 0; x < matchedContent.length; x++) {
        let img = this.getContentBySessionAndContentFile(matchedContent[x]);
        let brick = this.contentToBricks( [img] );
        localShownBricks.push( brick[0] );
      }
      this.shownBricks = localShownBricks;
    }
    else {
      // There were no matches
      this.shownBricks = [];
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
    this.shownBricks = [];
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
