import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit, ChangeDetectionStrategy, NgZone, forwardRef, Renderer2 } from '@angular/core';
import { Router, ActivatedRoute, NavigationStart } from '@angular/router';
import { ToolService } from 'services/tool.service';
import { DataService } from 'services/data.service';
import { Content, Contents } from 'types/content';
import { ContentCount } from 'types/contentcount';
import { ModalService } from '../modal/modal.service';
import { IsotopeConfig } from '../isotope/isotope-config';
import { IsotopeAPI } from '../isotope/isotope-api';
import { ContentMask } from 'types/contentmask';
import { Search } from 'types/search';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Collection } from 'types/collection';
import { Preferences } from 'types/preferences';
import { License } from 'types/license';
import * as utils from '../utils';
import { Logger } from 'loglevel';
import { CollectionDeletedDetails } from 'types/collection-deleted-details';
import { AbstractGrid } from '../abstract-grid.class';
import { Session, Sessions } from 'types/session';
import { DodgyArchiveTypes } from 'types/dodgy-archive-types';
import { SessionsAvailable } from 'types/sessions-available';
import ResizeObserverPolyfill from '@juggle/resize-observer';
import 'imagesloaded';
declare var log: Logger;
declare var $: any;
declare var Scroller: any;


@Component({
  selector: 'masonry-grid-view',
  providers: [ { provide: AbstractGrid, useExisting: forwardRef(() => MasonryGridComponent ) } ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

<toolbar-widget [contentCount]="contentCount"></toolbar-widget>

<!-- left bar -->
<div class="masonry-left-bar" fxLayout="column" fxLayoutAlign="start center">

  <!-- control bar -->
  <control-bar-masonry fxFlexOffset="1.052631579em"></control-bar-masonry>

  <!-- pause / resume buttons for monitoring collections -->
  <div *ngIf="selectedCollectionType == 'monitoring'" fxFlexOffset="2em" style="color: white;">
    <i *ngIf="!pauseMonitoring" class="fa fa-pause-circle-o fa-4x" (click)="suspendMonitoring()"></i>
    <i *ngIf="pauseMonitoring" class="fa fa-play-circle-o fa-4x" (click)="resumeMonitoring()"></i>
  </div>

  <!-- content count -->
  <content-count-widget *ngIf="selectedCollectionType" [contentCount]="contentCount" style="margin-top: auto; margin-bottom: auto;"></content-count-widget>

</div>


<div class="masonryViewport" style="overflow: none;">

  <!-- overflow-y: auto; -->
  <div #scrollContainer tabindex="-1" class="scrollContainer noselect" style="position: relative; width: 100%; height: 100%; outline: 0; overflow: hidden; transform: translateZ(0);">

    <div isotope #isotopeContent *ngIf="isotopeConfig" tabindex="-1" class="grid" [config]="isotopeConfig" [filter]="filter" [addWithLayout]="addWithLayout" style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; outline: none; overflow-y: visible;">

      <ng-container *ngIf="content && hasSessions() && masonryKeys">

        <masonry-tile *ngFor="let item of content" isotope-brick class="brick" [collectionId]="collectionId" [attr.contentType]="item.contentType" [attr.contentSubType]="item.contentSubType ? item.contentSubType : null" [attr.fromArchive]="item.fromArchive" [content]="item" [attr.sessionId]="item.session" [sessionId]="item.session" [masonryKeys]="masonryKeys" [masonryColumnWidth]="masonryColumnWidth" [serviceType]="selectedCollectionServiceType" [attr.id]="item.id" [margin]="tileMargin" (click)="onTileClicked($event)" [displayTextArea]="showTextArea"></masonry-tile>

      </ng-container>

    </div>
  </div>
  <p-scrollPanel-custom [scrollbarMovedSubject]="scrollbarMoved" [scrollTopChangedSubject]="scrollTopChanged" [containerHeightChangedSubject]="containerHeightChanged" [contentHeightChangedSubject]="contentHeightChanged"></p-scrollPanel-custom>

</div>



<!-- modals -->
<tab-container-modal></tab-container-modal>
<splash-screen-modal></splash-screen-modal>
<preferences-modal></preferences-modal>
<manage-users-modal></manage-users-modal>
<collection-deleted-notify-modal [user]="collectionDeletedUser"></collection-deleted-notify-modal>
<content-details-modal *ngIf="selectedCollectionServiceType" [session]="selectedSession" [content]="selectedContent" [serviceType]="selectedCollectionServiceType" [collectionId]="collectionId" [sessionsAvailable]="sessionsAvailable"></content-details-modal>
<ng-container *ngIf="preferences && preferences.serviceTypes">
  <nw-collection-modal *ngIf="preferences.serviceTypes.nw"></nw-collection-modal>
  <sa-collection-modal *ngIf="preferences.serviceTypes.sa"></sa-collection-modal>
</ng-container>
<license-expired-modal></license-expired-modal>
`,

  styles: [`

    isotope {
      outline-width: 0;
    }

  `]
})

export class MasonryGridComponent implements AbstractGrid, OnInit, AfterViewInit, OnDestroy {

  constructor(  private dataService: DataService,
                private toolService: ToolService,
                private elRef: ElementRef,
                private modalService: ModalService,
                private changeDetectionRef: ChangeDetectorRef,
                private router: Router,
                private route: ActivatedRoute,
                private zone: NgZone,
                private renderer: Renderer2 ) {}

  @ViewChild('scrollContainer', { static: true }) private scrollContainerRef: ElementRef;
  @ViewChild('isotopeContent', { static: false }) private isotopeContentRef: ElementRef;


  // high-level session, content, and search data pushed from server
  private search: Search[] = []; // 'search' is an array containing text extracted from PDF's which can be searched
  public content: Content[] = [];
  public contentObj: Contents = {}; // contains every item of content, indexed by its content id
  public sessions: Sessions = {};
  public contentCount = new ContentCount; // { images: number, pdfs: number, word: number, excel: number, powerpoint: number, dodgyArchives: number, hashes: number, total: number }

  // preferences
  public preferences: Preferences;
  public masonryKeys: any = null;

  // collection information
  public selectedCollectionType: string = null;
  public selectedCollectionServiceType: string = null; // 'nw' or 'sa'
  public collectionId: string = null;
  public collectionDeletedUser = '';
  private collectionState = '';

  // masonry and isotope
  public masonryColumnWidth = this.toolService.getPreference('masonryColumnWidth') || 350; // default is 350
  public tileMarginEms = 1;  // set the margin for tiles here in ems.  Its px value will be calculated later, and upon window resize
  public tileMargin = utils.convertEmRelativeToElement(this.tileMarginEms, document.body);
  public isotopeConfig = new IsotopeConfig({
    itemSelector: '.brick',
    resize: false, // we handle this ourselves to prevent change detection on resize
    masonry: {
      columnWidth: this.masonryColumnWidth + this.tileMargin * 2,
      gutter: 0,
      horizontalOrder: false, // setting to true will cause column lengths to get out of whack
      fitWidth: false
    },
    containerStyle: null
  });
  private isotopeApi: IsotopeAPI;
  private isotopeInitialized = false;
  public addWithLayoutSetting = false; // isotope will not auto-layout when bricks are added if false
  public addWithLayout = false; // isotope will not auto-layout when bricks are added if false
  private imgsLoaded: ImagesLoaded.ImagesLoaded = null;
  private initialLayoutInProgress = false; // helps address a race condition where onContentPublished() and/or onSessionsPurged() step on the first layout operation of onContentReplaced, and causes tons of unnecessary layout operations.  Prevents addWithLayout from being set to true until that first layout operation is complete.
  private publishedContentQueueing = false; // instructs onLayoutComplete() to perform an additional operation after the initialLayout operation has completed, and also to switch the layout mode to addWithLayout = true

  // search and filtering
  public filter = '*';
  private caseSensitiveSearch = false;
  private lastSearchTerm = '';
  private pauseMonitoring = false;
  private lastMask = new ContentMask;
  private searchBarOpen = false;

  // scrolling
  private pixelsPerSecond = this.toolService.getPreference('autoScrollSpeed') || 200; // the scroll speed.  the default is 200 pixels per second
  private autoScrollStarted = false; // the state of the autoscroll control button.  From the user perspective, is the process running?
  private autoScrollAnimationRunning = false; // is the scroll animation actually running?  It may be paused programatically from time to time to do things like purging
  private autoScrollAnimationPaused = false; // if true, when onLayoutComplete() runs, it will cause the autoscroller to unpause if it was previously running.  always combined with stopScrollerAnimation()
  private _scrollContainerHeight: number; // how tall the scroll container is
  set scrollContainerHeight(scrollContainerHeight) {
    this._scrollContainerHeight = scrollContainerHeight;
    this.containerHeightChanged.next(scrollContainerHeight);
  }
  get scrollContainerHeight() {
    return this._scrollContainerHeight;
  }
  private _scrollContentHeight = 0; // the total height of the content (not just what is viewable)
  set scrollContentHeight(scrollContentHeight) {
    this._scrollContentHeight = scrollContentHeight;
    this.contentHeightChanged.next(scrollContentHeight);
  }
  get scrollContentHeight() {
    return this._scrollContentHeight;
  }
  public toolbarHeight = 0; // not really being used right now but maybe will be some day
  private autoScrollRestartTimeout: any; // handle for timer
  private scrollerOptions = {
    scrollingX: false,
    scrollingY: true,
    animating: true,
    animationDuration: 0,
    bouncing: false,
    locking: false,
    paging: false,
    snapping: false,
    zooming: false,
    easing: false
  };
  private scroller: any;
  public _scrollTop = 0;
  set scrollTop(scrollTop) {
    this._scrollTop = scrollTop;
    this.scrollTopChanged.next(scrollTop);
  }
  get scrollTop() {
    return this._scrollTop;
  }
  private resizeObserver: any;
  private resizeId: any;
  private lineHeight: number; // we store the height of a single line relative to the container so we can use it when user hits up/down arrows
  public scrollbarMoved = new Subject<number>();
  public scrollTopChanged = new Subject<number>();
  public containerHeightChanged = new Subject<number>();
  public contentHeightChanged = new Subject<number>();
  private unpauseAfterResize = false;
  private unpauseAfterResizeTimeout;

  // session viewer
  public selectedSession: Session;
  public selectedContent: Content;
  private selectedContentId: string = null;
  public sessionsAvailable: SessionsAvailable = { previous: false, next: false };
  public mouseButtonDown = false;

  // license
  public license: License;
  private licenseChangedFunction = this.onLicenseChangedInitial;

  // Text Area
  public showTextArea = true;

  // Subscription holders
  private subscriptions = new Subscription;



  ngOnDestroy(): void {
    log.debug('MasonryGridComponent: ngOnDestroy()');
    if (this.resizeId) {
      clearTimeout(this.resizeId);
    }
    window.removeEventListener('resize', this.onWindowResize );
    if (this.unpauseAfterResizeTimeout) {
      clearTimeout(this.unpauseAfterResizeTimeout);
    }

    this.subscriptions.unsubscribe();
    this.scrollContainerRef.nativeElement.removeEventListener('wheel', this.onMouseWheel);
    if (this.autoScrollAnimationRunning) {
      this.stopScrollerAnimation();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    document.removeEventListener('keydown', this.onKeyPressed );
    this.toolService.addNwAdhocCollectionNext.next({});
    this.toolService.addSaAdhocCollectionNext.next({});
  }



  ngOnInit(): void {
    log.debug('MasonryGridComponent: ngOnInit()');

    this.toolService.lastRoute = 'masonryGrid';
    this.toolService.setPreference('lastRoute', 'masonryGrid');

    // New startup code
    log.debug('MasonryGridComponent: ngOnInit(): toolService.urlParametersLoaded:', this.toolService.urlParametersLoaded);
    log.debug('MasonryGridComponent: ngOnInit(): toolService.queryParams:', this.toolService.queryParams);

    this.subscriptions.add(this.dataService.licensingChanged.subscribe( license =>  this.licenseChangedFunction(license) ));

    this.subscriptions.add(this.toolService.onSplashScreenAtStartupClosed.subscribe( () => {
      if (!this.license.valid) {
        this.modalService.open(this.toolService.licenseExpiredModalId);
      }
      else if (!this.toolService.urlParametersLoaded) {
        // only show the collections tab container if the user hasn't passed in custom url params, like when drilling from an investigation
        this.modalService.open(this.toolService.tabContainerModalId);
      }
    }));

    if (this.toolService.urlParametersLoaded) {
      // if we have query parameters, load the appropriate ad hoc modal
      this.toolService.splashLoaded = true; // we don't want the splash to load if the user navigates to a different view
      if (this.toolService.queryParams['service'] === 'nw') {
        this.toolService.addNwAdhocCollectionNext.next(this.toolService.queryParams);
      }
      else if (this.toolService.queryParams['service'] === 'sa') {
        this.toolService.addSaAdhocCollectionNext.next(this.toolService.queryParams);
      }
      this.toolService.queryParams = null;
      this.toolService.urlParametersLoaded = false;
    }
    // End new startup code


    // Take subscriptions

    this.subscriptions.add(this.router.events.subscribe( (val: any) => this.onRouterEvent(val)));

    this.subscriptions.add(this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) ));

    this.subscriptions.add(this.dataService.collectionDeleted.subscribe( (details: CollectionDeletedDetails) => this.onCollectionDeleted(details) ));

    this.subscriptions.add(this.dataService.selectedCollectionChanged.subscribe( (collection: Collection) => this.onSelectedCollectionChanged(collection) ));

    this.subscriptions.add(this.dataService.collectionStateChanged.subscribe( (collection: any) => this.onCollectionStateChanged(collection) ));

    this.subscriptions.add(this.dataService.sessionsReplaced.subscribe( (s: any) => this.onSessionsReplaced(s) ));

    this.subscriptions.add(this.dataService.sessionPublished.subscribe( (s: any) => this.onSessionPublished(s) ));

    this.subscriptions.add(this.dataService.contentReplaced.subscribe( (i: any) => this.onContentReplaced(i) ));

    this.subscriptions.add(this.dataService.contentPublished.subscribe( (newContent: any) => this.onContentPublished(newContent) ));

    this.subscriptions.add(this.dataService.searchReplaced.subscribe( (s: Search[]) => this.onSearchReplaced(s) ));

    this.subscriptions.add(this.dataService.searchPublished.subscribe( (s: Search[]) => this.onSearchPublished(s) ));

    this.subscriptions.add(this.dataService.sessionsPurged.subscribe( (sessionsToPurge: number[]) => this.onSessionsPurged(sessionsToPurge) ));

    this.subscriptions.add(this.toolService.scrollToBottom.subscribe( () => this.onScrollToBottomClicked() ));

    this.subscriptions.add(this.toolService.stopScrollToBottom.subscribe( () => this.onStopScrollToBottomClicked() ));

    this.subscriptions.add(this.isotopeConfig.layoutComplete.subscribe( (height) => this.onLayoutComplete(height) ));

    this.subscriptions.add(this.toolService.masonryColumnWidthChanged.subscribe( (width: number) => this.onMasonryColumnWidthChanged(width) ));

    this.subscriptions.add(this.toolService.masonryAutoscrollSpeedChanged.subscribe( (autoScrollSpeed: number) => this.onAutoscrollSpeedChanged(autoScrollSpeed) ));

    this.subscriptions.add(this.dataService.monitoringCollectionPause.subscribe( (paused) => {
      this.pauseMonitoring = paused;
      this.changeDetectionRef.detectChanges();
    } ));

    this.subscriptions.add(this.toolService.showMasonryTextArea.subscribe( shown => this.onTextAreaToggled(shown) ));

    this.subscriptions.add(this.isotopeConfig.api.subscribe( api => this.isotopeApi = api ));

    this.subscriptions.add(this.isotopeConfig.initialized.subscribe(initialized => this.isotopeInitialized = initialized));

    this.subscriptions.add(this.scrollbarMoved.subscribe( scrollTop => this.onScrollbarMoved(scrollTop)));

  }



  ngAfterViewInit() {
    // https://localhost?op=adhoc&service=nw&ip=184.105.132.210&side=dst

    this.zone.runOutsideAngular( () => window.addEventListener('resize', this.onWindowResize ) );

    let toolbar: any = document.getElementsByClassName('afb-toolbar')[0];
    this.toolbarHeight = toolbar.offsetHeight;
    // console.log('toolbarHeight:', this.toolbarHeight);
    // this.changeDetectionRef.detectChanges();

    if ( !this.toolService.splashLoaded && !this.toolService.urlParametersLoaded ) {
        // only load the splash screen if we don't have ad hoc query parameters
        log.debug('MasonryGridComponent: ngAfterViewInit(): loading the splash screen');
        this.modalService.open(this.toolService.splashScreenModalId);
    }
    else if (this.toolService.splashLoaded && !this.toolService.selectedCollection) {
      // open the tab container on subsequent logout/login combos, if a collection wasn't previously selected
      if (!this.license.valid) {
        this.modalService.open(this.toolService.licenseExpiredModalId);
      }
      else if (this.toolService.urlParametersLoaded) {
        this.modalService.open(this.toolService.tabContainerModalId);
      }
    }
    else {
      log.debug('MasonryGridComponent: ngAfterViewInit(): not loading the splash screen - this should mean that we\'re just witching views or we\'re in ad hoc mode');
    }

    window.dispatchEvent(new Event('resize'));

    log.debug('MasonryGridComponent: ngAfterViewInit(): creating scroller');
    this.scroller = new Scroller( this.render, this.scrollerOptions );
    this.scroller.setDimensions(this.scrollContainerRef.nativeElement.clientWidth, this.scrollContainerRef.nativeElement.clientHeight, this.isotopeContentRef.nativeElement.offsetWidth, this.scrollContentHeight);
    // log.debug('MasonryGridComponent: ngAfterViewInit(): scroller:', this.scroller);
    this.isotopeContentRef.nativeElement.style['transform-origin'] = 'left-top';
    this.scrollContainerRef.nativeElement.addEventListener('wheel', this.onMouseWheel, { passive: true });

    log.debug('MasonryGridComponent: ngAfterViewInit(): creating ResizeObserver');
    const ResizeObserver: any = (<any>window).ResizeObserver || ResizeObserverPolyfill;
    this.resizeObserver = new ResizeObserver( entries => this.onContentHeightChanged(entries) );
    log.debug('MasonryGridComponent: ngAfterViewInit(): now observing');
    this.zone.runOutsideAngular( () => this.resizeObserver.observe(this.isotopeContentRef.nativeElement) );
    log.debug('MasonryGridComponent: ngAfterViewInit(): observation in progress');


    if (this.toolService.loadCollectionOnRouteChange) {
      log.debug('MasonryGridComponent: ngAfterViewInit(): getting collection data again on toolService.loadCollectionOnRouteChange');
      this.toolService.loadCollectionOnRouteChange = false;
      this.toolService.getCollectionDataAgain.next();
    }

    this.lineHeight = utils.convertEmRelativeToElement(1, this.scrollContainerRef.nativeElement);

    this.zone.runOutsideAngular( () => document.addEventListener('keydown', this.onKeyPressed ));

    log.debug('MasonryGridComponent: ngAfterViewInit(): finished ngAfterViewInit()');

  }



  onLicenseChangedInitial(license: License) {
    // check license validity on first startup
    log.debug('MasonryGridComponent: onLicenseChangedInitial(): license:', license);
    if (!license) {
      return;
    }
    this.license = license;
    this.licenseChangedFunction = this.onLicenseChangedSubsequent; // change the callback after first load
  }



  onLicenseChangedSubsequent(license: License) {
    // check license validity after the first load
    log.debug('MasonryGridComponent: onLicenseChangedSubsequent(): license:', license);
    this.license = license;
    if (!this.license.valid) {
      this.modalService.closeAll();
      if (this.selectedCollectionType !== 'fixed' ||  (this.selectedCollectionType === 'fixed' && !['complete', 'building'].includes(this.collectionState)) ) {
        this.dataService.noopCollection.next(); // this will clear out the toolbar and all selected collection data
        this.noopCollection();
      }
      this.modalService.open(this.toolService.licenseExpiredModalId);
    }
  }



  onNextSessionClicked(): void {
    log.debug('MasonryGridComponent: onNextSessionClicked()');
    // build a list of un-filtered tiles
    let displayedTileIds = $('masonry-tile:visible').map(function(){ return $(this).attr('id'); } ).get();
    log.debug('MasonryGridComponent: onNextSessionClicked(): displayedTileIds:', displayedTileIds);

    let nextContentItem: Content = null;
    let nextContentItemId = null;
    let nextSessionId = null;

    for (let i = 0; i < displayedTileIds.length; i++) {
      if (displayedTileIds[i] === this.selectedContentId && i < displayedTileIds.length - 1 ) {
        nextContentItemId = displayedTileIds[i + 1];
        log.debug('MasonryGridComponent: onNextSessionClicked(): nextContentItemId:', nextContentItemId);
        break;
      }
    }

    for (let i = 0; i < this.content.length; i++) {
      let contentItem = this.content[i];
      if (contentItem.id === nextContentItemId) {
        nextContentItem = contentItem;
        nextSessionId = contentItem.session;
        break;
      }
    }

    log.debug('MasonryGridComponent: onNextSessionClicked(): nextContentItem:', nextContentItem);
    log.debug('MasonryGridComponent: onNextSessionClicked(): nextSessionId:', nextSessionId);

    this.selectedSession = this.sessions[nextSessionId];
    this.selectedContent = nextContentItem;
    this.selectedContentId = nextContentItem.id;
    this.updateNextPreviousButtonStatus();
    this.changeDetectionRef.detectChanges();

  }



  onPreviousSessionClicked(): void {
    log.debug('MasonryGridComponent: onPreviousSessionClicked()');
    // build a list of un-filtered tiles
    let displayedTileIds = $('masonry-tile:visible').map(function(){ return $(this).attr('id'); } ).get();
    log.debug('MasonryGridComponent: onPreviousSessionClicked(): displayedTileIds:', displayedTileIds);
    let previousContentItem: Content = null;
    let previousContentItemId = null;
    let previousSessionId = null;

    for (let i = 0; i < displayedTileIds.length; i++) {
      if (displayedTileIds[i] === this.selectedContentId && i <= displayedTileIds.length - 1 ) {
        previousContentItemId = displayedTileIds[i - 1];
        log.debug('MasonryGridComponent: onPreviousSessionClicked(): previousContentItemId:', previousContentItemId);
        break;
      }
    }

    for (let i = 0; i < this.content.length; i++) {
      let contentItem = this.content[i];
      if (contentItem.id === previousContentItemId) {
        previousContentItem = contentItem;
        previousSessionId = contentItem.session;
        break;
      }
    }

    log.debug('MasonryGridComponent: onPreviousSessionClicked(): previousContentItem:', previousContentItem);
    log.debug('MasonryGridComponent: onPreviousSessionClicked(): previousSessionId:', previousSessionId);

    this.selectedSession = this.sessions[previousSessionId];
    this.selectedContent = previousContentItem;
    this.selectedContentId = previousContentItem.id;
    this.updateNextPreviousButtonStatus();
    this.changeDetectionRef.detectChanges();
  }



  updateNextPreviousButtonStatus(): void {
    // build a list of un-filtered tile id's
    let displayedTileIds = $('masonry-tile:visible').map(function(){return $(this).attr('id'); } ).get();
    // log.debug('MasonryGridComponent: updateNextPreviousButtonStatus(): displayedTileIds:', displayedTileIds);
    // log.debug('MasonryGridComponent: updateNextPreviousButtonStatus(): selectedContentId:', this.selectedContentId);

    for (let i = 0; i < displayedTileIds.length; i++) {

      if (displayedTileIds[i] === this.selectedContentId) {

        if (displayedTileIds.length - 1 === i) {
          // this is the last displayed item.  disable the next item button
          this.sessionsAvailable.next = false;
        }
        else {
          this.sessionsAvailable.next = true;
        }

        if (i === 0) {
          // this is the first displayed item.  disable the previous item button
          this.sessionsAvailable.previous = false;
        }
        else {
          // this is not the first displayed item.  enable the previous item button
          this.sessionsAvailable.previous = true;
        }

        this.sessionsAvailable = utils.deepCopy(this.sessionsAvailable);
        log.debug('MasonryGridComponent: updateNextPreviousButtonStatus(): previousSessionAvailable:', this.sessionsAvailable.previous);
        log.debug('MasonryGridComponent: updateNextPreviousButtonStatus(): nextSessionAvailable:', this.sessionsAvailable.next);
        break;
      }
    }

  }



  onWindowResize = (event) => {
    log.debug('MasonryGridComponent: onWindowResize()');

    if (this.autoScrollStarted) {
      this.pauseScrollerAnimation();
      this.unpauseAfterResize = true;
    }

    if (this.resizeId) {
      clearTimeout(this.resizeId);
    }

    this.resizeId = this.zone.runOutsideAngular( () => setTimeout( () => {
      this.scrollContainerHeight = this.scrollContainerRef.nativeElement.clientHeight;
      log.debug('MasonryGridComponent: onWindowResize(): scrollContainerHeight:', this.scrollContainerHeight);

      this.scroller.setDimensions(this.scrollContainerRef.nativeElement.clientWidth, this.scrollContainerRef.nativeElement.clientHeight, this.isotopeContentRef.nativeElement.offsetWidth, this.scrollContentHeight);

      this.tileMargin = utils.convertEmRelativeToElement(this.tileMarginEms, document.body);
      this.isotopeConfig.masonry.columnWidth = this.masonryColumnWidth + this.tileMargin * 2;

      this.changeDetectionRef.detectChanges(); // needed to refresh the tiles prior to layout

      if (this.isotopeInitialized) {
        this.isotopeApi.layout(true);
      }

      if (this.scrollTop > this.scrollContentHeight - this.scrollContainerHeight && this.scrollContentHeight > this.scrollContainerHeight) {
        // keep scrollTop in bounds
        this.render(0, this.scrollContentHeight - this.scrollContainerHeight, 1);
      }

      this.resizeId = null;
    }, 500 ) );

  }



  onSearchBarOpen(state: boolean): void {
    this.searchBarOpen = state;
  }



  onRouterEvent(val: any): void {
    // Take action to destroy masonry when we navigate away - saves us loads of time waiting for all the bricks to be removed and isotope to be destroyed
    // log.debug('MasonryGridComponent: onRouterEvent(): received val:', val);
    if (val instanceof NavigationStart) {
      log.debug('MasonryGridComponent: onRouterEvent(): manually destroying isotope');
      if (this.isotopeInitialized) {
        this.isotopeApi.destroyMe();
      }
    }
  }



  onPreferencesChanged(prefs: Preferences): void {

    log.debug('MasonryGridComponent: onPreferencesChanged()');

    let callLayout = false;

    if (this.selectedCollectionServiceType) {
      // we need to trigger a layout when we change masonry meta keys in preferences

      if (this.selectedCollectionServiceType === 'nw') {

        if ( this.isotopeInitialized && JSON.stringify(prefs.nw.masonryKeys) !== JSON.stringify(this.preferences.nw.masonryKeys) ) {
          log.debug('MasonryGridComponent: onPreferencesChanged(): NW Masonry keys have changed.  Calling Isotope layout');
          callLayout = true;
        }

        this.masonryKeys = prefs.nw.masonryKeys.slice(0);
      }

      if (this.selectedCollectionServiceType === 'sa') {

        if ( this.isotopeInitialized && JSON.stringify(prefs.sa.masonryKeys) !== JSON.stringify(this.preferences.sa.masonryKeys) ) {
          log.debug('MasonryGridComponent: onPreferencesChanged(): SA Masonry keys have changed.  Calling Isotope layout');
          callLayout = true;
        }

        this.masonryKeys = prefs.sa.masonryKeys.slice(0);
      }

    }
    this.changeDetectionRef.detectChanges(); // we need this to be before layout()

    if (callLayout) {
      this.isotopeApi.layout();
    }

    this.preferences = utils.deepCopy(prefs);
  }



  onMasonryColumnWidthChanged(width: number): void {
    if (this.masonryColumnWidth !== width) {
      log.debug('MasonryGridComponent: onMasonryColumnWidthChanged(): Changing masonry column size to', width);
      this.masonryColumnWidth = width;
      // detectChanges() as we need the tiles to update their width prior to layout being called
      this.changeDetectionRef.detectChanges();

      // deep copy so that the reference is changed and can thus be detected
      let newIsotopeConfig = this.isotopeConfig.copy();
      newIsotopeConfig.masonry.columnWidth = this.masonryColumnWidth + this.tileMargin * 2;
      this.isotopeConfig = newIsotopeConfig;

      this.changeDetectionRef.detectChanges();
    }
  }



  onAutoscrollSpeedChanged(autoScrollSpeed: number): void {
    if (this.pixelsPerSecond !== autoScrollSpeed) {
      log.debug('MasonryGridComponent: onAutoscrollSpeedChanged(): Setting autoscroller speed to', autoScrollSpeed);
      this.pixelsPerSecond = autoScrollSpeed;
      if (this.autoScrollStarted) {
        this.restartAutoScroll();
      }
    }
  }



  onSearchTermsTyped(event: any): void {
    // called directly from toolbar
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    this.searchTermsChanged(event);
  }



  onMaskChanged(event: ContentMask): void {
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    this.maskChanged(event);
  }



  onSelectedCollectionChanged(collection: Collection): void {
    // this triggers when a user chooses a new collection
    log.debug('MasonryGridComponent: onSelectedCollectionChanged(): collection:', collection);
    if (this.isotopeInitialized) {
      this.isotopeApi.destroyMe();
    }
    this.search = [];
    this.sessions = {};
    this.content = [];
    this.contentObj = {};
    this.resetContentCount();
    this.stopAutoScroll();
    this.scrollContentHeight = 0;
    this.resetScroll();
    this.selectedCollectionType = collection.type;
    this.pauseMonitoring = false;
    this.collectionState = collection.state;
    if (collection.type === 'monitoring') {
      this.collectionId = collection.id + '_' + this.dataService.clientSessionId;
    }
    else {
      this.collectionId = collection.id;
    }
    this.masonryKeys = this.preferences[collection.serviceType].masonryKeys.slice(0);
    this.selectedCollectionServiceType = collection.serviceType; // 'nw' or 'sa'
    this.changeDetectionRef.detectChanges();
    this.isotopeApi.initializeMe();
  }



  onSessionsReplaced(sessions: Sessions): void {
    // when a whole new sessions collection is received
    log.debug('MasonryGridComponent: onSessionsReplaced: sessions:', sessions);
    this.sessions = sessions;
  }



  onContentReplaced(content: Content[]) {
    // when a whole new content collection is received
    log.debug('MasonryGridComponent: onContentReplaced(): content:', content);
    this.addWithLayout = this.addWithLayoutSetting;
    content.sort(this.sortContent);
    this.content = content;
    this.content.forEach( (item: Content) => {
      let contentId = item.id;
      this.contentObj[contentId] = item;
    });
    if (this.content.length !== 0) {
      this.initialLayoutInProgress = true; // if we receive new published content during the initial layout operation, we need to queue it until we've finished that layout, or else we'll get a ton of layout operations
    }
    this.countContent();
    this.changeDetectionRef.detectChanges();
    // this.scrollContainerHeight = this.scrollContainerRef.nativeElement.clientHeight;
    this.scrollContentHeight = 0;
    if (this.autoScrollStarted) { // for when a collection restarts after changing query.delay.minutes in prefs
      this.restartAutoScroll();
    }
    this.zone.runOutsideAngular( () => {
      if (!this.addWithLayout) {
        this.imgsLoaded = imagesLoaded(this.isotopeContentRef.nativeElement);
        this.imgsLoaded.on('always', this.onImagesLoadedComplete);
      }
    });
  }



  onImagesLoadedComplete = () => {
    // this only gets used if this.addWithLayout if false, and that is just experimental and doesn't really work properly
    log.debug('MasonryGridComponent: onImagesLoadedComplete()');
    this.imgsLoaded.off('always', this.onImagesLoadedComplete);
    this.imgsLoaded = null;
    this.isotopeApi.layout();
    this.isotopeApi.reloadItems();
    this.isotopeApi.unhideAll();
  }



  onSearchReplaced(search: Search[]): void {
    // this receives complete search term data from complete collection
    log.debug('MasonryGridComponent: onSearchReplaced(): search:', search);
    this.search = search;
  }



  onSessionPublished(session: Session): void {
    // when an individual session is pushed from a building collection (or monitoring or rolling)
    log.debug('MasonryGridComponent: onSessionPublished(): session:', session);
    let sessionId = session.id;
    this.sessions[sessionId] = session;
  }



  onContentPublished(newContent: Content[]): void {
    // when a content object is pushed from a still-building fixed, rolling, or monitoring collection
    log.debug('MasonryGridComponent: onContentPublished(): content:', newContent);

    if (this.initialLayoutInProgress) {
      this.publishedContentQueueing = true;
    }
    else if (!this.addWithLayout) {
      this.addWithLayout = true;
    }

    newContent.forEach(content => {
      this.content.push(content);
      let contentId = content.id;
      this.contentObj[contentId] = content;
    });

    // update content counts here to save cycles not calculating image masks
    this.countContent(newContent);

    if (this.searchBarOpen) { this.searchTermsChanged( { searchTerms: this.lastSearchTerm } ); }
    this.changeDetectionRef.detectChanges();
  }



  onSearchPublished(search: Search[]): void {
    // this receives a partial search term data from a building collection
    log.debug('MasonryGridComponent: onSearchPublished(): searchTerm:', search);
    search.forEach( item => {
      this.search.push(item);
    });
    // log.debug("MasonryGridComponent: searchPublishedSubscription: this.search:", this.search);
    // if (this.searchBarOpen) { this.searchTermsChanged( { searchTerms: this.lastSearchTerm } ); } // we don't do this here because the content arrives after the search term
  }



  onCollectionStateChanged(state: string): void {
    // this triggers when a monitoring collection refreshes or when a fixed collection is 'building' or when it completes
    // we only really care about monitoring collections
    log.debug('MasonryGridComponent: onCollectionStateChanged(): state:', state);
    this.collectionState = state;

    if (state === 'monitoring')  {
      if (this.isotopeInitialized) {
        this.isotopeApi.destroyMe();
      }
      this.search = [];
      this.sessions = {};
      this.content = [];
      this.contentObj = {};
      this.resetContentCount();
      this.pauseScrollerAnimation();
      this.scrollContentHeight = 0;
      this.resetScroll();
      this.changeDetectionRef.detectChanges();
      this.isotopeApi.initializeMe();
      if (this.autoScrollStarted) {
        this.restartAutoScroll();
      }
    }
  }



  noopCollection() {
    log.debug('MasonryGridComponent: noopCollection()');
    if (this.isotopeInitialized) {
      this.isotopeApi.destroyMe();
    }
    this.search = [];
    this.sessions = {};
    this.content = [];
    this.contentObj = {};
    this.resetContentCount();
    this.stopAutoScroll();
    this.selectedCollectionType = null;
    this.collectionState = '';
    this.collectionId = null;
    this.selectedCollectionServiceType = null;
    this.masonryKeys = null;
    this.changeDetectionRef.detectChanges();
  }



  onCollectionDeleted(details: CollectionDeletedDetails): void {
    log.debug('MasonryGridComponent: onCollectionDeleted()');
    if (!this.collectionId || (this.collectionId && !this.collectionId.startsWith(details.id))) {
      // this doesn't apply to the current collection
      return;
    }
    this.collectionDeletedUser = details.user;
    this.dataService.noopCollection.next();
    this.noopCollection();
    this.modalService.open(this.toolService.collectionDeletedModalId);
  }



  onSessionsPurged(sessionsToPurge: number[]): void {
    log.debug('MasonryGridComponent: onSessionsPurged(): sessionsToPurge:', sessionsToPurge);

    if (this.initialLayoutInProgress) {
      this.publishedContentQueueing = true;
    }

    if (this.autoScrollStarted) {
      this.pauseScrollerAnimation();
    }
    let searchRemoved = this.purgeSessions(sessionsToPurge);

    this.maskChanged(this.lastMask);
    this.countContent();
    if (searchRemoved > 0 && this.searchBarOpen) {
      this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
    }
    this.changeDetectionRef.detectChanges();
  }



  onMouseWheel = (wheelEvent) => {
    // log.debug('MasonryGridComponent: wheelEvent:', wheelEvent);

    if (wheelEvent && wheelEvent.deltaY === 0) {
      // only do anything if we're scrolling vertically
      return;
    }

    if (this.autoScrollStarted) {
      log.debug('MasonryGridComponent: onMouseWheel(): autoscroll is running, so stopping it now');
      this.stopAutoScroll();
    }


    let targetY = this.scrollTop + wheelEvent.deltaY;
    // log.debug('MasonryGridComponent: wheelEvent: scrollContentHeight:', this.scrollContentHeight);
    // log.debug('MasonryGridComponent: wheelEvent: targetY:', targetY);
    if (targetY < 0 || targetY > this.scrollContentHeight - this.scrollContainerHeight) {
      return;
    }
    // scroll the container
    this.render(0, targetY, 1);
  }







  ////////////////// SCROLLING //////////////////


  onScrollToBottomClicked(): void {
    // runs autoScroller() when someone clicks the arrow button on the toolbar
    this.autoScrollStarted = true;
    this.scrollContainerRef.nativeElement.addEventListener('wheel', this.onMouseWheel, { passive: true });
    this.startScrollerAnimation();
  }



  startScrollerAnimation(): void {
    if (this.autoScrollAnimationRunning) {
      log.debug('MasonryGridComponent: startScrollerAnimation(): scroll animation is already in progress.  Returning');
      // is animation actually running?
      return;
    }

    log.debug('MasonryGridComponent: startScrollerAnimation(): scroll animation isn\'t running right now');
    // log.debug('MasonryGridComponent: startScrollerAnimation(): scrollContentHeight:', this.scrollContentHeight);

    let distanceToScroll = Math.round(this.scrollContentHeight) - this.scrollContainerHeight - this.scrollTop; // distance is how far the container needs to scroll in order to hit the end of the content
    log.debug('MasonryGridComponent: startScrollerAnimation(): distanceToScroll:', distanceToScroll);

    let duration = (distanceToScroll / this.pixelsPerSecond) * 1000;
    log.debug('MasonryGridComponent: startScrollerAnimation(): duration:', duration);

    if (distanceToScroll <= 1) {
      log.debug('MasonryGridComponent: startScrollerAnimation(): scrollbar is at the end.  Not running scroll animation this time');
      if (this.selectedCollectionType === 'fixed') {
        log.debug('MasonryGridComponent: startScrollerAnimation(): this is a fixed collection.  Fully stopping autoscroller');
        this.toolService.scrollToBottomStopped.next();
        this.autoScrollStarted = false;
      }
      return;
    }

    log.debug('MasonryGridComponent: startScrollerAnimation(): Starting scroller animation');

    log.debug('autoScrollAnimationRunning = true');
    this.autoScrollAnimationRunning = true;

    this.scroller.options.animationDuration = duration;
    this.scroller.setScrollTop(this.scrollTop);
    this.scroller.setDimensions(this.scrollContainerRef.nativeElement.clientWidth, this.scrollContainerRef.nativeElement.clientHeight, this.isotopeContentRef.nativeElement.offsetWidth, this.scrollContentHeight);
    this.zone.runOutsideAngular( () => {
      this.scroller.scrollBy(0, distanceToScroll, true, true, () => this.onAutoScrollAnimationComplete());
    });

  }



  private render = (left, top, zoom) => {
    // console.log(`render: left: ${left} top: ${top} zoom: ${zoom}`);
    this.scrollTop = top;
    this.isotopeContentRef.nativeElement.style['transform'] = 'translate3d(' + (-left) + 'px,' + (-top) + 'px,0) scale(' + zoom + ')';
    return;
  }



  private resetScroll() {
    this.render(0, 0, 1);
  }



  onAutoScrollAnimationComplete(): void {
    // This callback runs when the animation is complete
    log.debug('MasonryGridComponent: onAutoScrollAnimationComplete()');

    if (!this.autoScrollStarted) {
      return;
    }

    log.debug('autoScrollAnimationRunning = false');
    this.autoScrollAnimationRunning = false;

    let distanceToScroll = this.scrollContentHeight - this.scrollContainerHeight - this.scrollTop; // distance is how far the container needs to scroll in order to hit the end of the content
    log.debug('MasonryGridComponent: onAutoScrollAnimationComplete(): distanceToScroll', distanceToScroll);

    if (distanceToScroll <= 1) {
      // the scrollbar has reached the end
      log.debug('MasonryGridComponent: onAutoScrollAnimationComplete(): scrollbar has reached the end');
      if (this.selectedCollectionType === 'fixed' && this.collectionState !== 'building') {
        log.debug('MasonryGridComponent: onAutoScrollAnimationComplete(): this is a non-building fixed collection - fully stopping autoscroller');
        this.toolService.scrollToBottomStopped.next();
        this.autoScrollStarted = false;
      }
      return;
    }

    log.debug('MasonryGridComponent: onAutoScrollAnimationComplete(): scrollbar is not at the end.  restarting animation:');
    this.startScrollerAnimation();

  }



  onLayoutComplete(height: number): void {
    // this gets called when Isotope finishes a layout operation.  This means that the window height may have potentially grown or shrunk
    // log.debug('MasonryGridComponent: onLayoutComplete(): height:', height);

    if (this.initialLayoutInProgress) {
      log.debug('MasonryGridComponent: onLayoutComplete()');
      this.initialLayoutInProgress = false;

      if (this.publishedContentQueueing) {
        // if published content was queued while the initial layout was happening, call another layout() to lay them out, after which
        // every item will be laid out individually by setting addWithLayout to true
        this.publishedContentQueueing = false;
        this.isotopeApi.layout();
        setTimeout( () => {
          if (!this.addWithLayout) {
            this.addWithLayout = true;
          }
        }, 0);
      }
    }

    if (this.unpauseAfterResize) {
      this.unpauseAfterResize = false;
      this.unpauseAfterResizeTimeout = this.zone.runOutsideAngular( () => setTimeout( () => {
        this.unpauseAfterResizeTimeout = null;
        this.unpauseScrollerAnimation();
      }, 100 ) );
    }
  }



  onContentHeightChanged(entries: any[]) { // ResizeObserverEntry[]
    log.debug('MasonryGridComponent: onContentHeightChanged(): entry 0 contentRect:', entries[0].contentRect);
    let height = entries[0].contentRect.height;
    let lastScrollContentHeight = this.scrollContentHeight;
    this.scrollContentHeight = height;
    if (this.scrollTop > this.scrollContentHeight - this.scrollContainerHeight && this.scrollContentHeight > this.scrollContainerHeight) {
      // there must've been a purge - keep scrollTop in bounds
      log.debug('MasonryGridComponent: onContentHeightChanged(): keeping scrollTop in bounds 1');
      this.render(0, this.scrollContentHeight - this.scrollContainerHeight, 1);
    }
    else if (this.scrollContentHeight < this.scrollContainerHeight && this.scrollTop > 0) {
      // most likely a search term changed
      log.debug('MasonryGridComponent: onContentHeightChanged(): keeping scrollTop in bounds 2');
      this.render(0, 0, 1);
    }

    if (this.unpauseAfterResizeTimeout) {
      clearTimeout(this.unpauseAfterResizeTimeout);
      this.unpauseAfterResizeTimeout = null;
      this.autoScrollRestartTimeout = this.zone.runOutsideAngular( () => setTimeout( () => {
        this.unpauseAfterResizeTimeout = null;
        this.unpauseScrollerAnimation();
      }, 25 ) );
    }
    else if (this.autoScrollStarted && this.autoScrollAnimationPaused && !this.autoScrollRestartTimeout) {
      // scroller is paused and no existing setTimeout
      log.debug('MasonryGridComponent: onContentHeightChanged(): Stopping autoscroller via setTimeout()');
      this.autoScrollRestartTimeout = this.zone.runOutsideAngular( () => setTimeout( this.unpauseScrollerAnimation, 25 ) );
      return;
    }
    else if (this.autoScrollStarted && this.autoScrollAnimationPaused && this.autoScrollRestartTimeout) {
      // scroller is paused and there is an existing setTimeout - we've received several purges in a row
      clearTimeout(this.autoScrollRestartTimeout);
      log.debug('MasonryGridComponent: onContentHeightChanged(): retrying setTimeout() to unpause scroller animation');
      this.autoScrollRestartTimeout = this.zone.runOutsideAngular( () => setTimeout( this.unpauseScrollerAnimation, 25 ) );
      return;
    }

    if (!this.autoScrollAnimationPaused && this.autoScrollStarted && !this.autoScrollAnimationRunning) {
      // autoscroll is started, it isn't paused, and animation isn't actually running
      log.debug('MasonryGridComponent: onContentHeightChanged(): starting autoscroller');
      this.startScrollerAnimation();
    }
    else if (this.autoScrollStarted && this.autoScrollAnimationRunning) {
      log.debug('MasonryGridComponent: onContentHeightChanged(): autoscroll animation is already in progress.  not starting autoscroller this time');
    }
    else {
      // autoscroll is stopped, so do nothing
      log.debug('MasonryGridComponent: onContentHeightChanged(): not starting autoscroller this time');
      log.debug(`MasonryGridComponent: onContentHeightChanged(): autoScrollAnimationPaused: ${this.autoScrollAnimationPaused} autoScrollStarted: ${this.autoScrollStarted} autoScrollAnimationRunning: ${this.autoScrollAnimationRunning}`);
    }

  }



  onStopScrollToBottomClicked(): void {
    // stops the autoScroller with stopScrollerAnimation() when someone clicks the stop button on the toolbar
    this.autoScrollStarted = false;
    this.stopScrollerAnimation();
  }



  stopScrollerAnimation(): void {
    log.debug('MasonryGridComponent: stopScrollerAnimation(): Stopping scroller');
    if (this.scroller) {
      this.scroller.stop();
    }
    log.debug('autoScrollAnimationRunning = false');
    this.autoScrollAnimationRunning = false;
    // this.toolService.scrollToBottomStopped.next(); // sometimes we need to use this method without triggering an end to the controlbar
  }



  pauseScrollerAnimation(): void {
    log.debug('MasonryGridComponent: pauseScrollerAnimation(): Pausing scroller animation');
    this.stopScrollerAnimation();
    this.autoScrollAnimationPaused = true;
  }



  unpauseScrollerAnimation = () => {
    log.debug('MasonryGridComponent: unpauseScrollerAnimation(): Unpausing scroller animation');
    this.autoScrollAnimationPaused = false;
    this.startScrollerAnimation();
  }



  private stopAutoScroll(): void {
    // this gets called from onSearchTermsTyped(), onMaskChanged(), onCollectionDeleted(), onSelectedCollectionChanged()
    log.debug('MasonryGridComponent: stopAutoScroll()');
    this.stopScrollerAnimation();
    this.toolService.scrollToBottomStopped.next(); // tells the control bar that autoscroll stopped, so it can update its icon
    this.autoScrollStarted = false;
  }



  private restartAutoScroll(): void {
    // this gets called from onCollectionStateChanged() and onAutoscrollSpeedChanged()
    log.debug('MasonryGridComponent: restartAutoScroll()');
    this.stopScrollerAnimation();
    this.startScrollerAnimation();
  }






  //////////////////// END ANIMATION ////////////////////



  suspendMonitoring(): void {
    // this.pauseMonitoring = true; // pauseMonitoring will be updated after server push
    this.dataService.pauseMonitoringCollection();
  }



  resumeMonitoring(): void {
    // this.pauseMonitoring = false; // this.pauseMonitoring = true; // pauseMonitoring will be updated after server push
    // We must now check whether our collection has disconnected, and if not - call unpauseMonitoringCollection.  If so, call getRollingCollection
    this.dataService.unpauseMonitoringCollection();
  }



  openSessionDetails(): void {
    log.debug('MasonryGridComponent: openSessionDetails()');
    if (this.autoScrollStarted) {
      // stop the autoscroller
      this.stopAutoScroll();
    }
    this.modalService.open(this.toolService.contentDetailsModalId);
    if (this.selectedCollectionType === 'monitoring' && this.pauseMonitoring === false) {
      // pause monitoring
      this.suspendMonitoring();
    }
  }


  maskChanged(e: ContentMask): void {
    this.lastMask = e;
    log.debug('MasonryGridComponent: maskChanged():', e);

    if (e.showImage && e.showPdf && e.showWord && e.showExcel && e.showPowerpoint && e.showHash && e.showDodgy && !e.showFromArchivesOnly) {
      this.filter = '*';
      this.changeDetectionRef.detectChanges();
      return;
    }

    let tempFilter = [];
    let fromArchivesOnly = false;

    if (e.showFromArchivesOnly) {
      fromArchivesOnly = true;
    }
    if (e.showImage) {
      tempFilter.push('[contentType="image"]');
    }
    if (e.showPdf) {
      tempFilter.push('[contentType="pdf"]');
    }
    if (e.showWord) {
      tempFilter.push('[contentSubType="word"]');
    }
    if (e.showExcel) {
      tempFilter.push('[contentSubType="excel"]');
    }
    if (e.showPowerpoint) {
      tempFilter.push('[contentSubType="powerpoint"]');
    }
    if (e.showHash) {
      tempFilter.push('[contentType="hash"]');
    }
    if (e.showDodgy && !fromArchivesOnly) {
      tempFilter.push('[contentType="unsupportedZipEntry"],[contentType="encryptedZipEntry"],[contentType="encryptedRarEntry"],[contentType="encryptedRarTable"]');
    }
    if (tempFilter.length > 0 && !fromArchivesOnly) {
      this.filter = tempFilter.join(',');
    }
    else if (tempFilter.length > 0 && fromArchivesOnly) {
      this.filter = tempFilter.join('[fromArchive="true"],');
    }
    else {
      this.filter = '.none';
    }
    this.changeDetectionRef.detectChanges();
  }



  onToggleCaseSensitiveSearch(): void {
    log.debug('MasonryGridComponent: onToggleCaseSensitiveSearch()');
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
    // log.debug('MasonryGridComponent: searchTermsChanged(): e:', e);
    let searchTerms = e.searchTerms;
    this.lastSearchTerm = searchTerms;
    let matchedIds = [];

    if (searchTerms === '') {
      this.maskChanged(this.lastMask);
      this.changeDetectionRef.detectChanges();
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
  }



  resetContentCount(): void {
    log.debug('MasonryGridComponent: resetContentCount()');
    this.contentCount = new ContentCount;
  }



  private countContent(newContent: Content[] = null): void {
    // count content from scratch (if no newContent), or add to existing this.contentCount if newContent is defined
    let contentCount = newContent ? this.contentCount : new ContentCount; // operate on this.contentCount if newContent is defined
    let tempContent: Content[] = newContent || this.content;
    tempContent.forEach( (content) => {
      switch (content.contentType) {
        case 'image':
          contentCount.images += 1;
          break;
        case 'pdf':
          contentCount.pdfs += 1;
          break;
        case 'hash':
          contentCount.hashes += 1;
          break;
        case 'office':
          switch (content.contentSubType) {
            case 'word':
              contentCount.word += 1;
              break;
            case 'excel':
              contentCount.excel += 1;
              break;
            case 'powerpoint':
              contentCount.powerpoint += 1;
              break;
          }
          break;
      }
      if (DodgyArchiveTypes.includes(content.contentType)) {
        contentCount.dodgyArchives += 1;
      }
      if (content.fromArchive && !DodgyArchiveTypes.includes(content.contentType)) {
        contentCount.fromArchives += 1;
      }
    });
    contentCount.total = this.content.length;
    this.contentCount = utils.deepCopy(contentCount);
  }



  private purgeSessions(sessionsToPurge: number[]): number {
    let searchRemoved = 0;
    while (sessionsToPurge.length !== 0) {
      let sessionToPurge = sessionsToPurge.shift();

      let contentsToPurge = [];
      for (let i = 0; i < this.content.length; i++) {
        // Purge content
        let content = this.content[i];
        // log.debug('MasonryGridComponent: purgeSessions(): content:', content);
        if (content.session === sessionToPurge) {
          contentsToPurge.push(content);
        }
      }
      // log.debug('MasonryGridComponent: purgeSessions(): contentsToPurge:', contentsToPurge);
      while (contentsToPurge.length !== 0) {
        let contentToPurge = contentsToPurge.shift();
        for (let i = 0; i < this.content.length; i++) {
          let content = this.content[i];
          if (contentToPurge.session === content.session && contentToPurge.contentFile === content.contentFile && contentToPurge.contentType === content.contentType) {
            // Purge content
            log.debug(`MasonryGridComponent: purgeSessions(): purging content id ${content.id} for session ${content.session}`);
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



  getTopLeftTileInViewportId(): any {
    // returns the id of the top-left masonry tile on the screen

    let leftOffset = this.scrollContainerRef.nativeElement.offsetLeft + this.masonryColumnWidth / 2; // we'll target halfway through the first column
    let topOffset = this.toolbarHeight + 1;
    let maxTopOffset = this.toolbarHeight + this.scrollContainerHeight;
    // console.log('maxTopOffset:', maxTopOffset);
    let offsetIncrement = 5;
    let element = null;
    while (!element) {
      // need to handle reaching end of viewport y axis
      if (topOffset >= maxTopOffset) {
        return null;
      }
      let el = document.elementFromPoint(leftOffset, topOffset);
      // console.log('el:', el);
      if (el.classList.contains('grid')) {
        // we hit the background, so try again
        topOffset += offsetIncrement;
        // console.log('topOffset:', topOffset);
        continue;
      }
      let parent = el.parentElement;
      let classList = parent.classList;
      let found = false;
      for (let i = 0; i < 5; i++) {
        if (classList.contains('brick')) {
          found = true;
          break;
        }
        parent = parent.parentElement;
        classList = parent.classList;
      }
      if (found) {
        return parent.getAttribute('id');
      }
    }
  }



  getFirstTileFromLeftInViewportId(): any {
    // returns the id of the top-left masonry tile on the screen

    let leftOffset = this.scrollContainerRef.nativeElement.offsetLeft + this.masonryColumnWidth / 2; // we'll target halfway through the first column
    let topOffset = this.toolbarHeight + 1;
    let maxTopOffset = this.toolbarHeight + this.scrollContainerHeight;
    // console.log('maxTopOffset:', maxTopOffset);
    let offsetIncrement = 5;
    let element = null;
    while (!element) {
      // need to handle reaching end of viewport y axis
      if (topOffset >= maxTopOffset) {
        return null;
      }
      let el = document.elementFromPoint(leftOffset, topOffset);
      // console.log('el:', el);
      if (el.classList.contains('grid')) {
        // we hit the background, so try again
        topOffset += offsetIncrement;
        // console.log('topOffset:', topOffset);
        continue;
      }
      let parent = el.parentElement;
      let classList = parent.classList;
      let found = false;
      for (let i = 0; i < 5; i++) {
        if (classList.contains('brick')) {
          found = true;
          break;
        }
        parent = parent.parentElement;
        classList = parent.classList;
      }
      if (found) {
        return parent.getAttribute('id');
      }
    }
  }



  hasSessions(): boolean {
    return Object.keys(this.sessions).length !== 0;
  }



  onTileClicked(event) {
    // log.debug('MasonryGridComponent: onTileClicked(): event:', event);
    if (event.target.tagName === 'IMG') {
      // set session and open session viewer
      if (this.selectedCollectionType === 'monitoring' && !this.pauseMonitoring) {
        this.suspendMonitoring();
      }
      let sessionId = event.currentTarget.getAttribute('sessionId');
      let contentId = event.currentTarget.getAttribute('id');
      this.selectedSession = this.sessions[sessionId];
      this.selectedContent = this.contentObj[contentId];
      this.selectedContentId = contentId;
      // log.debug('MasonryGridComponent: onTileClicked(): selectedContentId:', this.selectedContentId);
      this.updateNextPreviousButtonStatus();
      this.changeDetectionRef.detectChanges();
      this.openSessionDetails();
    }
  }



  onScrollbarMoved(scrollTop) {
    // log.debug('MasonryGridComponent: onScrollbarMoved(): scrollTop:', scrollTop);
    if (scrollTop < 0 || scrollTop > this.scrollContentHeight - this.scrollContainerHeight) {
      return;
    }
    this.render(0, scrollTop, 1);
  }



  onTextAreaToggled(shown) {
    log.debug('MasonryGridComponent: onTextAreaToggled(): shown', shown);
    this.showTextArea = shown;
    if (this.autoScrollStarted) {
      // let topLeftTileId = this.getTopLeftTileInViewportId();
      // log.debug('topLeftTileId:', topLeftTileId);
      this.stopAutoScroll();
    }
    this.changeDetectionRef.detectChanges();
    if (this.isotopeInitialized) {
      this.isotopeApi.layout();
    }
  }



  // Keyboard Handlers //

  onKeyPressed = (event) => {
    if (this.modalService.isOpen) {
      return;
    }
    // log.debug('MasonryGridComponent: onKeyPressed(): event:', event);
    let keyTable = {
      'ArrowUp': () => this.onUpArrowPressed(),
      'ArrowDown': () => this.onDownArrowPressed(),
      'Home': () => this.onHomePressed(),
      'End': () => this.onEndPressed(),
      'PageDown': () => this.onPageDownPressed(),
      'PageUp': () => this.onPageUpPressed()
    };
    if (event.key in keyTable) {
      keyTable[event.key]();
    }
  }



  onHomePressed() {
    // log.debug('MasonryGridComponent: onHomePressed()');
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    this.zone.runOutsideAngular( () => {
      this.scroller.setScrollTop(this.scrollTop);
      this.scroller.setDimensions(this.scrollContainerRef.nativeElement.clientWidth, this.scrollContainerRef.nativeElement.clientHeight, this.isotopeContentRef.nativeElement.offsetWidth, this.scrollContentHeight);
      this.scroller.options.animationDuration = 250;
      this.scroller.scrollTo(0, 0, true, null);
    });
  }



  onEndPressed() {
    // log.debug('MasonryGridComponent: onEndPressed()');
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    if (this.scrollContentHeight <= this.scrollContainerHeight) {
      return;
    }
    let target = this.scrollContentHeight - this.scrollContainerHeight;
    this.zone.runOutsideAngular( () => {
      this.scroller.setScrollTop(this.scrollTop);
      this.scroller.setDimensions(this.scrollContainerRef.nativeElement.clientWidth, this.scrollContainerRef.nativeElement.clientHeight, this.isotopeContentRef.nativeElement.offsetWidth, this.scrollContentHeight);
      this.scroller.options.animationDuration = 250;
      this.scroller.scrollTo(0, target, true, null);
    });
  }



  onUpArrowPressed() {
    // log.debug('MasonryGridComponent: onUpArrowPressed()');
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    let target = this.scrollTop - this.lineHeight * 2;
    if (target < 0) {
      target = 0;
    }
    // this.render(0, target, 1);
    this.zone.runOutsideAngular( () => {
      this.scroller.setScrollTop(this.scrollTop);
      this.scroller.setDimensions(this.scrollContainerRef.nativeElement.clientWidth, this.scrollContainerRef.nativeElement.clientHeight, this.isotopeContentRef.nativeElement.offsetWidth, this.scrollContentHeight);
      this.scroller.options.animationDuration = 100;
      this.scroller.scrollTo(0, target, true, null);
    });
  }



  onDownArrowPressed() {
    // log.debug('MasonryGridComponent: onDownArrowPressed()');
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    if (this.scrollContentHeight <= this.scrollContainerHeight) {
      return;
    }
    let target = this.scrollTop + this.lineHeight * 2;
    if (target > this.scrollContentHeight - this.scrollContainerHeight) {
      target = this.scrollContentHeight - this.scrollContainerHeight;
    }
    this.zone.runOutsideAngular( () => {
      this.scroller.setScrollTop(this.scrollTop);
      this.scroller.setDimensions(this.scrollContainerRef.nativeElement.clientWidth, this.scrollContainerRef.nativeElement.clientHeight, this.isotopeContentRef.nativeElement.offsetWidth, this.scrollContentHeight);
      this.scroller.options.animationDuration = 100;
      this.scroller.scrollTo(0, target, true, null);
    });

  }



  onPageUpPressed() {
    // log.debug('MasonryGridComponent: onPageUpPressed()');
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    if (this.scrollContentHeight <= this.scrollContainerHeight) {
      return;
    }
    let target = this.scrollTop - this.scrollContainerHeight;
    if (target < 0) {
      target = 0;
    }
    this.zone.runOutsideAngular( () => {
      this.scroller.setScrollTop(this.scrollTop);
      this.scroller.setDimensions(this.scrollContainerRef.nativeElement.clientWidth, this.scrollContainerRef.nativeElement.clientHeight, this.isotopeContentRef.nativeElement.offsetWidth, this.scrollContentHeight);
      this.scroller.options.animationDuration = 250;
      this.scroller.scrollTo(0, target, true, null);
    });
  }



  onPageDownPressed() {
    // log.debug('MasonryGridComponent: onPageDownPressed()');
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    if (this.scrollContentHeight <= this.scrollContainerHeight) {
      return;
    }
    let target = this.scrollTop + this.scrollContainerHeight;
    if (target > this.scrollContentHeight - this.scrollContainerHeight) {
      target = this.scrollContentHeight - this.scrollContainerHeight;
    }
    this.zone.runOutsideAngular( () => {
      this.scroller.setScrollTop(this.scrollTop);
      this.scroller.setDimensions(this.scrollContainerRef.nativeElement.clientWidth, this.scrollContainerRef.nativeElement.clientHeight, this.isotopeContentRef.nativeElement.offsetWidth, this.scrollContentHeight);
      this.scroller.options.animationDuration = 250;
      this.scroller.scrollTo(0, target, true, null);
    });
  }



}
