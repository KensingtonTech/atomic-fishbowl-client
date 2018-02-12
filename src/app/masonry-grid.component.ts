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
import { Search } from './search';
import { Subscription } from 'rxjs/Subscription';
import { eval } from 'mathjs';

import * as utils from './utils';
import * as log from 'loglevel';
import { Collection } from './collection';
import { Preferences } from './preferences';
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
        <masonry-tile *ngFor="let item of content" masonry-brick class="brick" [ngStyle]="{'width.px': masonryColumnSize}" [content]="item" [apiServerUrl]="apiServerUrl" [session]="sessions[item.session]" [attr.contentFile]="item.contentFile" [attr.id]="item.id" [attr.sessionid]="item.session" [attr.contentType]="item.contentType" [attr.hashType]="item.hashType" [masonryKeys]="masonryKeys" [masonryColumnSize]="masonryColumnSize" [serviceType]="selectedCollectionServiceType"></masonry-tile>
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
                private router: Router,
                private zone: NgZone ) {}

  @ViewChildren('masonry') masonryRef: QueryList<any>;
  @ViewChild(MasonryComponent) private masonryComponentRef: MasonryComponent;
  public apiServerUrl: string = '//' + window.location.hostname;

  private search: Search[] = []; // 'search' is an array containing text extracted from PDF's which can be searched
  private content: Content[] = [];
  private sessions: any = {};
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

  public destroyView = true;
  private loadAllBeforeLayout = true;

  public selectedCollectionType: string = null;
  public selectedCollectionServiceType: string = null; // 'nw' or 'sa'
  private collectionId: string = null;
  private pixelsPerSecond = 200;
  private dodgyArchivesIncludedTypes: any = [ 'encryptedRarEntry', 'encryptedZipEntry', 'unsupportedZipEntry', 'encryptedRarTable' ];
  private masonryKeys: any;
  private autoScrollStarted = false;
  private autoScrollAnimationRunning = false; // this tracks autoscroller state
  private lastMask = new ContentMask;
  private lastWindowHeight = $('masonry').height();
  private searchBarOpen = false;
  private collectionState = '';
  private preferences: Preferences;

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
  private searchReplacedSubscription: Subscription;
  private searchPublishedSubscription: Subscription;
  private sessionsPurgedSubscription: Subscription;
  private routerEventsSubscription: Subscription;
  private preferencesChangedSubscription: Subscription;
  private scrollToBottomSubscription: Subscription;
  private stopScrollToBottomSubscription: Subscription;
  private layoutCompleteSubscription: Subscription;
  private openPDFViewerSubscription: Subscription;
  private openSessionViewerSubscription: Subscription;
  private collectionDeletedSubscription: Subscription;

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
    this.searchReplacedSubscription.unsubscribe();
    this.searchPublishedSubscription.unsubscribe();
    this.sessionsPurgedSubscription.unsubscribe();
    this.routerEventsSubscription.unsubscribe();
    this.preferencesChangedSubscription.unsubscribe();
    this.scrollToBottomSubscription.unsubscribe();
    this.stopScrollToBottomSubscription.unsubscribe();
    this.layoutCompleteSubscription.unsubscribe();
    this.openPDFViewerSubscription.unsubscribe();
    this.openSessionViewerSubscription.unsubscribe();
    this.collectionDeletedSubscription.unsubscribe();
  }

  ngOnInit(): void {
    log.debug('MasonryGridComponent: ngOnInit()');

    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'black');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'overflow', 'hidden');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'margin', '0');

    // Take subscriptions

    this.searchBarOpenSubscription = this.toolService.searchBarOpen.subscribe( (state: boolean) => this.onSearchBarOpen(state) );

    this.routerEventsSubscription = this.router.events.subscribe( (val: any) => this.onRouterEvent(val));

    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) );

    this.caseSensitiveSearchChangedSubscription = this.toolService.caseSensitiveSearchChanged.subscribe( () => this.toggleCaseSensitiveSearch() );

    this.searchTermsChangedSubscription = this.toolService.searchTermsChanged.subscribe( ($event: any) => this.onSearchTermsChanged($event) );

    this.maskChangedSubscription = this.toolService.maskChanged.subscribe( ($event: ContentMask) => this.onMaskChanged($event) );

    this.noCollectionsSubscription = this.toolService.noCollections.subscribe( () => this.onNoCollection() );

    this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (collection: Collection) => this.onSelectedCollectionChanged(collection) );

    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (collection: any) => this.onCollectionStateChanged(collection) );

    this.sessionsReplacedSubscription = this.dataService.sessionsReplaced.subscribe( (s: any) => this.onSessionsReplaced(s) );

    this.sessionPublishedSubscription = this.dataService.sessionPublished.subscribe( (s: any) => this.onSessionPublished(s) );

    this.contentReplacedSubscription = this.dataService.contentReplaced.subscribe( (i: any) => this.onContentReplaced(i) );

    this.contentPublishedSubscription = this.dataService.contentPublished.subscribe( (newContent: any) => this.onContentPublished(newContent) );

    this.searchReplacedSubscription = this.dataService.searchReplaced.subscribe( (s: Search[]) => this.onSearchReplaced(s) );

    this.searchPublishedSubscription = this.dataService.searchPublished.subscribe( (s: Search[]) => this.onSearchPublished(s) );

    this.sessionsPurgedSubscription = this.dataService.sessionsPurged.subscribe( (sessionsToPurge: number[]) => this.onSessionsPurged(sessionsToPurge) );

    this.scrollToBottomSubscription = this.toolService.scrollToBottom.subscribe( () => this.onScrollToBottom() );

    this.stopScrollToBottomSubscription = this.toolService.stopScrollToBottom.subscribe( () => this.onStopScrollToBottom() );

    this.layoutCompleteSubscription = this.toolService.layoutComplete.subscribe( () => this.onLayoutComplete() );

    this.openPDFViewerSubscription = this.toolService.openPDFViewer.subscribe( () => this.openPdfViewer() );

    this.openSessionViewerSubscription = this.toolService.openSessionViewer.subscribe( () => this.openSessionDetails() );

    this.collectionDeletedSubscription = this.dataService.collectionDeleted.subscribe( (collectionId: string) => this.onCollectionDeleted(collectionId) );

    if (this.toolService.loadCollectionOnRouteChange) {
      this.toolService.loadCollectionOnRouteChange = false;
      this.toolService.getCollectionDataAgain.next();
    }

  }



  onCollectionDeleted(collectionId: string): void {
    this.onNoCollection();
  }



  onSearchBarOpen(state: boolean): void {
    this.searchBarOpen = state;
  }



  onRouterEvent(val: any): void {
    // Take action to destroy masonry when we navigate away - saves us loads of time waiting for all the bricks to be removed and isotope to be destroyed
    // log.debug('MasonryGridComponent: routerEventSubscription: received val:', val);
    if (val instanceof NavigationStart) {
      log.debug('MasonryGridComponent: onRouterEvent(): manually destroying masonry');
      if (this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); }
    }
  }



  onPreferencesChanged(prefs: Preferences): void {
    // this.masonryKeys = prefs.masonryKeys;
    // log.debug('masonryKeys:', this.masonryKeys)
    this.preferences = prefs;
    this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();

    if (this.selectedCollectionServiceType) {
      if (this.selectedCollectionServiceType === 'nw') {
        this.masonryKeys = JSON.parse(JSON.stringify(this.preferences.nw.masonryKeys));
      }
      if (this.selectedCollectionServiceType === 'sa') {
        this.masonryKeys = JSON.parse(JSON.stringify(this.preferences.sa.masonryKeys));
      }
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    }

    if (this.masonryColumnSize !== prefs.masonryColumnSize) {
      log.debug('MasonryGridComponent: onPreferencesChanged(): Changing masonry column size to prefs.masonryColumnSize');
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
      log.debug('MasonryGridComponent: onPreferencesChanged(): calling layout');
      if (this.masonryComponentRef) { this.toolService.refreshMasonryLayout.next(); } // we don't execute the layout after changing masonry meta key preferences if we're changing the column size, so that layout is only triggered once
    }
  }



  onSearchTermsChanged($event: any): void {
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    this.searchTermsChanged($event);
  }


  onMaskChanged($event: ContentMask): void {
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    this.maskChanged($event);
  }


  onNoCollection(): void {
    log.debug('MasonryGridComponent: onNoCollection()');
    if (this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); }
    this.destroyView = true;
    this.sessionsDefined = false;
    this.resetContent();
    this.resetContentCount();
    this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
  }


  onSelectedCollectionChanged(collection: Collection): void {
    // this triggers when a user chooses a new collection
    log.debug('MasonryGridComponent: onSelectedCollectionChanged(): collection:', collection);
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

    if (!this.selectedCollectionServiceType) {
      if (collection.serviceType === 'nw') {
        this.masonryKeys = JSON.parse(JSON.stringify(this.preferences.nw.masonryKeys));
      }
      if (collection.serviceType === 'sa') {
        this.masonryKeys = JSON.parse(JSON.stringify(this.preferences.sa.masonryKeys));
      }
    }
    this.selectedCollectionServiceType = collection.serviceType; // 'nw' or 'sa'

    // this.loadAllBeforeLayout = false;
    /*if (collection.type === 'monitoring' || collection.type === 'rolling' ) { // || ( collection.type === 'fixed' && collection.state === 'building' )
      this.loadAllBeforeLayout = false;
    }
    else {
      this.loadAllBeforeLayout = true;
    }*/
  }



  onCollectionStateChanged(collection: any): void {
    // this triggers when a monitoring collection refreshes or when a fixed collection is 'building'
    log.debug('MasonryGridComponent: onCollectionStateChanged(): collection.state:', collection.state);
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

      // this.loadAllBeforeLayout = false;
      // this.destroyView = false;
      // this.changeDetectionRef.markForCheck();
      // this.changeDetectionRef.detectChanges();
    }
    if (collection.state === 'building' || collection.state === 'rolling' ) {
      // this.destroyView = false;
      // this.loadAllBeforeLayout = false;
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    }
  }



  onSessionsReplaced(s: any): void {
    // when a whole new sessions collection is received
    log.debug('MasonryGridComponent: onSessionsReplaced: sessions:', s);
    this.sessionsDefined = true;
    this.sessions = s;
    this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
  }


  onSessionPublished(s: any): void {
    // when an individual session is pushed from a building collection (or monitoring or rolling)
    log.debug('MasonryGridComponent: onSessionPublished(): session', s);
    let sessionId = s.id;
    this.sessionsDefined = true;
    this.sessions[sessionId] = s;
  }



  onContentReplaced(i: any) {
    // when a whole new content collection is received
    log.debug('MasonryGridComponent: onContentReplaced(): content:', i);
    if (i.length === 0 && this.masonryComponentRef) { this.masonryComponentRef.destroyMe(); } // we need this when we remove the only collection and it is biggish.  Prevents performance issues
    this.destroyView = true;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();

    i.sort(this.sortContent);
    this.content = i;
    this.search = [];
    this.countContent();
    if (this.content.length === 0) {
      this.loadAllBeforeLayout = false;
    }
    else {
      this.loadAllBeforeLayout = true;
    }
    this.destroyView = false;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();

    setTimeout( () => {
      // Sets keyboard focus
      if (this.content && this.sessionsDefined && this.masonryKeys && this.masonryColumnSize && !this.destroyView) {
        log.debug('MasonryGridComponent: onContentReplaced(): masonryRef', this.masonryRef);
        this.masonryRef.first.el.nativeElement.focus();
      }
    }, 50);
  }


  onContentPublished(newContent: any): void {
    // when a content object is pushed from a still-building fixed, rolling, or monitoring collection
    log.debug('MasonryGridComponent: onContentPublished(): content:', newContent);

    if (this.destroyView) {
      this.loadAllBeforeLayout = false;
      this.destroyView = false;
    }

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
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onSearchReplaced(s: Search[]): void {
    // this receives complete search term data from complete collection
    this.search = s;
    log.debug('MasonryGridComponent: onSearchReplaced(): search:', this.search);
    this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
  }



  onSearchPublished(s: Search[]): void {
    // this receives a partial search term data from a building collection
    log.debug('MasonryGridComponent: onSearchPublished(): searchTerm:', s);
    for (let i = 0; i < s.length; i++) {
      this.search.push(s[i]);
    }
    // log.debug("MasonryGridComponent: searchPublishedSubscription: this.search:", this.search);
    // if (this.searchBarOpen) { this.searchTermsChanged( { searchTerms: this.lastSearchTerm } ); } // we don't do this here because the content arrives after the search term
    this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
  }


  onSessionsPurged(sessionsToPurge: number[]): void {
    log.debug('MasonryGridComponent: onSessionsPurged(): sessionsToPurge:', sessionsToPurge);

    let searchRemoved = this.purgeSessions(sessionsToPurge);

    this.maskChanged(this.lastMask);
    this.countContent();
    if (searchRemoved > 0 && this.searchBarOpen) {
      this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
    }
    this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
    this.lastWindowHeight = $('masonry').height();
  }


  onScrollToBottom(): void {
    // runs autoScroller() when someone clicks the arrow button on the toolbar
    this.autoScrollStarted = true;
    this.autoScroller();
  }


  onStopScrollToBottom(): void {
    // stops the autoScroller with stopAutoScrollerAnimation() when someone clicks the stop button on the toolbar
    this.autoScrollStarted = false;
    this.stopAutoScrollerAnimation();
  }


  onLayoutComplete(): void {
    log.debug('MasonryGridComponent: onLayoutComplete()');
    // log.debug(`MasonryGridComponent: layoutCompleteSubscription: lastWindowHeight: ${this.lastWindowHeight}`)
    let windowHeight = $('masonry').height();
    // log.debug(`MasonryGridComponent: layoutCompleteSubscription: windowHeight: ${windowHeight}`)
    if (this.autoScrollStarted && windowHeight > this.lastWindowHeight ) { // this.selectedCollectionType === 'monitoring' &&
      this.autoScroller();
    }
    this.lastWindowHeight = windowHeight;
    // this.changeDetectionRef.markForCheck();
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
    this.zone.runOutsideAngular( () => $('.scrollTarget').velocity( 'scroll', { duration: this.scrollDuration(), container: $('.scrollContainer'), easing: 'linear', complete: () => {
      // This callback runs when the animation is complete
      // log.debug('MasonryGridComponent: autoScroller(): Animation complete');
      if (this.selectedCollectionType === 'fixed' && this.collectionState === 'complete') { this.stopAutoScroll(); }
    }}) );
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
