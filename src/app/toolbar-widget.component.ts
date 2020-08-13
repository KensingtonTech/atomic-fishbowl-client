import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ChangeDetectorRef, NgZone, ChangeDetectionStrategy, Input, Inject, forwardRef } from '@angular/core';
import { ToolService } from 'services/tool.service';
import { DataService } from 'services/data.service';
import { Collection } from 'types/collection';
import { ModalService } from './modal/modal.service';
import { ContentCount } from 'types/contentcount';
import { ContentMask } from 'types/contentmask';
import { UseCase } from 'types/usecase';
import { Subscription } from 'rxjs';
import { AbstractGrid } from './abstract-grid.class';
import * as utils from './utils';
import * as log from 'loglevel';

@Component( {
  selector: 'toolbar-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toolbar-widget.component.html'
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
  selectedCollection: Collection;

  showSearch = false;
  searchTerms: string;
  showImages = true;
  private maskState: ContentMask = { showPdf: true, showWord: true, showExcel: true, showPowerpoint: true, showImage: true, showHash: true, showDodgy: true, showFromArchivesOnly: false };
  showPdfs = true;
  showWord = true;
  showExcel = true;
  showPowerpoint = true;
  showHashes = true;
  showDodgyArchives = true;
  showFromArchivesOnly = false;
  private oldSearchTerms: string;
  caseSensitive = false;
  queryingIcon = false;
  spinnerIcon = false;
  errorIcon = false;
  errorMessage = '';
  queryResultsCount = 0;
  private useCases: UseCase[] = [];
  private useCasesObj = {};
  workerProgress: number = null;
  workerLabel: string = null;
  infoTooltipText = '';


  // Subscriptions
  private subscriptions = new Subscription;

  ngOnInit(): void {

    log.debug('ToolbarWidgetComponent: ngOnInit()');

    // take subscriptions

    this.subscriptions.add(this.dataService.collectionStateChanged.subscribe( (state: string) => this.onCollectionStateChanged(state) ));

    this.subscriptions.add(this.dataService.errorPublished.subscribe( (e: string) => this.errorMessage = e ));

    this.subscriptions.add(this.dataService.queryResultsCountUpdated.subscribe( (count: number) => this.onQueryResultsCountUpdated(count) ));

    this.subscriptions.add(this.dataService.useCasesChanged.subscribe( (useCases: any) => this.onUseCasesChanged(useCases) ));

    this.subscriptions.add(this.dataService.selectedCollectionChanged.subscribe( (collection: Collection) => this.onSelectedCollectionChanged(collection) ));

    this.subscriptions.add(this.dataService.noopCollection.subscribe( () => this.onNoop() ));

    this.subscriptions.add(this.dataService.workerProgress.subscribe( progress => this.onWorkerProgress(progress) ));
  }



  ngOnDestroy() {
    this.subscriptions.unsubscribe();
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

    let dupeCollection: Collection = utils.deepCopy(this.selectedCollection);
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
    this.modalService.open(this.toolService.preferencesModalId);
  }



  accountsButtonClick(): void {
    // log.debug("ToolbarWidgetComponent: preferencesButtonClick()");
    this.modalService.open(this.toolService.manageeUsersModalId);
  }



  helpButtonClick(): void {
    // log.debug("ToolbarWidgetComponent: helpButtonClick()");
    this.modalService.open(this.toolService.splashScreenModalId);
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
    // log.debug('ToolbarWidgetComponent: toggleSearch()');
    this.showSearch = !this.showSearch;
    this.parent.onSearchBarOpen(this.showSearch);
    if (!this.showSearch) {
      // search bar is closed
      this.oldSearchTerms = this.searchTerms;
      this.searchTerms = ''; // set the search terms back to nothing when closing the search bar
      this.searchTermsUpdate();
      this.parent.onMaskChanged(this.maskState);
    }
    else {
      // search bar is open
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



  onLogoutButtonClick(): void {
    log.debug('ToolbarWidgetComponent: onLogoutButtonClick()');
    this.toolService.logout.next(this.dataService.socketId);
  }



  onNoop(): void {
    this.selectedCollection = null;
    this.selectedCollectionId = null;
    this.contentCount = new ContentCount;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onCollectionsClick(): void {
    this.modalService.open(this.toolService.tabContainerModalId);
  }



  onEditCollectionClick(): void {
    log.debug('CollectionsModalComponent: onEditCollectionClick(): collection:', this.selectedCollection);
    if (this.selectedCollection.serviceType === 'nw') {
      this.toolService.editNwCollectionNext.next(this.selectedCollection);
      this.toolService.executeCollectionOnEdit.next(true);
      this.toolService.reOpenTabsModal.next(false);
      this.modalService.open(this.toolService.nwCollectionModalId);
    }
    if (this.selectedCollection.serviceType === 'sa') {
      this.toolService.editSaCollectionNext.next(this.selectedCollection);
      this.toolService.executeCollectionOnEdit.next(true);
      this.toolService.reOpenTabsModal.next(false);
      this.modalService.open(this.toolService.saCollectionModalId);
    }
  }

}
