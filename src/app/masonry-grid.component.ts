import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList, ComponentRef, ElementRef, Renderer2, ChangeDetectorRef, AfterViewInit, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
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
    <masonry #masonry tabindex="-1" class="grid" *ngIf="content && sessionsDefined && masonryKeys && masonryColumnSize" [options]="masonryOptions" [filter]="filter" [loadAllBeforeLayout]="loadAllBeforeLayout" style="width: 100%; height: 100%;">
      <masonry-tile *ngFor="let item of content" masonry-brick class="brick" [ngStyle]="{'width.px': masonryColumnSize}" [content]="item" [apiServerUrl]="apiServerUrl" (openSessionDetails)="openSessionDetails()" (openPDFViewer)="openPdfViewer()" [session]="sessions[item.session]" [attr.contentFile]="item.contentFile" [attr.id]="item.id" [attr.sessionid]="item.session" [attr.contentType]="item.contentType" [attr.hashType]="item.hashType" [masonryKeys]="masonryKeys" [masonryColumnSize]="masonryColumnSize"></masonry-tile>
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
                private renderer: Renderer2,
                private elRef: ElementRef,
                private modalService: ModalService,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService,
                private ngZone: NgZone,
                private router: Router ) {}

  @ViewChildren('masonry') masonryRef: QueryList<any>;
  @ViewChild(MasonryComponent) private masonryComponentRef: MasonryComponent;
  private hoveredImageSession: number;
  public apiServerUrl: string = '//' + window.location.hostname;
  private deviceNumber: number;

  private search: any = []; // 'search' is an array containing text extracted from PDF's which can be searched
  private content: Content[] = [];
  private sessions: any;
  private sessionsDefined = false;
  private contentCount = new ContentCount; // { images: number, pdfs: number, dodgyArchives: number, hashes: number, total: number }

  private caseSensitiveSearch = false;
  private lastSearchTerm = '';
  private pauseMonitoring = false;
  private masonryColumnSize = 350; // default is 350
  public filter = '*';
  private masonryOptions: MasonryOptions =  {
                                    layoutMode: 'masonry',
                                    itemSelector: '.brick',
                                    initLayout: false,
                                    resize: true,
                                    // filter: this.filter,
                                    masonry: {
                                                columnWidth: this.masonryColumnSize,
                                                gutter: 20,
                                                horizontalOrder: true,
                                                fitWidth: true,
                                    }
                                  };

  public selectedCollectionType: string;
  private collectionId: string;
  public destroyView = true;
  private pixelsPerSecond = 200;
  // @ViewChild('scrollTarget') scrollTarget: ElementRef;
  // @ViewChild('scrollContainer') scrollContainer: ElementRef;
  private loadAllBeforeLayout = true;
  private dodgyArchivesIncludedTypes: any = [ 'encryptedRarEntry', 'encryptedZipEntry', 'unsupportedZipEntry', 'encryptedRarTable' ];
  private masonryKeys: any;
  private alive = true;
  private autoScrollStarted = false;
  private autoScrollAnimationRunning = false; // this tracks autoscroller state
  private lastMask = new ContentMask;
  private lastWindowHeight = $('masonry').height();
  private searchBarOpen = false;
  private collectionState = '';

  ngOnDestroy(): void {
    log.debug('MasonryGridComponent: ngOnDestroy()');
    this.alive = false;
  }

  ngOnInit(): void {
    log.debug('MasonryGridComponent: ngOnInit()');

    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'black');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'overflow', 'hidden');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'margin', '0');

    // Take subscriptions

    this.toolService.searchBarOpen.takeWhile(() => this.alive).subscribe( (state: boolean) => {
      this.searchBarOpen = state;
    });

    this.router.events.takeWhile(() => this.alive).subscribe( (val: any) => {
      // Take action to destroy masonry when we navigate away - saves us loads of time waiting for all the bricks to be removed and isotope to be destroyed
      // log.debug('MasonryGridComponent: routerEventSubscription: received val:', val);
      if (val instanceof NavigationStart) {
        log.debug('MasonryGridComponent: routerEventSubscription: manually destroying masonry');
        if (this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); }
      }
    });

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

    this.toolService.searchTermsChanged.takeWhile(() => this.alive).subscribe( ($event: any) => {
      if (this.autoScrollStarted) {
        this.stopAutoScroll();
      }
      this.searchTermsChanged($event);
    });

    this.toolService.maskChanged.takeWhile(() => this.alive).subscribe( ($event: ContentMask) => {
      if (this.autoScrollStarted) {
        this.stopAutoScroll();
      }
      this.maskChanged($event);
     });

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

    this.dataService.selectedCollectionChanged.takeWhile(() => this.alive).subscribe( (collection: any) => {
      // this triggers when a user chooses a new collection
      log.debug('MasonryGridComponent: selectedCollectionChangedSubscription: selectedCollectionChanged:', collection);
      if (this.masonryComponentRef) {this.masonryComponentRef.destroyMe(); }
      this.destroyView = true;
      this.sessionsDefined = false;
      this.resetContent();
      this.resetContentCount();
      this.stopAutoScroll();
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
      this.selectedCollectionType = collection.type;
      this.collectionId = collection.id;
      if (this.selectedCollectionType === 'monitoring' || this.selectedCollectionType === 'rolling' || ( this.selectedCollectionType === 'fixed' && this.collectionState === 'building' )) {
        this.loadAllBeforeLayout = false;
      }
      else {
        this.loadAllBeforeLayout = true;
      }
    });

    this.dataService.collectionStateChanged.takeWhile(() => this.alive).subscribe( (collection: any) => {
      // this triggers when a monitoring collection refreshes
      log.debug('MasonryGridComponent: collectionStateChangedSubscription: collectionStateChanged:', collection.state);
      this.collectionState = collection.state;
      if (collection.state === 'refreshing')  {
        // this.masonryComponentRef.loadAllBeforeLayout = false;
        if (this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); }
        this.destroyView = true;
        this.changeDetectionRef.detectChanges();
        this.changeDetectionRef.markForCheck();
        if (this.autoScrollStarted) { this.restartAutoScroll(); }
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
      // when a whole new sessions collection is received
      log.debug('MasonryGridComponent: sessionsChangedSubscription: sessionsChanged:', s);
      this.sessionsDefined = true;
      this.sessions = s;
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.sessionPublished.takeWhile(() => this.alive).subscribe( (s: any) => {
      // when an individual session is pushed from a building collection (or monitoring or rolling)
      log.debug('MasonryGridComponent: sessionPublishedSubscription: sessionPublished', s);
      let sessionId = s.id;
      this.sessionsDefined = true;
      this.sessions[sessionId] = s;
    });

    this.dataService.contentChanged.takeWhile(() => this.alive).subscribe( (i: any) => {
       // when a whole new content collection is received
      log.debug('MasonryGridComponent: contentChangedSubscription: contentChanged:', i);
      if (i.length === 0 && this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); } // we need this when we remove the only collection and it is biggish.  Prevents performance issues
      this.destroyView = true;
      i.sort(this.sortImages);
      this.content = i;
      this.search = [];
      this.countContent();
      this.destroyView = false;
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();

      setTimeout( () => {
        if (this.content && this.sessionsDefined && this.masonryKeys && this.masonryColumnSize && !this.destroyView) {
          log.debug('MasonryGridComponent: contentChangedSubscription: this.masonryRef', this.masonryRef);
          this.masonryRef.first.el.nativeElement.focus();
        }
      }, 50);
    });

    this.dataService.contentPublished.takeWhile(() => this.alive).subscribe( (newContent: any) =>  {
      // when a content object is pushed from a still-building fixed, rolling, or monitoring collection
      log.debug('MasonryGridComponent: contentPublishedSubscription: contentPublished:', newContent);

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
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.searchChanged.takeWhile(() => this.alive).subscribe( (s: any) =>  {
      // this receives complete search term data from complete collection
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
      // if (this.searchBarOpen) { this.searchTermsChanged( { searchTerms: this.lastSearchTerm } ); } // we don't do this here because the content arrives after the search term
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.sessionsPurged.takeWhile(() => this.alive).subscribe( (sessionsToPurge: number[]) =>  {
      log.debug('MasonryGridComponent: sessionsPurgedSubscription: sessionsPurged:', sessionsToPurge);
      // log.debug("content", this.content);
      // log.debug("content length:",this.content.length);
      // log.debug("content:",JSON.parse(JSON.stringify(this.content)));
      let c = 0;

      let purgedContentPositions = [];
      let purgedSearchPositions = [];

      for (let x = 0; x < sessionsToPurge.length; x++) {
        let sidToPurge = sessionsToPurge[x];

        for (let i = 0; i < this.content.length; i++) {
          if (this.content[i].session === sidToPurge) {
            log.debug('MasonryGridComponent: sessionsPurgedSubscription: removing image with session id', sidToPurge);
            purgedContentPositions.push(i);
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
      // log.debug("purgedContentPositions:",purgedContentPositions);
      // log.debug("purgedSearchPositions:",purgedSearchPositions);
      purgedContentPositions.sort(this.sortNumber);
      for (let i = 0; i < purgedContentPositions.length; i++) {
        this.content.splice(purgedContentPositions[i], 1);
      }
      purgedSearchPositions.sort(this.sortNumber);
      for (let i = 0; i < purgedSearchPositions.length; i++) {
        this.search.splice(purgedSearchPositions[i], 1);
      }

      this.maskChanged(this.lastMask);
      this.countContent();
      if (c > 0 && this.searchBarOpen) {
        this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
      }
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
      this.lastWindowHeight = $('masonry').height();
    });


    this.toolService.scrollToBottom.takeWhile(() => this.alive).subscribe( () => {
      // runs autoScroller() when someone clicks the arrow button on the toolbar
      this.autoScrollStarted = true;
      this.autoScroller();
    });

    this.toolService.stopScrollToBottom.takeWhile(() => this.alive).subscribe( () =>  {
      // stops the autoScroller with stopAutoScrollerAnimation() when someone clicks the stop button on the toolbar
      this.autoScrollStarted = false;
      this.stopAutoScrollerAnimation();
    });

    this.toolService.layoutComplete.takeWhile(() => this.alive).subscribe( () => {
      log.debug('MasonryGridComponent: layoutCompleteSubscription: layoutComplete');
      // log.debug(`MasonryGridComponent: layoutCompleteSubscription: lastWindowHeight: ${this.lastWindowHeight}`)
      let windowHeight = $('masonry').height();
      // log.debug(`MasonryGridComponent: layoutCompleteSubscription: windowHeight: ${windowHeight}`)
      if (this.autoScrollStarted && windowHeight > this.lastWindowHeight ) { // this.selectedCollectionType === 'monitoring' &&
        this.autoScroller();
      }
      this.lastWindowHeight = windowHeight;
      this.changeDetectionRef.markForCheck();
    });

  }

  stopAutoScrollerAnimation(): void {
    log.debug('MasonryGridComponent: stopAutoScrollerAnimation(): Stopping scroller');
    $('.scrollContainer').stop(true, false);
    this.autoScrollAnimationRunning = false;
    // this.toolService.scrollToBottomStopped.next(); // sometimes we need to use this method without triggering an end to the controlbar
  }

  offset(): string {
    log.debug('MasonryGridComponent: offset()');
    let offset = $('.scrollTarget').position().top; // how far the scrolltarget is from the top
    return `+=${offset}`;
  }

  scrollDuration(): number {
    log.debug('MasonryGridComponent: scrollDuration()');
    let offset = $('.scrollTarget').position().top;
    let distance = Math.ceil(offset) - $('.scrollContainer').height();
    let scroll_duration = ( distance / this.pixelsPerSecond ) * 1000;
    return scroll_duration;
  }

  autoScroller(): void {
    // $('.scrollContainer').animate( { scrollTop: this.offset() }, this.scrollDuration(), 'linear');
    $('.scrollContainer').animate( { scrollTop: this.offset() }, this.scrollDuration(), 'linear', () => {
      if (this.selectedCollectionType === 'fixed' && this.collectionState === 'complete') { this.stopAutoScroll(); }
    });

    let queue = $('.scrollContainer').queue();
    if (queue.length > 1) {
      log.debug('MasonryGridComponent: autoScroller(): stopping existing animation');
      $('.scrollContainer').stop(false, false);
    }
  }

  oldautoScroller(): void {
    if (this.autoScrollAnimationRunning) {
      // We must stop the autoScroller before we restart it.  Yes, it's clunky
      $('.scrollContainer').stop(true, false);
      this.autoScrollAnimationRunning = false;
    }
    // this.toolService.scrollToBottomRunning.next();
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
    $('.scrollContainer').animate( { scrollTop: `+=${offset}` }, scroll_duration, 'linear'); // () => { this.toolService.scrollToBottomStopped.next(); }
    // $('body, html').animate({ 'scrollTop':   offset }, scroll_duration, 'linear');
    // $('.scrollContainer').animate({ 'scrollTop':   distance }, scroll_duration, 'linear');
    this.autoScrollAnimationRunning = true;
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

  suspendMonitoring(): void {
    this.pauseMonitoring = true;
    this.dataService.abortGetBuildingCollection();
  }

  resumeMonitoring(): void {
    this.pauseMonitoring = false;
    this.dataService.getRollingCollection(this.collectionId);
  }

  ngAfterViewInit(): void {
    window.dispatchEvent(new Event('resize'));
  }

  openPdfViewer(): void {
    log.debug('MasonryGridComponent: openPdfViewer()');
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    this.modalService.open('pdf-viewer');
  }


  openSessionDetails(): void {
    log.debug('MasonryGridComponent: openSessionDetails()');
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    this.modalService.open('sessionDetails');
  }

  maskChanged(e: ContentMask): void {
    this.lastMask = e;
    log.debug('MasonryGridComponent: maskChanged():', e);

    if (e.showImage && e.showPdf && e.showHash && e.showDodgy) {
      this.filter = '*';
      return;
    }

    let tempFilter = [];

    if (e.showImage) {
      tempFilter.push('[contentType="image"]');
    }
    if (e.showPdf) {
      tempFilter.push('[contentType="pdf"]');
    }
    if (e.showHash) {
      tempFilter.push('[contentType="hash"]');
    }
    if (e.showDodgy) {
      tempFilter.push('[contentType="unsupportedZipEntry"],[contentType="encryptedZipEntry"],[contentType="encryptedRarEntry"],[contentType="encryptedRarTable"]');
    }
    if (tempFilter.length > 0) {
      this.filter = tempFilter.join(',');
    }
    else {
      this.filter = '.none';
    }
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
      if (this.content[x].session === o.session && this.pathToFilename(this.content[x].contentFile) === o.contentFile) {
        return this.content[x];
      }
    }
  }

  searchTermsChanged(e: any): void {
    let searchTerms = e.searchTerms;
    // if ( this.lastSearchTerm === searchTerms ) { return; }
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
          matchedIds.push(`[id="${matchedId}"]`);
        }
        else if (this.caseSensitiveSearch && this.search[i].searchString.indexOf(searchTerms) >= 0) { // case-sensitive search
          // we found a match!
          let matchedId = this.search[i].id;
          matchedIds.push(`[id="${matchedId}"]`);
        }
      }
    }

    if (matchedIds.length === 0) {
      this.filter = '.none';
    }
    else {
      this.filter = matchedIds.join(',');
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
    this.toolService.contentCount.next( this.contentCount );
  }

  resetContent(): void {
    this.search = [];
    this.sessions = {};
    this.content = [];
  }

  private stopAutoScroll(): void {
    this.stopAutoScrollerAnimation();
    this.toolService.scrollToBottomStopped.next();
    this.autoScrollStarted = false;
    this.lastWindowHeight = $('masonry').height();
  }

  private restartAutoScroll(): void {
    this.stopAutoScrollerAnimation();
    this.lastWindowHeight = $('masonry').height();
    this.autoScroller();
  }

}
