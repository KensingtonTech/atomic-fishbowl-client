import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ChangeDetectorRef, NgZone, ChangeDetectionStrategy, Input, Inject, forwardRef } from '@angular/core';
import { ToolService } from 'services/tool.service';
import { DataService } from 'services/data.service';
import { Collection } from 'types/collection';
import { ModalService } from './modal/modal.service';
import { ContentCount } from 'types/contentcount';
import { ContentMask } from 'types/contentmask';
import { UseCase } from 'types/usecase';
import { Subscription } from 'rxjs';
import { License } from 'types/license';
import { Logger } from 'loglevel';
import { AbstractGrid } from './abstract-grid.class';
import * as utils from './utils';
declare var log: Logger;

@Component( {
  selector: 'toolbar-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<!-- begin toolbar -->
<div class="afb-toolbar noselect">

  &nbsp;&nbsp;

  <!--Choose a Collection-->
  <span *ngIf="!selectedCollection" (click)="onCollectionsClick()" class="noselect">
    <u>Choose a collection</u>
  </span>

  <ng-container *ngIf="selectedCollection && license">

    &nbsp;&nbsp;&nbsp;

    <!-- collection name -->
    <span class="label selectable" style="font-style: underline;" (click)="onCollectionsClick()"><u>{{selectedCollection.name}}</u></span>

    &nbsp;

    <!--Info Tooltip Icon-->
    <span class="collectionTooltip" *ngIf="selectedCollection" [pTooltip]="infoTooltipText" tooltipPosition="bottom" tooltipStyleClass="collectionTooltip" class="fa fa-info-circle fa-lg fa-fw"></span>

    <!-- Edit Icon -->
    <span *ngIf="selectedCollection.type != 'fixed' && license.valid" pTooltip="Edit collection" class="fa fa-pencil-square-o fa-lg fa-fw" (click)="onEditCollectionClick()"></span>
    <span *ngIf="selectedCollection.type == 'fixed' && license.valid" pTooltip="Reprocess collection" class="fa fa-repeat fa-lg fa-fw" (click)="onEditCollectionClick()"></span>

    <!--State Icons-->
    <span *ngIf="spinnerIcon" class="fa fa-refresh fa-spin fa-lg fa-fw" pTooltip="Building collection"></span>
    <span *ngIf="errorIcon" class="fa fa-exclamation-triangle fa-lg fa-fw" style="color: yellow;" [pTooltip]="errorMessage"></span>
    <span *ngIf="queryingIcon && selectedCollection.serviceType == 'nw'" class="fa fa-question fa-spin fa-lg fa-fw" pTooltip="Querying NetWitness data"></span>
    <span *ngIf="queryingIcon && selectedCollection.serviceType == 'sa'" class="fa fa-question fa-spin fa-lg fa-fw" pTooltip="Querying Security Analytics data"></span>
    <span *ngIf="queryResultsCount == 0 && selectedCollection.state == 'complete' && contentCount.total == 0" class="fa fa-ban fa-lg fa-fw" style="color: red;" pTooltip="0 results were returned from the query"></span>
    <span *ngIf="queryResultsCount == 0 && selectedCollection.state == 'resting' && contentCount.total == 0" class="fa fa-ban fa-lg fa-fw" pTooltip="0 results were returned from the latest query"></span>
    <span *ngIf="workerProgress != null">{{workerLabel}}: {{workerProgress}}&nbsp;&nbsp;</span>

    <!--Collection Type -->
    <span class="label selectable"> {{selectedCollection.type | capFirstLetter}} Collection&nbsp;&nbsp;</span>

    <!-- Collection Time -->
    <span *ngIf="selectedCollection.type == 'rolling'" class="label">Last {{selectedCollection.lastHours}} Hours&nbsp;&nbsp;</span>
    <span *ngIf="selectedCollection.type == 'fixed'" class="label">Time1: </span><span *ngIf="selectedCollection.type == 'fixed'" class="value selectable">{{selectedCollection.timeBegin | formatTime}}</span>&nbsp;
    <span *ngIf="selectedCollection.type == 'fixed'" class="label">Time2: </span><span *ngIf="selectedCollection.type == 'fixed'" class="value selectable">{{selectedCollection.timeEnd | formatTime}}</span>

  </ng-container>


    <!--Mask & Search Buttons-->
    <span style="float: right;">

      <ng-container *ngIf="selectedCollection && license">

        <!-- image mask-->
        <span *ngIf="contentCount.images != 0 && (contentCount.pdfs != 0 || contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.word != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showImages" [class.hide]="showSearch" (click)="maskClick('image')" class="fa fa-file-image-o fa-lg" pTooltip="Mask for image content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

        <!-- pdf mask -->
        <span *ngIf="contentCount.pdfs != 0 && (contentCount.images != 0 || contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.word != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showPdfs" [class.hide]="showSearch" (click)="maskClick('pdf')" class="fa fa-file-pdf-o fa-lg" pTooltip="Mask for PDF content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

        <!-- word mask -->
        <span *ngIf="contentCount.word != 0 && (contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.images != 0 || contentCount.pdfs != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showWord" [class.hide]="showSearch" (click)="maskClick('word')" class="fa fa-file-word-o fa-lg" pTooltip="Mask for Word content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

        <!-- excel mask -->
        <span *ngIf="contentCount.excel != 0 && (contentCount.word != 0 || contentCount.powerpoint != 0 || contentCount.images != 0 || contentCount.pdfs != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showExcel" [class.hide]="showSearch" (click)="maskClick('excel')" class="fa fa-file-excel-o fa-lg" pTooltip="Mask for Excel content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

        <!-- powerpoint mask -->
        <span *ngIf="contentCount.powerpoint != 0 && (contentCount.word != 0 || contentCount.excel != 0 || contentCount.images != 0 || contentCount.pdfs != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showPowerpoint" [class.hide]="showSearch" (click)="maskClick('powerpoint')" class="fa fa-file-powerpoint-o fa-lg" pTooltip="Mask for PowerPoint content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

        <!-- dodgy archive mask -->
        <span *ngIf="contentCount.dodgyArchives != 0 && !showFromArchivesOnly && (contentCount.pdfs != 0 || contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.word != 0 || contentCount.images != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showDodgyArchives" [class.hide]="showSearch" (click)="maskClick('dodgy')" class="fa fa-lock fa-lg" pTooltip="Mask for dodgy archive content" escape="false" showdelay="750" tooltipPosition="bottom">&nbsp;</span>

        <!-- hash mask -->
        <span *ngIf="contentCount.hashes != 0 && (contentCount.pdfs != 0 || contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.word != 0 || contentCount.dodgyArchives != 0 || contentCount.images != 0)" [class.fa-deselect]="!showHashes" [class.hide]="showSearch" (click)="maskClick('hash')" class="fa fa-hashtag fa-lg" pTooltip="Mask for matched hash content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

        <!-- only from archives mask -->
        <span *ngIf="contentCount.fromArchives != 0 && contentCount.fromArchives != contentCount.total" [class.fa-deselect]="!showFromArchivesOnly" [class.hide]="showSearch" (click)="maskClick('archivesOnly')" class="fa fa-file-archive-o fa-lg" pTooltip="Only show content extracted from archives" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

        <!--Search Button-->
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <span *ngIf="contentCount.pdfs != 0 || contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.word != 0" class="fa fa-search fa-lg" (click)="toggleSearch()"></span>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

      </ng-container>

      <!--Preferences, Accounts, Help, and Logout Buttons-->
      <span (click)="preferencesButtonClick()" class="fa fa-cog fa-lg" pTooltip="Global preferences" escape="false" showDelay="750" tooltipPosition="bottom"></span>&nbsp;
      <span (click)="accountsButtonClick()" class="fa fa-users fa-lg" pTooltip="Manage users" escape="false" showDelay="750" tooltipPosition="bottom"></span>&nbsp;
      <span (click)="helpButtonClick()" class="fa fa-question fa-lg" pTooltip="About Atomic Fishbowl" escape="false" showDelay="750" tooltipPosition="bottom"></span>&nbsp;
      <span (click)="logoutButtonClick()" class="fa fa-sign-out fa-lg" pTooltip="Logout" escape="false" showDelay="750" tooltipPosition="left"></span>&nbsp;&nbsp;

    </span>
</div>
<!-- end toolbar -->



<!--Search Bar Dropdown-->
<div class="noselect toolbarSearchDropdown" (keydown.escape)="toggleSearch()" *ngIf="showSearch">
  <input #searchBox type="text" name="searchTerms" [(ngModel)]="searchTerms" (ngModelChange)="searchTermsUpdate()">&nbsp;&nbsp;<span [class.fa-deselect]="caseSensitive" class="fa fa-text-height" (click)="toggleCaseSensitivity()"></span>&nbsp;&nbsp;<span class="fa fa-times" (click)="toggleSearch()"></span>
</div>



<!-- Totals Box -->
<div class="toolbarTotalsBox" *ngIf="selectedCollection">
  <div class="count" style="margin-top: 0; font-weight: bold;">Total: {{contentCount?.total}}</div>
  <div class="count">Images: {{contentCount?.images}}</div>
  <div class="count">PDF: {{contentCount?.pdfs}}</div>
  <div class="count">Word: {{contentCount?.word}}</div>
  <div class="count">Excel: {{contentCount?.excel}}</div>
  <div class="count">Powerpoint: {{contentCount?.powerpoint}}</div>
  <div class="count">Hash: {{contentCount?.hashes}}</div>
  <div class="count">Dodgy<br>Archives: {{contentCount?.dodgyArchives}}</div>
  <div class="count">Extracted From<br>Archives: {{contentCount?.fromArchives}}</div>
</div>
`
} )

export class ToolbarWidgetComponent implements OnInit, OnDestroy {

  constructor (private dataService: DataService,
               private modalService: ModalService,
               private toolService: ToolService,
               private changeDetectionRef: ChangeDetectorRef,
               private zone: NgZone,
               @Inject(forwardRef(() => AbstractGrid )) private parent: AbstractGrid ) {}

  @ViewChildren('searchBox') searchBoxRef: QueryList<any>;
  @Input() contentCount: ContentCount;

  private selectedCollectionId: string;
  public selectedCollection: Collection;

  public nwCollectionModalId = 'nw-collection-modal';
  public saCollectionModalId = 'sa-collection-modal';
  public tabContainerModalId = 'tab-container-modal';
  public showSearch = false;
  private searchTerms: string;
  private showImages = true;
  private maskState: ContentMask = { showPdf: true, showWord: true, showExcel: true, showPowerpoint: true, showImage: true, showHash: true, showDodgy: true, showFromArchivesOnly: false };
  private showPdfs = true;
  private showWord = true;
  private showExcel = true;
  private showPowerpoint = true;
  private showHashes = true;
  private showDodgyArchives = true;
  private showFromArchivesOnly = false;
  private oldSearchTerms: string;
  private caseSensitive = false;
  public queryingIcon = false;
  public spinnerIcon = false;
  public errorIcon = false;
  public errorMessage = '';
  public queryResultsCount = 0;
  private useCases: UseCase[] = [];
  private useCasesObj = {};
  public workerProgress: number = null;
  public workerLabel: string = null;
  public infoTooltipText = '';
  public license: License;


  // Subscriptions
  private collectionStateChangedSubscription: Subscription;
  private errorPublishedSubscription: Subscription;
  private queryResultsCountUpdatedSubscription: Subscription;
  private useCasesChangedSubscription: Subscription;
  private selectedCollectionChangedSubscription: Subscription;
  private workerProgressSubscription: Subscription;
  private licensingChangedSubscription: Subscription;
  private noopCollectionSubscription: Subscription;

  ngOnInit(): void {

    log.debug('ToolbarWidgetComponent: ngOnInit()');

    // take subscriptions

    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (state: string) => this.onCollectionStateChanged(state) );

    this.errorPublishedSubscription = this.dataService.errorPublished.subscribe( (e: string) => this.errorMessage = e );

    this.queryResultsCountUpdatedSubscription = this.dataService.queryResultsCountUpdated.subscribe( (count: number) => this.onQueryResultsCountUpdated(count) );

    this.useCasesChangedSubscription = this.dataService.useCasesChanged.subscribe( (useCases: any) => this.onUseCasesChanged(useCases) );

    this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (collection: Collection) => this.onSelectedCollectionChanged(collection) );

    this.noopCollectionSubscription = this.dataService.noopCollection.subscribe( () => this.onNoop() );

    this.workerProgressSubscription = this.dataService.workerProgress.subscribe( progress => this.onWorkerProgress(progress) );

    this.licensingChangedSubscription = this.dataService.licensingChanged.subscribe( license =>  this.onLicenseChanged(license) );

  }



  public ngOnDestroy() {
    this.collectionStateChangedSubscription.unsubscribe();
    this.errorPublishedSubscription.unsubscribe();
    this.queryResultsCountUpdatedSubscription.unsubscribe();
    this.useCasesChangedSubscription.unsubscribe();
    this.selectedCollectionChangedSubscription.unsubscribe();
    this.workerProgressSubscription.unsubscribe();
    this.licensingChangedSubscription.unsubscribe();
    this.noopCollectionSubscription.unsubscribe();
  }



  onLicenseChanged(license: License) {
    // log.debug('ToolbarWidgetComponent: onLicenseChanged(): license:', license);
    if (!license) {
      return;
    }
    this.license = license;
    // we need to run change detection as updates are out-of-band from the parent
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onQueryResultsCountUpdated(count: number): void {
    log.debug('ToolbarWidgetComponent: onQueryResultsCountUpdated(): count:', count);
    this.queryResultsCount = count;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onCollectionStateChanged(state: string): void {
    log.debug('ToolbarWidgetComponent: onCollectionStateChanged(): state:', state);
    this.iconDecider(state);
    let dupeCollection = utils.deepCopy(this.selectedCollection);
    dupeCollection['state'] = state;
    this.selectedCollection = dupeCollection;
    // we need to run change detection as updates are out-of-band from the parent
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onWorkerProgress(progress: any): void {
    log.debug('ToolbarWidgetComponent: onWorkerProgress(): progress:', progress);
    this.workerProgress = progress.workerProgress;
    this.workerLabel = progress.label;
    // we need to run change detection as updates are out-of-band from the parent
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onUseCasesChanged(useCases: any): void {
    log.debug('ToolbarWidgetComponent: onUseCasesChanged(): useCases:', useCases);
    if (Object.keys(useCases).length === 0) {
      return;
    }
    this.useCases = useCases.useCases;
    this.useCasesObj = useCases.useCasesObj;
    // we don't need change detection here as useCases aren't used in the template at all
  }



  buildTooltip(): string {
    let tt = '';
    let query = '';
    let contentTypes = '';
    let useCaseFriendlyName = null;
    let distillationEnabled = '';
    let regexDistillationEnabled = '';
    let distillationTerms = '';
    let regexDistillationTerms = '';

    if (this.selectedCollection.bound && this.useCases.length === 0) {
      this.infoTooltipText = 'This collection was created with a bound use case but doesn\'t have any cases defined';
      return;
    }
    else if (this.selectedCollection.bound) {
      // OOTB use case
      let useCaseName = this.selectedCollection.usecase;
      let useCase = this.useCasesObj[useCaseName];
      useCaseFriendlyName = useCase.friendlyName;
      if (this.selectedCollection.serviceType === 'nw') {
        query = useCase.nwquery;
        // tt = tt + 'Service Type: NetWitness\n';
      }
      else {
        query = useCase.saquery;
        tt = tt + 'Service Type: Symantec SA\n';
      }
      contentTypes = useCase.contentTypes.join(' ');
      tt = tt + 'Use Case: ' + useCaseFriendlyName + '\n';
      if ('distillationTerms' in useCase && useCase.distillationTerms.length > 0) {
        distillationEnabled = '\nDistillation is Enabled';
        distillationTerms = '\nDistillation Terms:';
        for (let x = 0; x < useCase.distillationTerms.length; x++) {
          distillationTerms = distillationTerms + '\n  ' + useCase.distillationTerms[x];
        }
      }

      if ('regexTerms' in useCase && useCase.regexTerms.length > 0) {
        regexDistillationEnabled = '\nRegEx Distillation is Enabled';
        regexDistillationTerms = '\nnRegEx Distillation Terms:';
        for (let x = 0; x < useCase.regexTerms.length; x++) {
          regexDistillationTerms = regexDistillationTerms + '\n  ' + useCase.regexTerms[x];
        }
      }
    }
    else {
      // custom collection
      if (this.selectedCollection.serviceType === 'nw') {
        // tt = tt + 'Service Type: NetWitness\n';
      }
      else {
        tt = tt + 'Service Type: Symantec SA\n';
      }
      query = this.selectedCollection.query;
      contentTypes = this.selectedCollection.contentTypes.join(' ');
      if (this.selectedCollection.distillationEnabled) { distillationEnabled = '\nDistillation is Enabled'; }
      if (this.selectedCollection.distillationEnabled && 'distillationTerms' in this.selectedCollection) {
        distillationTerms = '\nDistillation Terms:';
        for (let x = 0; x < this.selectedCollection.distillationTerms.length; x++) {
          distillationTerms = distillationTerms + '\n  ' + this.selectedCollection.distillationTerms[x];
        }
      }
      if (this.selectedCollection.regexDistillationEnabled) { regexDistillationEnabled = '\nRegEx Distillation is Enabled'; }
      if (this.selectedCollection.regexDistillationEnabled && 'regexDistillationTerms' in this.selectedCollection) {
        regexDistillationTerms = '\nRegex Distillation Terms:';
        for (let x = 0; x < this.selectedCollection.regexDistillationTerms.length; x++) {
          regexDistillationTerms = regexDistillationTerms + '\n  ' + this.selectedCollection.regexDistillationTerms[x];
        }
      }
    }

    tt = tt + 'Query: ' + query;

    if (this.selectedCollection.serviceType === 'nw') {
      tt = tt + '\nService: ' + this.selectedCollection.nwserverName;
    }
    else {
      tt = tt + '\nService: ' + this.selectedCollection.saserverName;
    }


    tt = tt + '\nContent Types: ' + contentTypes;
    tt = tt + '\nContent Limit: ' + this.selectedCollection.contentLimit;

    if (this.selectedCollection.minX && this.selectedCollection.minY) {
      tt = tt + '\nMin Dimensions: ' + this.selectedCollection.minX + ' x ' + this.selectedCollection.minY;
    }

    if (this.selectedCollection.sha1Enabled) { tt = tt + '\nSHA1 Hashing is Enabled'; }
    if (this.selectedCollection.sha256Enabled) { tt = tt + '\nSHA256 Hashing is Enabled'; }
    if (this.selectedCollection.md5Enabled) { tt = tt + '\nMD5 Hashing is Enabled'; }

    tt = tt + distillationEnabled;
    tt = tt + distillationTerms;
    tt = tt + regexDistillationEnabled;
    tt = tt + regexDistillationTerms;
    // log.debug('tt:', tt);
    this.infoTooltipText = tt;
  }



  maskClick(target) {
    switch (target) {
      case 'image':
        this.showImages = !this.showImages;
        this.maskState.showImage = !this.maskState.showImage;
        break;
      case 'pdf':
        this.showPdfs = !this.showPdfs;
        this.maskState.showPdf = !this.maskState.showPdf;
        break;
      case 'word':
        this.showWord = !this.showWord;
        this.maskState.showWord = !this.maskState.showWord;
        break;
      case 'excel':
        this.showExcel = !this.showExcel;
        this.maskState.showExcel = !this.maskState.showExcel;
        break;
      case 'powerpoint':
        this.showPowerpoint = !this.showPowerpoint;
        this.maskState.showPowerpoint = !this.maskState.showPowerpoint;
        break;
      case 'hash':
        this.showHashes = !this.showHashes;
        this.maskState.showHash = !this.maskState.showHash;
        break;
      case 'dodgy':
        this.showDodgyArchives = !this.showDodgyArchives;
        this.maskState.showDodgy = !this.maskState.showDodgy;
        break;
      case 'archivesOnly':
        this.showFromArchivesOnly = !this.showFromArchivesOnly;
        this.maskState.showFromArchivesOnly = !this.maskState.showFromArchivesOnly;
        break;
    }
    this.parent.onMaskChanged(this.maskState);
    // change detection will be handled by the parent
  }



  iconDecider(state: string): void {
    this.queryingIcon = false;
    this.spinnerIcon = false;
    this.errorIcon = false;

    if (state === 'querying') {
      this.queryingIcon = true;
    }

    if (state === 'building' || state === 'rolling' || state === 'monitoring') {
      this.spinnerIcon = true;
    }
    else if (state === 'error') {
      this.errorIcon = true;
    }
    this.changeDetectionRef.markForCheck();
  }



  preferencesButtonClick(): void {
    // log.debug("ToolbarWidgetComponent: preferencesButtonClick()");
    this.modalService.open('preferences-modal');
  }



  accountsButtonClick(): void {
    // log.debug("ToolbarWidgetComponent: preferencesButtonClick()");
    this.modalService.open('accounts-modal');
  }



  helpButtonClick(): void {
    // log.debug("ToolbarWidgetComponent: helpButtonClick()");
    this.modalService.open('splashScreenModal');
  }



  onSelectedCollectionChanged(collection: Collection): void {

    this.selectedCollection = collection;
    this.selectedCollectionId = collection.id;

    log.debug('ToolbarWidgetComponent: onSelectedCollectionChanged(): selectedCollectionId', this.selectedCollectionId);
    log.debug('ToolbarWidgetComponent: onSelectedCollectionChanged(): collection:', collection );

    if (this.showSearch) {
      this.toggleSearch();
    }

    // Reset content masks
    this.showImages = true;
    this.showPdfs = true;
    // this.showOffice = true;
    this.showWord = true;
    this.showExcel = true;
    this.showPowerpoint = true;
    this.showHashes = true;
    this.showDodgyArchives = true;
    this.maskState = { showPdf: true, showWord: true, showExcel: true, showPowerpoint: true, showImage: true, showHash: true, showDodgy: true, showFromArchivesOnly: false };
    this.parent.onMaskChanged(this.maskState);

    this.buildTooltip();

    if (collection.type === 'fixed') {
      this.iconDecider(collection.state);
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onEscape(event: KeyboardEvent ) {
    // log.debug("keyup event:", event);
    if (event.key === 'Escape' && this.showSearch) {
      this.toggleSearch();
    }
    this.changeDetectionRef.markForCheck();
  }



  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    this.parent.onSearchBarOpen(this.showSearch);
    if (!this.showSearch) {  // search bar is closed
      this.oldSearchTerms = this.searchTerms;
      this.searchTerms = ''; // set the search terms back to nothing when closing the search bar
      this.searchTermsUpdate();
      this.parent.onMaskChanged(this.maskState);
    }
    else { // search bar is open
      if (this.oldSearchTerms) {
        this.searchTerms = this.oldSearchTerms;
        this.searchTermsUpdate();
      }
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    if (this.showSearch) {
      this.zone.runOutsideAngular( () => setTimeout( () => this.searchBoxRef.first.nativeElement.focus(), 20) );
    }
  }



  searchTermsUpdate(): void {
    // log.debug('ToolbarWidgetComponent: searchTermsUpdate()', this.searchTerms);
    this.parent.onSearchTermsTyped( { searchTerms: this.searchTerms } );
  }



  toggleCaseSensitivity(): void {
    log.debug('ToolbarWidgetComponent: toggleCaseSensitivity()', this.caseSensitive);
    this.caseSensitive = !this.caseSensitive;
    this.changeDetectionRef.markForCheck();
    this.parent.onToggleCaseSensitiveSearch();
  }



  logoutButtonClick(): void {
    // log.debug("ToolbarWidgetComponent: logoutButtonClick()");
    this.toolService.logout.next();
  }



  onNoop(): void {
    this.selectedCollection = null;
    this.selectedCollectionId = null;
    this.contentCount = new ContentCount;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onCollectionsClick(): void {
    this.modalService.open(this.tabContainerModalId);
  }



  onEditCollectionClick(): void {
    log.debug('CollectionsModalComponent: onEditCollectionClick(): collection:', this.selectedCollection);
    if (!this.license.valid) {
      return;
    }
    if (this.selectedCollection.serviceType === 'nw') {
      this.toolService.editNwCollectionNext.next(this.selectedCollection);
      this.toolService.executeCollectionOnEdit.next(true);
      this.toolService.reOpenTabsModal.next(false);
      this.modalService.open(this.nwCollectionModalId);
    }
    if (this.selectedCollection.serviceType === 'sa') {
      this.toolService.editSaCollectionNext.next(this.selectedCollection);
      this.toolService.executeCollectionOnEdit.next(true);
      this.toolService.reOpenTabsModal.next(false);
      this.modalService.open(this.saCollectionModalId);
    }
  }

}
