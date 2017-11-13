import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList, ComponentRef, ElementRef, Renderer2, ChangeDetectorRef, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
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
import { Search } from './search';
import { Subscription } from 'rxjs/Subscription';
import * as math from 'mathjs';
import * as utils from './utils';
declare var log: any;
declare var $: any; // we must declare jQuery in this instance because we're using a jQuery plugin and don't have the typescript defs for it

@Component({
  selector: 'masonry-grid-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div style="position:absolute; left: 0; right: 0; bottom: 0; top: 30px; background-color: black;">
  <div style="position: absolute; left: 0; width: 100px; height: 100%;">
    <masonry-control-bar></masonry-control-bar>
    <div *ngIf="selectedCollectionType == 'monitoring' && !destroyView" style="position: absolute; left: 15px; top: 100px; color: white; z-index: 100;">
      <i *ngIf="!pauseMonitoring" class="fa fa-pause-circle-o fa-4x" (click)="suspendMonitoring()"></i>
      <i *ngIf="pauseMonitoring" class="fa fa-play-circle-o fa-4x" (click)="resumeMonitoring()"></i>
    </div>
  </div>
  <div class="scrollContainer noselect" style="position: absolute; left: 100px; right: 0; top: 0; bottom: 0; overflow-y: scroll;">
    <div *ngIf="!destroyView">
      <masonry #masonry tabindex="-1" class="grid" *ngIf="content && sessionsDefined && masonryKeys && masonryColumnSize" [options]="masonryOptions" [filter]="filter" [loadAllBeforeLayout]="loadAllBeforeLayout" style="width: 100%; height: 100%;">
        <masonry-tile *ngFor="let item of content" masonry-brick class="brick" [ngStyle]="{'width.px': masonryColumnSize}" [content]="item" [apiServerUrl]="apiServerUrl" [session]="sessions[item.session]" [attr.contentFile]="item.contentFile" [attr.id]="item.id" [attr.sessionid]="item.session" [attr.contentType]="item.contentType" [attr.hashType]="item.hashType" [masonryKeys]="masonryKeys" [masonryColumnSize]="masonryColumnSize"></masonry-tile>
      </masonry>
    </div>
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
                private router: Router ) {}

  @ViewChildren('masonry') masonryRef: QueryList<any>;
  @ViewChild(MasonryComponent) private masonryComponentRef: MasonryComponent;
  public apiServerUrl: string = '//' + window.location.hostname;

  private search: Search[] = []; // 'search' is an array containing text extracted from PDF's which can be searched
  private content: Content[] = [];
  private sessions: any;
  private sessionsDefined = false;
  private contentCount = new ContentCount; // { images: number, pdfs: number, officeDocs: number, dodgyArchives: number, hashes: number, total: number }

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
  private loadAllBeforeLayout = true;
  private dodgyArchivesIncludedTypes: any = [ 'encryptedRarEntry', 'encryptedZipEntry', 'unsupportedZipEntry', 'encryptedRarTable' ];
  private masonryKeys: any;
  private autoScrollStarted = false;
  private autoScrollAnimationRunning = false; // this tracks autoscroller state
  private lastMask = new ContentMask;
  private lastWindowHeight = $('masonry').height();
  private searchBarOpen = false;
  private collectionState = '';

  // Subscription holders
  private searchBarOpenSubscription: Subscription;
  private caseSensitiveSearchChangedSubscription: Subscription;
  private searchTermsChangedSubscription: Subscription;
  private maskChangedSubscription: Subscription;
  private noCollectionsSubscription: Subscription;
  private selectedCollectionChangedSubscription: Subscription;
  private collectionStateChangedSubscription: Subscription;
  private sessionsReplacedSubscription: Subscription;
  private sessionPublishedSubscription: Subscription;
  private contentReplacedSubscription: Subscription;
  private contentPublishedSubscription: Subscription;
  private searchChangedSubscription: Subscription;
  private searchPublishedSubscription: Subscription;
  private sessionsPurgedSubscription: Subscription;
  private routerEventsSubscription: Subscription;
  private preferencesChangedSubscription: Subscription;
  private scrollToBottomSubscription: Subscription;
  private stopScrollToBottomSubscription: Subscription;
  private layoutCompleteSubscription: Subscription;
  private openPDFViewerSubscription: Subscription;
  private openSessionViewerSubscription: Subscription;

  ngOnDestroy(): void {
    log.debug('MasonryGridComponent: ngOnDestroy()');
    this.searchBarOpenSubscription.unsubscribe();
    this.caseSensitiveSearchChangedSubscription.unsubscribe();
    this.searchTermsChangedSubscription.unsubscribe();
    this.maskChangedSubscription.unsubscribe();
    this.noCollectionsSubscription.unsubscribe();
    this.selectedCollectionChangedSubscription.unsubscribe();
    this.collectionStateChangedSubscription.unsubscribe();
    this.sessionsReplacedSubscription.unsubscribe();
    this.sessionPublishedSubscription.unsubscribe();
    this.contentReplacedSubscription.unsubscribe();
    this.contentPublishedSubscription.unsubscribe();
    this.searchChangedSubscription.unsubscribe();
    this.searchPublishedSubscription.unsubscribe();
    this.sessionsPurgedSubscription.unsubscribe();
    this.routerEventsSubscription.unsubscribe();
    this.preferencesChangedSubscription.unsubscribe();
    this.scrollToBottomSubscription.unsubscribe();
    this.stopScrollToBottomSubscription.unsubscribe();
    this.layoutCompleteSubscription.unsubscribe();
    this.openPDFViewerSubscription.unsubscribe();
    this.openSessionViewerSubscription.unsubscribe();
  }

  ngOnInit(): void {
    log.debug('MasonryGridComponent: ngOnInit()');

    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'black');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'overflow', 'hidden');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'margin', '0');

    // Take subscriptions

    this.searchBarOpenSubscription = this.toolService.searchBarOpen.subscribe( (state: boolean) => {
      this.searchBarOpen = state;
    });

    this.routerEventsSubscription = this.router.events.subscribe( (val: any) => {
      // Take action to destroy masonry when we navigate away - saves us loads of time waiting for all the bricks to be removed and isotope to be destroyed
      // log.debug('MasonryGridComponent: routerEventSubscription: received val:', val);
      if (val instanceof NavigationStart) {
        log.debug('MasonryGridComponent: routerEventSubscription: manually destroying masonry');
        if (this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); }
      }
    });

    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: any) =>  {
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
        // not sure why I had this here - we only need to trigger layout when the column size changes
        // I spoke too soon - we also need to call it when we add a masonry meta key in preferences
        log.debug('MasonryGridComponent: preferencesChangedSubscription: calling layout');
        if (this.masonryComponentRef) { this.toolService.refreshMasonryLayout.next(); } // we don't execute the layout after changing masonry meta key preferences if we're changing the column size, so that layout is only triggered once
      }
    });

    this.caseSensitiveSearchChangedSubscription = this.toolService.caseSensitiveSearchChanged.subscribe( () => this.toggleCaseSensitiveSearch() );

    this.searchTermsChangedSubscription = this.toolService.searchTermsChanged.subscribe( ($event: any) => {
      if (this.autoScrollStarted) {
        this.stopAutoScroll();
      }
      this.searchTermsChanged($event);
    });

    this.maskChangedSubscription = this.toolService.maskChanged.subscribe( ($event: ContentMask) => {
      if (this.autoScrollStarted) {
        this.stopAutoScroll();
      }
      this.maskChanged($event);
     });

    this.noCollectionsSubscription = this.toolService.noCollections.subscribe( () => {
      log.debug('MasonryGridComponent: noCollectionsSubscription');
      if (this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); }
      this.destroyView = true;
      this.sessionsDefined = false;
      this.resetContent();
      this.resetContentCount();
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (collection: any) => {
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
      this.collectionState = collection.state;
      this.collectionId = collection.id;
      if (collection.type === 'monitoring' || collection.type === 'rolling' || ( collection.type === 'fixed' && collection.state === 'building' )) {
        this.loadAllBeforeLayout = false;
      }
      else {
        this.loadAllBeforeLayout = true;
      }
    });

    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (collection: any) => {
      // this triggers when a monitoring collection refreshes
      log.debug('MasonryGridComponent: collectionStateChangedSubscription: collectionStateChanged:', collection.state);
      this.collectionState = collection.state;
      if (collection.state === 'monitoring')  {
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

    this.sessionsReplacedSubscription = this.dataService.sessionsReplaced.subscribe( (s: any) => {
      // when a whole new sessions collection is received
      log.debug('MasonryGridComponent: sessionsReplacedSubscription: sessionsReplaced:', s);
      this.sessionsDefined = true;
      this.sessions = s;
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.sessionPublishedSubscription = this.dataService.sessionPublished.subscribe( (s: any) => {
      // when an individual session is pushed from a building collection (or monitoring or rolling)
      log.debug('MasonryGridComponent: sessionPublishedSubscription: sessionPublished', s);
      let sessionId = s.id;
      this.sessionsDefined = true;
      this.sessions[sessionId] = s;
    });

    this.contentReplacedSubscription = this.dataService.contentReplaced.subscribe( (i: any) => {
       // when a whole new content collection is received
      log.debug('MasonryGridComponent: contentReplacedSubscription: contentReplaced:', i);
      if (i.length === 0 && this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); } // we need this when we remove the only collection and it is biggish.  Prevents performance issues
      this.destroyView = true;
      i.sort(this.sortContent);
      this.content = i;
      this.search = [];
      this.countContent();
      this.destroyView = false;
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();

      setTimeout( () => {
        // Sets keyboard focus
        if (this.content && this.sessionsDefined && this.masonryKeys && this.masonryColumnSize && !this.destroyView) {
          log.debug('MasonryGridComponent: contentReplacedSubscription: this.masonryRef', this.masonryRef);
          this.masonryRef.first.el.nativeElement.focus();
        }
      }, 50);
    });

    this.contentPublishedSubscription = this.dataService.contentPublished.subscribe( (newContent: any) =>  {
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
        else if (newContent[i].contentType === 'office' ) {
          this.contentCount.officeDocs++;
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

    this.searchChangedSubscription = this.dataService.searchChanged.subscribe( (s: Search[]) =>  {
      // this receives complete search term data from complete collection
      this.search = s;
      log.debug('MasonryGridComponent: searchChangedSubscription: searchChanged:', this.search);
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.searchPublishedSubscription = this.dataService.searchPublished.subscribe( (s: Search[]) => { // this receives a partial search term data from a building collection
      log.debug('MasonryGridComponent: searchPublishedSubscription: searchPublished:', s);
      for (let i = 0; i < s.length; i++) {
        this.search.push(s[i]);
      }
      // log.debug("MasonryGridComponent: searchPublishedSubscription: this.search:", this.search);
      // if (this.searchBarOpen) { this.searchTermsChanged( { searchTerms: this.lastSearchTerm } ); } // we don't do this here because the content arrives after the search term
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.sessionsPurgedSubscription = this.dataService.sessionsPurged.subscribe( (sessionsToPurge: number[]) =>  {
      log.debug('MasonryGridComponent: sessionsPurgedSubscription: sessionsPurged:', sessionsToPurge);

      let searchRemoved = this.purgeSessions(sessionsToPurge);

      this.maskChanged(this.lastMask);
      this.countContent();
      if (searchRemoved > 0 && this.searchBarOpen) {
        this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
      }
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
      this.lastWindowHeight = $('masonry').height();
    });

    this.scrollToBottomSubscription = this.toolService.scrollToBottom.subscribe( () => {
      // runs autoScroller() when someone clicks the arrow button on the toolbar
      this.autoScrollStarted = true;
      this.autoScroller();
    });

    this.stopScrollToBottomSubscription = this.toolService.stopScrollToBottom.subscribe( () =>  {
      // stops the autoScroller with stopAutoScrollerAnimation() when someone clicks the stop button on the toolbar
      this.autoScrollStarted = false;
      this.stopAutoScrollerAnimation();
    });

    this.layoutCompleteSubscription = this.toolService.layoutComplete.subscribe( () => {
      log.debug('MasonryGridComponent: layoutCompleteSubscription: layoutComplete');
      // log.debug(`MasonryGridComponent: layoutCompleteSubscription: lastWindowHeight: ${this.lastWindowHeight}`)
      let windowHeight = $('masonry').height();
      // log.debug(`MasonryGridComponent: layoutCompleteSubscription: windowHeight: ${windowHeight}`)
      if (this.autoScrollStarted && windowHeight > this.lastWindowHeight ) { // this.selectedCollectionType === 'monitoring' &&
        this.autoScroller();
      }
      this.lastWindowHeight = windowHeight;
      // this.changeDetectionRef.markForCheck();
    });


    this.openPDFViewerSubscription = this.toolService.openPDFViewer.subscribe( () => {
      this.openPdfViewer();
    });

    this.openSessionViewerSubscription = this.toolService.openSessionViewer.subscribe( () => {
      this.openSessionDetails();
    });

  }

  stopAutoScrollerAnimation(): void {
    log.debug('MasonryGridComponent: stopAutoScrollerAnimation(): Stopping scroller');
    // $('.scrollContainer').stop(true, false);
    $('.scrollTarget').velocity('stop');
    this.autoScrollAnimationRunning = false;
    // this.toolService.scrollToBottomStopped.next(); // sometimes we need to use this method without triggering an end to the controlbar
  }

  scrollDuration(): number {
    log.debug('MasonryGridComponent: scrollDuration()');
    let scrollTarget: any = document.getElementsByClassName('scrollTarget')[0];
    let offset = scrollTarget.offsetTop;
    // log.debug('MasonryGridComponent: scrollDuration(): offset:', offset);
    let scrollTop = $('.scrollContainer').scrollTop(); // the position of the scrollbars from the top of the container
    // log.debug('MasonryGridComponent: scrollDuration(): scrollTop:', scrollTop);
    let distance = math.eval(`${offset} - ${scrollTop}`);
    // log.debug('MasonryGridComponent: scrollDuration(): distance:', distance);
    let scrollDuration = math.eval( `( ${distance} / ${this.pixelsPerSecond} ) * 1000`);
    // log.debug('MasonryGridComponent: scrollDuration(): scrollDuration:', scrollDuration);
    return scrollDuration;
  }

  autoScroller(): void {
    log.debug('MasonryGridComponent: autoScroller(): Starting scroller');
    // Add a new animation to the animation queue
    $('.scrollTarget').velocity( 'scroll', { duration: this.scrollDuration(), container: $('.scrollContainer'), easing: 'linear', complete: () => {
      // This callback runs when the animation is complete
      // log.debug('MasonryGridComponent: autoScroller(): Animation complete');
      if (this.selectedCollectionType === 'fixed' && this.collectionState === 'complete') { this.stopAutoScroll(); }
    }});
    if ( $('.scrollTarget').queue().length > 1) {
      // If there's already an animation running, stop it to allow the next animation in the queue to run
      log.debug('MasonryGridComponent: autoScroller(): stopping existing animation');
      $('.scrollTarget').velocity('stop');
    }
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

  suspendMonitoring(): void {
    this.pauseMonitoring = true;
    // this.dataService.abortGetBuildingCollection();
    this.dataService.pauseMonitoringCollection(this.collectionId);
  }

  resumeMonitoring(): void {
    this.pauseMonitoring = false;

    // We must now check whether our collection has disconnected, and if not - call unpauseMonitoringCollection.  If so, call getRollingCollection
    if (this.dataService.httpJsonStreamServiceConnected) {
      // We're still connected
      this.dataService.unpauseMonitoringCollection(this.collectionId);
    }
    else {
      // We're disconnected
      this.dataService.getRollingCollection(this.collectionId);
    }
  }

  ngAfterViewInit(): void {
    window.dispatchEvent(new Event('resize'));
  }

  openPdfViewer(): void {
    log.debug('MasonryGridComponent: openPdfViewer()');
    if (this.autoScrollStarted) {
      // stop the autoscroller
      this.stopAutoScroll();
    }
    if (this.selectedCollectionType === 'monitoring' && this.pauseMonitoring === false) {
      // pause monitoring
      this.suspendMonitoring();
    }
    this.modalService.open('pdf-viewer');
  }


  openSessionDetails(): void {
    log.debug('MasonryGridComponent: openSessionDetails()');
    if (this.autoScrollStarted) {
      // stop the autoscroller
      this.stopAutoScroll();
    }
    this.modalService.open('sessionDetails');
    if (this.selectedCollectionType === 'monitoring' && this.pauseMonitoring === false) {
      // pause monitoring
      this.suspendMonitoring();
    }
  }

  maskChanged(e: ContentMask): void {
    this.lastMask = e;
    log.debug('MasonryGridComponent: maskChanged():', e);

    if (e.showImage && e.showPdf && e.showOffice && e.showHash && e.showDodgy) {
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
    if (e.showOffice) {
      tempFilter.push('[contentType="office"]');
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
      if (this.content[x].session === o.session && utils.pathToFilename(this.content[x].contentFile) === o.contentFile) {
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
      if (this.content[i].contentType === 'office') {
        this.contentCount.officeDocs++;
      }
      if (this.dodgyArchivesIncludedTypes.includes(this.content[i].contentType)) {
        this.contentCount.dodgyArchives++;
      }
    }
    this.contentCount.total = this.content.length;
    this.toolService.contentCount.next( this.contentCount );
  }

  resetContent(): void {
    this.search = [];
    this.sessions = {};
    this.content = [];
  }

  private stopAutoScroll(): void {
    log.debug('MasonryGridComponent: stopAutoScroll()');
    this.stopAutoScrollerAnimation();
    this.toolService.scrollToBottomStopped.next();
    this.autoScrollStarted = false;
    this.lastWindowHeight = $('masonry').height();
  }

  private restartAutoScroll(): void {
    log.debug('MasonryGridComponent: restartAutoScroll()');
    this.stopAutoScrollerAnimation();
    this.lastWindowHeight = $('masonry').height();
    this.autoScroller();
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


}
