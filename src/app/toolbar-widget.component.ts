import { Component, OnInit, AfterViewInit, OnDestroy, ViewChildren, Input, QueryList, ViewEncapsulation } from '@angular/core';
import { ToolService } from './tool.service';
import { DataService } from './data.service';
import { Collection } from './collection';
import { NwServer } from './nwserver';
import { ModalService } from './modal/modal.service';
import { AuthenticationService } from './authentication.service';
import { ContentCount } from './contentcount';
import { ContentMask } from './contentmask';
import { UseCase } from './usecase';
import { SelectItem } from 'primeng/components/common/selectitem';
import { Subscription } from 'rxjs/Subscription';
import * as log from 'loglevel';

@Component( {
  selector: 'toolbar-widget',
  template: `
<div style="position: relative; top: 0; width: 100%; height: 20px; background-color: rgba(146,151,160,.85); padding: 5px; color: white; font-size: 12px;">

  <div *ngIf="selectedCollection">
    <div style="position: absolute; top: 6px; width: 100%">
      <span class="noselect">
        <span class="label" style="font-style: underline;" (click)="onCollectionsClick()"><u>{{selectedCollection.name}}</u></span>

        <!--Info Tooltip Icon-->
        <span class="collectionTooltip" *ngIf="selectedCollection" [pTooltip]="buildTooltip()" tooltipPosition="bottom" tooltipStyleClass="collectionTooltip" escape="true" class="fa fa-info-circle fa-lg fa-fw"></span>

        <!-- Edit Icon -->
        <span *ngIf="selectedCollection.type != 'fixed'" pTooltip="Edit collection" class="fa fa-pencil-square-o fa-lg fa-fw" (click)="onEditCollectionClick()"></span>
        <span *ngIf="selectedCollection.type == 'fixed'" pTooltip="Reprocess collection" class="fa fa-repeat fa-lg fa-fw" (click)="onEditCollectionClick()"></span>

        <!--State Icons-->
        <span *ngIf="spinnerIcon" class="fa fa-refresh fa-spin fa-lg fa-fw" pTooltip="Building collection"></span>
        <span *ngIf="errorIcon" class="fa fa-exclamation-triangle fa-lg fa-fw" style="color: yellow;" [pTooltip]="errorMessage"></span>
        <span *ngIf="queryingIcon && selectedCollection.serviceType == 'nw'" class="fa fa-question fa-spin fa-lg fa-fw" pTooltip="Querying NetWitness data"></span>
        <span *ngIf="queryingIcon && selectedCollection.serviceType == 'sa'" class="fa fa-question fa-spin fa-lg fa-fw" pTooltip="Querying Security Analytics data"></span>
        <span *ngIf="queryResultsCount == 0 && selectedCollection.state == 'complete' && contentCount.total == 0" class="fa fa-ban fa-lg fa-fw" style="color: red;" pTooltip="0 results were returned from the query"></span>
        <span *ngIf="queryResultsCount == 0 && selectedCollection.state == 'resting' && contentCount.total == 0" class="fa fa-ban fa-lg fa-fw" pTooltip="0 results were returned from the latest query"></span>

      </span>

      <!--Statistics Text-->
      <span>
        <span *ngIf="selectedCollection.type == 'fixed'" class="label">Fixed</span>
        <span *ngIf="selectedCollection.type == 'rolling'" class="label">Rolling</span>
        <span *ngIf="selectedCollection.type == 'monitoring'" class="label">Monitoring</span>
        <span class="label"> {{selectedCollection.serviceType | allCaps}} Collection&nbsp;&nbsp;</span>

        <span *ngIf="selectedCollection.type == 'rolling'" class="label">Last {{selectedCollection.lastHours}} Hours&nbsp;&nbsp;</span>
        <span *ngIf="selectedCollection.type == 'fixed'" class="label">Time1: </span><span *ngIf="selectedCollection.type == 'fixed'" class="value">{{selectedCollection.timeBegin | formatTime}}</span>
        <span *ngIf="selectedCollection.type == 'fixed'" class="label">Time2: </span><span *ngIf="selectedCollection.type == 'fixed'" class="value">{{selectedCollection.timeEnd | formatTime}}</span>
        <span class="label">Images:</span> <span class="value">{{contentCount?.images}}</span>
        <span class="label">PDFs:</span> <span class="value">{{contentCount?.pdfs}}</span>
        <span class="label">Office:</span> <span class="value">{{contentCount?.officeDocs}}</span>
        <span class="label">Hash Matches:</span> <span class="value">{{contentCount?.hashes}}</span>
        <span class="label">Dodgy Archives:</span> <span class="value">{{contentCount?.dodgyArchives}}</span>
        <span class="label">Total:</span> <span class="value">{{contentCount?.total}}</span>
      </span>
    </div>

    <!--Mask & Search Buttons-->
    <div class="noselect" style="position: absolute; right: 160px; top: 2px;">
      <span *ngIf="contentCount.images != 0 && (contentCount.pdfs != 0 || contentCount.officeDocs != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showImages" [class.hide]="showSearch" (click)="imageMaskClick()" class="fa fa-file-image-o fa-2x" pTooltip="Mask for image content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>
      <span *ngIf="contentCount.pdfs != 0 && (contentCount.images != 0 || contentCount.officeDocs != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showPdfs" [class.hide]="showSearch" (click)="pdfMaskClick()" class="fa fa-file-pdf-o fa-2x" pTooltip="Mask for PDF content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

      <span *ngIf="contentCount.officeDocs != 0 && (contentCount.images != 0 || contentCount.pdfs != 0 || contentCount.dodgyArchives != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showOffice" [class.hide]="showSearch" (click)="officeMaskClick()" class="fa fa-file-word-o fa-2x" pTooltip="Mask for Office content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

      <span *ngIf="contentCount.dodgyArchives != 0 && (contentCount.pdfs != 0 || contentCount.officeDocs != 0 || contentCount.images != 0 || contentCount.hashes != 0)" [class.fa-deselect]="!showDodgyArchives" [class.hide]="showSearch" (click)="dodgyMaskClick()" class="fa fa-file-archive-o fa-2x" pTooltip="Mask for dodgy archive content" escape="false" showdelay="750" tooltipPosition="bottom">&nbsp;</span>
      <span *ngIf="contentCount.hashes != 0 && (contentCount.pdfs != 0 || contentCount.officeDocs != 0 || contentCount.dodgyArchives != 0 || contentCount.images != 0)" [class.fa-deselect]="!showHashes" [class.hide]="showSearch" (click)="hashMaskClick()" class="fa fa-hashtag fa-2x" pTooltip="Mask for matched hash content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>

      <!--Search Button-->
      <span *ngIf="contentCount.pdfs != 0 || contentCount.officeDocs != 0" class="fa fa-search fa-2x" (click)="toggleSearch()"></span>
    </div>
  </div>

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

<!--Search Box Dropdown-->
<div class="noselect" (keydown.escape)="toggleSearch()" *ngIf="showSearch" style="position: absolute; right: 60px; top: 30px; padding: 5px; background-color: rgba(146,151,160,.85); width: 315px; z-index: 100;">
  <input #searchBox type="text" name="searchTerms" [(ngModel)]="searchTerms" (ngModelChange)="searchTermsUpdate()" style="width: 85%;">
  <span [class.fa-deselect]="caseSensitive" class="fa fa-text-height" (click)="toggleCaseSensitivity()" style="color: white;"></span>
  <span class="fa fa-times" (click)="toggleSearch()" style="color: white;"></span>
</div>

<!--Modals-->
<tab-container-modal [id]="tabContainerModalId"></tab-container-modal>
<splash-screen-modal></splash-screen-modal>
<preferences-modal></preferences-modal>
<manage-users-modal></manage-users-modal>
<collection-deleted-notify-modal></collection-deleted-notify-modal>
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

    /*.collectionTooltip.ui-tooltip .ui-tooltip-text {
      white-space: pre-line;
      width: 375px;
    }
    moved to styles.css so we don't need to disable view encapsulation
    */

  `]
} )

export class ToolbarWidgetComponent implements OnInit, OnDestroy, AfterViewInit {

  constructor (private dataService: DataService,
               private modalService: ModalService,
               private toolService: ToolService,
               private authService: AuthenticationService ) {}

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
  private maskState: ContentMask = { showPdf: true, showOffice: true, showImage: true, showHash: true, showDodgy: true };
  private showPdfs = true;
  private showOffice = true;
  private showHashes = true;
  private showDodgyArchives = true;
  private oldSearchTerms: string;
  private caseSensitive = false;
  public queryingIcon = false;
  public spinnerIcon = false;
  public errorIcon = false;
  public errorMessage = '';
  public queryResultsCount = 0;
  private useCases: UseCase[] = [];
  private useCasesObj = {};


  // Subscriptions
  private contentCountSubscription: Subscription;
  private collectionStateChangedSubscription: Subscription;
  private errorPublishedSubscription: Subscription;
  private queryResultsCountUpdatedSubscription: Subscription;
  private useCasesChangedSubscription: Subscription;
  private collectionSelectedSubscription: Subscription;
  private noCollectionSubscription: Subscription;
  private collectionDeletedSubscription: Subscription;

  ngOnInit(): void {

    // take subscriptions
    this.contentCountSubscription = this.toolService.contentCount.subscribe( (c: any) => {
      log.debug('ToolbarWidgetComponent: ngOnInit(): contentCount:', c);
      this.contentCount = c;
    });

    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (collection: any) => {
      // log.debug("collection", collection);
      this.iconDecider(collection.state);
      this.selectedCollection.state = collection.state;
    });

    this.errorPublishedSubscription = this.dataService.errorPublished.subscribe( (e: string) => this.errorMessage = e );

    this.queryResultsCountUpdatedSubscription = this.dataService.queryResultsCountUpdated.subscribe( (count: number) => this.queryResultsCount = count);


    this.useCasesChangedSubscription = this.dataService.useCasesChanged.subscribe( (o: any) => {
      this.useCases = o.useCases;
      this.useCasesObj = o.useCasesObj;
    });

    this.collectionSelectedSubscription = this.toolService.collectionSelected.subscribe( (collection: Collection) => this.onCollectionSelected(collection) );

    this.noCollectionSubscription = this.toolService.noCollections.subscribe( () => this.onNoCollections() );

    this.collectionDeletedSubscription = this.dataService.collectionDeleted.subscribe( (collectionId: string) => this.onCollectionDeleted(collectionId) );
  }

  public ngOnDestroy() {
    this.contentCountSubscription.unsubscribe();
    this.collectionStateChangedSubscription.unsubscribe();
    this.errorPublishedSubscription.unsubscribe();
    this.queryResultsCountUpdatedSubscription.unsubscribe();
    this.useCasesChangedSubscription.unsubscribe();
    this.collectionSelectedSubscription.unsubscribe();
    this.noCollectionSubscription.unsubscribe();
    this.collectionDeletedSubscription.unsubscribe();
  }

  ngAfterViewInit(): void {
    // setTimeout( () => this.modalService.open('splashScreenModal'), 250);
    // setTimeout( () => this.onCollectionsClick(), 3500);

  }

  onCollectionDeleted(collectionId): void {

    this.toolService.noCollections.next();
    this.dataService.refreshCollections();

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

    if (this.selectedCollection.bound === true && this.useCases.length === 0) {
      return '';
    }
    else if (this.selectedCollection.bound === true) {
      // OOTB use case
      let useCaseName = this.selectedCollection.usecase;
      let useCase = this.useCasesObj[useCaseName];
      useCaseFriendlyName = useCase.friendlyName;
      query = useCase.query;
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
    // log.debug('tt:',tt);
    return tt;
  }

  imageMaskClick(): void {
    this.showImages = !this.showImages;
    this.maskState.showImage = !this.maskState.showImage;
    this.toolService.maskChanged.next(this.maskState);
  }

  pdfMaskClick(): void {
    this.showPdfs = !this.showPdfs;
    this.maskState.showPdf = !this.maskState.showPdf;
    this.toolService.maskChanged.next(this.maskState);
  }

  officeMaskClick(): void {
    this.showOffice = !this.showOffice;
    this.maskState.showOffice = !this.maskState.showOffice;
    this.toolService.maskChanged.next(this.maskState);
  }

  hashMaskClick(): void {
    this.showHashes = !this.showHashes;
    this.maskState.showHash = !this.maskState.showHash;
    this.toolService.maskChanged.next(this.maskState);
  }

  dodgyMaskClick(): void {
    this.showDodgyArchives = !this.showDodgyArchives;
    this.maskState.showDodgy = !this.maskState.showDodgy;
    this.toolService.maskChanged.next(this.maskState);
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

  onCollectionSelected(collection: Collection): void {

    this.selectedCollection = collection;
    this.selectedCollectionId = collection.id;

    log.debug('ToolbarWidgetComponent: onCollectionSelected(): selectedCollectionId', this.selectedCollectionId);
    log.debug('ToolbarWidgetComponent: onCollectionSelected():', collection );

    if (this.showSearch) {
      this.toggleSearch();
    }

    // Reset content masks
    this.showImages = true;
    this.showPdfs = true;
    this.showOffice = true;
    this.showHashes = true;
    this.showDodgyArchives = true;
    this.maskState = { showPdf: true, showOffice: true, showImage: true, showHash: true, showDodgy: true };
    this.toolService.maskChanged.next(this.maskState);

    if (collection.type === 'fixed') {
      this.iconDecider(collection.state);
    }
  }

  onEscape(event: KeyboardEvent ) {
    // log.debug("keyup event:", event);
    if (event.key === 'Escape' && this.showSearch) {
      this.toggleSearch();
    }
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

      setTimeout( () => this.searchBoxRef.first.nativeElement.focus(), 50); // we use a setTimeout because of a weird timing issue caused by *ngIf.  Without it, .first is undefined
    }
  }

  searchTermsUpdate(): void {
    log.debug('ToolbarWidgetComponent: searchTermsUpdate()', this.searchTerms);
    this.toolService.searchTermsChanged.next( { searchTerms: this.searchTerms } );
  }

  toggleCaseSensitivity(): void {
    log.debug('ToolbarWidgetComponent: toggleCaseSensitivity()', this.caseSensitive);
    this.caseSensitive = !this.caseSensitive;
    this.toolService.caseSensitiveSearchChanged.next();
  }

  logoutButtonClick(): void {
    // log.debug("ToolbarWidgetComponent: logoutButtonClick()");
    this.authService.logout();
  }

  onNoCollections(): void {
    this.selectedCollection = null;
    this.selectedCollectionId = null;
  }

  onCollectionsClick(): void {
    this.modalService.open(this.tabContainerModalId);
  }

  onEditCollectionClick(): void {
    log.debug('CollectionsModalComponent: onEditCollectionClick(): collection:', this.selectedCollection);
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
