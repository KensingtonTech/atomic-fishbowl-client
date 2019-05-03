import { Component, OnInit, OnDestroy, ElementRef, Input, ViewChild, ViewChildren, QueryList, ChangeDetectorRef, NgZone } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { ModalService } from './modal/modal.service';
import { NgForm } from '@angular/forms';
import { UUID } from 'angular2-uuid';
import { defaultSaQueries } from './default-sa-queries';
import { Query } from 'types/query';
import { ContentTypes } from 'types/contenttypes';
import { UseCase } from 'types/usecase';
import { SelectItem } from 'primeng/components/common/selectitem';
import { Subscription } from 'rxjs';
import { SaServer } from 'types/saserver';
import { Feed } from 'types/feed';
import { CollectionMeta } from 'types/collection-meta';
import { Collection } from 'types/collection';
import { Preferences } from 'types/preferences';
import * as utils from './utils';
import { Logger } from 'loglevel';
declare var moment;
declare var log: Logger;

@Component({
  selector: 'sa-collection-modal',
  templateUrl: './sacollection-modal.component.html',
  styles: [`

    .full-width {
      width: 100%;
    }

    .column1 {
      white-space: nowrap;
      /*width: 1px;*/
      width: 150px;
    }

    .line-separator {
      height: 7px;
    }

    .ourFont,
    .ui-button-text {
      font-family: system-ui, -apple-system, BlinkMacSystemFont !important;
    }

    .ui-radiobutton-box.ui-state-active {
      background-color: rgb(59, 153, 252);
    }

    .minDimensionsTooltip.ui-tooltip .ui-tooltip-text {
      width: 350px;
    }

    .contentLimitDistillationTooltip.ui-tooltip .ui-tooltip-text {
      width: 300px;
    }

    .textDistillationTooltip.ui-tooltip .ui-tooltip-text {
      width: 300px;
    }

    .regexDistillationTooltip.ui-tooltip .ui-tooltip-text {
      width: 400px;
    }

    .hashingTooltip.ui-tooltip .ui-tooltip-text {
      width: 405px;
    }

    .hashing256Tooltip.ui-tooltip .ui-tooltip-text {
      width: 425px;
    }

    .addCollectionTooltip.ui-tooltip .ui-tooltip-text {
      white-space: pre-line;
      width: 375px;
    }

    .saServerTitle {
      margin-top: 5px;
      margin-bottom: 5px;
    }

    .fa-deselect {
      color: gray !important;
    }

    .investigationTooltip.ui-tooltip .ui-tooltip-text {
      white-space: pre-line;
      width: 375px;
    }

  `]
})

export class SaCollectionModalComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private toolService: ToolService,
              private modalService: ModalService,
              private changeDetectionRef: ChangeDetectorRef,
              private zone: NgZone) {}

  @ViewChild('addCollectionForm') public addCollectionForm: NgForm;
  @ViewChild('addServiceBox') addServiceBoxRef: ElementRef;
  @ViewChildren('saNameBox') nameBoxRef: QueryList<any>;
  @ViewChildren('hostName') hostNameRef: QueryList<any>;
  public id = this.toolService.saCollectionModalId;
  private hashTooltip = 'This is used to find suspicious executables that match a certain hash pattern.  It presently works with Windows and Mac executables.  It also supports executables contained within ZIP or RAR archives.  This will not limit the display of other types of content pulled in from the query.  If found, a tile will be displayed with the hash value and an optional friendly name which can be specified by using CSV syntax of hashValue,friendlyIdentifier';

  public mode = 'add'; // can be add, editRolling, editFixed, or adhoc
  public apiServerMode = 'add'; // can be add or edit
  public formDisabled = false;
  private defaultCollectionQuery = '';
  private defaultCollectionType = 'rolling';
  public contentTypes = ContentTypes;
  private defaultUseCaseBinding = 'bound';
  public showUseCaseValues = false; // used to switch input controls to readonly mode.  true = readonly mode
  public collection: any;
  public testError = '';
  public timeBegin: Date = new Date();
  public timeEnd: Date = new Date();

  public name: string = null;
  public type = this.defaultCollectionType;
  public lastHours = 1;
  public selectedUseCase = null;
  public useCaseBinding = this.defaultUseCaseBinding;
  public selectedContentTypes = [];
  public contentLimit = null;
  public minX = null;
  public minY = null;
  public distillationEnabled = false;
  public distillationTerms = '';
  public regexDistillationEnabled = false;
  public regexDistillationTerms = '';
  public sha1Enabled = false;
  public sha1Hashes = '';
  public sha256Enabled = false;
  public sha256Hashes = '';
  public md5Enabled = false;
  public md5Hashes = '';



  public queryInputText = '';
  public selectedApiServer = '';
  public apiServers: any = {};
  public apiServersOptions: SelectItem[];

  public serviceFormModel = {
    hostname: '',
    restPort: 443,
    ssl: true,
    user: '',
    password: ''
  };
  public queryList = defaultSaQueries;
  private queryListObj = {};
  public queryListOptions: SelectItem[] = [];

  public selectedQuery = this.queryList[2].text;
  private preferences: any;
  private timeframes: any = ['Last 5 Minutes', 'Last 10 Minutes', 'Last 15 Minutes', 'Last 30 Minutes', 'Last Hour', 'Last 3 Hours', 'Last 6 Hours', 'Last 12 Hours', 'Last 24 Hours', 'Last 48 Hours', 'Last 5 Days (120 Hours)', 'Today', 'Yesterday', 'This Week', 'Last Week', 'Custom'];
  private selectedTimeframe = 'Last Hour';
  public displayCustomTimeframeSelector = false;
  private firstRun = true;

  // Subscriptions
  private subscriptions = new Subscription;


  public useCases: UseCase[];
  public useCasesObj = {};
  public useCaseOptions: SelectItem[] = [];
  public displayUseCaseDescription = false;
  public useCaseDescription = '';

  public imagesEnabled = false;
  public pdfsEnabled = false;
  public officeEnabled = false;
  public dodgyArchivesEnabled = false;
  public hashesEnabled = false;

  private editingCollectionId: string;
  private editingApiServerId: string;
  private editingCreator: CollectionMeta;
  public showApiServiceBox = false;
  public apiServerButtonText = 'Save'; // or 'Update'
  public thumbClass = '';
  public thumbClassInForm = '';
  public passwordRequired = true;
  public testErrorInForm = '';
  public disableBindingControls = false;
  public testInProgress = false;
  private reOpenTabsModal = false;

  private feeds = {};
  public hashingMode = 'feed';
  public feedOptions: SelectItem[] = [];
  private selectedFeed: Feed;
  private hashFeedId: string;

  private executeCollectionOnEdit = false;

  public nameValid = false;
  private collectionNames = {};
  private origName: string = null;

  private adhocParams: any;

  private newApiServer: SaServer = null;

  public onlyContentFromArchives = false;

  public jsonValidationMessage = 'Validation required';
  public jsonValid = false;



  ngOnInit(): void {

    log.debug('SaCollectionModalComponent: ngOnInit()');

    for (let i = 0; i < this.queryList.length; i++) {
      this.queryListObj[this.queryList[i].text] = this.queryList[i];
      let option: any = {};
      option['label'] = this.queryList[i].text;
      option['value'] = this.queryList[i].text;
      this.queryListOptions.push(option);
    }

    this.subscriptions.add(this.toolService.reOpenTabsModal.subscribe( (TorF) => this.reOpenTabsModal = TorF ));

    // Preferences changed subscription
    this.subscriptions.add(this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) ));

    this.subscriptions.add(this.dataService.useCasesChanged.subscribe( (o: any) => this.onUseCasesChanged(o) ));

    // Add collection next subscription
    this.subscriptions.add(this.toolService.addSaCollectionNext.subscribe( () => this.onAddCollection() ));

    // Edit collection next subscription
    this.subscriptions.add(this.toolService.editSaCollectionNext.subscribe( (collection: Collection) => this.onEditCollection(collection) ));

    this.subscriptions.add(this.dataService.feedsChanged.subscribe( (feeds: Feed[]) => this.onFeedsChanged(feeds) ));

    this.subscriptions.add(this.toolService.executeCollectionOnEdit.subscribe( TorF => this.executeCollectionOnEdit = TorF));

    this.subscriptions.add(this.dataService.collectionsChanged.subscribe( (collections: any) => this.onCollectionsChanged(collections) ));

    this.subscriptions.add(this.toolService.addSaAdhocCollectionNext.subscribe( (params: any) => this.onAdhocCollection(params) ));

    this.subscriptions.add(this.dataService.saServersChanged.subscribe( (apiServers) => this.onApiServersChanged(apiServers) ));
  }



  public ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }



  onPreferencesChanged(prefs: Preferences): void {
    log.debug('SaCollectionModalComponent: onPreferencesChanged(): prefs observable: ', prefs);

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
        for (let i = 0; i < this.queryList.length; i++) {
          let query = this.queryList[i];
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



  onFeedsChanged(feeds: Feed[]): void {
    if (Object.keys(feeds).length === 0) {
      return;
    }
    log.debug('SaCollectionModalComponent: onFeedsChanged(): feeds', feeds);
    let feedOptions: SelectItem[] = [];
    for (let i in feeds) {
      if (feeds.hasOwnProperty(i)) {
        let feed = feeds[i];
        let name = feed.name;
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



  onCollectionsChanged(collections: any): void {
    if (Object.keys(collections).length === 0) {
      return;
    }
    let temp = {};
    for (let c in collections) {
      if (collections.hasOwnProperty(c)) {
        let collection = collections[c];
        temp[collection.name] = null;
      }
    }
    this.collectionNames = temp;
  }



  onUseCasesChanged(o: any): void {
    if (Object.keys(o).length === 0) {
      return;
    }
    log.debug('SaCollectionModalComponent: onUseCasesChanged(): o', o);
    this.useCases = o.useCases;
    this.useCasesObj = o.useCasesObj;
    let useCaseOptions: SelectItem[] = [];
    useCaseOptions.push( { label: 'Custom', value: 'custom' } );
    for (let i = 0; i < this.useCases.length; i++) {
      useCaseOptions.push( { label: this.useCases[i].friendlyName, value: this.useCases[i].name } );
    }
    this.useCaseOptions = useCaseOptions;
  }



  public onNameChanged(name): void {
    // log.debug('SaCollectionModalComponent: onNameChanged()');

    if (!(name in this.collectionNames) || (this.mode === 'editRolling' && name === this.origName))  {
      this.nameValid = true;
    }
    else {
      this.nameValid = false;
    }
  }



  public onQuerySelected(): void {
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



  public timeframeSelected(e: any): void {
    if (this.selectedTimeframe === 'Custom') {
      // display custom timeframe selector
      this.displayCustomTimeframeSelector = true;
    }
    else {
      this.displayCustomTimeframeSelector = false;
    }
  }



  public displayServiceAddBox(): void {
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



  public hideServiceAddBox(): void {
    this.showApiServiceBox = false;
    this.serviceFormModel.hostname = '';
    this.serviceFormModel.restPort = 443;
    this.serviceFormModel.ssl = false;
    this.serviceFormModel.user = '';
    this.serviceFormModel.password = '';
    this.formDisabled = false;
    this.changeDetectionRef.markForCheck();
  }



  public onClose(): void {
    log.debug('SaCollectionModalComponent: onClose()');
    if (this.mode === 'editRolling' || this.mode === 'editFixed') {
      this.name = '';
    }
    if (this.reOpenTabsModal) {
      this.modalService.open(this.toolService.tabContainerModalId);
    }
  }



  public close(): void {
    log.debug('SaCollectionModalComponent: close()');
    this.modalService.close(this.id);
  }



  private onApiServersChanged(apiServers) {
    if (Object.keys(apiServers).length === 0) {
      return;
    }
    log.debug('SaCollectionModalComponent: onApiServersChanged(): apiServers:', apiServers);
    this.apiServers = apiServers;
    // log.debug("SaCollectionModalComponent: onApiServersChanged(): this.apiServers:", this.apiServers);

    let o: SelectItem[] = [];
    for (let server in this.apiServers) {
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



  public deleteApiServer(): void {
    log.debug('SaCollectionModalComponent: deleteApiServer(): this.selectedApiServer', this.selectedApiServer);
    if (this.formDisabled) {
      return;
    }
    this.toolService.saServerToDelete.next(this.apiServers[this.selectedApiServer]);
    this.modalService.open(this.toolService.confirmSaServerDeleteModalId);
  }



  public onCollectionSubmit(f: NgForm): void {
    // log.debug('SaCollectionModalComponent: submitForAdd()');
    const time = <number>(Math.round( <any>(new Date()) / 1000) );

    let newCollection: Collection = {
      id: UUID.UUID(), // overridden later if editing collection
      name: this.name,
      type: this.type,
      state: 'initial',
      saserver: this.selectedApiServer,
      saserverName: this.apiServers[this.selectedApiServer].friendlyName,
      // query: null,
      // contentTypes: null,
      contentLimit: this.contentLimit,
      // deviceNumber: this.apiServers[this.selectedApiServer].deviceNumber,
      bound: false, // may get overridden later
      usecase: 'custom', // may get overridden later
      // minX: this.minX,
      // minY: this.minY,
      // distillationEnabled: null,
      // regexDistillationEnabled: null,
      // useHashFeed: null,
      onlyContentFromArchives: this.onlyContentFromArchives,
      executeTime: time,
      serviceType: 'sa'
    };

    if (this.selectedUseCase !== 'custom' && this.useCaseBinding === 'bound') {
      // An OOTB use case is selected and is bound
      newCollection.usecase = this.selectedUseCase;
      newCollection.bound = true;

      for (let i = 0; i < this.useCases.length; i++) {
        // set minX and minY if the use case uses images
        let thisUseCase = this.useCases[i];
        let outerBreak = false;

        if (thisUseCase.name === newCollection.usecase) {
          let contentTypes = thisUseCase.contentTypes;
          for (let x = 0; x < contentTypes.length; x++) {
            if ( contentTypes[x] === 'images') {
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
        let query = JSON.parse(this.queryInputText);
        if ('host' in this.adhocParams) {
          query.push( { any: [ 'autogenerated_domain~' + this.adhocParams['host'], 'http_server~' + this.adhocParams['host'] ] } );
        }
        if ('ip' in this.adhocParams && this.adhocParams['side'] === 'src') {
          query.push( { any: [ 'ipv4_initiator=\"' + this.adhocParams['ip'] + '\"' ] } );
        }
        if ('ip' in this.adhocParams && this.adhocParams['side'] === 'dst') {
          query.push( { any: [ 'ipv4_responder=\"' + this.adhocParams['ip'] + '\"' ] } );
        }
        log.debug('SaCollectionModalComponent: onCollectionSubmit(): query:', query);
        newCollection.query = JSON.stringify(query);
      }

      newCollection.distillationEnabled = this.distillationEnabled;
      newCollection.regexDistillationEnabled = this.regexDistillationEnabled;
      newCollection.contentTypes = this.selectedContentTypes;

      for (let i = 0; i < newCollection.contentTypes.length; i++) {
        let type = newCollection.contentTypes[i];
        if (type === 'images') {
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
    if ( this.type === 'rolling' ) {
      newCollection.lastHours = this.lastHours;
    }
    else if ( this.type === 'fixed' ) {
      let t: any = {};
      if (this.selectedTimeframe === 'Custom') {
        t = utils.convertCustomTimeSelection(this.timeBegin, this.timeEnd);
      }
      else {
        t = utils.convertTimeSelection(this.selectedTimeframe);
      }
      newCollection.timeBegin = t.timeBegin;
      newCollection.timeEnd = t.timeEnd;
    }


    if (!newCollection.bound && this.distillationEnabled ) {
      newCollection.distillationEnabled = false;
      let endterms = utils.grokLines(this.distillationTerms);
      if ( endterms.length !== 0 ) {
        newCollection.distillationEnabled = true;
        newCollection.distillationTerms = endterms;
      }
    }

    if (!newCollection.bound && this.regexDistillationEnabled) {
      newCollection.regexDistillationEnabled = false;
      let endterms = utils.grokLines(this.regexDistillationTerms);
      if ( endterms.length !== 0 ) {
        newCollection.regexDistillationEnabled = true;
        newCollection.regexDistillationTerms = endterms;
      }
    }

    if (!newCollection.bound && this.sha1Enabled) {
      newCollection.sha1Enabled = false;
      let endterms = utils.grokHashingLines(this.sha1Hashes);
      if ( endterms.length !== 0 ) {
        newCollection.sha1Enabled = true;
        newCollection.sha1Hashes = endterms;
      }
    }

    if (!newCollection.bound && this.sha256Enabled) {
      newCollection.sha256Enabled = false;
      let endterms = utils.grokHashingLines(this.sha256Hashes);
      if ( endterms.length !== 0 ) {
        newCollection.sha256Enabled = true;
        newCollection.sha256Hashes = endterms;
      }
    }

    if (!newCollection.bound && this.md5Enabled) {
      newCollection.md5Enabled = false;
      let endterms = utils.grokHashingLines(this.md5Hashes);
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
      newCollection['creator'] = this.editingCreator;
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



  public addApiServerSubmit(f: NgForm): void {
    // log.debug("SaCollectionModalComponent: addApiServerSubmit(): f:", f);
    this.hideServiceAddBox();
    let encPassword = this.dataService.encryptor.encrypt(f.value.password);
    let newServer: SaServer = {
      id: UUID.UUID(),
      host: f.value.hostname,
      port: f.value.restPort,
      ssl: f.value.ssl,
      user: f.value.user,
      password: encPassword,
      // deviceNumber: f.value.deviceNumber,
      friendlyName: f.value.user + '@' + f.value.hostname + ':' + f.value.restPort // + ' (' + f.value.deviceNumber + ')'
    };
    if (this.apiServerMode === 'edit') {
      // server = this.apiServers[this.selectedApiServer];
      newServer.id = this.editingApiServerId;
    }
    if (newServer.ssl) {
      // newServer.friendlyName = newServer.friendlyName + ':ssl';
      newServer.friendlyName = f.value.user + '@' + f.value.hostname + ':' + f.value.restPort + ':ssl'; // + ' (' + f.value.deviceNumber + ')';
    }
    log.debug('SaCollectionModalComponent: addApiServer() newServer:', newServer);

    this.newApiServer = newServer;

    if (this.apiServerMode === 'add') {
      this.dataService.addSaServer(newServer)
                      .catch( (err) => {
                        let error = JSON.parse(err);
                        log.error('SaCollectionModalComponent: addApiServerSubmit(): error response from server:', error.error);
                      });
    }

    if (this.apiServerMode === 'edit') {
      this.dataService.editSaServer(newServer)
                      .catch( (err) => {
                        let error = JSON.parse(err);
                        log.error('SaCollectionModalComponent: addApiServerSubmit(): error response from server:', error.error);
                      });
    }

  }



  public onOpen(): void {
    // log.debug('SaCollectionModalComponent: onOpen()');
  }



  public onSelectedTypesChanged(): void {
    log.debug('SaCollectionModalComponent: onSelectedTypesChanged()');
    let v = this.selectedContentTypes;
    let imagesEnabled = false;
    let pdfsEnabled = false;
    let officeEnabled = false;
    let dodgyArchivesEnabled = false;
    let hashesEnabled = false;
    // log.debug('SaCollectionModalComponent: onSelectedTypesChanged: v:', v);
    // log.debug('SaCollectionModalComponent: onSelectedTypesChanged: browserEvent:', event);
    // log.debug('SaCollectionModalComponent: onSelectedTypesChanged: selectedContentTypes:', this.selectedContentTypes);
    for (let i = 0; i < v.length; i++) {
      let value = v[i];
      if (value === 'images') {
        imagesEnabled = true;
      }
      if (value === 'pdfs') {
        pdfsEnabled = true;
      }
      if (value === 'officedocs') {
        officeEnabled = true;
      }
      if (value === 'dodgyarchives') {
        dodgyArchivesEnabled = true;
      }
      if (value === 'hashes') {
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



  public onClearTypesSelected(): void {
    this.selectedContentTypes = [];
    this.onSelectedTypesChanged();
    this.changeDetectionRef.markForCheck();
  }



  public onAllTypesSelected() {
    let vals = [];
    for (let i = 0; i < this.contentTypes.length; i++) {
      vals.push( this.contentTypes[i].value );
    }
    this.selectedContentTypes = vals;
    this.onSelectedTypesChanged();
    this.changeDetectionRef.markForCheck();
  }



  public onUseCaseChanged(): void {
    log.debug('SaCollectionModalComponent: onUseCaseChanged()');
    // log.debug('SaCollectionModalComponent: onUseCaseChanged: selectedUseCase:', this.selectedUseCase );

    let displayUseCaseDescription = false;
    let thisUseCase: UseCase;

    for (let i = 0; i < this.useCases.length; i++) {
      if (this.useCases[i].name === this.selectedUseCase) {
        thisUseCase = this.useCases[i];
        displayUseCaseDescription = true;
        this.useCaseDescription = this.useCases[i].description;
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
    // this.collectionFormModel = JSON.parse(JSON.stringify(this.collectionFormModel));
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



  public onUseCaseBoundChanged(): void {
    log.debug('SaCollectionModalComponent: onUseCaseBoundChanged()');

    if (this.type === 'fixed') {
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



  private convertArrayToString(a: any): string {
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
    this.hashFeedId = null;
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



  private onAdhocCollection(params: any): void {

    log.debug('SaCollectionModalComponent: onAdhocCollection(): params:', params);

    this.adhocParams = params;

    if (Object.keys(params).length === 0) {
      return;
    }

    this.hashFeedId = null;
    this.mode = 'adhoc';

    // Collection type
    this.type = 'fixed';

    // Collection name
    let now = moment().format('YYYY/MM/DD HH:mm:ssZ');
    if ('host' in params) {
      this.name = 'Adhoc investigation for host \'' + params['host'] + '\' at ' + now;
    }
    else if ('ip' in params) {
      this.name = 'Adhoc investigation for ' + params['side'] + ' IP ' + params['ip'] + ' at ' + now;
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



  private onEditCollection(collection: Collection): void {
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
    this.type = collection.type;
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
      for (let i = 0; i < this.queryList.length; i++) {
        let query = this.queryList[i];
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
        this.sha1Hashes = utils.getHashesFromConfig(collection.sha1Hashes);
      }
      else {
        this.sha1Enabled = false;
      }

      if (collection.sha256Enabled) {
        this.sha256Enabled = true;
        this.sha256Hashes = utils.getHashesFromConfig(collection.sha256Hashes);
      }
      else {
        this.sha256Enabled = false;
      }

      if (collection.md5Enabled) {
        this.md5Enabled = true;
        this.md5Hashes = utils.getHashesFromConfig(collection.md5Hashes);
      }
      else {
        this.md5Enabled = false;
      }
    }
    this.changeDetectionRef.markForCheck();
  }







  public apiServerFormValid(): boolean {
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



  public addServiceFormValid(form: NgForm): boolean {
    // log.debug('SaCollectionModalComponent: addServiceFormValid()');

    if (this.apiServerMode === 'add' && this.serviceFormModel.hostname && this.serviceFormModel.user && this.serviceFormModel.password && this.serviceFormModel.restPort) { // && this.serviceFormModel.restPort && this.serviceFormModel.deviceNumber
      return true;
    }

    if (this.apiServerMode === 'edit' && this.serviceFormModel.hostname && this.serviceFormModel.user && this.serviceFormModel.restPort) { // && this.serviceFormModel.restPort  && this.serviceFormModel.deviceNumber
      return true;
    }

    return false;
  }

  public onApiServerChanged(): void {
    log.debug(`SaCollectionModalComponent: onApiServerChanged(): selectedApiServer: ${this.selectedApiServer}`);
  }



  public testApiServer(): void {
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

    let server = {};
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
        server['password'] = this.dataService.encryptor.encrypt(this.serviceFormModel.password);
      }
    }
    this.dataService.testSaServer(server)
                    .then( () => {
                      this.testInProgress = false;
                      let msg = 'Connection was successful';
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
                      let msg = 'Connection failed';
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



  public editApiServer(): void {
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
    let server = this.apiServers[this.selectedApiServer];
    log.debug('SaCollectionModalComponent: editApiServer(): server:', server);
    this.editingApiServerId = server.id;
    this.serviceFormModel.hostname = server.host;
    this.serviceFormModel.user = server.user;
    this.serviceFormModel.restPort = server.port;
    this.serviceFormModel.ssl = server.ssl;
    // this.serviceFormModel.deviceNumber = server.deviceNumber;
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
