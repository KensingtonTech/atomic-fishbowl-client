import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ChangeDetectorRef, NgZone } from '@angular/core';
import { ToolService } from './tool.service';
import { DataService } from './data.service';
import { Collection } from './collection';
import { ModalService } from './modal/modal.service';
import { ContentCount } from './contentcount';
import { ContentMask } from './contentmask';
import { UseCase } from './usecase';
import { Subscription } from 'rxjs';
import { License } from './license';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component( {
  selector: 'toolbar-widget',
  template: `
<div class="afb-toolbar" style="position: relative; top: 0; width: 100%; height: 20px; background-color: rgba(146,151,160,.85); padding: 5px; color: white; font-size: 12px;">

  <ng-container *ngIf="selectedCollection && license">
    <div style="position: absolute; top: 6px; width: 100%">
      <span class="noselect">
        &nbsp;&nbsp;&nbsp;
        <span class="label" style="font-style: underline;" (click)="onCollectionsClick()"><u>{{selectedCollection.name}}</u></span>

        &nbsp;
        <!--<span class="fa fa-ellipsis-v fa-lg fa-fw"></span>-->

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

      </span>

      <!--Statistics Text-->
      <span>
        <span class="label"> {{selectedCollection.type | capFirstLetter}} Collection&nbsp;&nbsp;</span>

        <!-- Collection Time -->
        <span *ngIf="selectedCollection.type == 'rolling'" class="label">Last {{selectedCollection.lastHours}} Hours&nbsp;&nbsp;</span>
        <span *ngIf="selectedCollection.type == 'fixed'" class="label">Time1: </span><span *ngIf="selectedCollection.type == 'fixed'" class="value">{{selectedCollection.timeBegin | formatTime}}</span>
        <span *ngIf="selectedCollection.type == 'fixed'" class="label">Time2: </span><span *ngIf="selectedCollection.type == 'fixed'" class="value">{{selectedCollection.timeEnd | formatTime}}</span>
      </span>

    </div>

    <!--Mask & Search Buttons-->
    <div class="noselect" style="position: absolute; right: 160px; top: 2px;">

      <!-- image mask-->
      <span *ngIf="contentCount.images != 0 && (contentCount.pdfs != 0 || contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.word != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showImages" [class.hide]="showSearch" (click)="imageMaskClick()" class="fa fa-file-image-o fa-2x" pTooltip="Mask for image content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

      <!-- pdf mask -->
      <span *ngIf="contentCount.pdfs != 0 && (contentCount.images != 0 || contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.word != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showPdfs" [class.hide]="showSearch" (click)="pdfMaskClick()" class="fa fa-file-pdf-o fa-2x" pTooltip="Mask for PDF content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

      <!-- word mask -->
      <span *ngIf="contentCount.word != 0 && (contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.images != 0 || contentCount.pdfs != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showWord" [class.hide]="showSearch" (click)="wordMaskClick()" class="fa fa-file-word-o fa-2x" pTooltip="Mask for Word content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

      <!-- excel mask -->
      <span *ngIf="contentCount.excel != 0 && (contentCount.word != 0 || contentCount.powerpoint != 0 || contentCount.images != 0 || contentCount.pdfs != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showExcel" [class.hide]="showSearch" (click)="excelMaskClick()" class="fa fa-file-excel-o fa-2x" pTooltip="Mask for Excel content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

      <!-- powerpoint mask -->
      <span *ngIf="contentCount.powerpoint != 0 && (contentCount.word != 0 || contentCount.excel != 0 || contentCount.images != 0 || contentCount.pdfs != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showPowerpoint" [class.hide]="showSearch" (click)="powerpointMaskClick()" class="fa fa-file-powerpoint-o fa-2x" pTooltip="Mask for PowerPoint content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

      <!-- dodgy archive mask -->
      <span *ngIf="contentCount.dodgyArchives != 0 && !showFromArchivesOnly && (contentCount.pdfs != 0 || contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.word != 0 || contentCount.images != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showDodgyArchives" [class.hide]="showSearch" (click)="dodgyMaskClick()" class="fa fa-lock fa-2x" pTooltip="Mask for dodgy archive content" escape="false" showdelay="750" tooltipPosition="bottom">&nbsp;</span>

      <!-- hash mask -->
      <span *ngIf="contentCount.hashes != 0 && (contentCount.pdfs != 0 || contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.word != 0 || contentCount.dodgyArchives != 0 || contentCount.images != 0)" [class.fa-deselect]="!showHashes" [class.hide]="showSearch" (click)="hashMaskClick()" class="fa fa-hashtag fa-2x" pTooltip="Mask for matched hash content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

      <!-- only from archives mask -->
      <span *ngIf="contentCount.fromArchives != 0 && contentCount.fromArchives != contentCount.total" [class.fa-deselect]="!showFromArchivesOnly" [class.hide]="showSearch" (click)="fromArchivesOnlyMaskClick()" class="fa fa-file-archive-o fa-2x" pTooltip="Only show content extracted from archives" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

      <!--Search Button-->
      <span *ngIf="contentCount.pdfs != 0 || contentCount.excel != 0 || contentCount.powerpoint != 0 || contentCount.word != 0" class="fa fa-search fa-2x" (click)="toggleSearch()"></span>
    </div>
  </ng-container>

  <!--Choose a Collection-->
  <div *ngIf="!selectedCollection" (click)="onCollectionsClick()" style="position: absolute; top: 7px; left: 10px;" class="noselect">
    <u>Choose a collection</u>
  </div>

  <!--Preferences, Accounts, Help, and Logout Buttons-->
  <div class="noselect" style="position: absolute; right: 10px; top: 2px;">
    <span (click)="preferencesButtonClick()" class="fa fa-cog fa-2x" pTooltip="Global preferences" escape="false" showDelay="750" tooltipPosition="bottom"></span>&nbsp;
    <span (click)="accountsButtonClick()" class="fa fa-users fa-2x" pTooltip="Manage users" escape="false" showDelay="750" tooltipPosition="bottom"></span>&nbsp;
    <span (click)="helpButtonClick()" class="fa fa-question fa-2x" pTooltip="About Atomic Fishbowl" escape="false" showDelay="750" tooltipPosition="bottom"></span>&nbsp;
    <span (click)="logoutButtonClick()" class="fa fa-sign-out fa-2x" pTooltip="Logout" escape="false" showDelay="750" tooltipPosition="left"></span>
  </div>
</div>

<!--Search Bar Dropdown-->
<div class="noselect" (keydown.escape)="toggleSearch()" *ngIf="showSearch" style="position: absolute; right: 60px; top: 30px; padding: 5px; background-color: rgba(146,151,160,.85); width: 315px; z-index: 100;">
  <input #searchBox type="text" name="searchTerms" [(ngModel)]="searchTerms" (ngModelChange)="searchTermsUpdate()" style="width: 85%;">&nbsp;<span [class.fa-deselect]="caseSensitive" class="fa fa-text-height" (click)="toggleCaseSensitivity()" style="color: white;"></span>&nbsp;<span class="fa fa-times" (click)="toggleSearch()" style="color: white;"></span>
</div>


<!-- Totals Box -->
<div *ngIf="selectedCollection" style="position: absolute; left: 0; top: 200px; width: auto; height: auto; padding: 5px; border-radius: 5px; z-index: 100; background-color: rgba(0,0,0,.8); font-size: 9pt; color: white;">
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
`,

  styles: [`
    .label {
      color: rgb(230,234,234);
      font-size: 13x;
      font-weight: bolder;
    }

    .value {
      color: white;
      font-size: 12px;
      margin-right: 10px;
    }

    .fa-deselect {
      color: black !important;
    }

    .hide {
      display: none;
    }

    .count {
      margin-top: 15px;
      text-align: right;
    }

    /*.collectionTooltip.ui-tooltip .ui-tooltip-text {
      white-space: pre-line;
      width: 375px;
    }
    moved to styles.css so we don't need to disable view encapsulation
    */

  `]
} )

export class ToolbarWidgetComponent implements OnInit, OnDestroy {

  constructor (private dataService: DataService,
               private modalService: ModalService,
               private toolService: ToolService,
               private changeDetectionRef: ChangeDetectorRef,
               private zone: NgZone ) {}

  @ViewChildren('searchBox') searchBoxRef: QueryList<any>;

  private selectedCollectionId: string;
  public selectedCollection: Collection;

  public nwCollectionModalId = 'nw-collection-modal';
  public saCollectionModalId = 'sa-collection-modal';
  public tabContainerModalId = 'tab-container-modal';
  public showSearch = false;
  private searchTerms: string;
  private contentCount = new ContentCount;
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
  private contentCountSubscription: Subscription;
  private collectionStateChangedSubscription: Subscription;
  private errorPublishedSubscription: Subscription;
  private queryResultsCountUpdatedSubscription: Subscription;
  private useCasesChangedSubscription: Subscription;
  private selectedCollectionChangedSubscription: Subscription;
  private noCollectionSubscription: Subscription;
  private workerProgressSubscription: Subscription;
  private licensingChangedSubscription: Subscription;

  ngOnInit(): void {

    log.debug('ToolbarWidgetComponent: ngOnInit()');

    // take subscriptions

    this.contentCountSubscription = this.toolService.contentCount.subscribe( (count: any) => this.onContentCountChanged(count) );

    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (state: string) => this.onCollectionStateChanged(state) );

    this.errorPublishedSubscription = this.dataService.errorPublished.subscribe( (e: string) => this.errorMessage = e );

    this.queryResultsCountUpdatedSubscription = this.dataService.queryResultsCountUpdated.subscribe( (count: number) => this.onQueryResultsCountUpdated(count) );

    this.useCasesChangedSubscription = this.dataService.useCasesChanged.subscribe( (useCases: any) => this.onUseCasesChanged(useCases) );

    this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (collection: Collection) => this.onSelectedCollectionChanged(collection) );

    this.noCollectionSubscription = this.dataService.noCollections.subscribe( () => this.onNoCollections() );

    this.workerProgressSubscription = this.dataService.workerProgress.subscribe( progress => this.onWorkerProgress(progress) );

    this.licensingChangedSubscription = this.dataService.licensingChanged.subscribe( license =>  this.onLicenseChanged(license) );

  }



  public ngOnDestroy() {
    this.contentCountSubscription.unsubscribe();
    this.collectionStateChangedSubscription.unsubscribe();
    this.errorPublishedSubscription.unsubscribe();
    this.queryResultsCountUpdatedSubscription.unsubscribe();
    this.useCasesChangedSubscription.unsubscribe();
    this.selectedCollectionChangedSubscription.unsubscribe();
    this.noCollectionSubscription.unsubscribe();
    this.workerProgressSubscription.unsubscribe();
    this.licensingChangedSubscription.unsubscribe();
  }



  onLicenseChanged(license: License) {
    // log.debug('ToolbarWidgetComponent: onLicenseChanged(): license:', license);
    if (!license) {
      return;
    }
    this.license = license;
    this.changeDetectionRef.markForCheck();
  }



  onQueryResultsCountUpdated(count: number): void {
    log.debug('ToolbarWidgetComponent: onQueryResultsCountUpdated(): count:', count);
    this.queryResultsCount = count;
    this.changeDetectionRef.markForCheck();
  }



  onCollectionStateChanged(state: string): void {
    log.debug('ToolbarWidgetComponent: onCollectionStateChanged(): state:', state);
    this.iconDecider(state);
    this.selectedCollection.state = state;
    this.changeDetectionRef.markForCheck();
  }



  onWorkerProgress(progress: any): void {
    log.debug('ToolbarWidgetComponent: onWorkerProgress(): progress:', progress);
    this.workerProgress = progress.workerProgress;
    this.workerLabel = progress.label;
    this.changeDetectionRef.markForCheck();
  }



  onContentCountChanged(count: any) {
    log.debug('ToolbarWidgetComponent: onContentCountChanged(): contentCount:', count);
    this.contentCount = count;
    this.changeDetectionRef.markForCheck();
  }



  onUseCasesChanged(useCases: any): void {
    log.debug('ToolbarWidgetComponent: onUseCasesChanged(): contentCount:', useCases);
    if (Object.keys(useCases).length === 0) {
      return;
    }
    this.useCases = useCases.useCases;
    this.useCasesObj = useCases.useCasesObj;
    this.changeDetectionRef.markForCheck();
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
    log.debug('tt:', tt);
    this.infoTooltipText = tt;
  }

  imageMaskClick(): void {
    this.showImages = !this.showImages;
    this.maskState.showImage = !this.maskState.showImage;
    this.toolService.maskChanged.next(this.maskState);
    this.changeDetectionRef.markForCheck();
  }

  pdfMaskClick(): void {
    this.showPdfs = !this.showPdfs;
    this.maskState.showPdf = !this.maskState.showPdf;
    this.toolService.maskChanged.next(this.maskState);
    this.changeDetectionRef.markForCheck();
  }

  wordMaskClick(): void {
    this.showWord = !this.showWord;
    this.maskState.showWord = !this.maskState.showWord;
    this.toolService.maskChanged.next(this.maskState);
    this.changeDetectionRef.markForCheck();
  }

  excelMaskClick(): void {
    this.showExcel = !this.showExcel;
    this.maskState.showExcel = !this.maskState.showExcel;
    this.toolService.maskChanged.next(this.maskState);
    this.changeDetectionRef.markForCheck();
  }

  powerpointMaskClick(): void {
    this.showPowerpoint = !this.showPowerpoint;
    this.maskState.showPowerpoint = !this.maskState.showPowerpoint;
    this.toolService.maskChanged.next(this.maskState);
    this.changeDetectionRef.markForCheck();
  }

  hashMaskClick(): void {
    this.showHashes = !this.showHashes;
    this.maskState.showHash = !this.maskState.showHash;
    this.toolService.maskChanged.next(this.maskState);
    this.changeDetectionRef.markForCheck();
  }

  dodgyMaskClick(): void {
    this.showDodgyArchives = !this.showDodgyArchives;
    this.maskState.showDodgy = !this.maskState.showDodgy;
    this.toolService.maskChanged.next(this.maskState);
    this.changeDetectionRef.markForCheck();
  }

  fromArchivesOnlyMaskClick(): void {
    this.showFromArchivesOnly = !this.showFromArchivesOnly;
    this.maskState.showFromArchivesOnly = !this.maskState.showFromArchivesOnly;
    this.toolService.maskChanged.next(this.maskState);
    this.changeDetectionRef.markForCheck();
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
    // log.debug("preferencesButtonClick()");
    this.modalService.open('preferences-modal');
  }

  accountsButtonClick(): void {
    // log.debug("preferencesButtonClick()");
    this.modalService.open('accounts-modal');
  }

  helpButtonClick(): void {
    // log.debug("helpButtonClick()");
    this.modalService.open('splashScreenModal');
  }


  closeModal(id: string): void {
    log.debug('ToolbarWidgetComponent: closeModal()');
    this.modalService.close(id);
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
    this.toolService.maskChanged.next(this.maskState);

    this.buildTooltip();

    if (collection.type === 'fixed') {
      this.iconDecider(collection.state);
    }
    this.changeDetectionRef.markForCheck();
    // this.changeDetectionRef.detectChanges();
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
    this.toolService.searchBarOpen.next(this.showSearch);
    if (!this.showSearch) {  // search bar is closed
      this.oldSearchTerms = this.searchTerms;
      this.searchTerms = ''; // set the search terms back to nothing when closing the search bar
      this.searchTermsUpdate();
      this.toolService.maskChanged.next(this.maskState);
    }
    else { // search bar is open
      if (this.oldSearchTerms) {
        this.searchTerms = this.oldSearchTerms;
        this.searchTermsUpdate();
      }
      this.changeDetectionRef.markForCheck();

      this.zone.runOutsideAngular( () => setTimeout( () => this.searchBoxRef.first.nativeElement.focus(), 20) );
    }
  }

  searchTermsUpdate(): void {
    // log.debug('ToolbarWidgetComponent: searchTermsUpdate()', this.searchTerms);
    this.toolService.searchTermsChanged.next( { searchTerms: this.searchTerms } );
  }

  toggleCaseSensitivity(): void {
    log.debug('ToolbarWidgetComponent: toggleCaseSensitivity()', this.caseSensitive);
    this.caseSensitive = !this.caseSensitive;
    this.toolService.caseSensitiveSearchChanged.next();
  }

  logoutButtonClick(): void {
    // log.debug("ToolbarWidgetComponent: logoutButtonClick()");
    this.toolService.logout.next();
  }

  onNoCollections(): void {
    this.selectedCollection = null;
    this.selectedCollectionId = null;
    this.contentCount = new ContentCount;
    this.changeDetectionRef.markForCheck();
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
