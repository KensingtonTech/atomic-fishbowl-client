import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  NgZone,
  forwardRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  PanZoomConfig,
  PanZoomModel
} from 'ngx-panzoom';
import { ToolService } from 'services/tool.service';
import { DataService } from 'services/data.service';
import { ContentCount } from 'types/contentcount';
import { ContentMask } from 'types/contentmask';
import {
  Collection,
  ContentItem,
  Search,
  Sessions,
  Session
} from 'types/collection';
import { Preferences } from 'types/preferences';
import { CollectionDeletedDetails } from 'types/collection-deleted-details';
import {
  trigger,
  state,
  transition,
  query,
  animateChild
} from '@angular/animations';
import { Point } from 'types/point';
import { AbstractGrid } from '../abstract-grid.class';
import { DodgyArchiveTypes } from 'types/dodgy-archive-types';
import { SessionsAvailable } from 'types/sessions-available';
import * as log from 'loglevel';
import * as utils from '../utils';
import { ConfirmationService } from 'primeng/api';

interface MouseDownData {
  top: number;
  left: number;
  time: number;
}


@Component({
  selector: 'app-classic-grid-view',
  providers: [{
    provide: AbstractGrid,
    useExisting: forwardRef(() => ClassicGridComponent)
  }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './classic-grid.component.html',
  styleUrls: [
    './classic-grid.component.scss'
  ],
  animations: [
    trigger(
      'zoomInOutParent',
      [
        transition(
          ':leave',
          [
            query('@*', animateChild())
          ]
        )
      ]
    )
  ]
})

export class ClassicGridComponent implements AbstractGrid, OnInit, AfterViewInit, OnDestroy {

  constructor(
    private dataService: DataService,
    private changeDetectionRef: ChangeDetectorRef,
    private toolService: ToolService,
    private zone: NgZone,
    private confirmationService: ConfirmationService
  ) {}

  @ViewChild('gridItems') gridItems: ElementRef;
  @ViewChild('classicGridElement', { static: true }) private classicGridElement: ElementRef;

  // preferences
  preferences: Preferences;
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

  // high-level session, content, and search data pushed from server
  content: ContentItem[] = [];
  contentCount = new ContentCount();
  private search: Search[] = [];
  sessions: Sessions;

  // collection information
  selectedCollectionType?: string;
  selectedCollectionServiceType?: 'nw' | 'sa'; // 'nw' or 'sa'
  collectionId?: string;
  collectionDeletedUser = ''; // holds the username of the user who deletes a collection
  private collectionState = ''; // initial, building, rolling, etc
  destroyView = true;

  // pan-zoom
  panzoomConfig = new PanZoomConfig({
    zoomLevels: 10,
    scalePerZoomLevel: 2.0,
    zoomStepDuration: 0.2,
    freeMouseWheelFactor: 0.01,
    zoomToFitZoomLevelFactor: 0.9
  });
  private panzoomModel: PanZoomModel;
  private lastPanzoomModel: PanZoomModel;
  canvasWidth = 2400;
  initialZoomHeight: number; // set in resetZoomToFit()
  initialZoomWidth = this.canvasWidth;

  // session viewer
  selectedSession: Session;
  selectedContent: ContentItem;
  private selectedContentId: string;
  sessionsAvailable: SessionsAvailable = {
    previous: false,
    next: false
  };

  // session widget and high-res sessions
  private transitionZoomLevel = 3.9;
  sessionWidgetEnabled = false;
  popUpSession?: Session;
  hoveredContentSession: number;
  highResSessions: boolean[] = [];
  loadAllHighResImages = false;
  private tooFarOutForHighRes = true;
  private center: Point;
  private wheelPoint: Point = {
    x: 0,
    y: 0
  };
  private lastWheelPoint: Point;
  private firstRun = true;
  private mouseDownData: MouseDownData; // prevent opening session viewer modal if dragging the view

  // search and filtering
  displayedContent: boolean[] = []; // now changing to be 1:1 with this.content, with every member as boolean
  private caseSensitiveSearch = false;
  private lastSearchTerm = '';
  private lastMask = new ContentMask();
  private searchBarOpen = false;

  // monitoring collections
  pauseMonitoring = false;





  // Subscription holders
  private subscriptions = new Subscription();



  ngOnDestroy(): void {
    log.debug('ClassicGridComponent: ngOnDestroy()');
    this.subscriptions.unsubscribe();
    this.toolService.addNwAdhocCollectionNext.next({});
    this.toolService.addSaAdhocCollectionNext.next({});
  }



  resetZoomToFit(): void {
    // log.debug('ClassicGridComponent: resetZoomToFit()');
    let height = this.classicGridElement.nativeElement.clientHeight;
    const width = this.classicGridElement.nativeElement.clientWidth;
    height = this.canvasWidth * height / width;
    this.panzoomConfig.initialZoomToFit = { x: 0, y: -85, width: this.canvasWidth, height };
    this.initialZoomHeight = height;
  }



  ngOnInit(): void {
    // https://localhost?op=adhoc&service=nw&ip=184.105.132.210&side=dst
    log.debug('ClassicGridComponent: ngOnInit()');
    this.toolService.lastRoute = 'classicGrid';
    this.toolService.setPreference('lastRoute', 'classicGrid');

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

    // pan-zoom
    this.subscriptions.add(
      this.panzoomConfig.modelChanged.subscribe(
        (model: PanZoomModel) => this.onModelChanged(model)
      )
    );

    // Take subscriptions

    this.subscriptions.add(
      this.dataService.collectionDeleted.subscribe(
        (details: CollectionDeletedDetails) => this.onCollectionDeleted(details)
      )
    );

    this.subscriptions.add(
      this.dataService.selectedCollectionChanged.subscribe(
        (collection) => this.onSelectedCollectionChanged(collection)
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
        (newContent) => this.onContentPublished(newContent)
      )
    );

    this.subscriptions.add(
      this.dataService.searchReplaced.subscribe(
        (searches) => this.onSearchReplaced(searches)
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
      this.dataService.monitoringCollectionPause.subscribe(
        (paused) => {
          this.pauseMonitoring = paused;
          this.changeDetectionRef.detectChanges();
        }
      )
    );

    this.subscriptions.add(
      this.dataService.preferencesChanged.subscribe(
        (prefs) => this.onPreferencesChanged(prefs)
      )
    );

    this.zone.runOutsideAngular(
      () => this.classicGridElement.nativeElement.addEventListener('wheel', this.onWheel, { passive: true })
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



  ngAfterViewInit(): void {
    // https://localhost?op=adhoc&service=nw&ip=184.105.132.210&side=dst
    this.resetZoomToFit();
    if (this.toolService.loadCollectionOnRouteChange) {
      log.debug('ClassicGridComponent: ngAfterViewInit(): getting collection data again');
      this.toolService.loadCollectionOnRouteChange = false;
      this.toolService.getCollectionDataAgain.next();
    }
    this.changeDetectionRef.detectChanges();
    this.center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
    this.wheelPoint = utils.deepCopy(this.center);

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



  onPreferencesChanged(prefs: Preferences | undefined): void {
    log.debug('ClassicGridComponent: onPreferencesChanged()');
    if (!prefs) {
      return;
    }
    this.preferences = utils.deepCopy(prefs);
  }



  onNextSessionClicked(): void {
    // log.debug('ClassicGridComponent: onNextSessionClicked()');
    // build a list of un-filtered tile id's
    const displayedTileIds: string[] = [];
    this.content.forEach( (contentItem, i) => {
      if (this.displayedContent[i] === true) {
        displayedTileIds.push(contentItem.id);
      }
    });
    // log.debug('ClassicGridComponent: onNextSessionClicked(): displayedTileIds:', displayedTileIds);

    let nextContentItem: ContentItem | undefined;
    let nextContentItemId: string | undefined;
    let nextSessionId: number | undefined;
    for (let i = 0; i < displayedTileIds.length; i++) {
      if (displayedTileIds[i] === this.selectedContentId && i < displayedTileIds.length - 1 ) {
        nextContentItemId = displayedTileIds[i + 1];
        log.debug('ClassicGridComponent: onNextSessionClicked(): nextContentItemId:', nextContentItemId);
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

    if (nextContentItem && nextContentItemId && nextSessionId !== undefined) {
      log.debug('ClassicGridComponent: onNextSessionClicked(): nextContentItem:', nextContentItem);
      log.debug('ClassicGridComponent: onNextSessionClicked(): nextSessionId:', nextSessionId);
      this.selectedSession = this.sessions[nextSessionId];
      this.selectedContent = nextContentItem;
      this.selectedContentId = nextContentItem.id;
      this.updateNextPreviousButtonStatus();
    }
    this.changeDetectionRef.detectChanges();
  }



  onPreviousSessionClicked(): void {
    // log.debug('ClassicGridComponent: onPreviousSessionClicked()');
    // build a list of un-filtered tile id's
    const displayedTileIds: string[] = [];
    this.content.forEach( (contentItem, i) => {
      if (this.displayedContent[i] === true) {
        displayedTileIds.push(contentItem.id);
      }
    });
    // log.debug('ClassicGridComponent: onPreviousSessionClicked(): displayedTileIds:', displayedTileIds);
    let previousContentItem: ContentItem | undefined;
    let previousContentItemId: string | undefined;
    let previousSessionId: number | undefined;
    for (let i = 0; i < displayedTileIds.length; i++) {
      if (displayedTileIds[i] === this.selectedContentId && i <= displayedTileIds.length - 1 ) {
        previousContentItemId = displayedTileIds[i - 1];
        log.debug('ClassicGridComponent: onPreviousSessionClicked(): previousContentItemId:', previousContentItemId);
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

    if (previousContentItem && previousContentItemId && previousSessionId !== undefined) {
      log.debug('ClassicGridComponent: onPreviousSessionClicked(): previousContentItem:', previousContentItem);
      log.debug('ClassicGridComponent: onPreviousSessionClicked(): previousSessionId:', previousSessionId);
      this.selectedSession = this.sessions[previousSessionId];
      this.selectedContent = previousContentItem;
      this.selectedContentId = previousContentItem.id;
      this.updateNextPreviousButtonStatus();
    }
    this.changeDetectionRef.detectChanges();
  }



  updateNextPreviousButtonStatus(): void {
    // build a list of un-filtered tile id's
    const displayedTileIds: string[] = [];
    this.content.forEach( (contentItem, i) => {
      if (this.displayedContent[i] === true) {
        displayedTileIds.push(contentItem.id);
      }
    });

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
          // this is the first displayed item.  disable the item button
          this.sessionsAvailable.previous = false;
        }
        else {
          // this is not the first displayed item.  enable the item button
          this.sessionsAvailable.previous = true;
        }

        this.sessionsAvailable = utils.deepCopy(this.sessionsAvailable);
        log.debug('ClassicGridComponent: updateNextPreviousButtonStatus(): previousSessionAvailable:', this.sessionsAvailable.previous);
        log.debug('ClassicGridComponent: updateNextPreviousButtonStatus(): nextSessionAvailable:', this.sessionsAvailable.next);
        break;
      }
    }
  }



  onSelectedCollectionChanged(collection: Collection): void {
    // this triggers whenever we select a new collection - it's job is to reset all collection state
    log.debug('ClassicGridComponent: onSelectedCollectionChanged(): selectedCollectionChanged:', collection);
    this.destroyView = true;
    this.displayedContent = [];
    this.highResSessions = [];
    this.search = [];
    this.sessions = {};
    this.content = [];
    this.loadAllHighResImages = false;
    this.resetContentCount();
    this.selectedCollectionType = collection.type;
    this.collectionState = collection.state;
    this.selectedCollectionServiceType = collection.serviceType; // 'nw' or 'sa'
    if (collection.type === 'monitoring') {
      this.collectionId = collection.id + '_' + this.dataService.clientSessionId;
    }
    else {
      this.collectionId = collection.id;
    }
    this.pauseMonitoring = false;
    this.sessionWidgetEnabled = false;
    this.changeDetectionRef.detectChanges();
  }



  onSessionsReplaced(sessions: Sessions): void {
    // when a different collection is selected - this is when the actual sessions gets pushed out from the server.
    // This happens after onSelectedCollectionChanged, but before onContentReplaced() and onSearchReplaced()
    log.debug('ClassicGridComponent: onSessionsReplaced(): sessionsReplaced:', sessions);
    this.sessions = sessions;
  }



  onContentReplaced(content: ContentItem[]): void {
    // when a new collection is selected - this is when complete collection content gets pushed out from the server.
    // This happens after onSelectedCollectionChanged() and after onSessionsReplaced(), but before onSearchReplaced()
    log.debug('ClassicGridComponent: onContentReplaced(): contentReplaced:', content);
    this.destroyView = true;
    this.content = content.sort(this.sortContentFunc);
    this.displayedContent = [];
    this.content.forEach( () => {
      this.displayedContent.push(true); // set all content to visible
    });
    this.countContent();
    this.destroyView = false;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.sessionWidgetDecider();
    // this.panZoomAPI.zoomToFit( {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight });
    this.changeDetectionRef.detectChanges();
    // this.zone.runOutsideAngular( () => wrapGrid(this.gridItems.nativeElement) );
  }



  onSearchReplaced(search: Search[]): void {
    // when a new collection is selected - this is when complete search term data gets pushed out from the server.
    // This happens after onSelectedCollectionChanged(), onSessionsReplaced(), and onContentReplaced()
    log.debug('ClassicGridComponent: onSearchReplaced(): searchReplaced:', search);
    this.search = search;
  }



  onSessionPublished(session: Session): void {
    // when an individual session is pushed from a building collection (or monitoring or rolling).  This should always precede the onContentPublished() event for the same session
    log.debug('ClassicGridComponent: onSessionPublished(): sessionPublished', session);
    const sessionId = session.id;
    this.sessions[sessionId] = session;
  }



  onContentPublished(newContent: ContentItem[]): void {
    // when one or more content items are pushed from a still-building rolling, or monitoring collection
    // there may be more than one content item per session
    log.debug('ClassicGridComponent: onContentPublished(): contentPublished:', newContent);

    if (this.destroyView) {
      this.destroyView = false;
    }

    newContent.forEach(content => {
      this.content.push(content);
      this.highResSessions.push(false); // default to low-res
      this.displayedContent.push(true);
    });

    // update content counts here to save cycles not calculating image masks
    this.countContent(newContent);

    this.onSearchTermsTyped(this.lastSearchTerm);
    this.changeDetectionRef.detectChanges();
    this.sessionWidgetDecider();
  }



  onSearchPublished(search: Search[]): void {
    // this receives partial search term data from a building collection
    log.debug('ClassicGridComponent: onSearchPublished(): searchPublished:', search);
    search.forEach( item => {
      this.search.push(item);
    });
  }



  onSessionsPurged(sessionsToPurge: number[]): void {
    log.debug('ClassicGridComponent: onSessionsPurged(): sessionsPurged:', sessionsToPurge);

    const searchRemoved = this.purgeSessions(sessionsToPurge);

// !!! this displayedContent line should be revisited so that it takes in to account last mask and search!!!
    // this.displayedContent = this.content.sort(this.sortContentFunc);
// !!!

    this.onMaskChanged(this.lastMask);
    this.countContent();
    if (searchRemoved && this.searchBarOpen) {
      this.onSearchTermsTyped(this.lastSearchTerm);
    }
  }



  onCollectionStateChanged(collectionState: string): void {
    // this triggers when a monitoring collection refreshes
    log.debug('ClassicGridComponent: onCollectionStateChanged(): collectionStateChanged:', state);
    this.collectionState = collectionState;
    if (collectionState === 'monitoring')  {
      this.destroyView = true;
      this.search = [];
      this.sessions = {};
      this.content = [];
      this.displayedContent = [];
      this.highResSessions = [];
      this.loadAllHighResImages = false;
      this.resetContentCount();
      this.changeDetectionRef.detectChanges();
      this.destroyView = false;
      this.changeDetectionRef.detectChanges();
    }
  }



  onCollectionDeleted(details: CollectionDeletedDetails): void {
    log.debug('ClassicGridComponent: onCollectionDeleted()');
    if (!this.collectionId || (this.collectionId && !this.collectionId.startsWith(details.id))) {
      // this doesn't apply to the current collection
      return;
    }
    this.collectionDeletedUser = details.user;
    this.dataService.noopCollection.next();
    this.confirmationService.confirm({
      message: `Ever so sorry, but your chosen collection has been deleted by user ${details.user}`,
      rejectVisible: false
    });
    this.noopCollection();
  }



  noopCollection() {
    log.debug('ClassicGridComponent: noopCollection()');
    this.destroyView = true;
    this.displayedContent = [];
    this.highResSessions = [];
    this.search = [];
    this.sessions = {};
    this.content = [];
    this.resetContentCount();
    this.loadAllHighResImages = false;
    this.selectedCollectionType = undefined;
    this.collectionState = '';
    this.collectionId = undefined;
    this.selectedCollectionServiceType = undefined;
    this.changeDetectionRef.detectChanges();
  }



  onSearchBarOpen(searchBarState: boolean): void {
    this.searchBarOpen = searchBarState;
  }



  onModelChanged(model: PanZoomModel): void {
    this.panzoomModel = model;
    this.sessionWidgetDecider();
  }



  onWindowResize(): void {
    log.debug('ClassicGridComponent: onWindowResize()');
    this.center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
    this.resetZoomToFit();
  }



  private sortContentFunc(a: ContentItem, b: ContentItem): number {
   if (a.session < b.session) {
    return -1;
   }
   if (a.session > b.session) {
    return 1;
   }
   return 0;
  }



  openSessionDetails(): void {
    log.debug('ClassicGridComponent: openSessionDetails()');
    this.toolService.displayContentDetailsModal.next(true);
    this.changeDetectionRef.detectChanges();
  }



  onMaskChanged(mask: ContentMask): void {
    this.lastMask = mask;
    log.debug('ClassicGridComponent: onMaskChanged():', mask);

    if (mask.showImage && mask.showPdf && mask.showWord && mask.showExcel && mask.showPowerpoint && mask.showHash && mask.showDodgy && !mask.showFromArchivesOnly) {
      const tmpDisplayedContent: boolean[] = this.content.map( () => true );
      this.displayedContent = tmpDisplayedContent;
      this.changeDetectionRef.detectChanges();
      return;
    }

    let contentIdsidsWeWant: string[] = [];
    const tempDisplayedContent: boolean[] = [];
    const fromArchivesOnly = mask.showFromArchivesOnly ? true : false;

    if (mask.showImage) {
      contentIdsidsWeWant = contentIdsidsWeWant.concat(this.getContentIdsByType('image', fromArchivesOnly));
    }
    if (mask.showPdf) {
      contentIdsidsWeWant = contentIdsidsWeWant.concat(this.getContentIdsByType('pdf', fromArchivesOnly));
    }
    if (mask.showWord) {
      contentIdsidsWeWant = contentIdsidsWeWant.concat(this.getContentIdsByType('word', fromArchivesOnly));
    }
    if (mask.showExcel) {
      contentIdsidsWeWant = contentIdsidsWeWant.concat(this.getContentIdsByType('excel', fromArchivesOnly));
    }
    if (mask.showPowerpoint) {
      contentIdsidsWeWant = contentIdsidsWeWant.concat(this.getContentIdsByType('powerpoint', fromArchivesOnly));
    }
    if (mask.showHash) {
      contentIdsidsWeWant = contentIdsidsWeWant.concat(this.getContentIdsByType('hash', fromArchivesOnly));
    }
    if (mask.showDodgy && !fromArchivesOnly) {
      contentIdsidsWeWant = contentIdsidsWeWant.concat(this.getContentIdsByType('unsupportedZipEntry', fromArchivesOnly));
      contentIdsidsWeWant = contentIdsidsWeWant.concat(this.getContentIdsByType('encryptedZipEntry', fromArchivesOnly));
      contentIdsidsWeWant = contentIdsidsWeWant.concat(this.getContentIdsByType('encryptedRarEntry', fromArchivesOnly));
      contentIdsidsWeWant = contentIdsidsWeWant.concat(this.getContentIdsByType('encryptedRarTable', fromArchivesOnly));
    }

    this.content.forEach( (item, i) => {
      if (contentIdsidsWeWant.includes(item.id)) {
        tempDisplayedContent.push(true);
      }
      else {
        tempDisplayedContent.push(false);
      }
    });
    this.displayedContent = tempDisplayedContent;
    this.changeDetectionRef.detectChanges();
  }



  private sessionWidgetDecider(): void {
    // gets called from onContentPublished(), onContentReplaced(), and onModelChanged()
    // decides if the session widget needs to be displayed
    // log.debug('ClassicGridComponent: sessionWidgetDecider()');
    if (!(this.panzoomModel)) {
      return;
    }

    if (this.firstRun) {
      this.firstRun = false;
      return;
    }

    const tooFarOutForHighRes = this.panzoomModel.zoomLevel < this.transitionZoomLevel;

    if (tooFarOutForHighRes && this.tooFarOutForHighRes === tooFarOutForHighRes) {
      // we were already too far out so we don't need to do any more checking
      return;
    }
    else if (tooFarOutForHighRes && this.tooFarOutForHighRes !== tooFarOutForHighRes) {
      // we just got too far out, so turn off all high-res sessions
      this.tooFarOutForHighRes = true;
      log.debug('ClassicGridComponent: sessionWidgetDecider(): switching off high-res images');
      const tempHighResSessions: boolean[] = this.content.map( () => false );
      this.highResSessions = tempHighResSessions;
      if (this.sessionWidgetEnabled) {
        this.hideSessionWidget(); // changes detected within
      }
      else {
        this.changeDetectionRef.detectChanges();
      }
      return;
    }

    const isZooming = this.panzoomModel && this.lastPanzoomModel && this.panzoomModel.zoomLevel !== this.lastPanzoomModel.zoomLevel;

    if (this.tooFarOutForHighRes === tooFarOutForHighRes &&
        this.lastWheelPoint && this.wheelPoint &&
        isZooming &&
        this.wheelPoint.x === this.lastWheelPoint.x &&
        this.wheelPoint.y === this.lastWheelPoint.y) {
          // zoom has changed but the wheel point hasn't.  we were already far enough in, so do nothing
          this.lastWheelPoint = utils.deepCopy(this.wheelPoint);
          this.lastPanzoomModel = utils.deepCopy(this.panzoomModel);
          return;
    }

    // log.debug('ClassicGridComponent: sessionWidgetDecider(): making a decision');

    this.lastWheelPoint = utils.deepCopy(this.wheelPoint);
    this.lastPanzoomModel = utils.deepCopy(this.panzoomModel);
    this.tooFarOutForHighRes = false;

    const focusedElement = isZooming
      ? document.elementFromPoint(this.wheelPoint.x, this.wheelPoint.y)
      : document.elementFromPoint(this.center.x, this.center.y);

    if (!focusedElement || !focusedElement.classList.contains('thumbnail') || focusedElement.nodeName !== 'IMG') {
      if (this.sessionWidgetEnabled) {
        this.hideSessionWidget();
      }
      return;
    }

    if (!this.sessionWidgetEnabled) {
    /*if (
      !this.previousFocusedElement
      || ( this.previousFocusedElement.isSameNode(focusedElement) && !this.sessionWidgetEnabled && focusedElement.nodeName === 'IMG' )
      || ( this.previousFocusedElement && !this.previousFocusedElement.isSameNode(focusedElement) && focusedElement.nodeName === 'IMG' && focusedElement.hasAttribute('contentfile') ) ) {*/

        const focusedTile = focusedElement?.parentNode?.parentElement;

        if ( focusedTile?.nodeName === 'APP-CLASSIC-TILE' ) {

          const sessionsForHighRes = [];
          sessionsForHighRes.push(Number(focusedTile.getAttribute('sessionid')));

          const previousElementSibling = focusedTile.previousElementSibling;
          if (previousElementSibling && previousElementSibling.nodeName === 'APP-CLASSIC-TILE' ) {
            sessionsForHighRes.push(Number(previousElementSibling.getAttribute('sessionid')));
          }

          const nextElementSibling = focusedTile.nextElementSibling;
          if (nextElementSibling && nextElementSibling.nodeName === 'APP-CLASSIC-TILE' ) {
            sessionsForHighRes.push(Number(nextElementSibling.getAttribute('sessionid')));
          }

          this.showSessionWidget( sessionsForHighRes[0], sessionsForHighRes );
        }
      }
  }



  private showSessionWidget(sessionId: number, sessionsForHighRes: number[] ): void {
    // log.debug('ClassicGridComponent: showSessionWidget()', {sessionId});
    this.hoveredContentSession = sessionId;
    this.popUpSession = this.sessions[sessionId];

    const tempHighResSession: boolean[] = [];
    this.content.forEach( content => {
      if (sessionsForHighRes.includes(content.session)) {
        tempHighResSession.push(true);
      }
      else {
        tempHighResSession.push(false);
      }
    });
    this.highResSessions = tempHighResSession;

    this.sessionWidgetEnabled = true;
    this.changeDetectionRef.detectChanges();
  }



  private hideSessionWidget(): void {
    // log.debug("ClassicGridComponent: hideSessionWidget()");
    this.sessionWidgetEnabled = false;
    this.changeDetectionRef.detectChanges();
  }



  onToggleCaseSensitiveSearch(): void {
    log.debug('ClassicGridComponent: onToggleCaseSensitiveSearch()');
    this.caseSensitiveSearch = !this.caseSensitiveSearch;
    this.onSearchTermsTyped(this.lastSearchTerm);
  }



  onSearchTermsTyped(searchTerm: string): void {
    this.lastSearchTerm = searchTerm;

    if (!searchTerm) {
      this.onMaskChanged(this.lastMask);
      this.changeDetectionRef.detectChanges();
      return;
    }

    const matchedIds = this.search
      .filter( (search) =>
        (!this.caseSensitiveSearch && search.searchString.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0) // case-insensitive search
        || (this.caseSensitiveSearch && search.searchString.indexOf(searchTerm) >= 0) // case-sensitive search
      )
      .map( (search) => search.id );

    let tempDisplayedContent: boolean[] = [];
    if (matchedIds.length === 0) {
      tempDisplayedContent = this.content.map( () => false);
    }
    else {
      tempDisplayedContent = this.content.map(
        (content) => matchedIds.includes(content.id)
          ? true
          : false
      );
    }
    this.displayedContent = tempDisplayedContent;
    this.changeDetectionRef.detectChanges();
  }



  private resetContentCount(): void {
    this.contentCount = new ContentCount();
  }



  private countContent(newContent?: ContentItem[]): void {
    // count content from scratch (if no newContent), or add to existing this.contentCount if newContent is defined
    const contentCount = newContent
      ? this.contentCount
      : new ContentCount(); // operate on this.contentCount if newContent is defined
    const tempContent: ContentItem[] = newContent ?? this.content;
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



  private getContentIdsByType(type: string, fromArchiveOnly: boolean): string[] {
    const temp: string[] = [];
    this.content.forEach( (item: ContentItem, i) => {
      if (!fromArchiveOnly && ( item.contentType === type || ('contentSubType' in item && item.contentSubType === type) ) ) {
        temp.push(item.id);
      }
      else if (fromArchiveOnly && item.fromArchive && ( item.contentType === type || ('contentSubType' in item && item.contentSubType === type) ) ) {
        temp.push(item.id);
      }
    });
    return temp;
  }



  private purgeSessions(sessionsToPurge: number[]): boolean {
    let searchRemoved = false;
    while (sessionsToPurge.length !== 0) {
      const sessionToPurge = sessionsToPurge.shift() as number;

      // Purge content
      const contentsToPurge = this.content.filter( (content) => content.session === sessionToPurge );

      while (contentsToPurge.length !== 0) {
        const contentToPurge = contentsToPurge.shift() as ContentItem;
        for (let i = this.content.length - 1; i >= 0; i--) {
          const content = this.content[i];
          if (contentToPurge.session === content.session && contentToPurge.contentFile === content.contentFile && contentToPurge.contentType === content.contentType) {
            // Purge content
            log.debug('ClassicGridComponent: purgeSessions(): purging content', content.session);
            this.content.splice(i, 1);
            break;
          }
        }
      }

      const searchesToPurge = this.search.filter( (search) => search.session === sessionToPurge);

      while (searchesToPurge.length !== 0) {
        const searchToPurge = searchesToPurge.shift() as Search;
        for (let i = 0; i < this.search.length; i++) {
          const search = this.search[i];
          if (searchToPurge.session === search.session && searchToPurge.contentFile === search.contentFile) {
            // Purge search
            log.debug('ClassicGridComponent: purgeSessions(): purging search', search.session);
            this.search.splice(i, 1);
            searchRemoved = true;
            break;
          }
        }
      }
    }
    return searchRemoved;
  }



  suspendMonitoring(): void {
    // this.pauseMonitoring = true; // pauseMonitoring will be updated after server push
    this.dataService.pauseMonitoringCollection();
  }



  resumeMonitoring(): void {
    // this.pauseMonitoring = false; // pauseMonitoring will be updated after server push
    this.dataService.unpauseMonitoringCollection();
  }



  onWheel = (event: MouseEvent) => {
    this.wheelPoint.x = event.pageX;
    this.wheelPoint.y = event.pageY;
  };



  onMouseDown(event: MouseEvent): void {
    this.mouseDownData = {
      top: event.pageX,
      left: event.pageY,
      time: event.timeStamp
    };
  }



  onMouseUp(event: MouseEvent): void {
    // log.debug('ClassicGridComponent: onMouseUp(): event:', event);
    const target = event.target as HTMLElement | undefined;
    const top   = event.pageX;
    const left  = event.pageY;
    const ptop  = this.mouseDownData.top;
    const pleft = this.mouseDownData.left;
    // prevent opening pdf modal if dragging the view
    if (Math.abs(top - ptop) === 0 || Math.abs(left - pleft) === 0) {

      if (target?.tagName === 'IMG') {
        // set session and open session viewer
        if (this.selectedCollectionType === 'monitoring' && !this.pauseMonitoring) {
          this.suspendMonitoring();
        }
        const currentTarget = event.currentTarget as HTMLElement | undefined;
        const sessionId = currentTarget?.getAttribute('sessionId')  as unknown as number | undefined;
        const contentId = currentTarget?.getAttribute('id');
        if (sessionId !== undefined && contentId) {
          this.selectedSession = this.sessions[sessionId];
          this.selectedContent = utils.getArrayMemberByObjectAttribute(this.content, 'id', contentId);
          this.selectedContentId = contentId;
          this.updateNextPreviousButtonStatus();
          this.changeDetectionRef.detectChanges();
          this.openSessionDetails();
        }
      }
    }
  }



  onDisplayTabContainerModalChanged(value: boolean) {
    this.toolService.displayTabContainerModal.next(value);
  }



  onDisplayNwCollectionModalChanged(value: boolean) {
    this.toolService.displayNwCollectionModal.next(value);
  }



  onDisplayFeedWizardModalChanged(value: boolean) {
    this.toolService.displayFeedWizardModal.next(value);
  }

}
