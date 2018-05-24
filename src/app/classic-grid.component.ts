import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, Renderer2, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToolService } from './tool.service';
import { PanZoomConfig, PanZoomAPI, PanZoomModel } from 'ng2-panzoom';
import { DataService } from './data.service';
import { Content } from './content';
import { ModalService } from './modal/modal.service';
import { ContentCount } from './contentcount';
import { ContentMask } from './contentmask';
import { Search } from './search';
import * as utils from './utils';
declare var log;

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'classic-grid-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div #classicGridElement (window:resize)="onWindowResize()" style="position:absolute; left: 0; right: 0; bottom: 0; top: 30px;">

  <pan-zoom *ngIf="content && sessionsDefined && displayedContent && !destroyView" [config]="panzoomConfig">

    <div class="bg noselect items" style="position: relative;" [style.width.px]="canvasWidth">

      <classic-tile *ngFor="let item of displayedContent" (openPDFViewer)="openPdfViewer()" (openSessionDetails)="openSessionDetails()" [collectionId]="collectionId" [content]="item" [sessionId]="item.session" [attr.sessionid]="item.session" [serviceType]="selectedCollectionServiceType">
      </classic-tile>

    </div>

  </pan-zoom>

  <classic-control-bar *ngIf="panzoomConfig" [panzoomConfig]="panzoomConfig" [initialZoomWidth]="initialZoomWidth" [initialZoomHeight]="initialZoomHeight" ></classic-control-bar>

  <!-- pause / resume buttons for monitoring collections -->
  <div *ngIf="selectedCollectionType == 'monitoring'" style="position: absolute; left: 210px; top: 10px; color: white; z-index: 100;">
    <i *ngIf="!pauseMonitoring" class="fa fa-pause-circle-o fa-4x" (click)="suspendMonitoring()"></i>
    <i *ngIf="pauseMonitoring" class="fa fa-play-circle-o fa-4x" (click)="resumeMonitoring()"></i>
  </div>

</div>

<!-- modals -->
<pdf-viewer-modal *ngIf="selectedCollectionServiceType" id="pdf-viewer" [serviceType]="selectedCollectionServiceType" [collectionId]="collectionId"></pdf-viewer-modal>
<session-details-modal *ngIf="selectedCollectionServiceType" id="sessionDetails" [serviceType]="selectedCollectionServiceType" [collectionId]="collectionId"></session-details-modal>
<classic-session-popup *ngIf="selectedCollectionServiceType" [session]="popUpSession" [enabled]="sessionWidgetEnabled" [serviceType]="selectedCollectionServiceType" #sessionWidget></classic-session-popup>
`,
  styles: [`

  classic-tile {
    display: inline-block;
  }

  `]
})

export class ClassicGridComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(  private dataService: DataService,
                private renderer: Renderer2,
                private el: ElementRef,
                private modalService: ModalService,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService,
                private router: Router,
                private route: ActivatedRoute ) {}

  @ViewChild('classicGridElement') private classicGridElement: ElementRef;

  public panzoomConfig = new PanZoomConfig;
  private panzoomModel: PanZoomModel;
  private panZoomAPI: PanZoomAPI;
  public canvasWidth = 2400;
  public initialZoomHeight: number = null; // set in resetZoomToFit()
  public initialZoomWidth = this.canvasWidth;

  public content: Content[] = [];
  private contentCount = new ContentCount;
  public sessionWidgetEnabled = false;
  public hoveredContentSession: number;
  // public highResSessions: number[] = [];
  public highResSessions: any = {};
  private deviceNumber: number;
  private search: Search[] = [];
  public displayedContent: Content[] = [];

  public sessions: any;
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
  private urlParametersLoaded = false;

  private selectedSessionId: number = null;
  private selectedContentType: string = null;
  private selectedContentId: string = null;

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
  private modelChangedSubscription: Subscription;
  private apiSubscription: Subscription;
  private onSplashScreenAtStartupClosedSubscription: Subscription;
  private nextSessionClickedSubscription: Subscription;
  private previousSessionClickedSubscription: Subscription;
  private newSessionSubscription: Subscription;
  private newImageSubscription: Subscription;
  private monitoringCollectionPauseSubscription: Subscription;



  ngOnDestroy(): void {
    log.debug('ClassicGridComponent: ngOnDestroy()');
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
    this.modelChangedSubscription.unsubscribe();
    this.apiSubscription.unsubscribe();
    this.onSplashScreenAtStartupClosedSubscription.unsubscribe();
    this.nextSessionClickedSubscription.unsubscribe();
    this.previousSessionClickedSubscription.unsubscribe();
    this.newSessionSubscription.unsubscribe();
    this.newImageSubscription.unsubscribe();
    this.monitoringCollectionPauseSubscription.unsubscribe();
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


    // New startup code
    this.onSplashScreenAtStartupClosedSubscription = this.toolService.onSplashScreenAtStartupClosed.subscribe( () => {
      if (!this.toolService.queryParams) {
        this.modalService.open(this.tabContainerModalId);
      }
    });

    // log.debug('splashLoaded:', this.toolService.splashLoaded);

    let queryParams = this.route.snapshot.queryParams || null;
    if ( !this.toolService.splashLoaded && ( (!queryParams  && !this.toolService.urlParametersLoaded) || ( !this.toolService.urlParametersLoaded && queryParams && Object.keys(queryParams).length === 0 ) ) ) {
      // only load the splash screen if we don't have ad hoc query parameters
      setTimeout( () => this.modalService.open('splashScreenModal'), 250);
    }
    if (Object.keys(queryParams).length !== 0) {
      // enter this block when first navigating to this page with custom url parameters
      this.parseQueryParams(queryParams);
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

    this.renderer.setStyle(this.el.nativeElement.ownerDocument.body, 'background-color', 'black');
    this.renderer.setStyle(this.el.nativeElement.ownerDocument.body, 'overflow', 'hidden');
    this.renderer.setStyle(this.el.nativeElement.ownerDocument.body, 'margin', '0');


    // PanZoom Config
    this.panzoomConfig.invertMouseWheel = true;
    this.panzoomConfig.useHardwareAcceleration = true;
    this.panzoomConfig.chromeUseTransform = true;
    this.panzoomConfig.zoomLevels = 10;
    this.panzoomConfig.scalePerZoomLevel = 2.0;
    this.panzoomConfig.zoomStepDuration = 0.2;
    this.panzoomConfig.freeMouseWheel = true;
    this.panzoomConfig.freeMouseWheelFactor = 0.01;
    this.panzoomConfig.zoomToFitZoomLevelFactor = 0.9;
    this.modelChangedSubscription = this.panzoomConfig.modelChanged.subscribe( (model: PanZoomModel) => this.onModelChanged(model) );
    this.apiSubscription = this.panzoomConfig.api.subscribe( (api: PanZoomAPI) => this.onGotNewApi(api) );


    // Take subscriptions

    this.searchBarOpenSubscription = this.toolService.searchBarOpen.subscribe( (state: boolean) => this.onSearchBarOpen(state) );

    this.caseSensitiveSearchChangedSubscription = this.toolService.caseSensitiveSearchChanged.subscribe( () => this.toggleCaseSensitiveSearch() );

    this.searchTermsChangedSubscription = this.toolService.searchTermsChanged.subscribe( (event: any) => this.searchTermsChanged(event) );

    this.maskChangedSubscription = this.toolService.maskChanged.subscribe( (event: any) => this.maskChanged(event) );

    this.noCollectionsSubscription = this.dataService.noCollections.subscribe( () => this.onNoCollections() );

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

    if (this.toolService.loadCollectionOnRouteChange) {
      this.toolService.loadCollectionOnRouteChange = false;
      this.toolService.getCollectionDataAgain.next();
    }

  }



  ngAfterViewInit(): void {
    this.resetZoomToFit();
  }



  onNextSessionClicked(): void {
    log.debug('ClassicGridComponent: onNextSessionClicked()');
    // build a list of un-filtered tile id's
    let displayedTileIds: string[] = [];
    for (let i = 0; i < this.displayedContent.length; i++) {
      let contentItem = this.displayedContent[i];
      displayedTileIds.push(contentItem.id);
    }
    log.debug('ClassicGridComponent: onNextSessionClicked(): displayedTileIds:', displayedTileIds);
    // log.debug('content:', this.content);
    let nextContentItem: Content = null;
    let nextContentItemId = null;
    let nextSessionId = null;
    for (let i = 0; i < displayedTileIds.length; i++) {
      if (displayedTileIds[i] === this.selectedContentId && i < displayedTileIds.length - 1 ) {
        nextContentItemId = displayedTileIds[i + 1];
        log.debug('ClassicGridComponent: onNextSessionClicked(): nextContentItemId:', nextContentItemId);
        if (displayedTileIds.length - 1 === i + 1) {
          // this is the last displayed item.  disable the next session button
          log.debug('ClassicGridComponent: onNextSessionClicked(): noNextSession:', true);
          this.toolService.noNextSession.next(true);
        }
        else {
          log.debug('ClassicGridComponent: onNextSessionClicked(): noNextSession:', false);
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

    log.debug('ClassicGridComponent: onNextSessionClicked(): nextContentItem:', nextContentItem);
    log.debug('ClassicGridComponent: onNextSessionClicked(): nextSessionId:', nextSessionId);
    log.debug('ClassicGridComponent: onNextSessionClicked(): selectedContentType:', this.selectedContentType);

    if ( (this.selectedContentType === 'pdf' || this.selectedContentType === 'office') && ( nextContentItem.contentType === 'pdf' || nextContentItem.contentType === 'office') ) {
      // just display the next content item
      log.debug('ClassicGridComponent: onNextSessionClicked(): got to 1');
      this.toolService.newSession.next(this.sessions[nextSessionId]);
      this.toolService.newImage.next(nextContentItem);
    }
    else if ( (this.selectedContentType === 'pdf' || this.selectedContentType === 'office') && !( nextContentItem.contentType === 'pdf' || nextContentItem.contentType === 'office') ) {
      // close the pdf modal and open the session-details modal
      log.debug('ClassicGridComponent: onNextSessionClicked(): got to 2');
      this.modalService.close('pdf-viewer');
      this.toolService.newSession.next(this.sessions[nextSessionId]);
      this.toolService.newImage.next(nextContentItem);
      this.modalService.open('sessionDetails');
    }
    else if ( !(this.selectedContentType === 'pdf' || this.selectedContentType === 'office') && !( nextContentItem.contentType === 'pdf' || nextContentItem.contentType === 'office') ) {
      // just display the next content item
      log.debug('ClassicGridComponent: onNextSessionClicked(): got to 3');
      this.toolService.newSession.next(this.sessions[nextSessionId]);
      this.toolService.newImage.next(nextContentItem);
    }
    else {
      // close the session-details modal and open the pdf modal
      log.debug('ClassicGridComponent: onNextSessionClicked(): got to 4');
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
    for (let i = 0; i < this.displayedContent.length; i++) {
      let contentItem = this.displayedContent[i];
      displayedTileIds.push(contentItem.id);
    }
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
    for (let i = 0; i < this.displayedContent.length; i++) {
      let contentItem = this.displayedContent[i];
      displayedTileIds.push(contentItem.id);
    }
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



  onSessionsPurged(sessionsToPurge: number[]): void {
    log.debug('ClassicGridComponent: onSessionsPurged(): sessionsPurged:', sessionsToPurge);

    let searchRemoved = this.purgeSessions(sessionsToPurge);

// !!! this displayedContent line should be revisited so that it takes in to account last mask and search!!!
    // this.displayedContent = this.content.sort(this.sortContent);
// !!!

    this.maskChanged(this.lastMask);
    this.countContent();
    if (searchRemoved > 0 && this.searchBarOpen) {
      this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
    }
    // this.changeDetectionRef.detectChanges();
    // this.changeDetectionRef.markForCheck();
  }



  onSearchPublished(s: Search[]): void {
    // this receives a partial search term data from a building collection
    log.debug('ClassicGridComponent: onSearchPublished(): searchPublished:', s);
    for (let i = 0; i < s.length; i++) {
      this.search.push(s[i]);
    }
    // log.debug("ClassicGridComponent: searchPublishedSubscription: this.search:", this.search);
    // this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
  }



  onSearchReplaced(s: Search[]): void {
    // this receives complete search term data from complete collection
    this.search = s;
    log.debug('ClassicGridComponent: onSearchReplaced(): searchReplaced:', this.search);
    // this.changeDetectionRef.detectChanges();
    // this.changeDetectionRef.markForCheck();
  }



  onContentPublished(newContent: any): void {
    // when content is pushed from a still-building rolling, or monitoring collection
    log.debug('ClassicGridComponent: onContentPublished(): contentPublished:', newContent);

    if (this.destroyView) {
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
      /*else if (newContent[i].contentType === 'office' ) {
        this.contentCount.officeDocs++;
      }*/
      else if (newContent[i].contentType === 'office' && newContent[i].contentSubType === 'word') {
        this.contentCount.word++;
      }
      else if (newContent[i].contentType === 'office' && newContent[i].contentSubType === 'excel') {
        this.contentCount.excel++;
      }
      else if (newContent[i].contentType === 'office' && newContent[i].contentSubType === 'powerpoint') {
        this.contentCount.powerpoint++;
      }
      else if (newContent[i].contentType === 'hash' ) {
        this.contentCount.hashes++;
      }
      else if ( this.dodgyArchivesIncludedTypes.includes(newContent[i].contentType) ) {
          this.contentCount.dodgyArchives++;
      }
      if (newContent[i].fromArchive && !this.dodgyArchivesIncludedTypes.includes(newContent[i].contentType)) {
        this.contentCount.fromArchives++;
      }
    }
    this.contentCount.total = this.content.length;
    this.toolService.contentCount.next( this.contentCount );

    // if (this.searchBarOpen) { this.searchTermsChanged( { searchTerms: this.lastSearchTerm } ); }
    this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
    this.changeDetectionRef.detectChanges();
    this.sessionWidgetDecider();
  }



  onContentReplaced(i: any): void {
    log.debug('ClassicGridComponent: onContentReplaced(): contentReplaced:', i); // when a new collection is selected
    this.destroyView = true;
    this.content = i;
    this.displayedContent = i.sort(this.sortContent);
    this.countContent();
    this.destroyView = false;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.sessionWidgetDecider();
    // this.panZoomAPI.zoomToFit( {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight });
    this.changeDetectionRef.detectChanges();
  }



  onSessionPublished(s: any): void {
    log.debug('ClassicGridComponent: onSessionPublished(): sessionPublished', s); // when an individual session is pushed from a building collection (or monitoring or rolling)
    let sessionId = s.id;
    this.sessionsDefined = true;
    this.sessions[sessionId] = s;
  }



  onSessionsReplaced(s: any): void {
    // when an a whole new collection is selected
    log.debug('ClassicGridComponent: onSessionsReplaced(): sessionsReplaced:', s);
    this.sessionsDefined = true;
    this.sessions = s;
  }



  onCollectionStateChanged(state: string): void {
    // this triggers when a monitoring collection refreshes
    log.debug('ClassicGridComponent: onCollectionStateChanged(): collectionStateChanged:', state);
    if (state === 'monitoring')  {
      this.destroyView = true;
      this.sessionsDefined = false;
      this.search = [];
      this.sessions = {};
      this.content = [];
      this.displayedContent = [];
      this.resetContentCount();
      this.destroyView = false;
      this.changeDetectionRef.detectChanges();
    }
  }



  onSelectedCollectionChanged(collection: any): void {
    // this triggers whenever we choose a new collection
    log.debug('ClassicGridComponent: onSelectedCollectionChanged(): selectedCollectionChanged:', collection);
    this.destroyView = true;
    this.sessionsDefined = false;
    this.displayedContent = [];
    this.search = [];
    this.sessions = {};
    this.content = [];
    this.resetContentCount();
    this.selectedCollectionType = collection.type;
    this.selectedCollectionServiceType = collection.serviceType; // 'nw' or 'sa'
    if (collection.type === 'monitoring') {
      this.collectionId = collection.id + '_' + this.dataService.clientSessionId;
    }
    else {
      this.collectionId = collection.id;
    }
    this.pauseMonitoring = false;
    this.changeDetectionRef.detectChanges();
  }



  onNoCollections(): void {
    log.debug('ClassicGridComponent: onNoCollections()');
    this.destroyView = true;
    this.sessionsDefined = false;
    this.displayedContent = [];
    this.search = [];
    this.sessions = {};
    this.content = [];
    this.resetContentCount();
    this.selectedCollectionType = null;
    this.collectionId = null;
    this.selectedCollectionServiceType = null;
    this.changeDetectionRef.detectChanges();
  }



  onSearchBarOpen(state: boolean): void {
    this.searchBarOpen = state;
  }



  onModelChanged(model: PanZoomModel): void {
    this.panzoomModel = model;
    this.sessionWidgetDecider();
  }



  onGotNewApi(api: PanZoomAPI): void {
    log.debug('ClassicGridComponent: onGotNewApi(): Got new API');
    this.panZoomAPI = api;
  }



  public onWindowResize(): void {
    log.debug('ClassicGridComponent: onWindowResize()');
    // this.initialZoomWidth = window.innerWidth;
    // this.initialZoomHeight = window.innerHeight;
    this.resetZoomToFit();
  }



  private sortNumber(a: number, b: number): number {
      return b - a;
  }



  private sortContent(a: any, b: any): number {
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



  private maskChanged(e: ContentMask): void {
    this.lastMask = e;
    log.debug('ClassicGridComponent: maskChanged():', e);

    if (e.showImage && e.showPdf && e.showWord && e.showExcel && e.showPowerpoint && e.showHash && e.showDodgy && !e.showFromArchivesOnly) {
      // this.displayedContent = this.content.sort(this.sortContent);
      this.displayedContent = this.content;
      return;
    }

    let tempDisplayedContent: Content[] = [];
    let fromArchivesOnly = false;

    if (e.showFromArchivesOnly) {
      fromArchivesOnly = true;
    }
    if (e.showImage) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('image', fromArchivesOnly));
    }
    if (e.showPdf) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('pdf', fromArchivesOnly));
    }
    if (e.showWord) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('word', fromArchivesOnly));
    }
    if (e.showExcel) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('excel', fromArchivesOnly));
    }
    if (e.showPowerpoint) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('powerpoint', fromArchivesOnly));
    }
    if (e.showHash) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('hash', fromArchivesOnly));
    }
    if (e.showDodgy && !fromArchivesOnly) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('unsupportedZipEntry', false));
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('encryptedZipEntry', false));
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('encryptedRarEntry', false));
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('encryptedRarTable', false));
    }
    if (tempDisplayedContent.length > 0) {
      // this.displayedContent = tempDisplayedContent.sort(this.sortContent);
      this.displayedContent = tempDisplayedContent;
    }
    else {
      this.displayedContent = [];
    }
  }



  private sessionWidgetDecider(): void {
    // log.debug('ClassicGridComponent: sessionWidgetDecider():', this.panzoomModel.zoomLevel);
    if (!(this.panzoomModel)) {
      return;
    }

    // log.debug(this.panzoomModel.zoomLevel);

    if (this.panzoomModel.zoomLevel < this.transitionZoomLevel) {
      this.hideSessionWidget();
      return;
    }

    let center: Point = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };

    let focusedElement = document.elementFromPoint(center.x, center.y);

    if (!focusedElement.classList.contains('thumbnail')) {
      this.hideSessionWidget();
      return;
    }

    if ( !this.previousFocusedElement ||
      ( this.previousFocusedElement.isSameNode(focusedElement) && !this.sessionWidgetEnabled && focusedElement.nodeName === 'IMG' ) ||
      ( this.previousFocusedElement && !this.previousFocusedElement.isSameNode(focusedElement) && focusedElement.nodeName === 'IMG' && focusedElement.hasAttribute('contentfile') ) ) {

        let focusedTile = focusedElement.parentNode.parentNode.parentElement;

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
    // if (!this.sessionWidgetEnabled) {
      this.hoveredContentSession = sessionId;
      this.popUpSession = this.sessions[sessionId];

      let sessionsForHighResTemp = {};
      for (let i = 0; i < sessionsForHighRes.length; i++) {
        let id = sessionsForHighRes[i];
        sessionsForHighResTemp[id] = true;
      }
      // this.highResSessions = sessionsForHighRes;
      // this.highResSessions = sessionsForHighResTemp;
      this.toolService.showHighResSessions.next(sessionsForHighResTemp);

      this.sessionWidgetEnabled = true;
      this.changeDetectionRef.detectChanges();
    // }
  }



  private hideSessionWidget(): void {
    // log.debug("ClassicGridComponent: hideSessionWidget()");
    // this.sessionWidgetEnabled = false;
    if (this.sessionWidgetEnabled) {
      this.sessionWidgetEnabled = false;
      this.changeDetectionRef.detectChanges();
    }
  }



  private toggleCaseSensitiveSearch(): void {
    log.debug('ClassicGridComponent: toggleCaseSensitiveSearch()');
    this.caseSensitiveSearch = !this.caseSensitiveSearch;
    this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
  }



  private getContentBySessionAndContentFile(o: any): any {
    for (let x = 0; x < this.content.length; x++) {
      if (this.content[x].session === o.session && utils.pathToFilename(this.content[x].contentFile) === o.contentFile) {
        return this.content[x];
      }
    }
  }



  private searchTermsChanged(e: any): void {
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
          matchedIds.push(matchedId);
        }
        else if (this.caseSensitiveSearch && this.search[i].searchString.indexOf(searchTerms) >= 0) { // case-sensitive search
          // we found a match!
          let matchedId = this.search[i].id;
          matchedIds.push(matchedId);
        }
      }
    }

    let tempDisplayedContent: Content[] = [];

    if (matchedIds.length === 0) {
      this.displayedContent = [];
    }
    else {
      // this.filter = matchedIds.join(',');
      for (let i = 0; i < this.content.length; i++) {
        let item = this.content[i];
        if (matchedIds.includes(item.id) ) {
          tempDisplayedContent.push(item);
        }
      }
      // this.displayedContent = tempDisplayedContent.sort(this.sortContent);
      this.displayedContent = tempDisplayedContent;
    }

    this.changeDetectionRef.detectChanges();
  }



  private resetContentCount(): void {
    this.contentCount = new ContentCount;
    this.toolService.contentCount.next( this.contentCount );
  }



  private countContent(): void {
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
      if (this.content[i].contentType === 'office' && this.content[i].contentSubType === 'word') {
        this.contentCount.word++;
      }
      if (this.content[i].contentType === 'office' && this.content[i].contentSubType === 'excel') {
        this.contentCount.excel++;
      }
      if (this.content[i].contentType === 'office' && this.content[i].contentSubType === 'powerpoint') {
        this.contentCount.powerpoint++;
      }
      if (this.dodgyArchivesIncludedTypes.includes(this.content[i].contentType)) {
        this.contentCount.dodgyArchives++;
      }
      if (this.content[i].fromArchive && !this.dodgyArchivesIncludedTypes.includes(this.content[i].contentType)) {
        this.contentCount.fromArchives++;
      }
    }
    this.contentCount.total = this.content.length;
    this.toolService.contentCount.next( this.contentCount );
  }



  private getContentByType(type: string, fromArchiveOnly: boolean): Content[] {
    let temp: Content[] = [];
    for (let i = 0; i < this.content.length; i++) {
      let item = this.content[i];
      if (!fromArchiveOnly && ( item.contentType === type || ('contentSubType' in item && item.contentSubType === type) ) ) {
        temp.push(item);
      }
      else if (fromArchiveOnly && item.fromArchive && ( item.contentType === type || ('contentSubType' in item && item.contentSubType === type) ) ) {
        temp.push(item);
      }
    }
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

}
