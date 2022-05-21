import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  AfterViewInit,
  ChangeDetectionStrategy,
  NgZone,
  forwardRef
} from '@angular/core';
import { Router, NavigationStart, Event as AltRouterEvent } from '@angular/router';
import { ToolService } from 'services/tool.service';
import { DataService } from 'services/data.service';
import { ContentCount } from 'types/contentcount';
import { IsotopeConfig } from '../isotope/isotope-config';
import { IsotopeAPI } from '../isotope/isotope-api';
import { ContentMask } from 'types/contentmask';
import { Subscription, Subject } from 'rxjs';
import {
  Collection,
  ContentItem,
  Search,
  Session,
  Sessions
} from 'types/collection';
import { MasonryKey, Preferences } from 'types/preferences';
import * as utils from '../utils';
import { CollectionDeletedDetails } from 'types/collection-deleted-details';
import { AbstractGrid } from '../abstract-grid.class';
import { DodgyArchiveTypes } from 'types/dodgy-archive-types';
import { SessionsAvailable } from 'types/sessions-available';
import * as imagesLoaded from 'imagesloaded';
import { Scroller } from '../scroller/scroller';
import * as log from 'loglevel';
import { ConfirmationService } from 'primeng/api';
import { MasonryTileComponent } from './masonry-tile.component';

@Component({
  selector: 'app-masonry-grid-view',
  providers: [ { provide: AbstractGrid, useExisting: forwardRef(() => MasonryGridComponent ) } ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './masonry-grid.component.html',
  styleUrls: [
    './masonry-grid.component.scss'
  ]
})

export class MasonryGridComponent implements AbstractGrid, OnInit, AfterViewInit, OnDestroy {

  constructor(
    private dataService: DataService,
    private toolService: ToolService,
    private changeDetectionRef: ChangeDetectorRef,
    private router: Router,
    private zone: NgZone,
    private confirmationService: ConfirmationService
  ) {}

  @ViewChild('ScrollContainerRef', { static: true }) private scrollContainerRef: ElementRef;
  @ViewChild('IsotopeContentRef') private isotopeContentRef: ElementRef;


  // high-level session, content, and search data pushed from server
  private search: Search[] = []; // 'search' is an array containing text extracted from PDF's which can be searched
  content: ContentItem[] = [];
  sessions: Sessions = {};
  contentCount = new ContentCount(); // { images: number, pdfs: number, word: number, excel: number, powerpoint: number, dodgyArchives: number, hashes: number, total: number }

  // Dialog Control
  displayTabContainerModal = false;
  displayManageUsersModal = false;
  displayFeedWizardModal = false;
  displayPreferencesModal = false;
  displayNwCollectionModal = false;
  displayContentDetailsModal = false;

  // Splash Screen Control
  _displaySplashScreenModal = false;
  set displaySplashScreenModal(value: boolean) {
    this._displaySplashScreenModal = value;
    if (!value) {
      this.toolService.splashScreenClosed.next();
    }
  }
  get displaySplashScreenModal() {
    return this._displaySplashScreenModal;
  }
  firstLoad = this.toolService.firstLoad;
  firstLoadTimeout?: NodeJS.Timeout;

  // preferences
  preferences: Preferences;
  masonryKeys?: MasonryKey[];

  // collection information
  selectedCollectionType?: string;
  selectedCollectionServiceType?: 'nw' | 'sa';
  collectionId?: string;
  collectionDeletedUser = '';
  private collectionState = '';

  // masonry and isotope
  masonryColumnWidth = this.toolService.getNumberPreference('masonryColumnWidth', 350); // default is 350
  minGutterPx = 20;
  layoutCompleteCallback = this.onLayoutComplete.bind(this);
  isotopeConfig: IsotopeConfig;
  private isotopeApi: IsotopeAPI;
  private isotopeInitialized = false;
  addWithLayoutSetting = false; // isotope will not auto-layout when bricks are added if false
  addWithLayout = false; // isotope will not auto-layout when bricks are added if false
  private imgsLoaded?: ImagesLoaded.ImagesLoaded;
  private initialLayoutInProgress = false; // helps address a race condition where onContentPublished() and/or onSessionsPurged() step on the first layout operation of onContentReplaced, and causes tons of unnecessary layout operations.  Prevents addWithLayout from being set to true until that first layout operation is complete.
  private queuePublishedContent = false; // instructs onLayoutComplete() to perform an additional operation after the initialLayout operation has completed, and also to switch the layout mode to addWithLayout = true
  private get displayedTileIds(): string[] {
    return utils.getVisibleElements(
      document.getElementsByTagName('app-masonry-tile') as HTMLCollectionOf<HTMLElement>
    )
      .map( (elem) => elem.getAttribute('id') )
      .filter( (elem) => elem !== null ) as string[];
  }

  // search and filtering
  filter = '*';
  private caseSensitiveSearch = false;
  private lastSearchTerm = '';
  pauseMonitoring = false;
  private lastMask = new ContentMask();
  private searchBarOpen = false;

  // scrolling
  private pixelsPerSecond = this.toolService.getNumberPreference('autoScrollSpeed', 200); // the scroll speed.  the default is 200 pixels per second
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
  toolbarHeight = 0; // not really being used right now but maybe will be some day
  private autoScrollRestartTimeout?: NodeJS.Timeout; // handle for timer
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
  private scroller: Scroller;
  _scrollTop = 0;
  set scrollTop(scrollTop) {
    this._scrollTop = scrollTop;
    this.scrollTopChanged.next(scrollTop);
  }
  get scrollTop() {
    return this._scrollTop;
  }
  private resizeObserver: ResizeObserver;
  private resizeTimout?: NodeJS.Timeout;
  private lineHeight: number; // we store the height of a single line relative to the container so we can use it when user hits up/down arrows
  scrollbarMoved = new Subject<number>();
  scrollTopChanged = new Subject<number>();
  containerHeightChanged = new Subject<number>();
  contentHeightChanged = new Subject<number>();
  private unpauseAfterResize = false;
  private unpauseAfterResizeTimeout?: NodeJS.Timeout;

  // session viewer
  selectedSession: Session;
  selectedContent: ContentItem;
  private selectedContentId: string;
  sessionsAvailable: SessionsAvailable = {
    previous: false,
    next: false
  };
  mouseButtonDown = false;

  // Text Area
  showTextArea = true;

  // Subscription holders
  private subscriptions = new Subscription();



  ngOnDestroy(): void {
    log.debug('MasonryGridComponent: ngOnDestroy()');
    if (this.resizeTimout) {
      clearTimeout(this.resizeTimout);
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
    this.scrollContainerRef.nativeElement.removeEventListener('keydown', this.onKeyPressed );
    this.toolService.addNwAdhocCollectionNext.next({});
    this.toolService.addSaAdhocCollectionNext.next({});
  }



  ngOnInit(): void {
    log.debug('MasonryGridComponent: ngOnInit()');
    this.toolService.lastRoute = 'masonryGrid';
    this.toolService.setPreference('lastRoute', 'masonryGrid');

    // log.debug('MasonryGridComponent: ngOnInit(): toolService.urlParametersLoaded:', this.toolService.urlParametersLoaded);
    // log.debug('MasonryGridComponent: ngOnInit(): toolService.queryParams:', this.toolService.queryParams);

    this.subscriptions.add(
      this.toolService.displayTabContainerModal.subscribe(
        (displayTabContainerModal) => {
          this.displayTabContainerModal = displayTabContainerModal;
          this.changeDetectionRef.detectChanges();
        }
      )
    );

    this.subscriptions.add(
      this.toolService.displayManageUsersModal.subscribe(
        (displayManageUsersModal) => this.displayManageUsersModal = displayManageUsersModal
      )
    );

    this.subscriptions.add(
      this.toolService.displayNwCollectionModal.subscribe(
        (displayNwCollectionModal) => {
          this.displayNwCollectionModal = displayNwCollectionModal;
          /*if (displayNwCollectionModal) {
            this.toolService.addNwCollectionNext.next();
          }*/
          this.changeDetectionRef.detectChanges();
        }
      )
    );

    this.subscriptions.add(
      this.toolService.displayContentDetailsModal.subscribe(
        (displayContentDetailsModal) => {
          this.displayContentDetailsModal = displayContentDetailsModal;
          this.changeDetectionRef.detectChanges();
        }
      )
    );

    this.subscriptions.add(
      this.toolService.splashScreenClosed.subscribe(
        () => this.onSplashScreenClosed()
      )
    );

    if (this.toolService.urlParametersLoaded) {
      // if we have query parameters, load the appropriate ad hoc modal
      this.toolService.firstLoad = false; // we don't want the splash to load if the user navigates to a different view
      this.firstLoad = false;
      switch (this.toolService.queryParams?.service) {
        case 'nw':
          this.toolService.addNwAdhocCollectionNext.next(this.toolService.queryParams);
          break;
        case 'sa':
          this.toolService.addSaAdhocCollectionNext.next(this.toolService.queryParams);
          break;
      }
      this.toolService.queryParams = undefined;
      this.toolService.urlParametersLoaded = false;
    }


    // Take subscriptions

    this.subscriptions.add(
      this.router.events.subscribe(
        (val) => this.onRouterEvent(val)
      )
    );

    this.subscriptions.add(
      this.dataService.preferencesChanged.subscribe(
        (prefs) => this.onPreferencesChanged(prefs)
      )
    );

    this.subscriptions.add(
      this.dataService.collectionDeleted.subscribe(
        (details: CollectionDeletedDetails) => this.onCollectionDeleted(details)
      )
    );

    this.subscriptions.add(
      this.dataService.selectedCollectionChanged.subscribe(
        (collection: Collection) => this.onSelectedCollectionChanged(collection)
      )
    );

    this.subscriptions.add(
      this.dataService.collectionStateChanged.subscribe(
        (collection) => this.onCollectionStateChanged(collection)
      )
    );

    this.subscriptions.add(
      this.dataService.sessionsReplaced.subscribe(
        (sessions) => this.onSessionsReplaced(sessions)
      )
    );

    this.subscriptions.add(
      this.dataService.sessionPublished.subscribe(
        (session) => this.onSessionPublished(session)
      )
    );

    this.subscriptions.add(
      this.dataService.contentReplaced.subscribe(
        (contentItems) => this.onContentReplaced(contentItems)
      )
    );

    this.subscriptions.add(
      this.dataService.contentPublished.subscribe(
        (contentItems) => this.onContentPublished(contentItems)
      )
    );

    this.subscriptions.add(
      this.dataService.searchReplaced.subscribe(
        (search) => this.onSearchReplaced(search)
      )
    );

    this.subscriptions.add(
      this.dataService.searchPublished.subscribe(
        (search) => this.onSearchPublished(search)
      )
    );

    this.subscriptions.add(
      this.dataService.sessionsPurged.subscribe(
        (sessionsToPurge) => this.onSessionsPurged(sessionsToPurge)
      )
    );

    this.subscriptions.add(
      this.toolService.scrollToBottom.subscribe(
        () => this.onScrollToBottomClicked()
      )
    );

    this.subscriptions.add(
      this.toolService.stopScrollToBottom.subscribe(
        () => this.onStopScrollToBottomClicked()
      )
    );

    this.subscriptions.add(
      this.toolService.masonryColumnWidthChanged.subscribe(
        (width) => this.onMasonryColumnWidthChanged(width)
      )
    );

    this.subscriptions.add(
      this.toolService.masonryAutoscrollSpeedChanged.subscribe(
        (autoScrollSpeed) => this.onAutoscrollSpeedChanged(autoScrollSpeed)
      )
    );

    this.subscriptions.add(
      this.dataService.monitoringCollectionPause.subscribe(
        (paused) => {
          this.pauseMonitoring = paused;
          this.changeDetectionRef.detectChanges();
        }
      )
    );

    this.subscriptions.add(
      this.toolService.showMasonryTextArea.subscribe(
        shown => this.onTextAreaToggled(shown)
      )
    );

    this.subscriptions.add(
      this.scrollbarMoved.subscribe(
        scrollTop => this.onScrollbarMoved(scrollTop)
      )
    );

    this.subscriptions.add(
      this.toolService.displayFeedWizardModal.subscribe(
        (display) => {
          this.displayFeedWizardModal = display;
          if (!display) {
            this.toolService.displayTabContainerModal.next(true);
          }
          this.changeDetectionRef.detectChanges();
        }
      )
    );
  }



  ngAfterViewInit() {
    // https://localhost?op=adhoc&service=nw&ip=184.105.132.210&side=dst
    this.zone.runOutsideAngular(
      () => window.addEventListener('resize', this.onWindowResize )
    );

    this.isotopeConfig = this.buildIsotopeConfig();
    this.changeDetectionRef.detectChanges();

    this.subscriptions.add(
      this.isotopeConfig.api.subscribe(
        api => this.isotopeApi = api
      )
    );

    this.subscriptions.add(
      this.isotopeConfig.initialized.subscribe(
        initialized => this.isotopeInitialized = initialized
      )
    );

    const toolbar = document.getElementsByClassName('afb-toolbar')[0] as HTMLElement;
    this.toolbarHeight = toolbar.offsetHeight;

    const displaySplashScreen = this.firstLoad && !this.toolService.urlParametersLoaded; // only load the splash screen if we don't have ad hoc query parameters;

    if (displaySplashScreen) {
      // only load the splash screen if we don't have ad hoc query parameters
      this.displaySplashScreenModal = true;
      this.firstLoadTimeout = setTimeout(
        () => this.displaySplashScreenModal = false,
        3000
      );
    }
    else if (!this.firstLoad && !this.toolService.selectedCollection) {
      // open the tab container on subsequent logout/login combos, if a collection wasn't previously selected
      if (this.toolService.urlParametersLoaded) {
        this.toolService.displayTabContainerModal.next(true);
      }
    }

    window.dispatchEvent(new Event('resize'));

    log.debug('MasonryGridComponent: ngAfterViewInit(): creating scroller');
    this.scroller = new Scroller( this.render, this.scrollerOptions, this.zone );
    this.scroller.setDimensions(
      this.scrollContainerRef.nativeElement.clientWidth,
      this.scrollContainerRef.nativeElement.clientHeight,
      this.isotopeContentRef.nativeElement.offsetWidth,
      this.scrollContentHeight
    );
    this.isotopeContentRef.nativeElement.style['transform-origin'] = 'left-top';
    this.scrollContainerRef.nativeElement.addEventListener(
      'wheel',
      this.onMouseWheel,
      { passive: true }
    );

    this.resizeObserver = new window.ResizeObserver( entries => this.onContentHeightChanged(entries) );
    this.zone.runOutsideAngular(
      () => this.resizeObserver.observe(this.isotopeContentRef.nativeElement)
    );

    if (this.toolService.loadCollectionOnRouteChange) {
      log.debug('MasonryGridComponent: ngAfterViewInit(): getting collection data again');
      this.toolService.loadCollectionOnRouteChange = false;
      this.toolService.getCollectionDataAgain.next();
    }

    this.lineHeight = utils.convertEmRelativeToElement(1, this.scrollContainerRef.nativeElement);

    this.zone.runOutsideAngular(
      () => this.scrollContainerRef.nativeElement.addEventListener(
        'keydown',
        this.onKeyPressed
      )
    );
  }



  onSplashScreenClosed() {
    if (this.firstLoadTimeout) {
      clearTimeout(this.firstLoadTimeout);
      this.firstLoadTimeout = undefined;
      this.toolService.firstLoad = false;
      this.firstLoad = false;
      this.changeDetectionRef.detectChanges();
      if (!this.toolService.urlParametersLoaded) {
        // only show the collections tab container if the user hasn't passed in custom url params, like when drilling from an investigation
        this.toolService.displayTabContainerModal.next(true);
      }
    }
  }



  onNextSessionClicked(): void {
    log.debug('MasonryGridComponent: onNextSessionClicked()');
    // get the list of un-filtered tiles
    const displayedTileIds = this.displayedTileIds;

    let nextContentItem: ContentItem | undefined;
    let nextContentItemId: string  | undefined;
    let nextSessionId: number | undefined;

    for (let i = 0; i < displayedTileIds.length; i++) {
      if (displayedTileIds[i] === this.selectedContentId && i < displayedTileIds.length - 1 ) {
        nextContentItemId = displayedTileIds[i + 1];
        log.debug('MasonryGridComponent: onNextSessionClicked(): nextContentItemId:', nextContentItemId);
        break;
      }
    }

    for (const contentItem of this.content) {
      if (contentItem.id === nextContentItemId) {
        nextContentItem = contentItem;
        nextSessionId = contentItem.session;
        break;
      }
    }

    if (nextContentItem && nextSessionId !== undefined) {
      this.selectedSession = this.sessions[nextSessionId];
      this.selectedContent = nextContentItem;
      this.selectedContentId = nextContentItem.id;
      this.updateNextPreviousButtonStatus();
    }
    this.changeDetectionRef.detectChanges();
  }



  onPreviousSessionClicked(): void {
    log.debug('MasonryGridComponent: onPreviousSessionClicked()');
    // get the list of un-filtered tiles
    const displayedTileIds = this.displayedTileIds;
    let previousContentItem: ContentItem | undefined;
    let previousContentItemId: string | undefined;
    let previousSessionId: number | undefined;

    for (let i = 0; i < displayedTileIds.length; i++) {
      if (displayedTileIds[i] === this.selectedContentId && i <= displayedTileIds.length - 1 ) {
        previousContentItemId = displayedTileIds[i - 1];
        break;
      }
    }

    for (const contentItem of this.content) {
      if (contentItem.id === previousContentItemId) {
        previousContentItem = contentItem;
        previousSessionId = contentItem.session;
        break;
      }
    }

    if (previousContentItem && previousSessionId !== undefined) {
      this.selectedSession = this.sessions[previousSessionId];
      this.selectedContent = previousContentItem;
      this.selectedContentId = previousContentItem.id;
      this.updateNextPreviousButtonStatus();
    }
    this.changeDetectionRef.detectChanges();
  }



  updateNextPreviousButtonStatus(): void {
    // log.debug('updateNextPreviousButtonStatus()');
    // get the list of un-filtered tile id's
    const displayedTileIds = this.displayedTileIds;
    for (let i = 0; i < displayedTileIds.length; i++) {
      const tileId = displayedTileIds[i];

      if (tileId === this.selectedContentId) {

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



  onWindowResize = () => {
    log.debug('MasonryGridComponent: onWindowResize()');

    if (this.autoScrollStarted) {
      this.pauseScrollerAnimation();
      this.unpauseAfterResize = true;
    }

    if (this.resizeTimout) {
      clearTimeout(this.resizeTimout);
    }

    this.resizeTimout = this.zone.runOutsideAngular(
      () => setTimeout(
        () => {
          this.scrollContainerHeight = this.scrollContainerRef.nativeElement.clientHeight;
          log.debug('MasonryGridComponent: onWindowResize(): scrollContainerHeight:', this.scrollContainerHeight);

          this.scroller.setDimensions(
            this.scrollContainerRef.nativeElement.clientWidth,
            this.scrollContainerRef.nativeElement.clientHeight,
            this.isotopeContentRef.nativeElement.offsetWidth,
            this.scrollContentHeight
          );

          this.isotopeConfig = this.buildIsotopeConfig();
          this.changeDetectionRef.detectChanges(); // needed to refresh the tiles prior to layout

          if (this.isotopeInitialized) {
            this.isotopeApi.layout(true);
          }

          if (this.scrollTop > this.scrollContentHeight - this.scrollContainerHeight && this.scrollContentHeight > this.scrollContainerHeight) {
            // keep scrollTop in bounds
            this.render(0, this.scrollContentHeight - this.scrollContainerHeight, 1);
          }
          this.resizeTimout = undefined;
        },
        500
      )
    );
  };



  onSearchBarOpen(state: boolean): void {
    this.searchBarOpen = state;
  }



  onRouterEvent(val: AltRouterEvent): void {
    // Take action to destroy masonry when we navigate away - saves us loads of time waiting for all the bricks to be removed and isotope to be destroyed
    // log.debug('MasonryGridComponent: onRouterEvent(): received val:', val);
    if (val instanceof NavigationStart) {
      log.debug('MasonryGridComponent: onRouterEvent(): manually destroying isotope');
      if (this.isotopeInitialized) {
        this.isotopeApi.destroyMe();
      }
    }
  }



  onPreferencesChanged(prefs?: Preferences): void {
    if (!prefs || Object.keys(prefs).length === 0) {
      return;
    }

    log.debug('MasonryGridComponent: onPreferencesChanged()');

    let callLayout = false;

    switch (this.selectedCollectionServiceType) {
      // we must trigger a layout when we change masonry meta keys in preferences
      case 'nw': {
        if ( this.isotopeInitialized && JSON.stringify(prefs.nw.masonryKeys) !== JSON.stringify(this.preferences.nw.masonryKeys) ) {
          log.debug('MasonryGridComponent: onPreferencesChanged(): NW Masonry keys have changed.  Calling Isotope layout');
          callLayout = true;
        }
        this.masonryKeys = prefs.nw.masonryKeys.slice(0);
        break;
      }

      case 'sa': {
        if ( this.isotopeInitialized && JSON.stringify(prefs.sa.masonryKeys) !== JSON.stringify(this.preferences.sa.masonryKeys) ) {
          log.debug('MasonryGridComponent: onPreferencesChanged(): SA Masonry keys have changed.  Calling Isotope layout');
          callLayout = true;
        }
        this.masonryKeys = prefs.sa.masonryKeys.slice(0);
        break;
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
      this.isotopeConfig = this.buildIsotopeConfig();
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



  onSearchTermsTyped(searchTerms: string): void {
    // called directly from toolbar
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    this.searchTermsChanged(searchTerms);
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



  onContentReplaced(content: ContentItem[]) {
    // when a whole new content collection is received
    log.debug('MasonryGridComponent: onContentReplaced(): content:', content);
    this.addWithLayout = this.addWithLayoutSetting;
    content.sort(this.sortContent);
    this.content = content;
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
    (this.imgsLoaded as ImagesLoaded.ImagesLoaded).off('always', this.onImagesLoadedComplete);
    this.imgsLoaded = undefined;
    this.isotopeApi.layout();
    this.isotopeApi.reloadItems();
    this.isotopeApi.unhideAll();
  };



  onSearchReplaced(search: Search[]): void {
    // this receives complete search term data from complete collection
    log.debug('MasonryGridComponent: onSearchReplaced(): search:', search);
    this.search = search;
  }



  onSessionPublished(session: Session): void {
    // when an individual session is pushed from a building collection (or monitoring or rolling)
    log.debug('MasonryGridComponent: onSessionPublished(): session:', session);
    const sessionId = session.id;
    this.sessions[sessionId] = session;
  }



  onContentPublished(newContent: ContentItem[]): void {
    // when a content object is pushed from a still-building fixed, rolling, or monitoring collection
    log.debug('MasonryGridComponent: onContentPublished(): newContent:', newContent);

    if (this.initialLayoutInProgress) {
      log.debug('MasonryGridComponent: onContentPublished(): initialLayoutInProgress === true.  Queing published content before layout.');
      this.queuePublishedContent = true;
    }
    else if (!this.addWithLayout) {
      log.debug('MasonryGridComponent: onContentPublished(): Adding content with immediate layout');
      this.addWithLayout = true;
      this.changeDetectionRef.detectChanges();
    }

    newContent.forEach(content => {
      this.content.push(content);
    });

    // update content counts here to save cycles not calculating image masks
    this.countContent(newContent);

    if (this.searchBarOpen) {
      this.searchTermsChanged(this.lastSearchTerm);
    }
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
    this.resetContentCount();
    this.stopAutoScroll();
    this.selectedCollectionType = undefined;
    this.collectionState = '';
    this.collectionId = undefined;
    this.selectedCollectionServiceType = undefined;
    this.masonryKeys = undefined;
    this.changeDetectionRef.detectChanges();
  }



  onCollectionDeleted(details: CollectionDeletedDetails): void {
    log.debug('MasonryGridComponent: onCollectionDeleted()');
    if (!this.collectionId || (this.collectionId && !this.collectionId.startsWith(details.id))) {
      // this doesn't apply to the current collection
      return;
    }
    this.collectionDeletedUser = details.user;
    this.confirmationService.confirm({
      message: `Ever so sorry, but your chosen collection has been deleted by user ${details.user}`,
      icon: 'pi pi-exclamation-triangle',
      header: 'Collection Deleted',
      rejectVisible: false
    });
    this.dataService.noopCollection.next();
    this.noopCollection();
  }



  onSessionsPurged(sessionsToPurge: number[]): void {
    log.debug('MasonryGridComponent: onSessionsPurged(): sessionsToPurge:', sessionsToPurge);

    if (this.initialLayoutInProgress) {
      this.queuePublishedContent = true;
    }

    if (this.autoScrollStarted) {
      this.pauseScrollerAnimation();
    }
    const searchRemoved = this.purgeSessions(sessionsToPurge);

    this.maskChanged(this.lastMask);
    this.countContent();
    if (searchRemoved && this.searchBarOpen) {
      this.searchTermsChanged(this.lastSearchTerm);
    }
    this.changeDetectionRef.detectChanges();
  }



  onMouseWheel = (wheelEvent: WheelEvent) => {
    // log.debug('MasonryGridComponent: wheelEvent:', wheelEvent);
    if (wheelEvent && wheelEvent.deltaY === 0) {
      // only do anything if we're scrolling vertically
      return;
    }

    if (this.autoScrollStarted) {
      log.debug('MasonryGridComponent: onMouseWheel(): autoscroll is running, so stopping it now');
      this.stopAutoScroll();
    }

    const targetY = this.scrollTop + wheelEvent.deltaY;
    // log.debug('MasonryGridComponent: wheelEvent: scrollContentHeight:', this.scrollContentHeight);
    // log.debug('MasonryGridComponent: wheelEvent: targetY:', targetY);
    if (targetY < 0 || targetY > this.scrollContentHeight - this.scrollContainerHeight) {
      return;
    }
    // scroll the container
    this.render(0, targetY, 1);
  };







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

    const distanceToScroll = Math.round(this.scrollContentHeight) - this.scrollContainerHeight - this.scrollTop; // distance is how far the container needs to scroll in order to hit the end of the content
    log.debug('MasonryGridComponent: startScrollerAnimation(): distanceToScroll:', distanceToScroll);

    const duration = (distanceToScroll / this.pixelsPerSecond) * 1000;
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
    this.autoScrollAnimationRunning = true;

    this.scroller.options.animationDuration = duration;
    this.scroller.setScrollTop(this.scrollTop);
    this.scroller.setDimensions(
      this.scrollContainerRef.nativeElement.clientWidth,
      this.scrollContainerRef.nativeElement.clientHeight,
      this.isotopeContentRef.nativeElement.offsetWidth,
      this.scrollContentHeight
    );
    this.zone.runOutsideAngular( () => {
      this.scroller.scrollBy(0, distanceToScroll, true, true, () => this.onAutoScrollAnimationComplete());
    });
  }



  private render = (left: number, top: number, zoom: number): void => {
    this.scrollTop = top;
    this.isotopeContentRef.nativeElement.style.transform = `translate3d(${(-left)}px,${(-top)}px,0) scale(${zoom})`;
  };



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

    const distanceToScroll = this.scrollContentHeight - this.scrollContainerHeight - this.scrollTop; // distance is how far the container needs to scroll in order to hit the end of the content
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



  onLayoutComplete(): void {
    // this gets called when Isotope finishes a layout operation.  This means that the window height may have potentially grown or shrunk
    // log.debug('MasonryGridComponent: onLayoutComplete(): height:', height);

    if (this.initialLayoutInProgress) {
      log.debug('MasonryGridComponent: onLayoutComplete()');
      this.initialLayoutInProgress = false;

      if (this.queuePublishedContent) {
        // if published content was queued while the initial layout was happening, call another layout() to lay them out, after which
        // every item will be laid out individually by setting addWithLayout to true
        this.queuePublishedContent = false;
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
      this.unpauseAfterResizeTimeout = this.zone.runOutsideAngular(
        () => setTimeout(
          () => {
            this.unpauseAfterResizeTimeout = undefined;
            this.unpauseScrollerAnimation();
          },
          100
        )
      );
    }
  }



  onContentHeightChanged(entries: ResizeObserverEntry[]) {
    log.debug('MasonryGridComponent: onContentHeightChanged(): entry 0 contentRect:', entries[0].contentRect);
    const height = entries[0].contentRect.height;
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
      this.unpauseAfterResizeTimeout = undefined;
      this.autoScrollRestartTimeout = this.zone.runOutsideAngular(
        () => setTimeout(
          () => {
            this.unpauseAfterResizeTimeout = undefined;
            this.unpauseScrollerAnimation();
          },
          25
        )
      );
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
  };



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
    this.toolService.displayContentDetailsModal.next(true);
    if (this.selectedCollectionType === 'monitoring' && this.pauseMonitoring === false) {
      // pause monitoring
      this.suspendMonitoring();
    }
    this.changeDetectionRef.detectChanges();
  }


  maskChanged(contentMask: ContentMask): void {
    this.lastMask = contentMask;
    log.debug('MasonryGridComponent: maskChanged():', contentMask);
    const {showImage, showPdf, showWord, showExcel, showPowerpoint, showHash, showDodgy, showFromArchivesOnly} = contentMask;

    if (showImage && showPdf && showWord && showExcel && showPowerpoint && showHash && showDodgy && !showFromArchivesOnly) {
      this.filter = '*';
      this.changeDetectionRef.detectChanges();
      return;
    }

    const tempFilter = [];
    let fromArchivesOnly = false;

    if (showFromArchivesOnly) {
      fromArchivesOnly = true;
    }
    if (showImage) {
      tempFilter.push('[contentType="image"]');
    }
    if (showPdf) {
      tempFilter.push('[contentType="pdf"]');
    }
    if (showWord) {
      tempFilter.push('[contentSubType="word"]');
    }
    if (showExcel) {
      tempFilter.push('[contentSubType="excel"]');
    }
    if (showPowerpoint) {
      tempFilter.push('[contentSubType="powerpoint"]');
    }
    if (showHash) {
      tempFilter.push('[contentType="hash"]');
    }
    if (showDodgy && !fromArchivesOnly) {
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
    this.searchTermsChanged(this.lastSearchTerm);
  }


  getContentBySession(sessionId: number): ContentItem | void {
    for (const content of this.content) {
      if (content.session === sessionId) {
        return content;
      }
    }
  }


  searchTermsChanged(searchTerms: string): void {
    // log.debug('MasonryGridComponent: searchTermsChanged()');
    this.lastSearchTerm = searchTerms;
    const matchedIds = [];

    if (searchTerms === '') {
      this.maskChanged(this.lastMask);
      this.changeDetectionRef.detectChanges();
      return;
    }

    for (const search of this.search) {
      if (!this.caseSensitiveSearch && search.searchString.toLowerCase().indexOf(searchTerms.toLowerCase()) >= 0) {
        // case-insensitive search
        // we found a match!
        const matchedId = search.id;
        matchedIds.push(`[id="${matchedId}"]`);
      }
      else if (this.caseSensitiveSearch && search.searchString.indexOf(searchTerms) >= 0) {
        // case-sensitive search
        // we found a match!
        const matchedId = search.id;
        matchedIds.push(`[id="${matchedId}"]`);
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
    this.contentCount = new ContentCount();
  }



  private countContent(newContent?: ContentItem[]): void {
    // count content from scratch (if no newContent), or add to existing this.contentCount if newContent is defined
    const contentCount = newContent ? this.contentCount : new ContentCount(); // operate on this.contentCount if newContent is defined
    const tempContent: ContentItem[] = newContent || this.content;
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



  private purgeSessions(sessionsToPurge: number[]): boolean {
    let searchRemoved = false;
    while (sessionsToPurge.length !== 0) {
      const sessionToPurge = sessionsToPurge.shift() as number;

      // Purge content
      const contentsToPurge = this.content.filter(
        (content) => content.session === sessionToPurge
      );

      while (contentsToPurge.length !== 0) {
        const contentToPurge = contentsToPurge.shift() as ContentItem;
        for (let i = 0; i < this.content.length; i++) {
          const content = this.content[i];
          if (contentToPurge.session === content.session && contentToPurge.contentFile === content.contentFile && contentToPurge.contentType === content.contentType) {
            // Purge content
            log.debug(`MasonryGridComponent: purgeSessions(): purging content id ${content.id} for session ${content.session}`);
            this.content.splice(i, 1);
            break;
          }
        }
      }

      const searchesToPurge = this.search.filter(
        (search) => search.session === sessionToPurge
      );

      while (searchesToPurge.length !== 0) {
        const searchToPurge = searchesToPurge.shift() as Search;
        for (let i = this.search.length - 1; i >= 0; i--) {
          const search = this.search[i];
          if (searchToPurge.session === search.session && searchToPurge.contentFile === search.contentFile) {
            // Purge search
            log.debug('MasonryGridComponent: purgeSessions(): purging search', search.session);
            this.search.splice(i, 1);
            searchRemoved = true;
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



  sortContent(a: ContentItem, b: ContentItem): number {
   if (a.session < b.session) {
    return -1;
   }
   if (a.session > b.session) {
    return 1;
   }
   return 0;
  }



  hasSessions(): boolean {
    return Object.keys(this.sessions).length !== 0;
  }



  onTileClicked(tile: MasonryTileComponent) {
    log.debug('MasonryGridComponent: onTileClicked()');
      if (this.selectedCollectionType === 'monitoring' && !this.pauseMonitoring) {
        this.suspendMonitoring();
      }
      this.selectedSession = tile.session;
      this.selectedContent = tile.content;
      this.selectedContentId = tile.content.id;
      this.updateNextPreviousButtonStatus();
      this.changeDetectionRef.detectChanges();
      this.openSessionDetails();
  }



  onScrollbarMoved(scrollTop: number) {
    // log.debug('MasonryGridComponent: onScrollbarMoved(): scrollTop:', scrollTop);
    if (scrollTop < 0 || scrollTop > this.scrollContentHeight - this.scrollContainerHeight) {
      return;
    }
    this.render(0, scrollTop, 1);
  }



  onTextAreaToggled(shown: boolean) {
    log.debug('MasonryGridComponent: onTextAreaToggled(): shown', shown);
    this.showTextArea = shown;
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    this.changeDetectionRef.detectChanges();
    if (this.isotopeInitialized) {
      this.isotopeApi.layout();
    }
  }



  // Keyboard Handlers //

  onKeyPressed = (event: KeyboardEvent) => {
    // log.debug('MasonryGridComponent: onKeyPressed(): event:', event);
    const keyTable = {
      ArrowUp: () => this.onUpArrowPressed(),
      ArrowDown: () => this.onDownArrowPressed(),
      Home: () => this.onHomePressed(),
      End: () => this.onEndPressed(),
      PageDown: () => this.onPageDownPressed(),
      PageUp: () => this.onPageUpPressed()
    };
    if (event.key in keyTable) {
      (keyTable as Record<string, () => void>)[event.key]();
    }
  };



  onHomePressed() {
    log.debug('MasonryGridComponent: onHomePressed()');
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    this.zone.runOutsideAngular( () => {
      this.scroller.setScrollTop(this.scrollTop);
      this.scroller.setDimensions(
        this.scrollContainerRef.nativeElement.clientWidth,
        this.scrollContainerRef.nativeElement.clientHeight,
        this.isotopeContentRef.nativeElement.offsetWidth,
        this.scrollContentHeight
      );
      this.scroller.options.animationDuration = 250;
      this.scroller.scrollTo(0, 0, true);
    });
  }



  onEndPressed() {
    log.debug('MasonryGridComponent: onEndPressed()');
    if (this.autoScrollStarted) {
      this.stopAutoScroll();
    }
    if (this.scrollContentHeight <= this.scrollContainerHeight) {
      return;
    }
    const target = this.scrollContentHeight - this.scrollContainerHeight;
    this.zone.runOutsideAngular( () => {
      this.scroller.setScrollTop(this.scrollTop);
      this.scroller.setDimensions(
        this.scrollContainerRef.nativeElement.clientWidth,
        this.scrollContainerRef.nativeElement.clientHeight,
        this.isotopeContentRef.nativeElement.offsetWidth,
        this.scrollContentHeight
      );
      this.scroller.options.animationDuration = 250;
      this.scroller.scrollTo(0, target, true);
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
    this.zone.runOutsideAngular( () => {
      this.scroller.setScrollTop(this.scrollTop);
      this.scroller.setDimensions(
        this.scrollContainerRef.nativeElement.clientWidth,
        this.scrollContainerRef.nativeElement.clientHeight,
        this.isotopeContentRef.nativeElement.offsetWidth,
        this.scrollContentHeight
      );
      this.scroller.options.animationDuration = 100;
      this.scroller.scrollTo(0, target, true);
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
      this.scroller.setDimensions(
        this.scrollContainerRef.nativeElement.clientWidth,
        this.scrollContainerRef.nativeElement.clientHeight,
        this.isotopeContentRef.nativeElement.offsetWidth,
        this.scrollContentHeight
      );
      this.scroller.options.animationDuration = 100;
      this.scroller.scrollTo(0, target, true);
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
      this.scroller.setDimensions(
        this.scrollContainerRef.nativeElement.clientWidth,
        this.scrollContainerRef.nativeElement.clientHeight,
        this.isotopeContentRef.nativeElement.offsetWidth,
        this.scrollContentHeight
      );
      this.scroller.options.animationDuration = 250;
      this.scroller.scrollTo(0, target, true);
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
      this.scroller.setDimensions(
        this.scrollContainerRef.nativeElement.clientWidth,
        this.scrollContainerRef.nativeElement.clientHeight,
        this.isotopeContentRef.nativeElement.offsetWidth,
        this.scrollContentHeight
      );
      this.scroller.options.animationDuration = 250;
      this.scroller.scrollTo(0, target, true);
    });
  }



  buildIsotopeConfig(): IsotopeConfig {
    const scrollContainer = this.scrollContainerRef.nativeElement as HTMLElement;
    const containerWidth = scrollContainer.clientWidth;

    let numColumns = Math.floor( containerWidth / this.masonryColumnWidth );
    let gutter = 0;
    let remainder;
    while (gutter < this.minGutterPx && numColumns > 1) {
      remainder = containerWidth - (this.masonryColumnWidth * numColumns);
      gutter = Math.floor( remainder / numColumns);
      if (gutter < this.minGutterPx) {
        numColumns--;
      }
    }

    return new IsotopeConfig({
      itemSelector: '.brick',
      resize: false, // we handle this ourselves to prevent change detection on resize
      masonry: {
        columnWidth: this.masonryColumnWidth,
        gutter,
        // gutter: 0,
        horizontalOrder: false, // setting to true will cause column lengths to get out of whack
        fitWidth: false
      }
    });
  }



  onDisplayTabContainerModalChanged(value: boolean) {
    log.debug('MasonryGridComponent: onDisplayTabContainerModalChanged()');
    this.toolService.displayTabContainerModal.next(value);
  }



  onDisplayNwCollectionModalChanged(value: boolean) {
    log.debug('MasonryGridComponent: onDisplayNwCollectionModalChanged()');
    this.toolService.displayNwCollectionModal.next(value);
  }
}
