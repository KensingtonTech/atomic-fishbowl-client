import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList, ComponentRef, ElementRef, Renderer2, ChangeDetectorRef, AfterViewInit, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { Router, ActivatedRoute, NavigationStart } from '@angular/router';
import { NgStyle } from '@angular/common';
import { ToolService } from './tool.service';
import { DataService } from './data.service';
import { Content } from './content';
import { ContentCount } from './contentcount';
import { ModalService } from './modal/modal.service';
import { IsotopeOptions } from './isotope/isotope-options';
import { IsotopeDirective } from './isotope/isotope.directive';
import { ContentMask } from './contentmask';
import { Search } from './search';
import { Subscription } from 'rxjs/Subscription';
import { Collection } from './collection';
import { Preferences } from './preferences';
import * as math from 'mathjs';
import * as utils from './utils';
import * as log from 'loglevel';
declare var $: any;

/*interface VelocityOptions {
  duration: number;
  container: JQuery;
  easing: string;
  complete: Function;
}

declare global {
  interface JQuery {
    // declare our velocity JQuery plugin
    velocity(action: string, options?: VelocityOptions): JQuery;
  }
}*/

@Component({
  selector: 'masonry-grid-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div style="position:absolute; left: 0; right: 0; bottom: 0; top: 30px; background-color: black;">
  <div style="position: absolute; left: 0; width: 100px; height: 100%;">
    <masonry-control-bar></masonry-control-bar>

    <!-- pause / resume buttons for monitoring collections -->
    <div *ngIf="selectedCollectionType == 'monitoring'" style="position: absolute; left: 15px; top: 100px; color: white; z-index: 100;">
      <i *ngIf="!pauseMonitoring" class="fa fa-pause-circle-o fa-4x" (click)="suspendMonitoring()"></i>
      <i *ngIf="pauseMonitoring" class="fa fa-play-circle-o fa-4x" (click)="resumeMonitoring()"></i>
    </div>
  </div>

  <div #canvas tabindex="-1" class="scrollContainer noselect" style="position: absolute; left: 100px; right: 0; top: 0; bottom: 0; overflow-y: scroll; outline: 0px solid transparent;">

    <div isotope *ngIf="!destroyView && content && sessionsDefined && masonryKeys" #isotope tabindex="-1" class="grid" [options]="isotopeOptions" [filter]="filter" style="width: 100%; height: 100%;">

        <masonry-tile *ngFor="let item of content" isotope-brick class="brick" [ngStyle]="{'width.px': masonryColumnWidth}" [attr.contentType]="item.contentType" [content]="item" [sessionId]="item.session" [masonryKeys]="masonryKeys" [masonryColumnWidth]="masonryColumnWidth" [serviceType]="selectedCollectionServiceType" [attr.id]="item.id">

        </masonry-tile>

    </div>

    <div class="scrollTarget"></div>
  </div>
</div>

<!-- modals -->
<pdf-viewer-modal *ngIf="selectedCollectionServiceType" id="pdf-viewer" [serviceType]="selectedCollectionServiceType"></pdf-viewer-modal>
<session-details-modal *ngIf="selectedCollectionServiceType" id="sessionDetails" [serviceType]="selectedCollectionServiceType"></session-details-modal>
`,

  styles: [`

    .brick {
      margin-top: 20px;
    }

    isotope {
      outline-width: 0;
    }

  `]
})

export class MasonryGridComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(  private dataService: DataService,
                private toolService: ToolService,
                private renderer: Renderer2,
                private elRef: ElementRef,
                private modalService: ModalService,
                private changeDetectionRef: ChangeDetectorRef,
                private router: Router,
                private route: ActivatedRoute,
                private zone: NgZone ) {}

  @ViewChildren('isotope') isotopeRef: QueryList<any>;
  @ViewChild(IsotopeDirective) private isotopeDirectiveRef: IsotopeDirective;
  @ViewChild('canvas') private canvasRef: ElementRef;

  private search: Search[] = []; // 'search' is an array containing text extracted from PDF's which can be searched
  public content: Content[] = [];
  public sessions: any = {};
  public sessionsDefined = false;
  private contentCount = new ContentCount; // { images: number, pdfs: number, officeDocs: number, dodgyArchives: number, hashes: number, total: number }

  private caseSensitiveSearch = false;
  private lastSearchTerm = '';
  private pauseMonitoring = false;
  public masonryColumnWidth = Number(this.toolService.getPreference('masonryColumnWidth')) || 350; // default is 350
  public filter = '*';
  private isotopeOptions: IsotopeOptions =  {
    layoutMode: 'masonry',
    itemSelector: '.brick',
    initLayout: true,
    resize: true,
    masonry: {
      columnWidth: this.masonryColumnWidth,
      gutter: 20,
      horizontalOrder: true,
      fitWidth: true,
    }
  };

  public destroyView = true;

  public selectedCollectionType: string = null;
  public selectedCollectionServiceType: string = null; // 'nw' or 'sa'
  private collectionId: string = null;

  // private pixelsPerSecond = 200;
  private pixelsPerSecond = Number(this.toolService.getPreference('autoScrollSpeed')) || 200; // default is 200 pixels per second

  private dodgyArchivesIncludedTypes: any = [ 'encryptedRarEntry', 'encryptedZipEntry', 'unsupportedZipEntry', 'encryptedRarTable' ];
  public masonryKeys: any = null;
  private lastMask = new ContentMask;
  // private lastWindowHeight = $('masonry').height();
  private searchBarOpen = false;
  private collectionState = '';
  private preferences: Preferences;
  public tabContainerModalId = 'tab-container-modal';
  private urlParametersLoaded = false;

  // scrolling
  private autoScrollStarted = false;
  private autoScrollAnimationRunning = false; // this tracks autoscroller state
  private scrollTarget: any;
  private scrollContainer: any;
  // private scrollPosition: number;
  private scrollContainerHeight = 0;
  private viewportHeight = 0;
  private toolbarHeight = 0;

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
  private onSplashScreenAtStartupClosedSubscription: Subscription;
  private refreshMasonryLayoutSubscription: Subscription;
  private masonryColumnWidthChangedSubscription: Subscription;
  private masonryAutoscrollSpeedChangedSubscription: Subscription;

  ngOnDestroy(): void {
    log.debug('MasonryGridComponent: ngOnDestroy()');
    window.removeEventListener('resize', this.onWindowResize );
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
    this.onSplashScreenAtStartupClosedSubscription.unsubscribe();
    this.refreshMasonryLayoutSubscription.unsubscribe();
    this.masonryColumnWidthChangedSubscription.unsubscribe();
    this.masonryAutoscrollSpeedChangedSubscription.unsubscribe();
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
    log.debug('MasonryGridComponent: ngOnInit()');
    this.toolService.lastRoute = 'masonryGrid';


    // New startup code
    log.debug('MasonryGridComponent: ngOnInit(): toolService.urlParametersLoaded:', this.toolService.urlParametersLoaded);
    log.debug('MasonryGridComponent: ngOnInit(): toolService.queryParams:', this.toolService.queryParams);
    this.onSplashScreenAtStartupClosedSubscription = this.toolService.onSplashScreenAtStartupClosed.subscribe( () => {
      if (!this.toolService.queryParams) {
        this.modalService.open(this.tabContainerModalId);
      }
    });

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


    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'black');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'overflow', 'hidden');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'margin', '0');

    // Take subscriptions

    this.searchBarOpenSubscription = this.toolService.searchBarOpen.subscribe( (state: boolean) => this.onSearchBarOpen(state) );

    this.routerEventsSubscription = this.router.events.subscribe( (val: any) => this.onRouterEvent(val));

    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) );

    this.caseSensitiveSearchChangedSubscription = this.toolService.caseSensitiveSearchChanged.subscribe( () => this.toggleCaseSensitiveSearch() );

    this.searchTermsChangedSubscription = this.toolService.searchTermsChanged.subscribe( (event: any) => this.onSearchTermsChanged(event) );

    this.maskChangedSubscription = this.toolService.maskChanged.subscribe( (event: ContentMask) => this.onMaskChanged(event) );

    this.noCollectionsSubscription = this.dataService.noCollections.subscribe( () => this.onNoCollections() );

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

    this.layoutCompleteSubscription = this.toolService.layoutComplete.subscribe( (height) => this.onLayoutComplete(height) );

    this.openPDFViewerSubscription = this.toolService.openPDFViewer.subscribe( () => this.openPdfViewer() );

    this.openSessionViewerSubscription = this.toolService.openSessionViewer.subscribe( () => this.openSessionDetails() );

    this.refreshMasonryLayoutSubscription = this.toolService.refreshMasonryLayout.subscribe( () => this.onRefreshMasonryLayout() );

    this.masonryColumnWidthChangedSubscription = this.toolService.masonryColumnWidthChanged.subscribe( (width: number) => this.onMasonryColumnWidthChanged(width) );

    this.masonryAutoscrollSpeedChangedSubscription = this.toolService.masonryAutoscrollSpeedChanged.subscribe( (autoScrollSpeed: number) => this.onAutoscrollSpeedChanged(autoScrollSpeed) );

  }



  ngAfterViewInit() {
    window.dispatchEvent(new Event('resize'));
    this.zone.runOutsideAngular( () => window.addEventListener('resize', this.onWindowResize ) );

    if (this.toolService.loadCollectionOnRouteChange) {
      log.debug('MasonryGridComponent: ngAfterViewInit(): getting collection data again on toolService.loadCollectionOnRouteChange');
      this.toolService.loadCollectionOnRouteChange = false;
      this.toolService.getCollectionDataAgain.next();
    }

    this.scrollTarget = document.getElementsByClassName('scrollTarget')[0];
    this.scrollContainer = document.getElementsByClassName('scrollContainer')[0];
    let toolbar: any = document.getElementsByClassName('afb-toolbar')[0];
    this.toolbarHeight = toolbar.offsetHeight;
    this.viewportHeight = window.innerHeight;
  }



  onRefreshMasonryLayout(): void {
    if (this.isotopeDirectiveRef) {
      this.isotopeDirectiveRef.layout();
    }
  }



  onWindowResize = (event) => {
    log.debug('MasonryGridComponent: onWindowResize(): event:', event);
    this.viewportHeight = window.innerHeight;
  }



  onSearchBarOpen(state: boolean): void {
    this.searchBarOpen = state;
  }



  onRouterEvent(val: any): void {
    // Take action to destroy masonry when we navigate away - saves us loads of time waiting for all the bricks to be removed and isotope to be destroyed
    // log.debug('MasonryGridComponent: onRouterEvent(): received val:', val);
    if (val instanceof NavigationStart) {
      log.debug('MasonryGridComponent: onRouterEvent(): manually destroying isotope');
      if (this.isotopeDirectiveRef) { this.isotopeDirectiveRef.destroyMe(); }
    }
  }



  onPreferencesChanged(prefs: Preferences): void {

    if (this.selectedCollectionServiceType) {
      if (this.selectedCollectionServiceType === 'nw') {
        this.masonryKeys = JSON.parse(JSON.stringify(prefs.nw.masonryKeys));
      }
      if (this.selectedCollectionServiceType === 'sa') {
        this.masonryKeys = JSON.parse(JSON.stringify(prefs.sa.masonryKeys));
      }
    }
    this.changeDetectionRef.detectChanges(); // we need this to be before layout()

    // we need to trigger a layout when we change masonry meta keys in preferences
    if ( this.isotopeDirectiveRef && JSON.stringify(prefs.nw.masonryKeys) !== JSON.stringify(this.preferences.nw.masonryKeys) ) {
      log.debug('MasonryGridComponent: onPreferencesChanged(): Masonry keys have changed.  Calling Isotope layout');
      this.isotopeDirectiveRef.layout();
    }

    this.preferences = prefs;
  }



  onMasonryColumnWidthChanged(width: number): void {
    if (this.masonryColumnWidth !== width) {
      log.debug('MasonryGridComponent: onMasonryColumnWidthChanged(): Changing masonry column size to', width);
      this.masonryColumnWidth = width;
      this.changeDetectionRef.detectChanges();

      let newIsotopeOptions: IsotopeOptions = Object.assign({}, this.isotopeOptions); // deep copy so that the reference is changed and can thus be detected
      newIsotopeOptions.masonry.columnWidth = this.masonryColumnWidth;
      this.isotopeOptions = newIsotopeOptions;

      // we have a second detectChanges() as we need the tiles to update their width prior to layout being called
      // otherwise, the spacing between the tiles will be all wrong
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



  onSearchTermsChanged(event: any): void {
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



  onNoCollections(): void {
    log.debug('MasonryGridComponent: onNoCollections()');
    if (this.isotopeDirectiveRef) { this.isotopeDirectiveRef.destroyMe(); }
    this.destroyView = true;
    this.sessionsDefined = false;
    this.search = [];
    this.sessions = {};
    this.content = [];
    this.resetContentCount();
    this.stopAutoScroll();

    this.selectedCollectionType = null;
    this.collectionState = '';
    this.collectionId = null;
    this.selectedCollectionServiceType = null;
    this.masonryKeys = null;

    this.changeDetectionRef.detectChanges();
  }



  onSelectedCollectionChanged(collection: Collection): void {
    // this triggers when a user chooses a new collection
    log.debug('MasonryGridComponent: onSelectedCollectionChanged(): collection:', collection);
    if (this.isotopeDirectiveRef) {this.isotopeDirectiveRef.destroyMe(); }
    this.destroyView = true;
    this.sessionsDefined = false;
    this.search = [];
    this.sessions = {};
    this.content = [];
    this.resetContentCount();
    this.stopAutoScroll();
    this.selectedCollectionType = collection.type;
    this.pauseMonitoring = false;
    this.collectionState = collection.state;
    this.collectionId = collection.id;
    this.changeDetectionRef.detectChanges();

    if (collection.serviceType === 'nw') {
      this.masonryKeys = JSON.parse(JSON.stringify(this.preferences.nw.masonryKeys));
    }
    if (collection.serviceType === 'sa') {
      this.masonryKeys = JSON.parse(JSON.stringify(this.preferences.sa.masonryKeys));
    }
    setTimeout( () => this.selectedCollectionServiceType = collection.serviceType, 0); // 'nw' or 'sa'

  }



  onCollectionStateChanged(state: string): void {
    // this triggers when a monitoring collection refreshes or when a fixed collection is 'building'
    log.debug('MasonryGridComponent: onCollectionStateChanged(): state:', state);
    this.collectionState = state;
    if (state === 'monitoring')  {
      if (this.isotopeDirectiveRef) { this.isotopeDirectiveRef.destroyMe(); }
      this.destroyView = true;
      this.changeDetectionRef.detectChanges();
      if (this.autoScrollStarted) { this.restartAutoScroll(); }
      this.search = [];
      this.sessions = {};
      this.content = [];
      this.sessionsDefined = false;
      this.resetContentCount();
    }
    /*if (state === 'building' || state === 'rolling' ) {
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    }*/
  }



  onSessionsReplaced(s: any): void {
    // when a whole new sessions collection is received
    log.debug('MasonryGridComponent: onSessionsReplaced: sessions:', s);
    this.sessionsDefined = true;
    this.sessions = s;
    // this.changeDetectionRef.markForCheck();
    // this.changeDetectionRef.detectChanges();
  }


  onSessionPublished(s: any): void {
    // when an individual session is pushed from a building collection (or monitoring or rolling)
    log.debug('MasonryGridComponent: onSessionPublished(): session', s);
    let sessionId = s.id;
    this.sessionsDefined = true;
    this.sessions[sessionId] = s;
  }



  onContentReplaced(content: any) {
    // when a whole new content collection is received
    log.debug('MasonryGridComponent: onContentReplaced(): content:', content);
    if (this.content.length !== 0 && this.isotopeDirectiveRef) { this.isotopeDirectiveRef.destroyMe(); } // we need this for when we replace the collection and it is biggish.  Prevents performance issues by completely blowing away Isotope rather than letting it tear itself down
    this.destroyView = true;
    this.changeDetectionRef.detectChanges();

    content.sort(this.sortContent);
    this.content = content;
    this.countContent();
    this.destroyView = false;
    this.changeDetectionRef.detectChanges();

    setTimeout( () => {
      // Sets keyboard focus
      if (this.content && this.sessionsDefined && this.masonryKeys && this.masonryColumnWidth && !this.destroyView) {
        this.canvasRef.nativeElement.focus();
      }
    }, 50);
  }


  onContentPublished(newContent: any): void {
    // when a content object is pushed from a still-building fixed, rolling, or monitoring collection
    log.debug('MasonryGridComponent: onContentPublished(): content:', newContent);

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
  }



  onSearchReplaced(s: Search[]): void {
    // this receives complete search term data from complete collection
    this.search = s;
    log.debug('MasonryGridComponent: onSearchReplaced(): search:', this.search);
  }



  onSearchPublished(s: Search[]): void {
    // this receives a partial search term data from a building collection
    log.debug('MasonryGridComponent: onSearchPublished(): searchTerm:', s);
    for (let i = 0; i < s.length; i++) {
      this.search.push(s[i]);
    }
    // log.debug("MasonryGridComponent: searchPublishedSubscription: this.search:", this.search);
    // if (this.searchBarOpen) { this.searchTermsChanged( { searchTerms: this.lastSearchTerm } ); } // we don't do this here because the content arrives after the search term

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







  ////////////////// SCROLLING //////////////////


  onScrollToBottomClicked(): void {
    // runs autoScroller() when someone clicks the arrow button on the toolbar
    this.autoScrollStarted = true;
    this.startScrollerAnimation();
  }



  onStopScrollToBottomClicked(): void {
    // stops the autoScroller with stopScrollerAnimation() when someone clicks the stop button on the toolbar
    this.autoScrollStarted = false;
    this.stopScrollerAnimation();
  }



  onLayoutComplete(height: number): void {

    // this gets called when Isotope finishes a layout operation.  This means that the window height may have potentially grown
    // log.debug('MasonryGridComponent: onLayoutComplete(): height:', height);
    log.debug('MasonryGridComponent: onLayoutComplete()');
    this.scrollContainerHeight = height;

    if (!this.autoScrollStarted) {
      return;
    }

    this.startScrollerAnimation();
  }



  stopScrollerAnimation(): void {
    log.debug('MasonryGridComponent: stopScrollerAnimation(): Stopping scroller');
    $('.scrollTarget').velocity('stop');
     this.autoScrollAnimationRunning = false;
    // this.toolService.scrollToBottomStopped.next(); // sometimes we need to use this method without triggering an end to the controlbar
  }



  startScrollerAnimation(): void {
    if (this.autoScrollAnimationRunning) {
      return;
    }

    // attempt to get scrollTop through listening to scroll event.  Unsuccessful.  The event doesn't actually contain the scroll position
    // this.scrollContainer.addEventListener('scroll', (event) => log.debug('event:', event ));
    // this.scrollContainer.onscroll = (event) => console.log('event:', event);

    log.debug('MasonryGridComponent: startScrollerAnimation(): Starting scroller');

    // Add a new animation to the animation queue

    this.autoScrollAnimationRunning = true;

    this.zone.runOutsideAngular( () => $('.scrollTarget').velocity( 'scroll',
      {
        duration: this.scrollDuration(),
        container: $('.scrollContainer'),
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

    let offset = Math.round(this.scrollContainerHeight); // how far the scrollTarget is from the top of the container

    let scrollTop = this.scrollContainer.scrollTop; // how far the scrollbars are from the top of the container.  this triggers a reflow.  we need a better way to get this.

    let distance = math.eval(`${offset} - ${scrollTop}`); // how far the container needs to scroll in order to hit the scrolltarget

    if (this.viewportHeight - distance - this.toolbarHeight === 0) {
      // the scrollbar has reached the end
      this.toolService.scrollToBottomStopped.next();
      this.autoScrollStarted = false;
      this.autoScrollAnimationRunning = false;
      return;
    }

    let scrollDuration = math.eval( `( ${distance} / ${this.pixelsPerSecond} ) * 1000`);

    this.zone.runOutsideAngular( () => $('.scrollTarget').velocity( 'scroll',
      {
        duration: scrollDuration,
        container: $('.scrollContainer'),
        easing: 'linear',
        complete: () => this.onAutoScrollAnimationComplete()
      })
    );

  }



  scrollDuration(): number {
    log.debug('MasonryGridComponent: scrollDuration()');

    let offset = Math.round(this.scrollContainerHeight); // how far the scrollTarget is from the top of the container
    // log.debug('MasonryGridComponent: scrollDuration(): offset:', offset);

    let scrollTop = this.scrollContainer.scrollTop; // how far the scrollbars are from the top of the container.  this triggers a reflow.  we need a better way to get this.
    // log.debug('MasonryGridComponent: scrollDuration(): scrollTop:', scrollTop);

    let distance = math.eval(`${offset} - ${scrollTop}`); // how far the container needs to scroll in order to hit the scrolltarget
    // log.debug('MasonryGridComponent: scrollDuration(): distance:', distance);

    // let expr: expression = `( ${distance} / ${this.pixelsPerSecond} ) * 1000`;
    let scrollDuration = math.eval( `( ${distance} / ${this.pixelsPerSecond} ) * 1000`);
    // let scrollDuration = eval( `( ${distance} / ${this.pixelsPerSecond} ) * 1000`);
    // log.debug('MasonryGridComponent: scrollDuration(): scrollDuration:', scrollDuration);

    return scrollDuration;
  }



  private stopAutoScroll(): void {
    // this gets called from onSearchTermsChanged(), onMaskChanged(), onNoCollections(), onSelectedCollectionChanged()
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
    // this.lastWindowHeight = $('isotope').height();
    this.startScrollerAnimation();
  }




  /*startScrollerAnimationOld(): void {
    log.debug('MasonryGridComponent: startScrollerAnimation(): Starting scroller');

    // Add a new animation to the animation queue

    this.zone.runOutsideAngular( () => $('.scrollTarget').velocity( 'scroll',
      {
        duration: this.scrollDuration(),
        container: $('.scrollContainer'),
        easing: 'linear',
        complete: () => this.onAutoScrollAnimationComplete()
      })
    );

    if ( $('.scrollTarget').queue().length > 1) {
      // If there's already an animation running, stop it to allow the next animation in the queue to run
      log.debug('MasonryGridComponent: startScrollerAnimation(): stopping existing animation');
      $('.scrollTarget').velocity('stop');
    }
  }*/



  /*onAutoScrollAnimationCompleteOld(): void {
    // This callback runs when the animation is complete
    // log.debug('MasonryGridComponent: startScrollerAnimation(): Animation complete');
    if (this.selectedCollectionType === 'fixed' && this.collectionState === 'complete') {
      this.stopAutoScroll();
    }
  }*/



  //////////////////// END ANIMATION ////////////////////



  suspendMonitoring(): void {
    this.pauseMonitoring = true;
    this.dataService.pauseMonitoringCollection();
  }



  resumeMonitoring(): void {
    this.pauseMonitoring = false;
    // We must now check whether our collection has disconnected, and if not - call unpauseMonitoringCollection.  If so, call getRollingCollection
    this.dataService.unpauseMonitoringCollection();
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


}
