import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy, NgZone, forwardRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { PanZoomConfig, PanZoomAPI, PanZoomModel } from 'ng2-panzoom';
import { ToolService } from 'services/tool.service';
import { DataService } from 'services/data.service';
import { Content, Contents } from 'types/content';
import { ModalService } from '../modal/modal.service';
import { ContentCount } from 'types/contentcount';
import { ContentMask } from 'types/contentmask';
import { Collection } from 'types/collection';
import { Preferences } from 'types/preferences';
import { Search } from 'types/search';
import { License } from 'types/license';
import { CollectionDeletedDetails } from 'types/collection-deleted-details';
import { trigger, state, transition, query, animateChild } from '@angular/animations';
import { Point } from 'types/point';
import { Sessions, Session } from 'types/session';
import { AbstractGrid } from '../abstract-grid.class';
import { DodgyArchiveTypes } from 'types/dodgy-archive-types';
import { SessionsAvailable } from 'types/sessions-available';
import * as log from 'loglevel';
import * as utils from '../utils';


@Component({
  selector: 'classic-grid-view',
  providers: [ { provide: AbstractGrid, useExisting: forwardRef(() => ClassicGridComponent ) } ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div #classicGridElement class="classic-grid-element" (window:resize)="onWindowResize()" style="height: 100%; width: 100%; overflow: hidden;">

  <pan-zoom *ngIf="content && displayedContent && !destroyView && highResSessions" [config]="panzoomConfig">

    <div class="bg noselect gridItems classic-grid-container" #gridItems style="position: relative;" [style.width.px]="canvasWidth">

      <!--@zoomInOutParent-->

      <classic-tile @zoomInOutParent *ngFor="let item of content; index as i;" [collectionId]="collectionId" [content]="item" [attr.sessionId]="item.session" [attr.id]="item.id" [loadHighRes]="loadAllHighResImages" [showHighRes]="highResSessions[i]" [hide]="!displayedContent[i]" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)">
      </classic-tile>

    </div>

  </pan-zoom>

</div>

<div class="classic-left-bar" fxLayout="column" fxLayoutAlign="start start">

  <!-- control bar -->
  <control-bar-classic *ngIf="panzoomConfig" fxFlexOffset="2em" [panzoomConfig]="panzoomConfig" [initialZoomWidth]="initialZoomWidth" [initialZoomHeight]="initialZoomHeight"></control-bar-classic>

  <!-- pause / resume buttons for monitoring collections -->
  <div *ngIf="selectedCollectionType == 'monitoring'" class="monitoringBox" fxFlexOffset=".5em" style="color: white;">
    <i *ngIf="!pauseMonitoring" class="fa fa-pause-circle-o fa-4x" (click)="suspendMonitoring()"></i>
    <i *ngIf="pauseMonitoring" class="fa fa-play-circle-o fa-4x" (click)="resumeMonitoring()"></i>
  </div>

  <!-- content count -->
  <content-count-widget *ngIf="selectedCollectionType" [contentCount]="contentCount"></content-count-widget>

</div>


<!-- toolbar -->
<toolbar-widget [contentCount]="contentCount"></toolbar-widget>

<!-- session popup -->
<classic-session-popup *ngIf="selectedCollectionServiceType" [enabled]="sessionWidgetEnabled" #sessionWidget>
  <meta-widget [session]="popUpSession" [serviceType]="selectedCollectionServiceType" styleClass="popupSessionWidget"></meta-widget>
</classic-session-popup>

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
  animations: [
    trigger('zoomInOutParent', [
      transition(':leave', [
        query('@*', animateChild())
      ])
    ])
  ]
})

export class ClassicGridComponent implements AbstractGrid, OnInit, AfterViewInit, OnDestroy {

  constructor(  private dataService: DataService,
                private el: ElementRef,
                private modalService: ModalService,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService,
                private router: Router,
                private route: ActivatedRoute,
                private zone: NgZone ) {}

  @ViewChild('classicGridElement', { static: true }) private classicGridElement: ElementRef;
  @ViewChild('gridItems') public gridItems: ElementRef;

  // preferences
  public preferences: Preferences;

  // high-level session, content, and search data pushed from server
  public content: Content[] = [];
  public contentObj: Contents = {}; // contains every item of content, indexed by its content id
  public contentCount = new ContentCount;
  private search: Search[] = [];
  public sessions: Sessions;

  // collection information
  public selectedCollectionType: string = null;
  public selectedCollectionServiceType: string = null; // 'nw' or 'sa'
  private collectionId: string = null;
  public collectionDeletedUser = ''; // holds the username of the user who deletes a collection
  private collectionState = ''; // initial, building, rolling, etc
  public destroyView = true;

  // pan-zoom
  public panzoomConfig = new PanZoomConfig({
    zoomLevels: 10,
    scalePerZoomLevel: 2.0,
    zoomStepDuration: 0.2,
    freeMouseWheelFactor: 0.01,
    zoomToFitZoomLevelFactor: 0.9
  });
  private panzoomModel: PanZoomModel;
  private lastPanzoomModel: PanZoomModel;
  private panZoomAPI: PanZoomAPI;
  public canvasWidth = 2400;
  public initialZoomHeight: number = null; // set in resetZoomToFit()
  public initialZoomWidth = this.canvasWidth;

  // session viewer
  public selectedSession: Session;
  public selectedContent: Content;
  private selectedContentId: string = null;
  public sessionsAvailable: SessionsAvailable = { previous: false, next: false };
  private selectedContentType: string = null;

  // session widget and high-res sessions
  private transitionZoomLevel = 3.9;
  public sessionWidgetEnabled = false;
  public popUpSession: any;
  public hoveredContentSession: number;
  public highResSessions: boolean[] = [];
  private previousFocusedElement: Node;
  public loadAllHighResImages = false;
  private tooFarOutForHighRes = true;
  private center: Point = null;
  private wheelPoint: Point = {
    x: 0,
    y: 0
  };
  private lastWheelPoint: Point;
  private firstRun = true;
  private mouseDownData: any = {}; // prevent opening session viewer modal if dragging the view

  // search and filtering
  public displayedContent: boolean[] = []; // now changing to be 1:1 with this.content, with every member as boolean
  private caseSensitiveSearch = false;
  private lastSearchTerm = '';
  private lastMask = new ContentMask;
  private searchBarOpen = false;

  // monitoring collections
  public pauseMonitoring = false;

  // license
  public license: License;
  private licenseChangedFunction = this.onLicenseChangedInitial;





  // Subscription holders
  private subscriptions = new Subscription;



  ngOnDestroy(): void {
    log.debug('ClassicGridComponent: ngOnDestroy()');
    this.subscriptions.unsubscribe();
    this.toolService.addNwAdhocCollectionNext.next({});
    this.toolService.addSaAdhocCollectionNext.next({});
  }



  resetZoomToFit(): void {
    // log.debug('ClassicGridComponent: resetZoomToFit()');
    let height = this.classicGridElement.nativeElement.clientHeight;
    let width = this.classicGridElement.nativeElement.clientWidth;
    height = this.canvasWidth * height / width;
    this.panzoomConfig.initialZoomToFit = { x: 0, y: -85, width: this.canvasWidth, height: height };
    this.initialZoomHeight = height;
  }



  ngOnInit(): void {
    // https://localhost?op=adhoc&service=nw&ip=184.105.132.210&side=dst
    log.debug('ClassicGridComponent: ngOnInit()');
    this.toolService.lastRoute = 'classicGrid';
    this.toolService.setPreference('lastRoute', 'classicGrid');

    this.subscriptions.add(this.dataService.licensingChanged.subscribe( license =>  this.licenseChangedFunction(license) ));

    // New startup code
    this.subscriptions.add(this.toolService.onSplashScreenAtStartupClosed.subscribe( () => {
      if (!this.license.valid) {
        this.modalService.open(this.toolService.licenseExpiredModalId);
      }
      else if (!this.toolService.urlParametersLoaded) {
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

    // pan-zoom
    this.subscriptions.add(this.panzoomConfig.modelChanged.subscribe( (model: PanZoomModel) => this.onModelChanged(model) ));
    this.subscriptions.add(this.panzoomConfig.api.subscribe( (api: PanZoomAPI) => this.onGotNewPanzoomApi(api) ));


    // Take subscriptions

    this.subscriptions.add(this.dataService.collectionDeleted.subscribe( (details: CollectionDeletedDetails) => this.onCollectionDeleted(details) ));

    this.subscriptions.add(this.dataService.selectedCollectionChanged.subscribe( (collection: any) => this.onSelectedCollectionChanged(collection) ));

    this.subscriptions.add(this.dataService.collectionStateChanged.subscribe( (collection: any) => this.onCollectionStateChanged(collection) ));

    this.subscriptions.add(this.dataService.sessionsReplaced.subscribe( (s: any) => this.onSessionsReplaced(s) ));

    this.subscriptions.add(this.dataService.sessionPublished.subscribe( (s: any) => this.onSessionPublished(s) ));

    this.subscriptions.add(this.dataService.contentReplaced.subscribe( (i: any) => this.onContentReplaced(i) ));

    this.subscriptions.add(this.dataService.contentPublished.subscribe( (newContent: any) => this.onContentPublished(newContent) ));

    this.subscriptions.add(this.dataService.searchReplaced.subscribe( (s: Search[]) => this.onSearchReplaced(s) ));


    this.subscriptions.add(this.dataService.searchPublished.subscribe( (s: Search[]) => this.onSearchPublished(s) ));

    this.subscriptions.add(this.dataService.sessionsPurged.subscribe( (sessionsToPurge: number[]) => this.onSessionsPurged(sessionsToPurge) ));

    this.subscriptions.add(this.dataService.monitoringCollectionPause.subscribe( (paused) => {
      this.pauseMonitoring = paused;
      this.changeDetectionRef.detectChanges();
    } ));

    this.subscriptions.add(this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) ));

    this.zone.runOutsideAngular( () => this.classicGridElement.nativeElement.addEventListener('wheel', this.onWheel, { passive: true } ) );

  }



  ngAfterViewInit(): void {
    // https://localhost?op=adhoc&service=nw&ip=184.105.132.210&side=dst
    this.resetZoomToFit();
    if (this.toolService.loadCollectionOnRouteChange) {
      log.debug('ClassicGridComponent: ngAfterViewInit(): getting collection data again on toolService.loadCollectionOnRouteChange');
      this.toolService.loadCollectionOnRouteChange = false;
      this.toolService.getCollectionDataAgain.next();
    }
    this.changeDetectionRef.detectChanges();
    this.center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
    this.wheelPoint = utils.deepCopy(this.center);
    if ( !this.toolService.splashLoaded && !this.toolService.urlParametersLoaded) {
        // only load the splash screen if we don't have ad hoc query parameters
        log.debug('ClassicGridComponent: ngAfterViewInit(): loading the splash screen');
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
      log.debug('ClassicGridComponent: ngAfterViewInit(): not loading the splash screen');
    }
  }



  onLicenseChangedInitial(license: License) {
    log.debug('ClassicGridComponent: onLicenseChangedInitial(): license:', license);
    if (!license) {
      return;
    }
    this.license = license;
    this.licenseChangedFunction = this.onLicenseChangedSubsequent; // change the callback after first load
  }



  onLicenseChangedSubsequent(license: License) {
    log.debug('ClassicGridComponent: onLicenseChangedSubsequent(): license:', license);
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



  onPreferencesChanged(prefs: Preferences): void {
    log.debug('ClassicGridComponent: onPreferencesChanged()');
    this.preferences = utils.deepCopy(prefs);
  }



  onNextSessionClicked(): void {
    log.debug('ClassicGridComponent: onNextSessionClicked()');
    // build a list of un-filtered tile id's
    let displayedTileIds: string[] = [];
    this.content.forEach( (contentItem, i) => {
      if (this.displayedContent[i] === true) {
        displayedTileIds.push(contentItem.id);
      }
    });
    log.debug('ClassicGridComponent: onNextSessionClicked(): displayedTileIds:', displayedTileIds);

    let nextContentItem: Content = null;
    let nextContentItemId = null;
    let nextSessionId = null;
    for (let i = 0; i < displayedTileIds.length; i++) {
      if (displayedTileIds[i] === this.selectedContentId && i < displayedTileIds.length - 1 ) {
        nextContentItemId = displayedTileIds[i + 1];
        log.debug('ClassicGridComponent: onNextSessionClicked(): nextContentItemId:', nextContentItemId);
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

    log.debug('ClassicGridComponent: onNextSessionClicked(): nextContentItem:', nextContentItem);
    log.debug('ClassicGridComponent: onNextSessionClicked(): nextSessionId:', nextSessionId);

    this.selectedSession = this.sessions[nextSessionId];
    this.selectedContent = nextContentItem;
    this.selectedContentId = nextContentItem.id;
    this.updateNextPreviousButtonStatus();
    this.changeDetectionRef.detectChanges();

  }



  onPreviousSessionClicked(): void {
    log.debug('ClassicGridComponent: onPreviousSessionClicked()');
    // build a list of un-filtered tile id's
    let displayedTileIds: string[] = [];
    this.content.forEach( (contentItem, i) => {
      if (this.displayedContent[i] === true) {
        displayedTileIds.push(contentItem.id);
      }
    });
    log.debug('ClassicGridComponent: onPreviousSessionClicked(): displayedTileIds:', displayedTileIds);
    let previousContentItem: Content = null;
    let previousContentItemId = null;
    let previousSessionId = null;
    for (let i = 0; i < displayedTileIds.length; i++) {
      if (displayedTileIds[i] === this.selectedContentId && i <= displayedTileIds.length - 1 ) {
        previousContentItemId = displayedTileIds[i - 1];
        log.debug('ClassicGridComponent: onPreviousSessionClicked(): previousContentItemId:', previousContentItemId);
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

    log.debug('ClassicGridComponent: onPreviousSessionClicked(): previousContentItem:', previousContentItem);
    log.debug('ClassicGridComponent: onPreviousSessionClicked(): previousSessionId:', previousSessionId);

    this.selectedSession = this.sessions[previousSessionId];
    this.selectedContent = previousContentItem;
    this.selectedContentId = previousContentItem.id;
    this.updateNextPreviousButtonStatus();
    this.changeDetectionRef.detectChanges();

  }



  updateNextPreviousButtonStatus(): void {
    // build a list of un-filtered tile id's
    let displayedTileIds: string[] = [];
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
    this.contentObj = {};
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



  onContentReplaced(content: Content[]): void {
    // when a new collection is selected - this is when complete collection content gets pushed out from the server.
    // This happens after onSelectedCollectionChanged() and after onSessionsReplaced(), but before onSearchReplaced()
    log.debug('ClassicGridComponent: onContentReplaced(): contentReplaced:', content);
    this.destroyView = true;
    this.content = content.sort(this.sortContentFunc);
    this.content.forEach( (item: Content) => {
      let contentId = item.id;
      this.contentObj[contentId] = item;
    });
    this.displayedContent = [];
    this.content.forEach( (contentItem) => {
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
    let sessionId = session.id;
    this.sessions[sessionId] = session;
  }



  onContentPublished(newContent: Content[]): void {
    // when one or more content items are pushed from a still-building rolling, or monitoring collection
    // there may be more than one content item per session
    log.debug('ClassicGridComponent: onContentPublished(): contentPublished:', newContent);

    if (this.destroyView) {
      this.destroyView = false;
    }

    newContent.forEach(content => {
      this.content.push(content);
      let contentId = content.id;
      this.contentObj[contentId] = content;
      this.highResSessions.push(false); // default to low-res
      this.displayedContent.push(true);
    });

    // update content counts here to save cycles not calculating image masks
    this.countContent(newContent);

    // if (this.searchBarOpen) { this.onSearchTermsTyped( { searchTerms: this.lastSearchTerm } ); }
    this.onSearchTermsTyped( { searchTerms: this.lastSearchTerm } );
    this.changeDetectionRef.detectChanges();
    this.sessionWidgetDecider();
  }



  onSearchPublished(search: Search[]): void {
    // this receives partial search term data from a building collection
    log.debug('ClassicGridComponent: onSearchPublished(): searchPublished:', search);
    search.forEach( item => {
      this.search.push(item);
    });
    // log.debug("ClassicGridComponent: searchPublishedSubscription: this.search:", this.search);
    // this.onSearchTermsTyped( { searchTerms: this.lastSearchTerm } );
  }



  onSessionsPurged(sessionsToPurge: number[]): void {
    log.debug('ClassicGridComponent: onSessionsPurged(): sessionsPurged:', sessionsToPurge);

    let searchRemoved = this.purgeSessions(sessionsToPurge);

// !!! this displayedContent line should be revisited so that it takes in to account last mask and search!!!
    // this.displayedContent = this.content.sort(this.sortContentFunc);
// !!!

    this.onMaskChanged(this.lastMask);
    this.countContent();
    if (searchRemoved > 0 && this.searchBarOpen) {
      this.onSearchTermsTyped( { searchTerms: this.lastSearchTerm } );
    }
    // this.changeDetectionRef.detectChanges();
    // this.changeDetectionRef.markForCheck();
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
      this.contentObj = {};
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
    this.noopCollection();
    this.modalService.open(this.toolService.collectionDeletedModalId);
  }



  noopCollection() {
    log.debug('ClassicGridComponent: noopCollection()');
    this.destroyView = true;
    this.displayedContent = [];
    this.highResSessions = [];
    this.search = [];
    this.sessions = {};
    this.content = [];
    this.contentObj = {};
    this.resetContentCount();
    this.loadAllHighResImages = false;
    this.selectedCollectionType = null;
    this.collectionState = '';
    this.collectionId = null;
    this.selectedCollectionServiceType = null;
    this.changeDetectionRef.detectChanges();
  }



  onSearchBarOpen(searchBarState: boolean): void {
    this.searchBarOpen = searchBarState;
  }



  onModelChanged(model: PanZoomModel): void {
    this.panzoomModel = model;
    // console.log('ClassicGridComponent: onModelChanged(): changed model.pan:', model.pan);
    this.sessionWidgetDecider();
  }



  onGotNewPanzoomApi(api: PanZoomAPI): void {
    log.debug('ClassicGridComponent: onGotNewPanzoomApi(): Got new panZoom API');
    this.panZoomAPI = api;
  }



  public onWindowResize(): void {
    log.debug('ClassicGridComponent: onWindowResize()');
    this.center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
    this.resetZoomToFit();
  }



  private sortNumber(a: number, b: number): number {
      return b - a;
  }



  private sortContentFunc(a: any, b: any): number {
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
    this.modalService.open(this.toolService.contentDetailsModalId);
  }



  onMaskChanged(mask: ContentMask): void {
    this.lastMask = mask;
    log.debug('ClassicGridComponent: onMaskChanged():', mask);

    if (mask.showImage && mask.showPdf && mask.showWord && mask.showExcel && mask.showPowerpoint && mask.showHash && mask.showDodgy && !mask.showFromArchivesOnly) {
      let tmpDisplayedContent: boolean[] = [];
      this.content.forEach( () => tmpDisplayedContent.push(true) );
      this.displayedContent = tmpDisplayedContent;
      this.changeDetectionRef.detectChanges();
      return;
    }

    let contentIdsidsWeWant: string[] = [];
    let tempDisplayedContent: boolean[] = [];
    let fromArchivesOnly = mask.showFromArchivesOnly ? true : false;

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

    let tooFarOutForHighRes = this.panzoomModel.zoomLevel < this.transitionZoomLevel;
    // console.log('tooFarOutForHighRes:', tooFarOutForHighRes);
    // console.log('this.tooFarOutForHighRes:', this.tooFarOutForHighRes);

    // log.debug(this.panzoomModel.zoomLevel);

    if (tooFarOutForHighRes && this.tooFarOutForHighRes === tooFarOutForHighRes) {
      // we were already too far out so we don't need to do any more checking
      return;
    }
    else if (tooFarOutForHighRes && this.tooFarOutForHighRes !== tooFarOutForHighRes) {
      // we just got too far out, so turn off all high-res sessions
      this.tooFarOutForHighRes = true;
      log.debug('ClassicGridComponent: sessionWidgetDecider(): switching off high-res images');
      let tempHighResSessions: boolean[] = [];
      this.content.forEach( () => {
        tempHighResSessions.push(false);
      });
      this.highResSessions = tempHighResSessions;
      if (this.sessionWidgetEnabled) {
        this.hideSessionWidget(); // changes detected within
      }
      else {
        this.changeDetectionRef.detectChanges();
      }
      return;
    }

    // console.log('wheelPoint:', this.wheelPoint);

    let isZooming = this.panzoomModel && this.lastPanzoomModel && this.panzoomModel.zoomLevel !== this.lastPanzoomModel.zoomLevel;
    let isPanning  = this.panzoomModel && this.lastPanzoomModel && !isZooming && ( this.panzoomModel.pan.x !== this.lastPanzoomModel.pan.x ||
    this.panzoomModel.pan.y !== this.lastPanzoomModel.pan.y );

    /*if (this.tooFarOutForHighRes === tooFarOutForHighRes &&
        this.lastWheelPoint && this.wheelPoint &&
        isPanning) {
      // zoom hasn't changed, but we are panning.  We were already far enough in, so do nothing
      // log.debug('ClassicGridComponent: sessionWidgetDecider(): not deciding this time');
      this.lastWheelPoint = utils.deepCopy(this.wheelPoint);
      this.lastPanzoomModel = utils.deepCopy(this.panzoomModel);
      return;
    }*/

    if (this.tooFarOutForHighRes === tooFarOutForHighRes &&
        this.lastWheelPoint && this.wheelPoint &&
        isZooming &&
        this.wheelPoint.x === this.lastWheelPoint.x &&
        this.wheelPoint.y === this.lastWheelPoint.y) {
      // zoom has changed but the wheel point hasn't.  we were already far enough in, so do nothing
      // log.debug('ClassicGridComponent: sessionWidgetDecider(): not deciding this time');
      this.lastWheelPoint = utils.deepCopy(this.wheelPoint);
      this.lastPanzoomModel = utils.deepCopy(this.panzoomModel);
      return;
    }



    log.debug('ClassicGridComponent: sessionWidgetDecider(): making a decision');

    this.lastWheelPoint = utils.deepCopy(this.wheelPoint);
    this.lastPanzoomModel = utils.deepCopy(this.panzoomModel);
    this.tooFarOutForHighRes = false;

    // let focusedElement = document.elementFromPoint(this.center.x, this.center.y);

    let focusedElement;
    if (isZooming) {
      focusedElement = document.elementFromPoint(this.wheelPoint.x, this.wheelPoint.y);
    }
    else {
      // we must be panning
      focusedElement = document.elementFromPoint(this.center.x, this.center.y);
    }

    if (!focusedElement.classList.contains('thumbnail')) {
      this.hideSessionWidget();
      return;
    }

    if ( !this.previousFocusedElement ||
      ( this.previousFocusedElement.isSameNode(focusedElement) && !this.sessionWidgetEnabled && focusedElement.nodeName === 'IMG' ) ||
      ( this.previousFocusedElement && !this.previousFocusedElement.isSameNode(focusedElement) && focusedElement.nodeName === 'IMG' && focusedElement.hasAttribute('contentfile') ) ) {

        let focusedTile = focusedElement.parentNode.parentElement;

        if ( focusedTile.nodeName === 'CLASSIC-TILE' ) {

          let sessionsForHighRes = [];
          sessionsForHighRes.push(Number(focusedTile.getAttribute('sessionid')));

          let previousElementSibling = focusedTile.previousElementSibling;
          if (previousElementSibling && previousElementSibling.nodeName === 'CLASSIC-TILE' ) {
            sessionsForHighRes.push(Number(previousElementSibling.getAttribute('sessionid')));
          }

          let nextElementSibling = focusedTile.nextElementSibling;
          if (nextElementSibling && nextElementSibling.nodeName === 'CLASSIC-TILE' ) {
            sessionsForHighRes.push(Number(nextElementSibling.getAttribute('sessionid')));
          }

          this.showSessionWidget( sessionsForHighRes[0], sessionsForHighRes );
        }
      }
    this.previousFocusedElement = focusedElement;
  }



  private showSessionWidget(sessionId: number, sessionsForHighRes: number[] ): void {
    // log.debug('ClassicGridComponent: showSessionWidget()', i);
    this.hoveredContentSession = sessionId;
    this.popUpSession = this.sessions[sessionId];

    let tempHighResSession = [];
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
    // this.sessionWidgetEnabled = false;
    if (this.sessionWidgetEnabled) {
      this.sessionWidgetEnabled = false;
      this.changeDetectionRef.detectChanges();
    }
  }



  onToggleCaseSensitiveSearch(): void {
    log.debug('ClassicGridComponent: onToggleCaseSensitiveSearch()');
    this.caseSensitiveSearch = !this.caseSensitiveSearch;
    this.onSearchTermsTyped( { searchTerms: this.lastSearchTerm } );
  }



  private getContentBySessionAndContentFile(o: any): any {
    for (let x = 0; x < this.content.length; x++) {
      if (this.content[x].session === o.session && utils.pathToFilename(this.content[x].contentFile) === o.contentFile) {
        return this.content[x];
      }
    }
  }



  onSearchTermsTyped(e: any): void {
    let searchTerms = e.searchTerms;
    this.lastSearchTerm = searchTerms;
    let matchedIds = [];


    if (searchTerms === '') {
      this.onMaskChanged(this.lastMask);
      this.changeDetectionRef.detectChanges();
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

    let tempDisplayedContent: boolean[] = [];

    if (matchedIds.length === 0) {
      // this.displayedContent = [];
      this.content.forEach( content => {
        tempDisplayedContent.push(false);
      });
    }
    else {
      // this.filter = matchedIds.join(',');
      /*for (let i = 0; i < this.content.length; i++) {
        let item = this.content[i];
        if (matchedIds.includes(item.id) ) {
          tempDisplayedContent.push(item);
        }
      }*/
      this.content.forEach( content => {
        if (matchedIds.includes(content.id) ) {
          tempDisplayedContent.push(true);
        }
        else {
          tempDisplayedContent.push(false);
        }
      });
      // this.displayedContent = tempDisplayedContent.sort(this.sortContentFunc);
    }
    this.displayedContent = tempDisplayedContent;
    this.changeDetectionRef.detectChanges();
  }



  private resetContentCount(): void {
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



  private getContentIdsByType(type: string, fromArchiveOnly: boolean): string[] {
    let temp: string[] = [];
    this.content.forEach( (item: Content, i) => {
      if (!fromArchiveOnly && ( item.contentType === type || ('contentSubType' in item && item.contentSubType === type) ) ) {
        temp.push(item.id);
      }
      else if (fromArchiveOnly && item.fromArchive && ( item.contentType === type || ('contentSubType' in item && item.contentSubType === type) ) ) {
        temp.push(item.id);
      }
    });
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
            log.debug('ClassicGridComponent: purgeSessions(): purging content', content.session);
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
            log.debug('ClassicGridComponent: purgeSessions(): purging search', search.session);
            this.search.splice(i, 1);
            break;
          }
        }
      }

    }
    return searchRemoved;
  }



  private suspendMonitoring(): void {
    // this.pauseMonitoring = true; // pauseMonitoring will be updated after server push
    this.dataService.pauseMonitoringCollection();
  }



  private resumeMonitoring(): void {
    // this.pauseMonitoring = false; // pauseMonitoring will be updated after server push
    this.dataService.unpauseMonitoringCollection();
  }



  onWheel = (event: MouseEvent) => {
    // console.log('onWheel(): event:', event);
    this.wheelPoint.x = event.pageX;
    this.wheelPoint.y = event.pageY;
    // console.log('changed wheelPoint:', this.wheelPoint);
  }



  onMouseDown(event: MouseEvent): void {
    this.mouseDownData = { top: event.pageX, left: event.pageY, time: event.timeStamp };
  }



  onMouseUp(event): void {
    // log.debug('ClassicGridComponent: onMouseUp(): event:', event);
    let top   = event.pageX;
    let left  = event.pageY;
    let ptop  = this.mouseDownData.top;
    let pleft = this.mouseDownData.left;
    // prevent opening pdf modal if dragging the view
    if (Math.abs(top - ptop) === 0 || Math.abs(left - pleft) === 0) {

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
  }

}
