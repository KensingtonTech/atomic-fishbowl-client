import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit, ChangeDetectionStrategy, NgZone, forwardRef } from '@angular/core';
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
import { Subscription } from 'rxjs';
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
import 'imagesloaded';
declare var log: Logger;
declare var $: any;



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
  <!-- position: absolute; left: 1.315789474em;-->
  <div *ngIf="selectedCollectionType == 'monitoring'" fxFlexOffset="2em" style="color: white;">

    <i *ngIf="!pauseMonitoring" class="fa fa-pause-circle-o fa-4x" (click)="suspendMonitoring()"></i>
    <i *ngIf="pauseMonitoring" class="fa fa-play-circle-o fa-4x" (click)="resumeMonitoring()"></i>

  </div>

  <!-- content count -->
  <content-count-widget *ngIf="selectedCollectionType" [contentCount]="contentCount" style="margin-top: auto; margin-bottom: auto;"></content-count-widget>



</div>


<div class="masonryViewport" style="overflow: none;">

  <div #canvas tabindex="-1" class="scrollContainer noselect" style="position: relative; width: 100%; height: 100%; overflow-y: auto; outline: 0;">

    <div isotope *ngIf="isotopeConfig" #isotope tabindex="-1" class="grid" [config]="isotopeConfig" [filter]="filter" [addWithLayout]="addWithLayout" style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; outline: none;">

      <ng-container *ngIf="content && hasSessions() && masonryKeys">

        <masonry-tile *ngFor="let item of content" isotope-brick class="brick" [collectionId]="collectionId" [attr.contentType]="item.contentType" [attr.contentSubType]="item.contentSubType ? item.contentSubType : null" [attr.fromArchive]="item.fromArchive" [content]="item" [attr.sessionId]="item.session" [sessionId]="item.session" [masonryKeys]="masonryKeys" [masonryColumnWidth]="masonryColumnWidth" [serviceType]="selectedCollectionServiceType" [attr.id]="item.id" [margin]="tileMargin" (click)="onTileClicked($event)"></masonry-tile>

      </ng-container>

    </div>

    <div class="scrollTarget"></div>
  </div>

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
                private zone: NgZone ) {}

  @ViewChild('canvas') private canvasRef: ElementRef;
  @ViewChild('isotope') private isotopeRef: ElementRef;


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
      horizontalOrder: true,
      fitWidth: false
    },
    containerStyle: null
  });
  private isotopeApi: IsotopeAPI;
  private isotopeInitialized = false;
  public addWithLayoutSetting = false; // isotope will not auto-layout when bricks are added if false
  public addWithLayout = false; // isotope will not auto-layout when bricks are added if false
  private imgsLoaded: ImagesLoaded.ImagesLoaded = null;

  // search and filtering
  public filter = '*';
  private caseSensitiveSearch = false;
  private lastSearchTerm = '';
  private pauseMonitoring = false;
  private lastMask = new ContentMask;
  private searchBarOpen = false;

  // scrolling
  private pixelsPerSecond = this.toolService.getPreference('autoScrollSpeed') || 200; // default is 200 pixels per second
  private autoScrollStarted = false; // the state of the autoscroll control button.  Is the process running?
  private autoScrollAnimationRunning = false; // is the velocity scroll animation actually running?
  private restartAutoScrollAfterLayout = false;
  private scrollContainer: any;
  private scrollContainerHeight;
  private scrollTargetOffset = 0;
  private viewportHeight = 0;
  public toolbarHeight = 0;
  // private scrollPosition: number;
  // private lastWindowHeight = $('masonry').height();

  // session viewer
  public selectedSession: Session;
  public selectedContent: Content;
  private selectedContentId: string = null;
  public sessionsAvailable: SessionsAvailable = { previous: false, next: false };

  // license
  public license: License;
  private licenseChangedFunction = this.onLicenseChangedInitial;

  // routing
  private queryParams: any;
  private urlParametersLoaded = false;


  // Subscription holders
  private showMasonryTextAreaSubscription: Subscription;
  private collectionDeletedSubscription: Subscription;
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
  private onSplashScreenAtStartupClosedSubscription: Subscription;
  private refreshMasonryLayoutSubscription: Subscription;
  private masonryColumnWidthChangedSubscription: Subscription;
  private masonryAutoscrollSpeedChangedSubscription: Subscription;
  private monitoringCollectionPauseSubscription: Subscription;
  private isotopeApiSubscription: Subscription;
  private isotopeInitializedSubscription: Subscription;
  private licensingChangedSubscription: Subscription;

  ngOnDestroy(): void {
    log.debug('MasonryGridComponent: ngOnDestroy()');
    window.removeEventListener('resize', this.onWindowResize );
    this.showMasonryTextAreaSubscription.unsubscribe();
    this.collectionDeletedSubscription.unsubscribe();
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
    this.onSplashScreenAtStartupClosedSubscription.unsubscribe();
    this.refreshMasonryLayoutSubscription.unsubscribe();
    this.masonryColumnWidthChangedSubscription.unsubscribe();
    this.masonryAutoscrollSpeedChangedSubscription.unsubscribe();
    this.monitoringCollectionPauseSubscription.unsubscribe();
    this.isotopeApiSubscription.unsubscribe();
    this.isotopeInitializedSubscription.unsubscribe();
    this.licensingChangedSubscription.unsubscribe();
    this.canvasRef.nativeElement.removeEventListener('wheel', this.onMouseWheel);
  }



  parseQueryParams(params: any): void {
    if ( 'op' in params && 'service' in params && ( 'host' in params || ( 'ip' in params && 'side' in params) || ( 'adUser' in params && 'side' in params) ) ) {

      if (params['op'] !== 'adhoc') {
        return;
      }

      if (params['service'] !== 'nw' && params['service'] !== 'sa') {
        return;
      }

      if ('ip' in params && params['side'] !== 'src' && params['side'] !== 'dst') {
        return;
      }

      if ('adUser' in params && params['side'] !== 'src' && params['side'] !== 'dst') {
        return;
      }

      if ('host' in params && 'ip' in params) {
        // you can't have both ip and host
        return;
      }

      this.toolService.urlParametersLoaded = true;
      this.toolService.queryParams = params;

    }
  }



  ngOnInit(): void {
    log.debug('MasonryGridComponent: ngOnInit()');
    this.toolService.lastRoute = 'masonryGrid';
    this.toolService.setPreference('lastRoute', 'masonryGrid');

    // New startup code
    log.debug('MasonryGridComponent: ngOnInit(): toolService.urlParametersLoaded:', this.toolService.urlParametersLoaded);
    log.debug('MasonryGridComponent: ngOnInit(): toolService.queryParams:', this.toolService.queryParams);

    this.licensingChangedSubscription = this.dataService.licensingChanged.subscribe( license =>  this.licenseChangedFunction(license) );

    this.onSplashScreenAtStartupClosedSubscription = this.toolService.onSplashScreenAtStartupClosed.subscribe( () => {
      if (!this.license.valid) {
        this.modalService.open(this.toolService.licenseExpiredModalId);
      }
      else if (!this.toolService.queryParams) {
        // only show the collections tab container if the user hasn't passed in custom url params, like when drilling from an investigation
        this.modalService.open(this.toolService.tabContainerModalId);
      }
    });

    this.queryParams = this.route.snapshot.queryParams || null;

    if (Object.keys(this.queryParams).length !== 0) {
      // enter this block when first navigating to this page with custom url parameters
      this.parseQueryParams(this.queryParams);
      // the above function will store any query parameters in toolService.
      // we then must re-navigate to this page to clear the url bar query parameters
      this.router.navigate(['.'], { queryParams: {} } );
    }

    else if (this.toolService.queryParams) {
      // if we have query parameters, load the appropriate ad hoc modal
      this.toolService.splashLoaded = true; // we don't want the splash to load if the user navigates to a different view
      if (this.toolService.queryParams['service'] === 'nw') {
        this.toolService.addNwAdhocCollectionNext.next(this.toolService.queryParams);
      }
      if (this.toolService.queryParams['service'] === 'sa') {
        this.toolService.addSaAdhocCollectionNext.next(this.toolService.queryParams);
      }
      this.toolService.queryParams = null;
      this.toolService.urlParametersLoaded = false;
    }
    // End new startup code


    // Take subscriptions

    this.routerEventsSubscription = this.router.events.subscribe( (val: any) => this.onRouterEvent(val));

    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) );

    this.collectionDeletedSubscription = this.dataService.collectionDeleted.subscribe( (details: CollectionDeletedDetails) => this.onCollectionDeleted(details) );

    this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (collection: Collection) => this.onSelectedCollectionChanged(collection) );

    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (collection: any) => this.onCollectionStateChanged(collection) );

    this.sessionsReplacedSubscription = this.dataService.sessionsReplaced.subscribe( (s: any) => this.onSessionsReplaced(s) );

    this.sessionPublishedSubscription = this.dataService.sessionPublished.subscribe( (s: any) => this.onSessionPublished(s) );

    this.contentReplacedSubscription = this.dataService.contentReplaced.subscribe( (i: any) => this.onContentReplaced(i) );

    this.contentPublishedSubscription = this.dataService.contentPublished.subscribe( (newContent: any) => this.onContentPublished(newContent) );

    this.searchReplacedSubscription = this.dataService.searchReplaced.subscribe( (s: Search[]) => this.onSearchReplaced(s) );

    this.searchPublishedSubscription = this.dataService.searchPublished.subscribe( (s: Search[]) => this.onSearchPublished(s) );

    this.sessionsPurgedSubscription = this.dataService.sessionsPurged.subscribe( (sessionsToPurge: number[]) => this.onSessionsPurged(sessionsToPurge) );

    this.scrollToBottomSubscription = this.toolService.scrollToBottom.subscribe( () => this.onScrollToBottomClicked() );

    this.stopScrollToBottomSubscription = this.toolService.stopScrollToBottom.subscribe( () => this.onStopScrollToBottomClicked() );

    this.layoutCompleteSubscription = this.isotopeConfig.layoutComplete.subscribe( (height) => this.onLayoutComplete(height) );
    // this.layoutCompleteSubscription = this.isotopeConfig.layoutComplete.pipe(debounceTime(100)).subscribe( (height) => this.onLayoutComplete(height) );

    this.refreshMasonryLayoutSubscription = this.toolService.refreshMasonryLayout.subscribe( () => this.onRefreshMasonryLayout() );

    this.masonryColumnWidthChangedSubscription = this.toolService.masonryColumnWidthChanged.subscribe( (width: number) => this.onMasonryColumnWidthChanged(width) );

    this.masonryAutoscrollSpeedChangedSubscription = this.toolService.masonryAutoscrollSpeedChanged.subscribe( (autoScrollSpeed: number) => this.onAutoscrollSpeedChanged(autoScrollSpeed) );

    this.monitoringCollectionPauseSubscription = this.dataService.monitoringCollectionPause.subscribe( (paused) => {
      this.pauseMonitoring = paused;
      this.changeDetectionRef.detectChanges();
    } );

    this.showMasonryTextAreaSubscription = this.toolService.showMasonryTextArea.subscribe( shown => {
      if (this.autoScrollStarted) {
        let topLeftTileId = this.getTopLeftTileInViewportId();
        log.debug('topLeftTileId:', topLeftTileId);
        this.stopScrollerAnimation();
        this.restartAutoScrollAfterLayout = true;
      }
    });

    this.isotopeApiSubscription = this.isotopeConfig.api.subscribe( api => this.isotopeApi = api );

    this.isotopeInitializedSubscription = this.isotopeConfig.initialized.subscribe(initialized => this.isotopeInitialized = initialized);

  }



  ngAfterViewInit() {
    /*this.isotopeConfig = new IsotopeConfig({
      itemSelector: '.brick',
      resize: false, // we handle this ourselves to prevent change detection on resize
      masonry: {
        columnWidth: this.masonryColumnWidth + this.tileMargin,
        gutter: 0,
        horizontalOrder: true,
        fitWidth: false
      }
    });*/

    this.zone.runOutsideAngular( () => window.addEventListener('resize', this.onWindowResize ) );

    if (this.toolService.loadCollectionOnRouteChange) {
      log.debug('MasonryGridComponent: ngAfterViewInit(): getting collection data again on toolService.loadCollectionOnRouteChange');
      this.toolService.loadCollectionOnRouteChange = false;
      this.toolService.getCollectionDataAgain.next();
    }

    this.scrollContainer = document.getElementsByClassName('scrollContainer')[0];
    let toolbar: any = document.getElementsByClassName('afb-toolbar')[0];
    this.toolbarHeight = toolbar.offsetHeight;
    // console.log('toolbarHeight:', this.toolbarHeight);
    this.changeDetectionRef.detectChanges();

    window.dispatchEvent(new Event('resize'));

    if ( !this.toolService.splashLoaded && (
      (!this.queryParams  && !this.toolService.urlParametersLoaded)
      || ( !this.toolService.urlParametersLoaded && this.queryParams && Object.keys(this.queryParams).length === 0 ) ) ) {
        // only load the splash screen if we don't have ad hoc query parameters
        log.debug('MasonryGridComponent: ngAfterViewInit(): loading the splash screen');
        this.modalService.open(this.toolService.splashScreenModalId);
    }
    else if (this.toolService.splashLoaded && !this.toolService.selectedCollection) {
      // open the tab container on subsequent logout/login combos, if a collection wasn't previously selected
      if (!this.license.valid) {
        this.modalService.open(this.toolService.licenseExpiredModalId);
      }
      else {
        this.modalService.open(this.toolService.tabContainerModalId);
      }
    }
    else {
      log.debug('MasonryGridComponent: ngAfterViewInit(): not loading the splash screen - this should mean that we\'re just witching views');
    }


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



  onRefreshMasonryLayout(): void {
    if (this.isotopeInitialized) {
      this.isotopeApi.layout();
    }
  }



  onWindowResize = (event) => {
    log.debug('MasonryGridComponent: onWindowResize()');
    // this.viewportHeight = window.innerHeight;

    this.viewportHeight = document.getElementsByClassName('masonryViewport')[0].clientHeight;
    // log.debug('MasonryGridComponent: onWindowResize(): viewportHeight:', this.viewportHeight);

    this.scrollContainerHeight = this.scrollContainer.clientHeight;
    log.debug('MasonryGridComponent: onWindowResize(): scrollContainerHeight:', this.scrollContainerHeight);

    this.tileMargin = utils.convertEmRelativeToElement(this.tileMarginEms, document.body);
    this.isotopeConfig.masonry.columnWidth = this.masonryColumnWidth + this.tileMargin * 2;

    this.changeDetectionRef.detectChanges(); // needed to refresh the tiles prior to layout

    if (this.isotopeInitialized) {
      this.isotopeApi.layout(true);
    }

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
    this.scrollTargetOffset = 0;
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
    this.countContent();
    this.changeDetectionRef.detectChanges();
    this.zone.runOutsideAngular( () => {
      if (!this.addWithLayout) {
        this.imgsLoaded = imagesLoaded(this.isotopeRef.nativeElement);
        this.imgsLoaded.on('always', this.onImagesLoadedComplete);
      }
      setTimeout( () => {
        // Sets keyboard focus
        if (this.content && this.hasSessions() && this.masonryKeys && this.masonryColumnWidth) {
          this.canvasRef.nativeElement.focus();
        }
      }, 50);
    });
  }



  onImagesLoadedComplete = () => {
    // this only gets used if this.addWithLayout if false, and that is just experimental and doesn't really work properly
    log.debug('MasonryGridComponent: onImagesLoadedComplete()');
    this.imgsLoaded.off('always', this.onImagesLoadedComplete);
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

    if (!this.addWithLayout) {
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
    log.debug('MasonryGridComponent: onCollectionStateChanged(): state:', state);
    this.collectionState = state;

    if (state === 'monitoring')  {
      if (this.isotopeInitialized) {
        this.isotopeApi.destroyMe();
      }
      this.scrollTargetOffset = 0;
      this.search = [];
      this.sessions = {};
      this.content = [];
      this.contentObj = {};
      this.resetContentCount();
      this.changeDetectionRef.detectChanges();
      if (this.autoScrollStarted) { this.restartAutoScroll(); }
    }
    /*if (state === 'building' || state === 'rolling' ) {
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    }*/
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

    let searchRemoved = this.purgeSessions(sessionsToPurge);

    this.maskChanged(this.lastMask);
    this.countContent();
    if (searchRemoved > 0 && this.searchBarOpen) {
      this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
    }
    this.changeDetectionRef.detectChanges();
    // this.lastWindowHeight = $('isotope').height();
  }



  onMouseWheel = (wheelEvent) => {
    if (this.autoScrollStarted) {
      log.debug('MasonryGridComponent: onMouseWheel(): autoscroll is running, so stopping it now');
      this.canvasRef.nativeElement.removeEventListener('wheel', this.onMouseWheel);
      this.stopAutoScroll();
    }
  }







  ////////////////// SCROLLING //////////////////


  onScrollToBottomClicked(): void {
    // runs autoScroller() when someone clicks the arrow button on the toolbar
    this.autoScrollStarted = true;
    this.canvasRef.nativeElement.addEventListener('wheel', this.onMouseWheel, { passive: true });
    this.startScrollerAnimation();
  }



  startScrollerAnimation(): void {
    if (this.autoScrollAnimationRunning) {
      log.debug('MasonryGridComponent: startScrollerAnimation(): animation is in progress.  Returning');
      // is velocity animation actually running?
      return;
    }

    // Note to self: attempts to get scrollTop through listening to scroll event were unsuccessful.  The event doesn't actually contain the scroll position

    log.debug('MasonryGridComponent: startScrollerAnimation(): a velocity animation isn\'t running right now');

    // Add a new animation to the animation queue

    let scrollTargetOffset = this.scrollTargetOffset; // offset is how far the scrollTarget is from the top of the container
    log.debug('MasonryGridComponent: startScrollerAnimation(): scrollTargetOffset:', scrollTargetOffset);

    let scrollTop = this.scrollContainer.scrollTop; // scrollTop is how far the scrollbars are from the top of the container.  this triggers a reflow.  we need a better way to get this.
    log.debug('MasonryGridComponent: startScrollerAnimation(): scrollTop:', scrollTop);

    let distanceToScroll = Math.round(scrollTargetOffset) - this.scrollContainerHeight - scrollTop; // distance is how far the container needs to scroll in order to hit the scrolltarget
    log.debug('MasonryGridComponent: startScrollerAnimation(): distanceToScroll:', distanceToScroll);

    // let duration = this.scrollDuration(scrollTargetOffset, scrollTop);
    let duration = (distanceToScroll / this.pixelsPerSecond) * 1000;

    if (duration <= 1) {
      log.debug('MasonryGridComponent: startScrollerAnimation(): the distance and duration is 0.  Not running scroll animation this time');
      if (this.selectedCollectionType === 'fixed') {
        log.debug('MasonryGridComponent: startScrollerAnimation(): this is a fixed collection.  Fully stopping autoscroller');
        this.toolService.scrollToBottomStopped.next();
        this.autoScrollStarted = false;
      }
      return;
    }

    log.debug('MasonryGridComponent: startScrollerAnimation(): Starting scroller animation');

    this.autoScrollAnimationRunning = true;

    this.zone.runOutsideAngular( () =>
      $('.scrollContainer').velocity(
        { scrollTop: `${Math.round(this.scrollTargetOffset - this.scrollContainerHeight)}px` },
        {
          duration: duration,
          easing: 'linear',
          complete: () => this.onAutoScrollAnimationComplete()
        })
    );

  }



  onAutoScrollAnimationComplete(): void {
    // This callback runs when the animation is complete
    log.debug('MasonryGridComponent: onAutoScrollAnimationComplete()');

    if (!this.autoScrollStarted) {
      return;
    }

    let scrollTargetOffset = this.scrollTargetOffset; // offset is how far the scrollTarget is from the top of the container

    let scrollTop = this.scrollContainer.scrollTop; // scrollTop is how far the scrollbars are from the top of the container.  this triggers a reflow.  we need a better way to get this.

    let scrollContainerHeight = this.scrollContainerHeight;

    let distanceToScroll = scrollTargetOffset - scrollContainerHeight - scrollTop; // distance is how far the container needs to scroll in order to hit the scrolltarget
    log.debug('MasonryGridComponent: onAutoScrollAnimationComplete(): distanceToScroll', distanceToScroll);
    this.autoScrollAnimationRunning = false;

    // if (this.viewportHeight - distance - this.toolbarHeight === 0) {
    if (distanceToScroll <= 1) {
      // the scrollbar has reached the end
      log.debug('MasonryGridComponent: onAutoScrollAnimationComplete(): scrollbar has reached the end');
      if (this.selectedCollectionType === 'fixed' && this.collectionState !== 'building') {
        log.debug('this is a fixed collection.  fully stopping autoscroller');
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
    // this is debounced to 100 ms
    // log.debug('MasonryGridComponent: onLayoutComplete(): height:', height);
    log.debug('MasonryGridComponent: onLayoutComplete(): height:', height);
    this.scrollTargetOffset = height;

    if (!this.autoScrollStarted && !this.restartAutoScrollAfterLayout) {
      log.debug('MasonryGridComponent: onLayoutComplete(): autoScroll isn\'t running.  Returning');
      return;
    }

    this.restartAutoScrollAfterLayout = false;
    this.startScrollerAnimation();
  }



  onStopScrollToBottomClicked(): void {
    // stops the autoScroller with stopScrollerAnimation() when someone clicks the stop button on the toolbar
    this.autoScrollStarted = false;
    this.stopScrollerAnimation();
  }



  stopScrollerAnimation(): void {
    log.debug('MasonryGridComponent: stopScrollerAnimation(): Stopping scroller');
    // $('.scrollTarget').velocity('stop');
    $('.scrollContainer').velocity('stop');
     this.autoScrollAnimationRunning = false;
    // this.toolService.scrollToBottomStopped.next(); // sometimes we need to use this method without triggering an end to the controlbar
  }



  private stopAutoScroll(): void {
    // this gets called from onSearchTermsTyped(), onMaskChanged(), onCollectionDeleted(), onSelectedCollectionChanged()
    log.debug('MasonryGridComponent: stopAutoScroll()');
    this.stopScrollerAnimation();
    this.toolService.scrollToBottomStopped.next();
    this.autoScrollStarted = false;
    this.autoScrollAnimationRunning = false;
    // this.lastWindowHeight = $('isotope').height();
  }



  private restartAutoScroll(): void {
    // this gets called from onCollectionStateChanged() and onAutoscrollSpeedChanged()
    log.debug('MasonryGridComponent: restartAutoScroll()');
    this.stopScrollerAnimation();
    this.startScrollerAnimation();
  }






  //////////////////// END ANIMATION ////////////////////



  suspendMonitoring(): void {
    // this.pauseMonitoring = true;
    this.dataService.pauseMonitoringCollection();
  }



  resumeMonitoring(): void {
    // this.pauseMonitoring = false;
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
    // if ( this.lastSearchTerm === searchTerms ) { return; }
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

    let leftOffset = this.canvasRef.nativeElement.offsetLeft + this.masonryColumnWidth / 2; // we'll target halfway through the first column
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

    let leftOffset = this.canvasRef.nativeElement.offsetLeft + this.masonryColumnWidth / 2; // we'll target halfway through the first column
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


}
