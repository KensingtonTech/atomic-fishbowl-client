import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy, NgZone, forwardRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { PanZoomConfig, PanZoomAPI, PanZoomModel } from 'ng2-panzoom';
import { ToolService } from 'services/tool.service';
import { DataService } from 'services/data.service';
import { Content } from 'types/content';
import { ModalService } from '../modal/modal.service';
import { ContentCount } from 'types/contentcount';
import { ContentMask } from 'types/contentmask';
import { Collection } from 'types/collection';
import { Preferences } from 'types/preferences';
import { Search } from 'types/search';
import { License } from 'types/license';
import * as utils from '../utils';
import { Logger } from 'loglevel';
import { CollectionDeletedDetails } from 'types/collection-deleted-details';
import { trigger, state, style, animate, transition, query, animateChild } from '@angular/animations';
import { Point } from 'types/point';
import { Sessions, Session } from 'types/session';
import { AbstractGrid } from '../abstract-grid.class';
declare var log: Logger;
declare var imagesLoaded;



@Component({
  selector: 'classic-grid-view',
  providers: [ { provide: AbstractGrid, useExisting: forwardRef(() => ClassicGridComponent ) } ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div #classicGridElement (window:resize)="onWindowResize()" style="position: absolute; left: 0; right: 0; bottom: 0; top: 0; overflow: hidden;">

  <pan-zoom *ngIf="content && sessionsDefined && displayedContent && !destroyView && highResSessions" [config]="panzoomConfig">

    <div class="bg noselect gridItems" #gridItems style="position: relative;" [style.width.px]="canvasWidth">

      <!--@zoomInOutParent-->

      <classic-tile *ngFor="let item of content; index as i;" (openPDFViewer)="openPdfViewer()" (openSessionDetails)="openSessionDetails()" [collectionId]="collectionId" [content]="item" [sessionId]="item.session" [attr.sessionid]="item.session" [serviceType]="selectedCollectionServiceType" [loadHighRes]="loadAllHighResImages" [showHighRes]="highResSessions[i]" [hide]="!displayedContent[i]">
      </classic-tile>

    </div>

  </pan-zoom>

</div>

<!-- control bar -->
<control-bar-classic *ngIf="panzoomConfig" [panzoomConfig]="panzoomConfig" [initialZoomWidth]="initialZoomWidth" [initialZoomHeight]="initialZoomHeight" ></control-bar-classic>

<!-- pause / resume buttons for monitoring collections -->
<div *ngIf="selectedCollectionType == 'monitoring'" style="position: absolute; left: 11.05263158em; top: 0.526315789em; color: white; z-index: 100;">
  <i *ngIf="!pauseMonitoring" class="fa fa-pause-circle-o fa-4x" (click)="suspendMonitoring()"></i>
  <i *ngIf="pauseMonitoring" class="fa fa-play-circle-o fa-4x" (click)="resumeMonitoring()"></i>
</div>

<!-- toolbar -->
<toolbar-widget [contentCount]="contentCount"></toolbar-widget>

<!-- session popup -->
<classic-session-popup *ngIf="selectedCollectionServiceType" [enabled]="sessionWidgetEnabled" #sessionWidget>
  <session-widget [session]="popUpSession" [serviceType]="selectedCollectionServiceType" styleClass="popupSessionWidget"></session-widget>
</classic-session-popup>

<!-- modals -->
<tab-container-modal [id]="tabContainerModalId"></tab-container-modal>
<splash-screen-modal></splash-screen-modal>
<preferences-modal></preferences-modal>
<manage-users-modal></manage-users-modal>
<collection-deleted-notify-modal [id]="collectionDeletedModalId" [user]="collectionDeletedUser"></collection-deleted-notify-modal>
<pdf-viewer-modal *ngIf="selectedCollectionServiceType" id="pdf-viewer" [serviceType]="selectedCollectionServiceType" [collectionId]="collectionId"></pdf-viewer-modal>
<session-details-modal *ngIf="selectedCollectionServiceType" id="sessionDetails" [serviceType]="selectedCollectionServiceType" [collectionId]="collectionId"></session-details-modal>
<ng-container *ngIf="preferences && preferences.serviceTypes">
  <nw-collection-modal *ngIf="preferences.serviceTypes.nw" [id]="nwCollectionModalId"></nw-collection-modal>
  <sa-collection-modal *ngIf="preferences.serviceTypes.sa" [id]="saCollectionModalId"></sa-collection-modal>
</ng-container>
<license-expired-modal [id]="licenseExpiredModalId"></license-expired-modal>
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

  @ViewChild('classicGridElement') private classicGridElement: ElementRef;
  @ViewChild('gridItems') public gridItems: ElementRef;

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
  public content: Content[] = [];
  public contentCount = new ContentCount;
  public sessionWidgetEnabled = false;
  public hoveredContentSession: number;
  public highResSessions: boolean[] = [];
  private deviceNumber: number;
  private search: Search[] = [];
  public displayedContent: boolean[] = []; // now changing to be 1:1 with this.content, with every member as boolean
  public sessions: Sessions;
  public popUpSession: any;
  private pdfFile: string;
  private caseSensitiveSearch = false;
  private showOnlyImages: any = [];
  private lastSearchTerm = '';
  public selectedCollectionType: string = null;
  public selectedCollectionServiceType: string = null; // 'nw' or 'sa'
  private collectionId: string = null;
  public sessionsDefined = false;
  public destroyView = true;
  private dodgyArchivesIncludedTypes: any = [ 'encryptedRarEntry', 'encryptedZipEntry', 'unsupportedZipEntry', 'encryptedRarTable' ];
  private lastMask = new ContentMask;
  private searchBarOpen = false;
  private pauseMonitoring = false;
  private transitionZoomLevel = 3.9;
  private previousFocusedElement: Node;
  public tabContainerModalId = 'tab-container-modal';
  public nwCollectionModalId = 'nw-collection-modal';
  public saCollectionModalId = 'sa-collection-modal';
  public licenseExpiredModalId = 'license-expired-modal';
  public collectionDeletedModalId = 'collection-deleted-notify-modal';
  public collectionDeletedUser = '';
  private urlParametersLoaded = false;
  private selectedSessionId: number = null;
  private selectedContentType: string = null;
  private selectedContentId: string = null;
  public preferences: Preferences;
  private center: Point = null;
  public loadAllHighResImages = false;
  private tooFarOutForHighRes = true;
  public license: License;
  private licenseChangedFunction = this.onLicenseChangedInitial;
  private collectionState = '';
  private queryParams: any;
  private firstRun = true;
  private wheelPoint: Point = {
    x: 0,
    y: 0
  };
  private lastWheelPoint: Point;
  private imagesLoaded: any; // handler to imagesLoaded instance

  // Subscription holders
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
  private modelChangedSubscription: Subscription;
  private apiSubscription: Subscription;
  private onSplashScreenAtStartupClosedSubscription: Subscription;
  private nextSessionClickedSubscription: Subscription;
  private previousSessionClickedSubscription: Subscription;
  private newSessionSubscription: Subscription;
  private newImageSubscription: Subscription;
  private monitoringCollectionPauseSubscription: Subscription;
  private preferencesChangedSubscription: Subscription;
  private licensingChangedSubscription: Subscription;



  ngOnDestroy(): void {
    log.debug('ClassicGridComponent: ngOnDestroy()');
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
    this.modelChangedSubscription.unsubscribe();
    this.apiSubscription.unsubscribe();
    this.onSplashScreenAtStartupClosedSubscription.unsubscribe();
    this.nextSessionClickedSubscription.unsubscribe();
    this.previousSessionClickedSubscription.unsubscribe();
    this.newSessionSubscription.unsubscribe();
    this.newImageSubscription.unsubscribe();
    this.monitoringCollectionPauseSubscription.unsubscribe();
    this.preferencesChangedSubscription.unsubscribe();
    this.licensingChangedSubscription.unsubscribe();
    if (this.imagesLoaded) {
      this.imagesLoaded.off( 'always', this.onImagesLoaded );
    }
  }



  resetZoomToFit(): void {
    // log.debug('ClassicGridComponent: resetZoomToFit()');
    let height = this.classicGridElement.nativeElement.clientHeight;
    let width = this.classicGridElement.nativeElement.clientWidth;
    height = this.canvasWidth * height / width;
    this.panzoomConfig.initialZoomToFit = { x: 0, y: -85, width: this.canvasWidth, height: height };
    this.initialZoomHeight = height;
  }



  parseQueryParams(params: any): void {
    if ( 'op' in params && 'service' in params && ( 'host' in params || ( 'ip' in params && 'side' in params) ) ) {

      if (params['op'] !== 'adhoc') {
        return;
      }

      if (params['service'] !== 'nw' && params['service'] !== 'sa') {
        return;
      }

      if ('ip' in params && params['side'] !== 'src' && params['side'] !== 'dst') {
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
    log.debug('ClassicGridComponent: ngOnInit()');
    this.toolService.lastRoute = 'classicGrid';
    this.toolService.setPreference('lastRoute', 'classicGrid');

    this.licensingChangedSubscription = this.dataService.licensingChanged.subscribe( license =>  this.licenseChangedFunction(license) );

    // New startup code
    this.onSplashScreenAtStartupClosedSubscription = this.toolService.onSplashScreenAtStartupClosed.subscribe( () => {
      if (!this.license.valid) {
        this.modalService.open(this.licenseExpiredModalId);
      }
      else if (!this.toolService.queryParams) {
        this.modalService.open(this.tabContainerModalId);
      }
    });

    // log.debug('splashLoaded:', this.toolService.splashLoaded);

    this.queryParams = this.route.snapshot.queryParams || null;

    if (Object.keys(this.queryParams).length !== 0) {
      // enter this block when first navigating to this page with custom url parameters
      this.parseQueryParams(this.queryParams);
      // the above function will store any query parameters in toolService.
      // we then must re-navigate to this page to clear the url bar query parameters
      log.debug('ClassicGridComponent: redirecting to .');
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

    // pan-zoom
    this.modelChangedSubscription = this.panzoomConfig.modelChanged.subscribe( (model: PanZoomModel) => this.onModelChanged(model) );
    this.apiSubscription = this.panzoomConfig.api.subscribe( (api: PanZoomAPI) => this.onGotNewPanzoomApi(api) );


    // Take subscriptions

    this.collectionDeletedSubscription = this.dataService.collectionDeleted.subscribe( (details: CollectionDeletedDetails) => this.onCollectionDeleted(details) );

    this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (collection: any) => this.onSelectedCollectionChanged(collection) );

    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (collection: any) => this.onCollectionStateChanged(collection) );

    this.sessionsReplacedSubscription = this.dataService.sessionsReplaced.subscribe( (s: any) => this.onSessionsReplaced(s) );

    this.sessionPublishedSubscription = this.dataService.sessionPublished.subscribe( (s: any) => this.onSessionPublished(s) );

    this.contentReplacedSubscription = this.dataService.contentReplaced.subscribe( (i: any) => this.onContentReplaced(i) );

    this.contentPublishedSubscription = this.dataService.contentPublished.subscribe( (newContent: any) => this.onContentPublished(newContent) );

    this.searchReplacedSubscription = this.dataService.searchReplaced.subscribe( (s: Search[]) => this.onSearchReplaced(s) );


    this.searchPublishedSubscription = this.dataService.searchPublished.subscribe( (s: Search[]) => this.onSearchPublished(s) );

    this.sessionsPurgedSubscription = this.dataService.sessionsPurged.subscribe( (sessionsToPurge: number[]) => this.onSessionsPurged(sessionsToPurge) );

    this.newSessionSubscription = this.toolService.newSession.subscribe( (session: any ) => {
      log.debug('ClassicGridComponent: newSessionSubscription: Got new session', session);
      this.selectedSessionId = session['id'];
    });

    this.nextSessionClickedSubscription = this.toolService.nextSessionClicked.subscribe( () => this.onNextSessionClicked() );

    this.previousSessionClickedSubscription = this.toolService.previousSessionClicked.subscribe( () => this.onPreviousSessionClicked() );

    this.monitoringCollectionPauseSubscription = this.dataService.monitoringCollectionPause.subscribe( (paused) => {
      this.pauseMonitoring = paused;
      this.changeDetectionRef.detectChanges();
    } );

    this.newImageSubscription = this.toolService.newImage.subscribe( (content: Content) => {
      log.debug('ClassicGridComponent: newImageSubscription: Got new image', content);
      this.selectedContentType = content.contentType;
      this.selectedContentId = content.id;
      this.updateNextPreviousButtonStatus();
    } );

    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) );

    this.zone.runOutsideAngular( () => this.classicGridElement.nativeElement.addEventListener('wheel', this.onWheel, { passive: true } ) );

  }



  ngAfterViewInit(): void {
    let toolbar: any = document.getElementsByClassName('afb-toolbar')[0];
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
    if ( !this.toolService.splashLoaded && (
      (!this.queryParams  && !this.toolService.urlParametersLoaded)
      || ( !this.toolService.urlParametersLoaded && this.queryParams && Object.keys(this.queryParams).length === 0 ) ) ) {
        // only load the splash screen if we don't have ad hoc query parameters
        log.debug('ClassicGridComponent: ngAfterViewInit(): loading the splash screen');
        this.modalService.open('splashScreenModal');
    }
    else if (this.toolService.splashLoaded && !this.toolService.selectedCollection) {
      // open the tab container on subsequent logout/login combos, if a collection wasn't previously selected
      if (!this.license.valid) {
        this.modalService.open(this.licenseExpiredModalId);
      }
      else {
        this.modalService.open(this.tabContainerModalId);
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
      this.modalService.open(this.licenseExpiredModalId);
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
    // log.debug('ClassicGridComponent: onNextSessionClicked(): displayedTileIds:', displayedTileIds);
    // log.debug('content:', this.content);
    let nextContentItem: Content = null;
    let nextContentItemId = null;
    let nextSessionId = null;
    for (let i = 0; i < displayedTileIds.length; i++) {
      if (displayedTileIds[i] === this.selectedContentId && i < displayedTileIds.length - 1 ) {
        nextContentItemId = displayedTileIds[i + 1];
        // log.debug('ClassicGridComponent: onNextSessionClicked(): nextContentItemId:', nextContentItemId);
        if (displayedTileIds.length - 1 === i + 1) {
          // this is the last displayed item.  disable the next session button
          // log.debug('ClassicGridComponent: onNextSessionClicked(): noNextSession:', true);
          this.toolService.noNextSession.next(true);
        }
        else {
          // log.debug('ClassicGridComponent: onNextSessionClicked(): noNextSession:', false);
          this.toolService.noNextSession.next(false);
        }
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

    // log.debug('ClassicGridComponent: onNextSessionClicked(): nextContentItem:', nextContentItem);
    // log.debug('ClassicGridComponent: onNextSessionClicked(): nextSessionId:', nextSessionId);
    // log.debug('ClassicGridComponent: onNextSessionClicked(): selectedContentType:', this.selectedContentType);

    if ( (this.selectedContentType === 'pdf' || this.selectedContentType === 'office') && ( nextContentItem.contentType === 'pdf' || nextContentItem.contentType === 'office') ) {
      // just display the next content item
      // log.debug('ClassicGridComponent: onNextSessionClicked(): got to 1');
      this.toolService.newSession.next(this.sessions[nextSessionId]);
      this.toolService.newImage.next(nextContentItem);
    }
    else if ( (this.selectedContentType === 'pdf' || this.selectedContentType === 'office') && !( nextContentItem.contentType === 'pdf' || nextContentItem.contentType === 'office') ) {
      // close the pdf modal and open the session-details modal
      this.modalService.close('pdf-viewer');
      this.toolService.newSession.next(this.sessions[nextSessionId]);
      this.toolService.newImage.next(nextContentItem);
      this.modalService.open('sessionDetails');
    }
    else if ( !(this.selectedContentType === 'pdf' || this.selectedContentType === 'office') && !( nextContentItem.contentType === 'pdf' || nextContentItem.contentType === 'office') ) {
      // just display the next content item
      this.toolService.newSession.next(this.sessions[nextSessionId]);
      this.toolService.newImage.next(nextContentItem);
    }
    else {
      // close the session-details modal and open the pdf modal
      this.modalService.close('sessionDetails');
      this.toolService.newSession.next(this.sessions[nextSessionId]);
      this.toolService.newImage.next(nextContentItem);
      this.modalService.open('pdf-viewer');
    }

  }



  onPreviousSessionClicked(): void {
    log.debug('ClassicGridComponent: onPreviousSessionClicked()');
    // build a list of un-filtered tile id's
    let displayedTileIds: string[] = [];
    /*for (let i = 0; i < this.displayedContent.length; i++) {
      let contentItem = this.displayedContent[i];
      displayedTileIds.push(contentItem.id);
    }*/
    this.content.forEach( (contentItem, i) => {
      if (this.displayedContent[i] === true) {
        displayedTileIds.push(contentItem.id);
      }
    });
    log.debug('ClassicGridComponent: onPreviousSessionClicked(): displayedTileIds:', displayedTileIds);
    // log.debug('content:', this.content);
    let previousContentItem: Content = null;
    let previousContentItemId = null;
    let previousSessionId = null;
    for (let i = 0; i < displayedTileIds.length; i++) {
      if (displayedTileIds[i] === this.selectedContentId && i <= displayedTileIds.length - 1 ) {
        log.debug('got to 0');
        previousContentItemId = displayedTileIds[i - 1];
        log.debug('ClassicGridComponent: onPreviousSessionClicked(): previousContentItemId:', previousContentItemId);
        if (i === 0) {
          // this is the first displayed item.  disable the previous session button
          log.debug('ClassicGridComponent: onPreviousSessionClicked(): noNextSession:', true);
          this.toolService.noNextSession.next(true);
        }
        else {
          log.debug('ClassicGridComponent: onPreviousSessionClicked(): noNextSession:', false);
          this.toolService.noNextSession.next(false);
        }
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

    if ( (this.selectedContentType === 'pdf' || this.selectedContentType === 'office') && ( previousContentItem.contentType === 'pdf' || previousContentItem.contentType === 'office') ) {
      // just display the next content item
      log.debug('ClassicGridComponent: onPreviousSessionClicked(): got to 1');
      this.toolService.newSession.next(this.sessions[previousSessionId]);
      this.toolService.newImage.next(previousContentItem);
    }
    else if ( (this.selectedContentType === 'pdf' || this.selectedContentType === 'office') && !( previousContentItem.contentType === 'pdf' || previousContentItem.contentType === 'office') ) {
      // close the pdf modal and open the session-details modal
      log.debug('ClassicGridComponent: onPreviousSessionClicked(): got to 2');
      this.modalService.close('pdf-viewer');
      this.toolService.newSession.next(this.sessions[previousSessionId]);
      this.toolService.newImage.next(previousContentItem);
      this.modalService.open('sessionDetails');
    }
    else if ( !(this.selectedContentType === 'pdf' || this.selectedContentType === 'office') && !( previousContentItem.contentType === 'pdf' || previousContentItem.contentType === 'office') ) {
      // just display the next content item
      log.debug('ClassicGridComponent: onPreviousSessionClicked(): got to 3');
      this.toolService.newSession.next(this.sessions[previousSessionId]);
      this.toolService.newImage.next(previousContentItem);
    }
    else {
      // close the session-details modal and open the pdf modal
      log.debug('ClassicGridComponent: onPreviousSessionClicked(): got to 4');
      this.modalService.close('sessionDetails');
      this.toolService.newSession.next(this.sessions[previousSessionId]);
      this.toolService.newImage.next(previousContentItem);
      this.modalService.open('pdf-viewer');
    }

  }



  updateNextPreviousButtonStatus(): void {
    // build a list of un-filtered tile id's
    let displayedTileIds: string[] = [];
    /*for (let i = 0; i < this.displayedContent.length; i++) {
      let contentItem = this.displayedContent[i];
      displayedTileIds.push(contentItem.id);
    }*/
    this.content.forEach( (contentItem, i) => {
      if (this.displayedContent[i] === true) {
        displayedTileIds.push(contentItem.id);
      }
    });
    for (let i = 0; i < displayedTileIds.length; i++) {

      if (displayedTileIds[i] === this.selectedContentId) {

        if (displayedTileIds.length - 1 === i) {
          // this is the last displayed item.  disable the next item button
          log.debug('ClassicGridComponent: updateNextPreviousButtonStatus(): noNextSession:', true);
          this.toolService.noNextSession.next(true);
        }
        else {
          log.debug('ClassicGridComponent: updateNextPreviousButtonStatus(): noNextSession:', false);
          this.toolService.noNextSession.next(false);
        }
        if (i === 0) {
          log.debug('ClassicGridComponent: updateNextPreviousButtonStatus(): noPreviousSession:', true);
          // this is the first displayed item.  disable the item button
          this.toolService.noPreviousSession.next(true);
        }
        else {
          log.debug('ClassicGridComponent: updateNextPreviousButtonStatus(): noPreviousSession:', false);
          // this is not the first displayed item.  enable the item button
          this.toolService.noPreviousSession.next(false);
        }
        break;
      }
    }

  }



  onSelectedCollectionChanged(collection: Collection): void {
    // this triggers whenever we select a new collection - it's job is to reset all collection state
    log.debug('ClassicGridComponent: onSelectedCollectionChanged(): selectedCollectionChanged:', collection);
    this.destroyView = true;
    this.sessionsDefined = false;
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
    this.sessionsDefined = true;
    this.sessions = sessions;
  }



  onContentReplaced(content: Content[]): void {
    // when a new collection is selected - this is when complete collection content gets pushed out from the server.
    // This happens after onSelectedCollectionChanged() and after onSessionsReplaced(), but before onSearchReplaced()
    log.debug('ClassicGridComponent: onContentReplaced(): contentReplaced:', content);
    this.destroyView = true;
    this.content = content.sort(this.sortContentFunc);
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
    this.imagesLoaded = this.zone.runOutsideAngular( () => imagesLoaded(this.gridItems.nativeElement, this.onImagesLoaded ) );
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
    this.sessionsDefined = true;
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
      this.highResSessions.push(false); // default to low-res
      this.displayedContent.push(true);
    });

    // update content counts here to save cycles not calculating image masks
    this.countContent(newContent);

    // if (this.searchBarOpen) { this.onSearchTermsTyped( { searchTerms: this.lastSearchTerm } ); }
    this.onSearchTermsTyped( { searchTerms: this.lastSearchTerm } );
    this.changeDetectionRef.detectChanges();
    this.imagesLoaded = this.zone.runOutsideAngular( () => imagesLoaded(this.gridItems.nativeElement, this.onImagesLoaded ) );
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
      this.sessionsDefined = false;
      this.search = [];
      this.sessions = {};
      this.content = [];
      this.displayedContent = [];
      this.highResSessions = [];
      this.loadAllHighResImages = false;
      this.resetContentCount();
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
    this.modalService.open(this.collectionDeletedModalId);
  }



  noopCollection() {
    log.debug('ClassicGridComponent: noopCollection()');
    this.destroyView = true;
    this.sessionsDefined = false;
    this.displayedContent = [];
    this.highResSessions = [];
    this.search = [];
    this.sessions = {};
    this.content = [];
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



  private openPdfViewer(e: any): void {
    log.debug('ClassicGridComponent: openPdfViewer()');
    /*
    if (this.selectedCollectionType === 'monitoring' && this.pauseMonitoring === false) {
      // pause monitoring
      this.suspendMonitoring();
    }
    */
    this.modalService.open('pdf-viewer');
  }



  openSessionDetails(): void {
    log.debug('ClassicGridComponent: openSessionDetails()');
    this.modalService.open('sessionDetails');
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

    let idsWeWant: number[] = [];
    let tempDisplayedContent: boolean[] = [];
    let fromArchivesOnly = false;

    if (mask.showFromArchivesOnly) {
      fromArchivesOnly = true;
    }
    if (mask.showImage) {
      idsWeWant = idsWeWant.concat(this.getContentIdsByType('image', fromArchivesOnly));
    }
    if (mask.showPdf) {
      idsWeWant = idsWeWant.concat(this.getContentIdsByType('pdf', fromArchivesOnly));
    }
    if (mask.showWord) {
      idsWeWant = idsWeWant.concat(this.getContentIdsByType('word', fromArchivesOnly));
    }
    if (mask.showExcel) {
      idsWeWant = idsWeWant.concat(this.getContentIdsByType('excel', fromArchivesOnly));
    }
    if (mask.showPowerpoint) {
      idsWeWant = idsWeWant.concat(this.getContentIdsByType('powerpoint', fromArchivesOnly));
    }
    if (mask.showHash) {
      idsWeWant = idsWeWant.concat(this.getContentIdsByType('hash', fromArchivesOnly));
    }
    if (mask.showDodgy && !fromArchivesOnly) {
      idsWeWant = idsWeWant.concat(this.getContentIdsByType('unsupportedZipEntry', fromArchivesOnly));
      idsWeWant = idsWeWant.concat(this.getContentIdsByType('encryptedZipEntry', fromArchivesOnly));
      idsWeWant = idsWeWant.concat(this.getContentIdsByType('encryptedRarEntry', fromArchivesOnly));
      idsWeWant = idsWeWant.concat(this.getContentIdsByType('encryptedRarTable', fromArchivesOnly));
    }

    this.content.forEach( (item, i) => {
      if (idsWeWant.includes(item.session)) {
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



  private countContent(newContent = null): void {
    // count content from scratch (if no newContent), or add to existing this.contentCount if newContent is defined
    let contentCount = newContent ? this.contentCount : new ContentCount;
    this.content.forEach( (content) => {
      switch (content.contentType) {
        case 'image':
          contentCount.images++;
          break;
        case 'pdf':
          contentCount.pdfs++;
          break;
        case 'office':
          switch (content.contentSubType) {
            case 'word':
              contentCount.word++;
              break;
            case 'excel':
              contentCount.excel++;
              break;
            case 'powerpoint':
              contentCount.powerpoint++;
              break;
          }
          break;
        case 'hash':
          contentCount.hashes++;
          break;
      }
      if (this.dodgyArchivesIncludedTypes.includes(content.contentType)) {
        contentCount.dodgyArchives++;
      }
      if (content.fromArchive && !this.dodgyArchivesIncludedTypes.includes(content.contentType)) {
        contentCount.fromArchives++;
      }
    });
    contentCount.total = this.content.length;
    this.contentCount = newContent ? contentCount : utils.deepCopy(contentCount);
  }



  private getContentIdsByType(type: string, fromArchiveOnly: boolean): number[] {
    let temp: number[] = [];
    this.content.forEach( (item: Content, i) => {
      if (!fromArchiveOnly && ( item.contentType === type || ('contentSubType' in item && item.contentSubType === type) ) ) {
        temp.push(item.session);
      }
      else if (fromArchiveOnly && item.fromArchive && ( item.contentType === type || ('contentSubType' in item && item.contentSubType === type) ) ) {
        temp.push(item.session);
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
    // this.pauseMonitoring = true;
    this.dataService.pauseMonitoringCollection();
  }



  private resumeMonitoring(): void {
    // this.pauseMonitoring = false;
    this.dataService.unpauseMonitoringCollection();
  }



  onImagesLoaded = () => {
    log.debug('ClassicGridComponent: onImagesLoaded()');
    this.loadAllHighResImages = true;
    this.changeDetectionRef.detectChanges();
    this.imagesLoaded.off( 'always', this.onImagesLoaded );
  }



  onWheel = (event: MouseEvent) => {
    // console.log('onWheel(): event:', event);
    this.wheelPoint.x = event.pageX;
    this.wheelPoint.y = event.pageY;
    // console.log('changed wheelPoint:', this.wheelPoint);
  }

}
