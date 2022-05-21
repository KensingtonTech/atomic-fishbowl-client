/* eslint-disable id-blacklist */
import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { NgForm } from '@angular/forms';
import { v4 as UUIDv4 } from 'uuid';
import { defaultSaQueries } from '../default-sa-queries';
import { ContentTypes } from 'types/contenttypes';
import { ClientUseCases, UseCase } from 'types/use-case';
import { SelectItem } from 'primeng/api/selectitem';
import { Subscription } from 'rxjs';
import { SaServer, SaServers } from 'types/saserver';
import { Feed, Feeds } from 'types/feed';
import { SaCollection, Collection, CollectionMeta, CollectionType, Collections } from 'types/collection';
import { Preferences } from 'types/preferences';
import * as utils from '../utils';
import dayjs from 'dayjs';
import * as log from 'loglevel';
import { Params } from '@angular/router';
import { Query } from 'types/query';

@Component({
  selector: 'app-sa-collection-modal',
  templateUrl: './sa-collection-modal.component.html',
  styleUrls: [
    './sa-collection-modal.component.scss'
  ]
})

export class SaCollectionModalComponent implements OnInit, OnDestroy {

  constructor(
    private dataService: DataService,
    private toolService: ToolService,
    private changeDetectionRef: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  @ViewChild('addCollectionForm', { static: true }) addCollectionForm: NgForm;
  @ViewChild('addServiceBox') addServiceBoxRef: ElementRef;
  @ViewChildren('saNameBox') nameBoxRef: QueryList<any>;
  @ViewChildren('hostName') hostNameRef: QueryList<any>;
  id = this.toolService.saCollectionModalId;
  hashTooltip = 'This is used to find suspicious executables that match a certain hash pattern.  It presently works with Windows and Mac executables.  It also supports executables contained within ZIP or RAR archives.  This will not limit the display of other types of content pulled in from the query.  If found, a tile will be displayed with the hash value and an optional friendly name which can be specified by using CSV syntax of hashValue,friendlyIdentifier';

  mode = 'add'; // can be add, editRolling, editFixed, or adhoc
  apiServerMode = 'add'; // can be add or edit
  formDisabled = false;
  private defaultCollectionQuery = '';
  contentTypes = ContentTypes;
  private defaultUseCaseBinding = 'bound';
  showUseCaseValues = false; // used to switch input controls to readonly mode.  true = readonly mode
  collection: SaCollection;
  testError = '';
  timeBegin: Date = new Date();
  timeEnd: Date = new Date();

  name: string;
  collectionType: CollectionType = 'rolling';
  lastHours = 1;
  selectedUseCase = null;
  useCaseBinding = this.defaultUseCaseBinding;
  selectedContentTypes = [];
  contentLimit: number;
  minX: number;
  minY: number;
  distillationEnabled = false;
  distillationTerms = '';
  regexDistillationEnabled = false;
  regexDistillationTerms = '';
  sha1Enabled = false;
  sha1Hashes = '';
  sha256Enabled = false;
  sha256Hashes = '';
  md5Enabled = false;
  md5Hashes = '';



  queryInputText = '';
  selectedApiServer = '';
  apiServers: SaServers = {};
  apiServersOptions: SelectItem[];

  serviceFormModel = {
    hostname: '',
    restPort: 443,
    ssl: true,
    user: '',
    password: ''
  };
  queryList = defaultSaQueries;
  private queryListObj: Record<string, Query> = {};
  queryListOptions: SelectItem[] = [];

  selectedQuery = this.queryList[2].text;
  private preferences?: Preferences;
  timeframes: string[] = ['Last 5 Minutes', 'Last 10 Minutes', 'Last 15 Minutes', 'Last 30 Minutes', 'Last Hour', 'Last 3 Hours', 'Last 6 Hours', 'Last 12 Hours', 'Last 24 Hours', 'Last 48 Hours', 'Last 5 Days (120 Hours)', 'Today', 'Yesterday', 'This Week', 'Last Week', 'Custom'];
  selectedTimeframe = 'Last Hour';
  displayCustomTimeframeSelector = false;
  private firstRun = true;

  // Subscriptions
  private subscriptions = new Subscription();

  useCases: UseCase[];
  useCasesObj = {};
  useCaseOptions: SelectItem[] = [];
  displayUseCaseDescription = false;
  useCaseDescription = '';

  imagesEnabled = false;
  pdfsEnabled = false;
  officeEnabled = false;
  dodgyArchivesEnabled = false;
  hashesEnabled = false;

  private editingCollectionId: string;
  private editingApiServerId: string;
  private editingCreator: CollectionMeta;
  showApiServiceBox = false;
  apiServerButtonText = 'Save'; // or 'Update'
  thumbClass = '';
  thumbClassInForm = '';
  passwordRequired = true;
  testErrorInForm = '';
  disableBindingControls = false;
  testInProgress = false;
  private reOpenTabsModal = false;

  private feeds = {};
  hashingMode = 'feed';
  feedOptions: SelectItem[] = [];
  selectedFeed: Feed;
  private hashFeedId?: string;

  private executeCollectionOnEdit = false;

  nameValid = false;
  private collectionNames = {};
  private origName?: string;

  private adhocParams: Params;

  private newApiServer?: SaServer;

  onlyContentFromArchives = false;

  jsonValidationMessage = 'Validation required';
  jsonValid = false;



  ngOnInit(): void {
    log.debug('SaCollectionModalComponent: ngOnInit()');

    for (const ql of this.queryList) {
      this.queryListObj[ql.text] = ql;
      this.queryListOptions.push({
        label: ql.text,
        value: ql.text
      });
    }

    this.subscriptions.add(
      this.toolService.reOpenTabsModal.subscribe(
        (TorF) => this.reOpenTabsModal = TorF
      )
    );

    // Preferences changed subscription
    this.subscriptions.add(
      this.dataService.preferencesChanged.subscribe(
        (prefs) => this.onPreferencesChanged(prefs)
      )
    );

    this.subscriptions.add(
      this.dataService.useCasesChanged.subscribe(
        (useCases) => this.onUseCasesChanged(useCases)
      )
    );

    // Add collection next subscription
    this.subscriptions.add(
      this.toolService.addSaCollectionNext.subscribe(
        () => this.onAddCollection()
      )
    );

    // Edit collection next subscription
    this.subscriptions.add(
      this.toolService.editSaCollectionNext.subscribe(
        (collection: SaCollection) => this.onEditCollection(collection)
      )
    );

    this.subscriptions.add(
      this.dataService.feedsChanged.subscribe(
        (feeds) => this.onFeedsChanged(feeds)
      )
    );

    this.subscriptions.add(
      this.toolService.executeCollectionOnEdit.subscribe(
        TorF => this.executeCollectionOnEdit = TorF
      )
    );

    this.subscriptions.add(
      this.dataService.collectionsChanged.subscribe(
        (collections) => this.onCollectionsChanged(collections)
      )
    );

    this.subscriptions.add(
      this.toolService.addSaAdhocCollectionNext.subscribe(
        (params) => this.onAdhocCollection(params)
      )
    );

    this.subscriptions.add(
      this.dataService.saServersChanged.subscribe(
        (apiServers) => this.onApiServersChanged(apiServers)
      )
    );
  }



  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }



  onPreferencesChanged(prefs?: Preferences): void {
    log.debug('SaCollectionModalComponent: onPreferencesChanged(): prefs observable: ', prefs);
    if (!prefs) {
      return;
    }

    if (Object.keys(prefs).length === 0) {
      return; // this handles a race condition where we subscribe before the getPreferences call has actually run
    }

    this.preferences = prefs;

    // We can update this every time
    if ( 'presetQuery' in prefs.sa ) {
      this.defaultCollectionQuery = prefs.sa.presetQuery;
      // this.queryInputText = prefs.sa.presetQuery;
    }


    if (this.firstRun) { // we only want to update these the first time we open.  After that, leave them alone, as we don't want the user to have to change them every time he opens the window.  In other words, leave the last-used settings for the next time the user opens the modal


      if ( 'defaultQuerySelection' in prefs.sa ) {
        for (const query of this.queryList) {
          if (query.text === prefs.sa.defaultQuerySelection) {
            log.debug('SaCollectionModalComponent: onPreferencesChanged(): setting query selector to ', query);
            this.selectedQuery = query.text; // changes the query in the query select box dropdown
            this.queryInputText = query.queryString; // changes the query string in the query string input

            if (this.selectedQuery !== 'Custom Query' && this.selectedQuery !== 'Preset Query') {
              this.jsonValidationMessage = 'Validation successful';
              this.jsonValid = true;
            }
            else {
              this.jsonValidationMessage = 'Validation required';
              this.jsonValid = false;
            }
            break;
          }
        }
      }

      if ( 'minX' in prefs && 'minY' in prefs ) {
        this.minX = prefs.minX;
        this.minY = prefs.minY;
      }
      if ( 'defaultContentLimit' in prefs ) {
        this.contentLimit = prefs.defaultContentLimit;
      }
      if ( 'defaultRollingHours' in prefs ) {
        this.lastHours = prefs.defaultRollingHours;
      }

      if ( 'presetQuery' in prefs.sa && prefs.sa.defaultQuerySelection === 'Preset Query' ) {
        this.selectedQuery = 'Preset Query';
        this.queryInputText = prefs.sa.presetQuery; // changes the query string in the query string input
      }

    }

    this.firstRun = false;
    this.changeDetectionRef.markForCheck();
  }



  onFeedsChanged(feeds: Feeds): void {
    if (Object.keys(feeds).length === 0) {
      return;
    }
    log.debug('SaCollectionModalComponent: onFeedsChanged(): feeds', feeds);
    const feedOptions: SelectItem[] = [];
    for (const i in feeds) {
      if (feeds.hasOwnProperty(i)) {
        const feed = feeds[i];
        const name = feed.name;
        feedOptions.push( { label: name, value: feed } );
      }
    }
    this.feeds = feeds;
    this.feedOptions = feedOptions;

    if (this.hashFeedId && this.hashFeedId in feeds) {
      this.selectedFeed = this.feeds[this.hashFeedId];
    }
    else {
      this.selectedFeed = this.feedOptions[0].value;
    }
  }



  onCollectionsChanged(collections: Collections): void {
    if (Object.keys(collections).length === 0) {
      return;
    }
    const temp = {};
    for (const c in collections) {
      if (collections.hasOwnProperty(c)) {
        const collection = collections[c];
        temp[collection.name] = null;
      }
    }
    this.collectionNames = temp;
  }



  onUseCasesChanged(useCases: ClientUseCases): void {
    if (Object.keys(useCases).length === 0) {
      return;
    }
    log.debug('SaCollectionModalComponent: onUseCasesChanged(): o', useCases);
    this.useCases = useCases.useCases;
    this.useCasesObj = useCases.useCasesObj;
    const useCaseOptions: SelectItem[] = [
      { label: 'Custom', value: 'custom' },
      ...this.useCases.map(
        useCase => ({
          label: useCase.friendlyName,
          value: useCase.name
        })
      )
    ];
    this.useCaseOptions = useCaseOptions;
  }



  onNameChanged(name): void {
    // log.debug('SaCollectionModalComponent: onNameChanged()');

    if (!(name in this.collectionNames) || (this.mode === 'editRolling' && name === this.origName))  {
      this.nameValid = true;
    }
    else {
      this.nameValid = false;
    }
  }



  onQuerySelected(): void {
    // log.debug('SaCollectionModalComponent: querySelected(): e', e);
    if (this.selectedQuery === 'Preset Query') {
      this.queryInputText = this.defaultCollectionQuery;
      this.jsonValidationMessage = 'Validation required';
      this.jsonValid = false;
    }
    else if (this.selectedQuery === 'Custom Query') {
      this.queryInputText = this.queryListObj[this.selectedQuery].queryString;
      this.jsonValidationMessage = 'Validation required';
      this.jsonValid = false;
    }
    else {
      this.queryInputText = this.queryListObj[this.selectedQuery].queryString;
      this.jsonValidationMessage = 'Validation successful';
      this.jsonValid = true;
    }
  }



  timeframeSelected(): void {
    if (this.selectedTimeframe === 'Custom') {
      // display custom timeframe selector
      this.displayCustomTimeframeSelector = true;
    }
    else {
      this.displayCustomTimeframeSelector = false;
    }
  }



  displayServiceAddBox(): void {
    if (this.formDisabled) {
      return;
    }
    this.passwordRequired = true;
    this.thumbClassInForm = '';
    this.showApiServiceBox = true;
    this.apiServerButtonText = 'Save';
    this.apiServerMode = 'add';
    this.formDisabled = true;
    this.changeDetectionRef.markForCheck();
    this.zone.runOutsideAngular( () => setTimeout( () => this.hostNameRef.first.nativeElement.focus(), 20 ) );
  }



  hideServiceAddBox(): void {
    this.showApiServiceBox = false;
    this.serviceFormModel.hostname = '';
    this.serviceFormModel.restPort = 443;
    this.serviceFormModel.ssl = false;
    this.serviceFormModel.user = '';
    this.serviceFormModel.password = '';
    this.formDisabled = false;
    this.changeDetectionRef.markForCheck();
  }



  onClose(): void {
    log.debug('SaCollectionModalComponent: onClose()');
    if (this.mode === 'editRolling' || this.mode === 'editFixed') {
      this.name = '';
    }
    if (this.reOpenTabsModal) {
      this.modalService.open(this.toolService.tabContainerModalId);
    }
  }



  close(): void {
    log.debug('SaCollectionModalComponent: close()');
    this.modalService.close(this.id);
  }



  private onApiServersChanged(apiServers) {
    if (Object.keys(apiServers).length === 0) {
      return;
    }
    log.debug('SaCollectionModalComponent: onApiServersChanged(): apiServers:', apiServers);
    this.apiServers = apiServers;

    const o: SelectItem[] = [];
    for (const server in this.apiServers) {
      if (this.apiServers.hasOwnProperty(server)) {
        // log.debug('saserver:', server);
        o.push( { label: this.apiServers[server].friendlyName, value: this.apiServers[server].id } )  ;
      }
    }
    this.apiServersOptions = o;

    if (this.newApiServer && this.selectedApiServer === '') {
      this.selectedApiServer = this.newApiServer.id;
      this.newApiServer = null;
    }
    else if (Object.keys(this.apiServers).length === 0) {
      // log.debug('this.selectedApiServer:', this.selectedApiServer);
      this.selectedApiServer = '';
    }
    else if (Object.keys(this.apiServers).length === 1) {
      // log.debug('this.selectedApiServer:', this.selectedApiServer);
      this.selectedApiServer = Object.keys(this.apiServers)[0];
    }
    this.changeDetectionRef.markForCheck();
  }



  deleteApiServer(): void {
    log.debug('SaCollectionModalComponent: deleteApiServer(): this.selectedApiServer', this.selectedApiServer);
    if (this.formDisabled) {
      return;
    }
    this.toolService.saServerToDelete.next(this.apiServers[this.selectedApiServer]);
    this.modalService.open(this.toolService.confirmSaServerDeleteModalId);
  }



  async onCollectionSubmit(f: NgForm): Promise<void> {
    // log.debug('SaCollectionModalComponent: submitForAdd()');
    const time = Math.round( (new Date()).getTime() / 1000);

    const newCollection: SaCollection = {
      id: UUIDv4(), // overridden later if editing collection
      name: this.name,
      type: this.collectionType,
      state: 'initial',
      saserver: this.selectedApiServer,
      saserverName: this.apiServers[this.selectedApiServer].friendlyName,
      contentLimit: this.contentLimit,
      bound: false, // may get overridden later
      usecase: 'custom', // may get overridden later
      onlyContentFromArchives: this.onlyContentFromArchives,
      executeTime: time,
      serviceType: 'sa'
    };

    if (this.selectedUseCase !== 'custom' && this.useCaseBinding === 'bound') {
      // An OOTB use case is selected and is bound
      newCollection.usecase = this.selectedUseCase;
      newCollection.bound = true;

      for (const thisUseCase of this.useCases) {
        // set minX and minY if the use case uses images
        let outerBreak = false;
        if (thisUseCase.name === newCollection.usecase) {
          const contentTypes = thisUseCase.contentTypes;
          for (const contentType of contentTypes) {
            if ( contentType === 'images') {
              newCollection.minX = this.minX;
              newCollection.minY = this.minY;
              outerBreak = true;
              break;
            }
          }
          if (outerBreak) {
            break;
          }
        }
      }
    }

    else {
      // We either have a custom use case or an unbound use case
      newCollection.query = this.queryInputText;

      if (this.mode === 'adhoc') {
        log.debug('SaCollectionModalComponent: onCollectionSubmit(): queryInputText:', this.queryInputText);
        const query = JSON.parse(this.queryInputText);
        if ('host' in this.adhocParams) {
          query.push( {
            any: [
              `autogenerated_domain~${this.adhocParams.host}`,
              `http_server~${this.adhocParams.host}`
            ]
          });
        }
        if ('ip' in this.adhocParams && this.adhocParams.side === 'src') {
          query.push( {
            any: [
              `ipv4_initiator="${this.adhocParams.ip}"`
            ]
          });
        }
        if ('ip' in this.adhocParams && this.adhocParams.side === 'dst') {
          query.push( {
            any: [
              `ipv4_responder="${this.adhocParams.ip}"`
            ]
          });
        }
        log.debug('SaCollectionModalComponent: onCollectionSubmit(): query:', query);
        newCollection.query = JSON.stringify(query);
      }

      newCollection.distillationEnabled = this.distillationEnabled;
      newCollection.regexDistillationEnabled = this.regexDistillationEnabled;
      newCollection.contentTypes = this.selectedContentTypes;

      for (const contentType of newCollection.contentTypes ?? []) {
        if (contentType === 'images') {
          newCollection.minX = this.minX;
          newCollection.minY = this.minY;
        }
      }

      if (!newCollection.bound && this.hashesEnabled && this.hashingMode === 'manual') {
        newCollection.useHashFeed = false;
        newCollection.md5Enabled = this.md5Enabled;
        newCollection.sha1Enabled = this.sha1Enabled;
        newCollection.sha256Enabled = this.sha256Enabled;
      }
      if (!newCollection.bound && this.hashesEnabled && this.hashingMode === 'feed' && this.selectedFeed) {
        newCollection.useHashFeed = true;
        newCollection.hashFeed = this.selectedFeed.id;
      }
    }

    // set timeframe on collection
    if ( this.collectionType === 'rolling' ) {
      newCollection.lastHours = this.lastHours;
    }
    else if ( this.collectionType === 'fixed' ) {
      const t = this.selectedTimeframe === 'Custom'
        ? utils.convertCustomTimeSelection(this.timeBegin, this.timeEnd)
        : utils.convertTimeSelection(this.selectedTimeframe);
      newCollection.timeBegin = t.timeBegin;
      newCollection.timeEnd = t.timeEnd;
    }


    if (!newCollection.bound && this.distillationEnabled ) {
      newCollection.distillationEnabled = false;
      const endterms = utils.grokLines(this.distillationTerms);
      if ( endterms.length !== 0 ) {
        newCollection.distillationEnabled = true;
        newCollection.distillationTerms = endterms;
      }
    }

    if (!newCollection.bound && this.regexDistillationEnabled) {
      newCollection.regexDistillationEnabled = false;
      const endterms = utils.grokLines(this.regexDistillationTerms);
      if ( endterms.length !== 0 ) {
        newCollection.regexDistillationEnabled = true;
        newCollection.regexDistillationTerms = endterms;
      }
    }

    if (!newCollection.bound && this.sha1Enabled) {
      newCollection.sha1Enabled = false;
      const endterms = utils.grokHashingLines(this.sha1Hashes);
      if ( endterms.length !== 0 ) {
        newCollection.sha1Enabled = true;
        newCollection.sha1Hashes = endterms;
      }
    }

    if (!newCollection.bound && this.sha256Enabled) {
      newCollection.sha256Enabled = false;
      const endterms = utils.grokHashingLines(this.sha256Hashes);
      if ( endterms.length !== 0 ) {
        newCollection.sha256Enabled = true;
        newCollection.sha256Hashes = endterms;
      }
    }

    if (!newCollection.bound && this.md5Enabled) {
      newCollection.md5Enabled = false;
      const endterms = utils.grokHashingLines(this.md5Hashes);
      if ( endterms.length !== 0 ) {
        newCollection.md5Enabled = true;
        newCollection.md5Hashes = endterms;
      }
    }

    if (this.mode === 'add' || this.mode === 'editFixed' || this.mode === 'adhoc') {
      log.debug('SaCollectionModalComponent: onCollectionSubmit(): new newCollection:', newCollection);
      this.dataService.addCollection(newCollection)
                      .then( () => {
                          this.toolService.executeAddCollection.next( newCollection );
                          this.reOpenTabsModal = false;
                          this.close();
                          this.name = null; // reset collection name
                        });
    }

    if (this.mode === 'editRolling') {
      newCollection.id = this.editingCollectionId;
      newCollection.creator = this.editingCreator;
      log.debug('SaCollectionModalComponent: onCollectionSubmit(): edited newCollection:', newCollection);
      this.dataService.editCollection(newCollection)
                      .then( () => {
                          this.toolService.executeEditCollection.next( newCollection );
                          this.reOpenTabsModal = false;
                          this.close();
                          this.name = null; // reset collection name
                        });
    }


  }



  addApiServerSubmit(f: NgForm): void {
    // log.debug("SaCollectionModalComponent: addApiServerSubmit(): f:", f);
    this.hideServiceAddBox();
    const encPassword = this.dataService.encryptor.encrypt(f.value.password);
    const newServer: SaServer = {
      id: UUIDv4(),
      host: f.value.hostname,
      port: f.value.restPort,
      ssl: f.value.ssl,
      user: f.value.user,
      password: encPassword,
      friendlyName: f.value.user + '@' + f.value.hostname + ':' + f.value.restPort // + ' (' + f.value.deviceNumber + ')'
    };
    if (this.apiServerMode === 'edit') {
      newServer.id = this.editingApiServerId;
    }
    if (newServer.ssl) {
      newServer.friendlyName = f.value.user + '@' + f.value.hostname + ':' + f.value.restPort + ':ssl'; // + ' (' + f.value.deviceNumber + ')';
    }
    log.debug('SaCollectionModalComponent: addApiServer() newServer:', newServer);

    this.newApiServer = newServer;

    if (this.apiServerMode === 'add') {
      this.dataService.addSaServer(newServer)
                      .catch( (err) => {
                        const error = JSON.parse(err);
                        log.error('SaCollectionModalComponent: addApiServerSubmit(): error response from server:', error.error);
                      });
    }

    if (this.apiServerMode === 'edit') {
      this.dataService.editSaServer(newServer)
                      .catch( (err) => {
                        const error = JSON.parse(err);
                        log.error('SaCollectionModalComponent: addApiServerSubmit(): error response from server:', error.error);
                      });
    }

  }



  onSelectedTypesChanged(): void {
    log.debug('SaCollectionModalComponent: onSelectedTypesChanged()');
    const contentTypes = this.selectedContentTypes;
    let imagesEnabled = false;
    let pdfsEnabled = false;
    let officeEnabled = false;
    let dodgyArchivesEnabled = false;
    let hashesEnabled = false;
    for (const contentType of contentTypes) {
      if (contentType === 'images') {
        imagesEnabled = true;
      }
      if (contentType === 'pdfs') {
        pdfsEnabled = true;
      }
      if (contentType === 'officedocs') {
        officeEnabled = true;
      }
      if (contentType === 'dodgyarchives') {
        dodgyArchivesEnabled = true;
      }
      if (contentType === 'hashes') {
        hashesEnabled = true;
      }
    }
    if ( !(officeEnabled || pdfsEnabled) ) {
      this.distillationEnabled = false;
      this.regexDistillationEnabled = false;
    }
    if (!hashesEnabled) {
      this.sha1Enabled = false;
      this.sha256Enabled = false;
      this.md5Enabled = false;
    }
    this.imagesEnabled = imagesEnabled;
    this.pdfsEnabled = pdfsEnabled;
    this.officeEnabled = officeEnabled;
    this.dodgyArchivesEnabled = dodgyArchivesEnabled;
    this.hashesEnabled = hashesEnabled;

    this.changeDetectionRef.markForCheck();
  }



  onClearTypesSelected(): void {
    this.selectedContentTypes = [];
    this.onSelectedTypesChanged();
    this.changeDetectionRef.markForCheck();
  }



  onAllTypesSelected() {
    const vals = this.contentTypes.map(
      (contentType) => contentType.value
    );
    this.selectedContentTypes = vals;
    this.onSelectedTypesChanged();
    this.changeDetectionRef.markForCheck();
  }



  onUseCaseChanged(): void {
    log.debug('SaCollectionModalComponent: onUseCaseChanged()');
    // log.debug('SaCollectionModalComponent: onUseCaseChanged: selectedUseCase:', this.selectedUseCase );

    let displayUseCaseDescription = false;
    let thisUseCase: UseCase;

    for (const useCase of this.useCases) {
      if (useCase.name === this.selectedUseCase) {
        thisUseCase = useCase;
        displayUseCaseDescription = true;
        this.useCaseDescription = useCase.description;
        break;
      }
    }
    this.displayUseCaseDescription = displayUseCaseDescription;


    if (this.useCaseBinding === 'unbound') {
      this.selectedQuery = 'Custom Query';
    }

    if (this.selectedUseCase === 'custom') {
      this.showUseCaseValues = false;
      this.onSelectedTypesChanged();
      return;
    }

    // an OOTB use case has been selected
    log.debug('SaCollectionModalComponent: onUseCaseChanged: thisUseCase:', thisUseCase);
    this.queryInputText = thisUseCase.saquery;
    this.selectedContentTypes = thisUseCase.contentTypes;
    this.onlyContentFromArchives = thisUseCase.onlyContentFromArchives || false;
    this.distillationEnabled = false;
    if ('distillationTerms' in thisUseCase) {
      this.distillationEnabled = true;
      this.distillationTerms = thisUseCase.distillationTerms.join('\n');
    }
    this.regexDistillationEnabled = false;
    if ('regexTerms' in thisUseCase) {
      this.regexDistillationEnabled = true;
      this.regexDistillationTerms = thisUseCase.regexTerms.join('\n');
    }
    // this might be our problem
    if (this.useCaseBinding === 'bound') {
      this.showUseCaseValues = true;
    }
    else {
      // unbound
      this.showUseCaseValues = false;
      this.jsonValidationMessage = 'Validation successful';
      this.jsonValid = true;
    }
    this.onSelectedTypesChanged();
    this.changeDetectionRef.markForCheck();
  }



  onUseCaseBoundChanged(): void {
    log.debug('SaCollectionModalComponent: onUseCaseBoundChanged()');

    if (this.collectionType === 'fixed') {
      // Use cases are always unbound for fixed collections, as they only run once
      this.useCaseBinding = 'unbound';
      this.disableBindingControls = true;
    }
    else {
      // not a fixed collection
      this.disableBindingControls = false;
    }

    if (this.selectedUseCase === 'custom') {
      this.showUseCaseValues = false;
    }

    else if (this.useCaseBinding === 'bound') {
      this.showUseCaseValues = true;
      this.onUseCaseChanged(); // this is needed to update the content types, distillation terms, etc
    }
    else {
      // unbound
      this.showUseCaseValues = false;
      this.selectedQuery = 'Custom Query';
    }
    this.changeDetectionRef.markForCheck();

  }



  private convertArrayToString(a: string[]): string {
    let text = '';
    for (let i = 0; i < a.length; i++) {
      text += a[i];
      if (i < a.length - 1) { // omit the newline on the last line
       text += '\n';
      }
    }
    return text;
  }



  private onAddCollection(): void {
    log.debug('SaCollectionModalComponent: onAddCollection()');
    this.hashFeedId = undefined;
    this.mode = 'add';
    this.name = '';
    this.nameBoxRef.first.nativeElement.focus();
    this.selectedUseCase = this.useCaseOptions[0].value; // this sets it to 'custom'
    this.showUseCaseValues = false;
    this.displayUseCaseDescription = false;
    if (Object.keys(this.apiServers).length !== 0) {
      this.selectedApiServer = Object.keys(this.apiServers)[0];
    }
    log.debug('SaCollectionModalComponent: onAddCollection(): selectedApiServer', this.selectedApiServer);
    this.changeDetectionRef.markForCheck();
  }



  private onAdhocCollection(params: Params): void {

    log.debug('SaCollectionModalComponent: onAdhocCollection(): params:', params);

    this.adhocParams = params;

    if (Object.keys(params).length === 0) {
      return;
    }

    this.hashFeedId = null;
    this.mode = 'adhoc';

    // Collection type
    this.collectionType = 'fixed';

    // Collection name
    const now = dayjs().format('YYYY/MM/DD HH:mm:ssZ');
    if ('host' in params) {
      this.name = `Adhoc investigation for host '${params.host}' at ${now}`;
    }
    else if ('ip' in params) {
      this.name = `Adhoc investigation for ${params.side} IP ${params.ip} at ${now}`;
    }
    this.onNameChanged(this.name);
    this.nameBoxRef.first.nativeElement.focus();

    // Use case
    this.selectedUseCase = 'custom'; // this sets it to 'custom'
    this.showUseCaseValues = false;
    this.displayUseCaseDescription = false;

    // Query
    this.selectedQuery = this.queryList[0].text; // select all types
    this.onQuerySelected();

    // Content types
    this.selectedContentTypes = [ 'pdfs', 'officedocs', 'images', 'dodgyarchives' ];
    this.onSelectedTypesChanged();

    // Timeframe
    this.selectedTimeframe = 'Last 24 Hours';

    // API Server
    if (Object.keys(this.apiServers).length !== 0) {
      this.selectedApiServer = Object.keys(this.apiServers)[0];
    }
    log.debug('SaCollectionModalComponent: onAdhocCollection(): selectedApiServer', this.selectedApiServer);
    this.modalService.open(this.id);
    this.changeDetectionRef.markForCheck();
  }



  private onEditCollection(collection: SaCollection): void {
    // Called when we receive an edit signal from toolbar
    log.debug('SaCollectionModalComponent: onEditCollection(): collection:', collection);
    this.collection = collection;

    if (collection.type === 'rolling' || collection.type === 'monitoring' ) {
      this.mode = 'editRolling';
      this.editingCollectionId = collection.id;
      if ('creator' in collection) {
        this.editingCreator = collection.creator;
      }
      if (collection.type === 'rolling') {
        this.lastHours = collection.lastHours;
      }
    }
    else {
      this.mode = 'editFixed';
    }

    this.name = collection.name;
    this.origName = collection.name;
    this.onNameChanged(collection.name);
    this.collectionType = collection.type;
    this.contentLimit = collection.contentLimit;
    this.onlyContentFromArchives = collection.onlyContentFromArchives || false;
    if ('minX' in collection && 'minY' in collection) {
      this.minX = collection.minX;
      this.minY = collection.minY;
    }
    else {
      this.minX = this.preferences.minX;
      this.minY = this.preferences.minY;
    }
    this.selectedUseCase = collection.usecase;

    if (collection.bound) {
      this.useCaseBinding = 'bound';
      this.onUseCaseBoundChanged();
      this.onUseCaseChanged();
    }
    else {
      // unbound or custom collection
      this.useCaseBinding = 'unbound';
      this.selectedContentTypes = collection.contentTypes;
      this.displayUseCaseDescription = false;
      let foundQuery = false;
      // now try to match the collection query to our predefined queries
      for (const query of this.queryList) {
        if (query.queryString === collection.query) {
          this.selectedQuery = query.text;
          foundQuery = true;
        }
      }
      if (!foundQuery) {
        this.selectedQuery = 'Custom Query';
      }
      this.queryInputText = collection.query;
      this.onUseCaseBoundChanged();
      this.onUseCaseChanged();
    }

    // TODO: add logic for when server has been deleted
    if (collection.saserver in this.apiServers) {
      log.debug(`Collection's saserver ${collection.saserver} is defined`);
      this.selectedApiServer = collection.saserver;
    }
    else {
      log.debug(`Collection's saserver ${collection.saserver} is not currently defined`);
      this.selectedApiServer = '';
    }

      if (collection.distillationEnabled) {
        this.distillationEnabled = true;
        this.distillationTerms = this.convertArrayToString(collection.distillationTerms);
      }
      else {
        this.distillationEnabled = false;
      }

      if (collection.regexDistillationEnabled) {
        this.regexDistillationEnabled = true;
        this.regexDistillationTerms = this.convertArrayToString(collection.regexDistillationTerms);
      }
      else {
        this.regexDistillationEnabled = false;
      }


    if (collection.useHashFeed) {
      this.hashingMode = 'feed';
      this.hashFeedId = collection.hashFeed;
      // now get the feed object and stick it in selectedFeed
    }
    else {
      this.hashingMode = 'manual';
      if (collection.sha1Enabled) {
        this.sha1Enabled = true;
        this.sha1Hashes = utils.getHashesFromCollection(collection.sha1Hashes);
      }
      else {
        this.sha1Enabled = false;
      }

      if (collection.sha256Enabled) {
        this.sha256Enabled = true;
        this.sha256Hashes = utils.getHashesFromCollection(collection.sha256Hashes);
      }
      else {
        this.sha256Enabled = false;
      }

      if (collection.md5Enabled) {
        this.md5Enabled = true;
        this.md5Hashes = utils.getHashesFromCollection(collection.md5Hashes);
      }
      else {
        this.md5Enabled = false;
      }
    }
    this.changeDetectionRef.markForCheck();
  }







  apiServerFormValid(): boolean {
    // log.debug('SaCollectionModalComponent: apiServerFormValid()');
    // log.debug('this.selectedApiServer:', this.selectedApiServer);
    // log.debug('this.apiServers:', this.apiServers);
    if (Object.keys(this.apiServers).length === 0) {
      return false;
    }
    if (!(this.selectedApiServer in this.apiServers)) {
      return false;
    }
    if (this.addCollectionForm.form.valid && this.selectedApiServer !== '') {
      return true;
    }
    return false;
  }



  addServiceFormValid(form: NgForm): boolean {
    // log.debug('SaCollectionModalComponent: addServiceFormValid()');
    if (this.apiServerMode === 'add' && this.serviceFormModel.hostname && this.serviceFormModel.user && this.serviceFormModel.password && this.serviceFormModel.restPort) { // && this.serviceFormModel.restPort && this.serviceFormModel.deviceNumber
      return true;
    }

    if (this.apiServerMode === 'edit' && this.serviceFormModel.hostname && this.serviceFormModel.user && this.serviceFormModel.restPort) { // && this.serviceFormModel.restPort  && this.serviceFormModel.deviceNumber
      return true;
    }

    return false;
  }

  onApiServerChanged(): void {
    log.debug(`SaCollectionModalComponent: onApiServerChanged(): selectedApiServer: ${this.selectedApiServer}`);
  }



  testApiServer(): void {
    if (this.testInProgress) {
      return;
    }
    if (!this.showApiServiceBox) {
      this.testError = 'Test in progress';
      this.thumbClass = '';
    }
    else {
      this.testErrorInForm = 'Test in progress';
      this.thumbClassInForm = '';
    }

    this.testInProgress = true;

    let server: Partial<SaServer> = {};
    if (!this.showApiServiceBox) {
      server = this.apiServers[this.selectedApiServer];
    }
    else if (this.apiServerMode === 'add') {
      server = {
        host: this.serviceFormModel.hostname,
        port: this.serviceFormModel.restPort,
        ssl: this.serviceFormModel.ssl,
        user: this.serviceFormModel.user,
        password: this.dataService.encryptor.encrypt(this.serviceFormModel.password)
      };
    }
    else if (this.apiServerMode === 'edit') {
      server = {
        id: this.editingApiServerId,
        host: this.serviceFormModel.hostname,
        port: this.serviceFormModel.restPort,
        ssl: this.serviceFormModel.ssl,
        user: this.serviceFormModel.user
      };
      if (this.serviceFormModel.password) {
        // we only set the password if we've changed it
        server.password = this.dataService.encryptor.encrypt(this.serviceFormModel.password);
      }
    }
    this.dataService.testSaServer(server)
                    .then( () => {
                      this.testInProgress = false;
                      const msg = 'Connection was successful';
                      if (!this.showApiServiceBox) {
                        this.thumbClass = 'fa-thumbs-up';
                        this.thumbClassInForm = '';
                        this.testError = msg;
                        this.testErrorInForm = '';
                      }
                      else {
                        this.thumbClass = '';
                        this.thumbClassInForm = 'fa-thumbs-up';
                        this.testErrorInForm = msg;
                        this.testError = '';
                      }
                      this.changeDetectionRef.markForCheck();
                    })
                    .catch( (err) => {
                      this.testInProgress = false;
                      const msg = 'Connection failed';
                      if (!this.showApiServiceBox) {
                        this.thumbClass = 'fa-thumbs-down';
                        this.thumbClassInForm = '';
                        this.testError = msg;
                        this.testErrorInForm = '';
                      }
                      else {
                        this.thumbClass = '';
                        this.thumbClassInForm = 'fa-thumbs-down';
                        this.testErrorInForm = msg;
                        this.testError = '';
                      }
                      this.changeDetectionRef.markForCheck();
                      log.info('Test connection failed with error:', err);
                    });
  }



  editApiServer(): void {
    log.debug('SaCollectionModalComponent: editApiServer()');
    if (this.formDisabled) {
      return;
    }
    this.passwordRequired = false;
    this.thumbClassInForm = '';
    this.formDisabled = true;
    this.apiServerMode = 'edit';
    this.apiServerButtonText = 'Update';
    this.showApiServiceBox = true;
    const server = this.apiServers[this.selectedApiServer];
    log.debug('SaCollectionModalComponent: editApiServer(): server:', server);
    this.editingApiServerId = server.id;
    this.serviceFormModel.hostname = server.host;
    this.serviceFormModel.user = server.user;
    this.serviceFormModel.restPort = server.port;
    this.serviceFormModel.ssl = server.ssl;
    this.changeDetectionRef.markForCheck();
  }



  onValidateJsonClicked(): void {
    log.debug('SaCollectionModalComponent: onValidateJsonClicked()');
    try {
      JSON.parse(this.queryInputText);
      this.jsonValidationMessage = 'Validation successful';
      this.jsonValid = true;
    }
    catch {
      this.jsonValidationMessage = 'Validation failed';
      this.jsonValid = false;
    }
    this.changeDetectionRef.markForCheck();
  }

  queryInputTextChanged(): void {
    this.jsonValidationMessage = 'Validation required';
    this.jsonValid = false;
    this.changeDetectionRef.markForCheck();
  }

}
