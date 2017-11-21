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
import { SelectItem } from 'primeng/primeng';
import { Subscription } from 'rxjs/Subscription';
import * as log from 'loglevel';

@Component( {
  selector: 'toolbar-widget',
  // encapsulation: ViewEncapsulation.None,
  template: `
<div style="position: relative; top: 0; width: 100%; height: 20px; background-color: rgba(146,151,160,.85); padding: 5px; color: white; font-size: 12px;">
  <div *ngIf="showCollections">
    <div style="position: absolute; top: 6px; width: 100%">

      <span class="noselect">
        <span class="label">Collection:&nbsp;
          <p-dropdown [options]="collectionsOptions" [(ngModel)]="selectedCollectionId" (onChange)="onCollectionSelected($event)" autoWidth="false" [style]="{'margin-bottom':'4px','width':'250px'}"></p-dropdown>
        </span>

        <!--Add/Edit/Delete Icons-->
        <span class="fa fa-pencil-square-o fa-lg fa-fw" (click)="onEditCollectionClick()"></span>
        <span (click)="onAddCollectionClick()" class="fa fa-plus fa-lg fa-fw"></span>
        <span (click)="onDeleteCollectionClick()" class="fa fa-minus fa-lg fa-fw"></span>
        <span class="collectionTooltip" *ngIf="refreshed && selectedCollectionId && collections" #infoIcon [pTooltip]="buildTooltip()" tooltipPosition="bottom" tooltipStyleClass="collectionTooltip" escape="true" class="fa fa-info-circle fa-lg fa-fw"></span>

        <!--State Icons-->
        <span *ngIf="spinnerIcon" class="fa fa-refresh fa-spin fa-lg fa-fw" pTooltip="Building collection"></span>
        <span *ngIf="errorIcon" class="fa fa-exclamation-triangle fa-lg fa-fw" style="color: yellow;" [pTooltip]="errorMessage"></span>
        <span *ngIf="queryingIcon" class="fa fa-question fa-spin fa-lg fa-fw" pTooltip="Querying NetWitness data"></span>
        <span *ngIf="queryResultsCount == 0 && collections[selectedCollectionId].state == 'complete' && contentCount.total == 0" class="fa fa-ban fa-lg fa-fw" style="color: red;" pTooltip="0 results were returned from the query"></span>
        <span *ngIf="queryResultsCount == 0 && collections[selectedCollectionId].state == 'resting' && contentCount.total == 0" class="fa fa-ban fa-lg fa-fw" pTooltip="0 results were returned from the latest query"></span>

      </span>

      <!--Statistics Text-->
      <span *ngIf="refreshed">
        <span *ngIf="collections[selectedCollectionId].type == 'fixed'" class="label">Fixed Collection&nbsp;&nbsp;</span>
        <span *ngIf="collections[selectedCollectionId].type == 'rolling'" class="label">Rolling Collection&nbsp;&nbsp;</span>
        <span *ngIf="collections[selectedCollectionId].type == 'monitoring'" class="label">Monitoring Collection&nbsp;&nbsp;</span>
        <span *ngIf="collections[selectedCollectionId].type == 'rolling'" class="label">Last {{collections[selectedCollectionId].lastHours}} Hours&nbsp;&nbsp;</span>
        <span *ngIf="collections[selectedCollectionId].type == 'fixed'" class="label">Time1: </span><span *ngIf="collections[selectedCollectionId].type == 'fixed'" class="value">{{collections[selectedCollectionId].timeBegin | formatTime}}</span>
        <span *ngIf="collections[selectedCollectionId].type == 'fixed'" class="label">Time2: </span><span *ngIf="collections[selectedCollectionId].type == 'fixed'" class="value">{{collections[selectedCollectionId].timeEnd | formatTime}}</span>
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

  <!--First collection Text-->
  <div (click)="onAddCollectionClick()" style="position: absolute; top: 7px; left: 10px;" *ngIf="showCreateFirstCollection" class="noselect">
    <u>Create your first collection</u>
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
<splash-screen-modal></splash-screen-modal>
<add-collection-modal [id]="addCollectionModalId"></add-collection-modal>
<delete-collection-confirm-modal (confirmDelete)="deleteConfirmed()" ></delete-collection-confirm-modal>
<preferences-modal></preferences-modal>
<manage-users-modal></manage-users-modal>
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

  private collections: any;
  private selectedCollectionId: string;
  private collectionsOptions: SelectItem[] = [];

  public addCollectionModalId = 'add-collection-modal';
  public showCreateFirstCollection = false;
  public showCollections = false;
  public showSearch = false;
  private searchTerms: string;
  private refreshed = false;
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

  // Subscriptions
  private contentCountSubscription: Subscription;
  private getCollectionDataAgainSubscription: Subscription;
  private selectedCollectionChangedSubscription: Subscription;
  private collectionsChangedSubscription: Subscription;
  private collectionStateChangedSubscription: Subscription;
  private errorPublishedSubscription: Subscription;
  private queryResultsCountUpdatedSubscription: Subscription;
  private useCasesChangedSubscription: Subscription;
  private executeAddCollectionSubscription: Subscription;
  private executeEditCollectionSubscription: Subscription;
  private useCases: UseCase[] = [];
  private useCasesObj = {};


  ngOnInit(): void {
    // take subscriptions
    this.contentCountSubscription = this.toolService.contentCount.subscribe( (c: any) => {
      log.debug('ToolbarWidgetComponent: ngOnInit(): contentCount:', c);
      this.contentCount = c;
    });
    this.getCollectionDataAgainSubscription = this.toolService.getCollectionDataAgain.subscribe( () => this.getCollectionDataAgain() );
    this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (e: any) => this.selectedCollectionId = e.id );
    this.collectionsChangedSubscription = this.dataService.collectionsChanged.subscribe( (collections: string) => {
      this.collections = collections;
      let collectionsOptions = [];

      for (let c in this.collections) {
        if (this.collections.hasOwnProperty(c)) {
          let collection = this.collections[c];
          let option: SelectItem = { label: collection.name, value: collection.id };
          collectionsOptions.push(option);
        }
      }
      this.collectionsOptions = collectionsOptions;
      log.debug('ToolbarWidgetComponent: collectionsChangedSubscription: collections update', this.collections);
    });
    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (collection: any) => {
      // log.debug("collection", collection);
      this.iconDecider(collection.state);
      this.collections[collection.id].state = collection.state;
    });
    this.errorPublishedSubscription = this.dataService.errorPublished.subscribe( (e: string) => this.errorMessage = e );
    this.queryResultsCountUpdatedSubscription = this.dataService.queryResultsCountUpdated.subscribe( (count: number) => this.queryResultsCount = count);


    this.dataService.refreshCollections()
                    .then( () => {
                      this.refreshed = true;
                      if (Object.keys(this.collections).length !== 0 ) { // we only select a collection if there are collections
                        this.selectedCollectionId = this.getFirstCollection();
                        this.onCollectionSelected({ value: this.selectedCollectionId });
                        this.toolService.deviceNumber.next( { deviceNumber: this.collections[this.selectedCollectionId].deviceNumber, nwserver:  this.collections[this.selectedCollectionId].nwserver } );
                        this.showCollections = true;
                      }
                      else {
                        this.showCreateFirstCollection = true;
                      }
                    });

    this.useCasesChangedSubscription = this.dataService.useCasesChanged.subscribe( (o: any) => {
      this.useCases = o.useCases;
      this.useCasesObj = o.useCasesObj;
    });

    this.executeAddCollectionSubscription = this.toolService.executeAddCollection.subscribe( (collection: any) => {
      this.collectionExecuted(collection);
    });

    this.executeEditCollectionSubscription = this.toolService.executeEditCollection.subscribe( (collection: any) => {
      this.collectionExecuted(collection);
    });

  }

  public ngOnDestroy() {
    this.contentCountSubscription.unsubscribe();
    this.getCollectionDataAgainSubscription.unsubscribe();
    this.selectedCollectionChangedSubscription.unsubscribe();
    this.collectionsChangedSubscription.unsubscribe();
    this.collectionStateChangedSubscription.unsubscribe();
    this.errorPublishedSubscription.unsubscribe();
    this.queryResultsCountUpdatedSubscription.unsubscribe();
    this.useCasesChangedSubscription.unsubscribe();
    this.executeAddCollectionSubscription.unsubscribe();
    this.executeEditCollectionSubscription.unsubscribe();
  }

  ngAfterViewInit(): void {
    setTimeout( () => this.modalService.open('splashScreenModal'), 250);
  }

  buildTooltip(): string {
    // log.debug("selectedCollectionId:",this.selectedCollectionId);
    // log.debug("collection:", this.collections[this.selectedCollectionId]);
    // pTooltip="Query: {{collections[selectedCollectionId].query}}\nService: {{collections[selectedCollectionId].nwserverName}}\nImage Limit: {{collections[selectedCollectionId].imageLimit}}\nMin Dimensions: {{collections[selectedCollectionId].minX}} x {{collections[selectedCollectionId].minY}}\nMD5 Hashing: {{collections[selectedCollectionId].md5Enabled}}\nDistillation Enabled: {{collections[selectedCollectionId].distillationEnabled}}\nDistillation Terms: {{collections[selectedCollectionId].distillationTerms}}"

    // return '';

    let tt = '';
    let thisCollection = this.collections[this.selectedCollectionId];
    let query = '';
    let contentTypes = '';
    let useCaseFriendlyName = null;
    let distillationEnabled = '';
    let regexDistillationEnabled = '';
    let distillationTerms = '';
    let regexDistillationTerms = '';

    if (thisCollection.bound === true && this.useCases.length === 0) {
      return '';
    }
    else if (thisCollection.bound === true) {
      // OOTB use case
      let useCaseName = thisCollection.usecase;
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
      query = thisCollection.query;
      contentTypes = thisCollection.contentTypes.join(' ');
      if (thisCollection.distillationEnabled) { distillationEnabled = '\nDistillation is Enabled'; }
      if (thisCollection.distillationEnabled && thisCollection.distillationTerms) {
        distillationTerms = '\nDistillation Terms:';
        for (let x = 0; x < thisCollection.distillationTerms.length; x++) {
          distillationTerms = distillationTerms + '\n  ' + thisCollection.distillationTerms[x];
        }
      }
      if (thisCollection.regexDistillationEnabled) { regexDistillationEnabled = '\nRegEx Distillation is Enabled'; }
      if (thisCollection.regexDistillationEnabled && thisCollection.regexDistillationTerms) {
        regexDistillationTerms = '\nRegex Distillation Terms:';
        for (let x = 0; x < thisCollection.regexDistillationTerms.length; x++) {
          regexDistillationTerms = regexDistillationTerms + '\n  ' + thisCollection.regexDistillationTerms[x];
        }
      }
    }

    tt = tt + 'Query: ' + query;
    tt = tt + '\nService: ' + thisCollection.nwserverName;
    tt = tt + '\nContent Types: ' + contentTypes;
    tt = tt + '\nImage Limit: ' + thisCollection.imageLimit;
    tt = tt + '\nMin Dimensions: ' + thisCollection.minX + ' x ' + thisCollection.minY;

    if (thisCollection.sha1Enabled) { tt = tt + '\nSHA1 Hashing is Enabled'; }
    if (thisCollection.sha256Enabled) { tt = tt + '\nSHA256 Hashing is Enabled'; }
    if (thisCollection.md5Enabled) { tt = tt + '\nMD5 Hashing is Enabled'; }

    tt = tt + distillationEnabled;
    // if (thisCollection.distillationEnabled) { tt = tt + '\nDistillation is Enabled'; }
    tt = tt + distillationTerms;
/*    if (thisCollection.distillationEnabled && thisCollection.distillationTerms) {
      tt = tt + '\nDistillation Terms:';
      for (let x = 0; x < thisCollection.distillationTerms.length; x++) {
        tt = tt + '\n  ' + thisCollection.distillationTerms[x];
      }
    }
*/
    tt = tt + regexDistillationEnabled;
    // if (thisCollection.regexDistillationEnabled) { tt = tt + '\nRegEx Distillation is Enabled'; }
    /*if (thisCollection.regexDistillationEnabled && thisCollection.regexDistillationTerms) {
      tt = tt + '\nRegex Distillation Terms:';
      for (let x = 0; x < thisCollection.regexDistillationTerms.length; x++) {
        tt = tt + '\n  ' + thisCollection.regexDistillationTerms[x];
      }
    }*/
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
    // else if (state === 'complete' || state === 'resting') {
    // }
  }

  getFirstCollection(): any { // a bit of a hack since dicts aren't really ordered
    // log.debug("getFirstCollection()");
    for (let c in this.collections) {
      if (this.collections.hasOwnProperty(c)) {
        return c;
      }
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



  deleteConfirmed(): void {
    log.debug('ToolbarWidgetComponent: deleteConfirmed(): Received deleteConfirmed event');
    this.dataService.abortGetBuildingCollection()
                    .then( () => this.dataService.deleteCollection(this.selectedCollectionId) )
                    .then( () => this.dataService.refreshCollections() )
                    .then( () => {
                                    this.refreshed = true;
                                    if (Object.keys(this.collections).length === 0 ) {
                                      this.showCreateFirstCollection = true;
                                      this.showCollections = false;
                                      this.toolService.noCollections.next();
                                    }
                                    else {
                                      this.showCollections = true;
                                      this.selectedCollectionId = this.getFirstCollection();
                                      // log.debug('ToolbarWidgetComponent: deleteConfirmed(): select collection 1');
                                      this.onCollectionSelected( { value: this.selectedCollectionId } );
                                      // this.dataService.getCollectionData(this.collections[this.selectedCollectionId])
                                      //                .then( () => this.iconDecider(this.collections[this.selectedCollectionId].state) );
                                    }
                                  });
  }

  onDeleteCollectionClick(): void {
    // log.debug('ToolbarWidgetComponent: onDeleteCollectionClick()');
    this.modalService.open('collection-confirm-delete-modal');
  }

  onCollectionSelected(event: any): void {
    let id = event.value;
    log.debug('ToolbarWidgetComponent: onCollectionSelected(): id', id);
    log.debug('ToolbarWidgetComponent: onCollectionSelected():', this.collections[id]);
    // log.debug("collections:", this.collections);
    // log.debug(this.collections[id]);
    // log.debug("this.selectedCollectionId:", this.collections[this.selectedCollectionId]);

    this.dataService.abortGetBuildingCollection();
    if (this.showSearch) {
      this.toggleSearch();
    }

    if (this.collections[id].deviceNumber) {
      this.toolService.deviceNumber.next( { deviceNumber: this.collections[id].deviceNumber, nwserver: this.collections[id].nwserver } );
    }

    // Reset content masks
    this.showImages = true;
    this.showPdfs = true;
    this.showOffice = true;
    this.showHashes = true;
    this.showDodgyArchives = true;
    this.maskState = { showPdf: true, showOffice: true, showImage: true, showHash: true, showDodgy: true };
    this.toolService.maskChanged.next(this.maskState);


    if (this.collections[id].type === 'rolling' || this.collections[id].type === 'monitoring') {
      // log.debug('select collection 2');
      this.dataService.getCollectionData(this.collections[id])
                      .then( () => this.dataService.getRollingCollection(id) );
    }
    else { // fixed collections
      // log.debug('select collection 3');
      // log.debug("this.collections[id].state",  this.collections[id].state);
      this.iconDecider(this.collections[id].state);
      if (this.collections[id].state === 'building') {
        // log.debug('select collection 4');
        this.dataService.getCollectionData(this.collections[id])
                        .then( () => this.dataService.getBuildingFixedCollection(id) );
        return;
      }
      // log.debug('select collection 5');
      this.dataService.getCollectionData(this.collections[id]);
    }
  }

  getRollingCollection(id: string): void {
    log.debug('ToolbarWidgetComponent: getRollingCollection(id)');
    this.dataService.getRollingCollection(id);
  }

  collectionExecuted(e: any): void {
    let id = e.id;
    log.debug('ToolbarWidgetComponent: collectionExecuted():', id, e);
    // this.onCollectionSelected(id);
    this.refreshed = false;
    this.dataService.abortGetBuildingCollection()
                    .then( () => this.dataService.refreshCollections() )
                    .then( () => {
                      if (this.collections[id].type === 'fixed') { this.dataService.buildFixedCollection(id); }
                    })
                    .then( () => this.dataService.refreshCollections() )
                    .then( () => {
                                    this.refreshed = true;
                                    this.selectedCollectionId = id;
                                    this.showCreateFirstCollection = false;
                                    this.showCollections = true;
                                  })
                    .then( () => this.onCollectionSelected( { value: id }) );
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

  getCollectionDataAgain(): void {
    log.debug('ToolbarWidgetComponent: getCollectionDataAgain()');
    // log.debug('select collection 7');
    this.onCollectionSelected( { value: this.selectedCollectionId });
    this.toolService.deviceNumber.next( {
                                          deviceNumber: this.collections[this.selectedCollectionId].deviceNumber,
                                          nwserver:  this.collections[this.selectedCollectionId].nwserver
                                        });
  }

  logoutButtonClick(): void {
    // log.debug("ToolbarWidgetComponent: logoutButtonClick()");
    this.authService.logout();
  }

  onAddCollectionClick(): void {
    // log.debug("onAddCollectionClick()");
    this.toolService.addCollectionNext.next();
    this.modalService.open(this.addCollectionModalId);
  }

  onEditCollectionClick(): void {
    log.debug('ToolbarWidgetComponent: onEditCollectionClick()');
    let collection = this.collections[this.selectedCollectionId];
    this.toolService.editCollectionNext.next(collection);
    this.modalService.open(this.addCollectionModalId);
  }

}
