import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  NgZone,
  ChangeDetectionStrategy,
  Input,
  Inject,
  forwardRef,
  Output,
  EventEmitter
} from '@angular/core';
import { ToolService } from 'services/tool.service';
import { DataService } from 'services/data.service';
import { Collection } from 'types/collection';
import { ContentCount } from 'types/contentcount';
import { ContentMask } from 'types/contentmask';
import { ClientUseCases, UseCase } from 'types/use-case';
import { Subscription } from 'rxjs';
import { AbstractGrid } from '../abstract-grid.class';
import * as utils from '../utils';
import * as log from 'loglevel';

@Component( {
  selector: 'app-toolbar-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toolbar-widget.component.html',
  styleUrls: [
    './toolbar-widget.component.scss'
  ]
} )

export class ToolbarWidgetComponent implements OnInit, OnDestroy {

  constructor(
    private dataService: DataService,
    private toolService: ToolService,
    private changeDetectionRef: ChangeDetectorRef,
    private zone: NgZone,
    @Inject(forwardRef(() => AbstractGrid )) private gridComponent: AbstractGrid
  ) {}

  @ViewChild('searchBox') searchBoxRef: ElementRef<HTMLElement>;
  @Input() contentCount: ContentCount;
  @Output() displaySplashScreenModal = new EventEmitter<void>();
  @Output() displayPreferencesModal = new EventEmitter<void>();

  private selectedCollectionId?: string;
  selectedCollection?: Collection;

  showSearch = false;
  searchTerms: string;
  showImages = true;
  private maskState: ContentMask = {
    showPdf: true,
    showWord: true,
    showExcel: true,
    showPowerpoint: true,
    showImage: true,
    showHash: true,
    showDodgy: true,
    showFromArchivesOnly: false
  };
  showPdfs = true;
  showWord = true;
  showExcel = true;
  showPowerpoint = true;
  showHashes = true;
  showDodgyArchives = true;
  showFromArchivesOnly = false;
  private oldSearchTerms: string;
  caseSensitive = false;
  isQuerying = false;
  isSpinningState = false;
  isErrorState = false;
  errorMessage = '';
  queryResultsCount = 0;
  private useCases: UseCase[] = [];
  private useCasesObj: Record<string, UseCase> = {};
  workerProgress?: string;
  workerLabel?: string;
  infoTooltipText = '';

  // Subscriptions
  private subscriptions = new Subscription();

  ngOnInit(): void {
    log.debug('ToolbarWidgetComponent: ngOnInit()');

    // take subscriptions

    this.subscriptions.add(
      this.dataService.collectionStateChanged.subscribe(
        (state) => this.onCollectionStateChanged(state)
      )
    );

    this.subscriptions.add(
      this.dataService.errorPublished.subscribe(
        (error) => this.errorMessage = error
      )
    );

    this.subscriptions.add(
      this.dataService.queryResultsCountUpdated.subscribe(
        (count) => this.onQueryResultsCountUpdated(count)
      )
    );

    this.subscriptions.add(
      this.dataService.useCasesChanged.subscribe(
        (useCases) => this.onUseCasesChanged(useCases)
      )
    );

    this.subscriptions.add(
      this.dataService.selectedCollectionChanged.subscribe(
        (collection) => this.onSelectedCollectionChanged(collection)
      )
    );

    this.subscriptions.add(
      this.dataService.noopCollection.subscribe(
        () => this.onNoopCollection()
      )
    );

    this.subscriptions.add(
      this.dataService.workerProgress.subscribe(
        progress => this.onWorkerProgress(progress.workerProgress, progress.label)
      )
    );
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
    this.iconStateDecider(state);

    if (this.selectedCollection) {
      const dupeCollection: Collection = utils.deepCopy(this.selectedCollection);
      dupeCollection.state = state;
      this.selectedCollection = dupeCollection;
    }
    // we need to run change detection as updates are out-of-band from the parent
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onWorkerProgress(workerProgress?: string, label?: string): void {
    log.debug('ToolbarWidgetComponent: onWorkerProgress():', {workerProgress, label});
    this.workerProgress = workerProgress;
    this.workerLabel = label;
    // we need to run change detection as updates are out-of-band from the parent
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onUseCasesChanged(useCases: ClientUseCases): void {
    log.debug('ToolbarWidgetComponent: onUseCasesChanged(): useCases:', useCases);
    if (Object.keys(useCases).length === 0) {
      return;
    }
    this.useCases = useCases.useCases;
    this.useCasesObj = useCases.useCasesObj;
    // we don't need change detection here as useCases aren't used in the template at all
  }



  buildTooltip(selectedCollection: Collection): void {
    const toolTip: string[] = [];
    let query = '';
    let contentTypes = '';
    let useCaseFriendlyName: string;
    let distillationEnabled = '';
    let regexDistillationEnabled = '';
    let distillationTerms = '';
    let regexDistillationTerms = '';

    if (selectedCollection.bound && this.useCases.length === 0) {
      this.infoTooltipText = 'This collection was created with a bound use case but doesn\'t have any cases defined';
      return;
    }
    else if (selectedCollection.bound) {
      // OOTB use case
      const useCaseName = selectedCollection.usecase;
      const useCase = this.useCasesObj[useCaseName];
      useCaseFriendlyName = useCase.friendlyName;
      if (selectedCollection.serviceType === 'nw') {
        query = useCase.nwquery;
        toolTip.push('Service Type: NetWitness');
      }
      else {
        query = useCase.saquery;
        toolTip.push('Service Type: Symantec SA');
      }
      contentTypes = useCase.contentTypes.join(' ');
      toolTip.push('Use Case: ' + useCaseFriendlyName);
      if (useCase.distillationTerms && useCase.distillationTerms.length > 0) {
        distillationEnabled = 'Distillation is Enabled';
        distillationTerms = `Distillation Terms: ${useCase.distillationTerms.join('\n  ')}`;
      }

      if (useCase.regexTerms && useCase.regexTerms.length > 0) {
        regexDistillationEnabled = 'RegEx Distillation is Enabled';
        regexDistillationTerms = `RegEx Distillation Terms: ${useCase.regexTerms.join('\n  ')}`;
      }
    }
    else {
      // custom collection
      if (selectedCollection.serviceType === 'sa') {
        toolTip.push('Service Type: Symantec SA');
      }
      query = selectedCollection.query;
      contentTypes = selectedCollection.contentTypes.join(' ');

      if (selectedCollection.distillationEnabled) {
        distillationEnabled = 'Distillation is Enabled';
      }

      if (selectedCollection.distillationEnabled && 'distillationTerms' in selectedCollection) {
        distillationTerms = `Distillation Terms: ${selectedCollection.distillationTerms.join('\n  ')}`;
      }

      if (selectedCollection.regexDistillationEnabled) {
        regexDistillationEnabled = 'RegEx Distillation is Enabled';
      }

      if (selectedCollection.regexDistillationEnabled && 'regexDistillationTerms' in selectedCollection) {
        regexDistillationTerms = `Regex Distillation Terms: ${selectedCollection.regexDistillationTerms.join('\n  ')}`;
      }
    }

    toolTip.push(`Query: ${query}`);

    if (selectedCollection.serviceType === 'nw') {
      toolTip.push(`Service: ${selectedCollection.nwserverName}`);
    }
    else {
      toolTip.push(`Service: ${selectedCollection.saserverName}`);
    }

    toolTip.push(`Content Types: ${contentTypes}`);
    toolTip.push(`Content Limit: ${selectedCollection.contentLimit}`);

    if (selectedCollection.minX && selectedCollection.minY) {
      toolTip.push(`Min Dimensions: ${selectedCollection.minX} x ${selectedCollection.minY}`);
    }

    if (selectedCollection.sha1Enabled) {
      toolTip.push('SHA1 Hashing is Enabled');
    }
    if (selectedCollection.sha256Enabled) {
      toolTip.push('SHA256 Hashing is Enabled');
    }
    if (selectedCollection.md5Enabled) {
      toolTip.push('MD5 Hashing is Enabled');
    }
    this.infoTooltipText = [
      ...toolTip,
      distillationEnabled,
      distillationTerms,
      regexDistillationEnabled,
      regexDistillationTerms
    ].flat().join('\n');
  }



  maskClick(target: string) {
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
    this.gridComponent.onMaskChanged(this.maskState);
    // change detection will be handled by the parent
  }



  iconStateDecider(state: string): void {
    this.isQuerying = state === 'querying';
    this.isErrorState = state === 'error';
    this.isSpinningState = !this.isErrorState && ['building', 'rolling', 'monitoring'].includes(state);
    this.changeDetectionRef.markForCheck();
  }



  onPreferencesClick(): void {
    log.debug('ToolbarWidgetComponent: onPreferencesClick()');
    this.displayPreferencesModal.next();
  }



  onManageUsersClick(): void {
    log.debug('ToolbarWidgetComponent: onManageUsersClick()');
    this.toolService.displayManageUsersModal.next(true);
  }



  onHelpClick(): void {
    log.debug('ToolbarWidgetComponent: onHelpClick()');
    this.displaySplashScreenModal.next();
  }



  onSelectedCollectionChanged(collection: Collection): void {
    log.debug('ToolbarWidgetComponent: onSelectedCollectionChanged()', {selectedCollectionId: this.selectedCollectionId});
    this.selectedCollection = collection;
    this.selectedCollectionId = collection.id;

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
    this.gridComponent.onMaskChanged(this.maskState);

    this.buildTooltip(collection);

    if (collection.type === 'fixed') {
      this.iconStateDecider(collection.state);
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
    this.gridComponent.onSearchBarOpen(this.showSearch);
    if (!this.showSearch) {
      // search bar is closed
      this.oldSearchTerms = this.searchTerms;
      this.searchTerms = ''; // set the search terms back to nothing when closing the search bar
      this.searchTermsUpdate();
      this.gridComponent.onMaskChanged(this.maskState);
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
      this.zone.runOutsideAngular(
        () => setTimeout(
          () => this.searchBoxRef.nativeElement.focus()
          , 20
        )
      );
    }
  }



  searchTermsUpdate(): void {
    // log.debug('ToolbarWidgetComponent: searchTermsUpdate()', this.searchTerms);
    this.gridComponent.onSearchTermsTyped( this.searchTerms );
  }



  toggleCaseSensitivity(): void {
    log.debug('ToolbarWidgetComponent: toggleCaseSensitivity()', this.caseSensitive);
    this.caseSensitive = !this.caseSensitive;
    this.changeDetectionRef.markForCheck();
    this.gridComponent.onToggleCaseSensitiveSearch();
  }



  onLogoutButtonClick(): void {
    log.debug('ToolbarWidgetComponent: onLogoutButtonClick()');
    this.toolService.logout.next(this.dataService.socketId);
  }



  onNoopCollection(): void {
    this.selectedCollection = undefined;
    this.selectedCollectionId = undefined;
    this.contentCount = new ContentCount();
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onCollectionsClick(): void {
    this.toolService.displayTabContainerModal.next(true);
  }



  onEditCollectionClick(selectedCollection: Collection): void {
    log.debug('CollectionsModalComponent: onEditCollectionClick(): collection:', selectedCollection);
    if (selectedCollection.serviceType === 'nw') {
      this.toolService.editNwCollectionNext.next(selectedCollection);
      this.toolService.executeCollectionOnEdit.next(true);
      this.toolService.reOpenTabsModal.next(false);
      this.toolService.displayNwCollectionModal.next(true);
    }
    if (selectedCollection.serviceType === 'sa') {
      this.toolService.editSaCollectionNext.next(selectedCollection);
      this.toolService.executeCollectionOnEdit.next(true);
      this.toolService.reOpenTabsModal.next(false);
    }
  }
}
