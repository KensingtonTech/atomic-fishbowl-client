import { Component, OnInit, OnDestroy, ElementRef, Input, Output, EventEmitter, ViewChild, ViewChildren, QueryList, ViewEncapsulation } from '@angular/core';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
import { ModalService } from './modal/modal.service';
import { NgForm } from '@angular/forms';
import { UUID } from 'angular2-uuid';
import { defaultSaQueries } from './default-sa-queries';
import { Query } from './query';
import { ContentTypes } from './contenttypes';
import { UseCase } from './usecase';
import { SelectItem } from 'primeng/components/common/selectitem';
import { Subscription } from 'rxjs/Subscription';
import { SaServer } from './saserver';
import { Feed } from './feed';
import * as utils from './utils';
import * as log from 'loglevel';
import { CollectionMeta } from './collection-meta';
import { Collection } from './collection';
import { Preferences } from './preferences';
declare var JSEncrypt: any;


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
      font-size: 11px !important;
    }

    .description-text {
      font-size: 12px
    }

    .ui-radiobutton-label {
      font-size: 14px;
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
              private modalService: ModalService) {}

  @Input() id: string;
  @ViewChild('addCollectionForm') public addCollectionForm: NgForm;
  @ViewChild('addServiceBox') addServiceBoxRef: ElementRef;
  @ViewChildren('nameBox') nameBoxRef: QueryList<any>;
  @ViewChildren('hostName') hostNameRef: QueryList<any>;
  private hashTooltip = 'This is used to find suspicious executables that match a certain hash pattern.  It presently works with Windows and Mac executables.  It also supports executables contained within ZIP or RAR archives.  This will not limit the display of other types of content pulled in from the query.  If found, a tile will be displayed with the hash value and an optional friendly name which can be specified by using CSV syntax of hashValue,friendlyIdentifier';

  public tabContainerModalId = 'tab-container-modal';

  public mode = 'add'; // can be add, editRolling, or editFixed
  public apiServerMode = 'add'; // can be add or edit
  public formDisabled = false;
  private defaultCollectionQuery = `filetype='pdf','office 2007 document'`;
  private defaultCollectionType = 'rolling';
  public contentTypes = ContentTypes;
  private defaultUseCaseBinding = 'bound';
  public showUseCaseValues = false; // used to switch input controls to readonly mode.  true = readonly mode
  public collection: any;
  public testError = '';
  public timeBegin: Date = new Date();
  public timeEnd: Date = new Date();

  public collectionFormModel = {
    name: '',
    type: this.defaultCollectionType,
    lastHours: 1,
    selectedUseCase: null,
    useCaseBinding: this.defaultUseCaseBinding,
    selectedContentTypes: [],
    contentLimit: null,
    minX: null,
    minY: null,
    distillationEnabled: false,
    distillationTerms: '',
    regexDistillationEnabled: false,
    regexDistillationTerms: '',
    sha1Enabled: false,
    sha1Hashes: '',
    sha256Enabled: false,
    sha256Hashes: '',
    md5Enabled: false,
    md5Hashes: ''
  };
  public queryInputText = this.defaultCollectionQuery;
  public selectedApiServer = '';
  public apiServers: any = {};
  public apiServersOptions: SelectItem[];

  public serviceFormModel = {
    hostname: '',
    restPort: 443,
    ssl: true,
    user: '',
    password: '',
    // deviceNumber: 1
  };
  public queryList = defaultSaQueries;
  private queryListObj = {};
  public queryListOptions: SelectItem[] = [];

  public selectedQuery: any = this.queryList[2];
  private preferences: any;
  private timeframes: any = ['Last 5 Minutes', 'Last 10 Minutes', 'Last 15 Minutes', 'Last 30 Minutes', 'Last Hour', 'Last 3 Hours', 'Last 6 Hours', 'Last 12 Hours', 'Last 24 Hours', 'Last 48 Hours', 'Last 5 Days (120 Hours)', 'Today', 'Yesterday', 'This Week', 'Last Week', 'Custom'];
  private selectedTimeframe = 'Last Hour';
  public displayCustomTimeframeSelector = false;
  private firstRun = true;

  // Subscriptions
  private preferencesChangedSubscription: Subscription;
  private useCasesChangedSubscription: Subscription;
  private addSaCollectionNextSubscription: Subscription;
  private editSaCollectionNextSubscription: Subscription;
  private confirmSaServerDeleteSubscription: Subscription;
  private feedsChangedSubscription: Subscription;
  private executeCollectionOnEditSubscription: Subscription;
  private reOpenTabsModalSubscription: Subscription;

  private pubKey: string;
  private encryptor: any = new JSEncrypt();

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


  ngOnInit(): void {

    log.debug('SaCollectionModalComponent: ngOnInit()');

    this.dataService.getPublicKey().then( (pubKey) => {
      this.encryptor.log = true;
      this.pubKey = pubKey;
      log.debug('SaCollectionModalComponent: Server public key: ', this.pubKey);
      this.encryptor.setPublicKey(this.pubKey);
    });

    this.getApiServers();

    for (let i = 0; i < this.queryList.length; i++) {
      this.queryListObj[this.queryList[i].text] = this.queryList[i];
      let option: any = {};
      option['label'] = this.queryList[i].text;
      option['value'] = this.queryList[i].text;
      this.queryListOptions.push(option);
    }

    this.reOpenTabsModalSubscription = this.toolService.reOpenTabsModal.subscribe( (TorF) => this.reOpenTabsModal = TorF );

    // Preferences changed subscription
    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: Preferences) =>  {
      log.debug('SaCollectionModalComponent: prefs observable: ', prefs);

      if (Object.keys(prefs).length === 0) {
        return; // this handles a race condition where we subscribe before the getPreferences call has actually run
      }
      setTimeout( () => { // wrap it all in a setTimeout so our model updates properly
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
                log.debug('SaCollectionModalComponent: ngOnInit(): setting query selector to ', query);
                  this.selectedQuery = query.text; // changes the query in the query select box dropdown
                  this.queryInputText = query.queryString; // changes the query string in the query string input
                break;
              }
            }
          }

          if ( 'minX' in prefs && 'minY' in prefs ) {
            this.collectionFormModel.minX = prefs.minX;
            this.collectionFormModel.minY = prefs.minY;
          }
          if ( 'defaultContentLimit' in prefs ) {
            this.collectionFormModel.contentLimit = prefs.defaultContentLimit;
          }
          if ( 'defaultRollingHours' in prefs ) {
            this.collectionFormModel.lastHours = prefs.defaultRollingHours;
          }

          if ( 'presetQuery' in prefs.sa && prefs.sa.defaultQuerySelection === 'Preset Query' ) {
            // this.defaultCollectionQuery = prefs.sa.presetQuery;
            this.queryInputText = prefs.sa.presetQuery; // changes the query string in the query string input
          }

        }

        this.firstRun = false;
      }, 0);
    });

    this.useCasesChangedSubscription = this.dataService.useCasesChanged.subscribe( (o: any) => {
      log.debug('SaCollectionModalComponent: useCasesChangedSubscription(): o', o);
      this.useCases = o.useCases;
      this.useCasesObj = o.useCasesObj;
      let useCaseOptions: SelectItem[] = [];
      useCaseOptions.push( { label: 'Custom', value: 'custom' } );
      for (let i = 0; i < this.useCases.length; i++) {
        useCaseOptions.push( { label: this.useCases[i].friendlyName, value: this.useCases[i].name } );
      }
      this.useCaseOptions = useCaseOptions;
    });

    // Add collection next subscription
    this.addSaCollectionNextSubscription = this.toolService.addSaCollectionNext.subscribe( () => {
      this.onAddCollection();
    });

    // Edit collection next subscription
    this.editSaCollectionNextSubscription = this.toolService.editSaCollectionNext.subscribe( (collection: Collection) => {
      this.onEditCollection(collection);
    });

    this.confirmSaServerDeleteSubscription = this.toolService.confirmSaServerDelete.subscribe( (id: string) => this.deleteApiServerConfirmed(id) );

    this.feedsChangedSubscription = this.dataService.feedsChanged.subscribe( (feeds: Feed[]) => {
      log.debug('SaCollectionModalComponent: feedsChangedSubscription(): feeds', feeds);
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
    });

    this.executeCollectionOnEditSubscription = this.toolService.executeCollectionOnEdit.subscribe( TorF => this.executeCollectionOnEdit = TorF);

  }

  public ngOnDestroy() {
    this.preferencesChangedSubscription.unsubscribe();
    this.useCasesChangedSubscription.unsubscribe();
    this.addSaCollectionNextSubscription.unsubscribe();
    this.editSaCollectionNextSubscription.unsubscribe();
    this.reOpenTabsModalSubscription.unsubscribe();
    this.feedsChangedSubscription.unsubscribe();
  }


  public onQuerySelected(): void {
    // log.debug('SaCollectionModalComponent: querySelected(): e', e);
    if (this.selectedQuery === 'Preset Query') {
      this.queryInputText = this.defaultCollectionQuery;
    }
    else {
      // this.queryInputText = JSON.stringify(this.queryListObj[this.selectedQuery].query);
      this.queryInputText = this.queryListObj[this.selectedQuery].queryString;
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
    setTimeout( () => {
      this.passwordRequired = true;
      this.thumbClassInForm = '';
      this.showApiServiceBox = true;
      this.apiServerButtonText = 'Save';
      this.apiServerMode = 'add';
      this.formDisabled = true;
      // setTimeout( () => this.hostNameRef.first.nativeElement.focus(), .2 );
    }, 0);
    setTimeout( () => this.hostNameRef.first.nativeElement.focus() );
  }

  public hideServiceAddBox(): void {
    setTimeout( () => {
      this.showApiServiceBox = false;
      this.serviceFormModel.hostname = '';
      this.serviceFormModel.restPort = 443;
      this.serviceFormModel.ssl = false;
      this.serviceFormModel.user = '';
      this.serviceFormModel.password = '';
      this.formDisabled = false;
    }, 0);
  }

  public cancel(): void {
    log.debug('SaCollectionModalComponent: cancel()');
    if (this.mode === 'editRolling' || this.mode === 'editFixed') {
      this.collectionFormModel.name = '';
    }
    this.modalService.close(this.id);
    if (this.reOpenTabsModal) {
      this.modalService.open(this.tabContainerModalId);
    }
  }

  private closeModal(): void {
    this.modalService.close(this.id);
  }

  public cancelledEventReceived(): void {
    log.debug('SaCollectionModalComponent: cancelledEventReceived()');
    this.cancel();
  }

  private getApiServers(): Promise<any> {
    // log.debug("SaCollectionModalComponent: getApiServers()");
    return this.dataService.getSaServers()
      .then( n => {
        // setTimeout( () => {
          log.debug('SaCollectionModalComponent: getApiServers(): apiServers:', n);
          this.apiServers = n;
          // log.debug("SaCollectionModalComponent: getApiServers(): this.apiServers:", this.apiServers);

          let o: SelectItem[] = [];
          for (let server in this.apiServers) {
            if (this.apiServers.hasOwnProperty(server)) {
              // log.debug(apiserver:', server);
              o.push( { label: this.apiServers[server].friendlyName, value: this.apiServers[server].id } )  ;
            }
          }
          this.apiServersOptions = o;
        // }, 0);
      });
  }

  public deleteApiServer(): void {
    log.debug('SaCollectionModalComponent: deleteApiServer(): this.selectedApiServer', this.selectedApiServer);
    if (this.formDisabled) {
      return;
    }
    this.toolService.saServerToDelete.next(this.apiServers[this.selectedApiServer]);
    this.modalService.open('confirm-saserver-delete-modal');
  }

  private deleteApiServerConfirmed(id: string): void {
    log.debug('SaCollectionModalComponent: deleteApiServerConfirmed(): id:', id);
    // log.debug(this.apiServers[this.selectedApiServer].friendlyName);
    this.dataService.deleteSaServer(id)
      .then ( () => {
        this.getApiServers()
          .then( () => {
            if (Object.keys(this.apiServers).length === 0) {
              // log.debug('this.selectedApiServer:', this.selectedApiServer);
              setTimeout( () => this.selectedApiServer = '', 0);
            }
            if (Object.keys(this.apiServers).length === 1) {
              // log.debug('this.selectedApiServer:', this.selectedApiServer);
              setTimeout( () => this.selectedApiServer = Object.keys(this.apiServers)[0], 0);
            }
            else {
              log.debug('apiServers key length was:', Object.keys(this.apiServers).length);
              log.debug('apiServers keys:', Object.keys(this.apiServers));
            }
          });
      });

  }



  public onCollectionSubmit(f: NgForm): void {
    // log.debug('SaCollectionModalComponent: submitForAdd()');
    const time = <number>(Math.round( <any>(new Date()) / 1000) );

    let newCollection: Collection = {
      id: UUID.UUID(), // overridden later if editing collection
      name: this.collectionFormModel.name,
      type: this.collectionFormModel.type,
      state: 'initial',
      saserver: this.selectedApiServer,
      saserverName: this.apiServers[this.selectedApiServer].friendlyName,
      // query: null,
      // contentTypes: null,
      contentLimit: this.collectionFormModel.contentLimit,
      // deviceNumber: this.apiServers[this.selectedApiServer].deviceNumber,
      bound: false, // may get overridden later
      usecase: 'custom', // may get overridden later
      // minX: this.collectionFormModel.minX,
      // minY: this.collectionFormModel.minY,
      // distillationEnabled: null,
      // regexDistillationEnabled: null,
      // useHashFeed: null,
      executeTime: time,
      serviceType: 'sa'
    };

    if (this.collectionFormModel.selectedUseCase !== 'custom' && this.collectionFormModel.useCaseBinding === 'bound') {
      // An OOTB use case is selected and is bound
      newCollection.usecase = this.collectionFormModel.selectedUseCase;
      newCollection.bound = true;

      for (let i = 0; i < this.useCases.length; i++) {
        // set minX and minY if the use case uses images
        let thisUseCase = this.useCases[i];
        let outerBreak = false;

        if (thisUseCase.name === newCollection.usecase) {
          let contentTypes = thisUseCase.contentTypes;
          for (let x = 0; x < contentTypes.length; x++) {
            if ( contentTypes[x] === 'images') {
              newCollection.minX = this.collectionFormModel.minX;
              newCollection.minY = this.collectionFormModel.minY;
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
      newCollection.distillationEnabled = this.collectionFormModel.distillationEnabled;
      newCollection.regexDistillationEnabled = this.collectionFormModel.regexDistillationEnabled;
      newCollection.contentTypes = this.collectionFormModel.selectedContentTypes;

      for (let i = 0; i < newCollection.contentTypes.length; i++) {
        let type = newCollection.contentTypes[i];
        if (type === 'images') {
          newCollection.minX = this.collectionFormModel.minX;
          newCollection.minY = this.collectionFormModel.minY;
        }
      }

      if (!newCollection.bound && this.hashesEnabled && this.hashingMode === 'manual') {
        newCollection.useHashFeed = false;
        newCollection.md5Enabled = this.collectionFormModel.md5Enabled;
        newCollection.sha1Enabled = this.collectionFormModel.sha1Enabled;
        newCollection.sha256Enabled = this.collectionFormModel.sha256Enabled;
      }
      if (!newCollection.bound && this.hashesEnabled && this.hashingMode === 'feed' && this.selectedFeed) {
        newCollection.useHashFeed = true;
        newCollection.hashFeed = this.selectedFeed.id;
      }
    }

    // set timeframe on collection
    if ( this.collectionFormModel.type === 'rolling' ) {
      newCollection.lastHours = this.collectionFormModel.lastHours;
    }
    else if ( this.collectionFormModel.type === 'fixed' ) {
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


    if (!newCollection.bound && 'distillationEnabled' in this.collectionFormModel && this.collectionFormModel.distillationEnabled ) {
      newCollection.distillationEnabled = false;
      let endterms = utils.grokLines(this.collectionFormModel.distillationTerms);
      if ( endterms.length !== 0 ) {
        newCollection.distillationEnabled = true;
        newCollection.distillationTerms = endterms;
      }
    }

    if (!newCollection.bound && 'regexDistillationEnabled' in this.collectionFormModel && this.collectionFormModel.regexDistillationEnabled) {
      newCollection.regexDistillationEnabled = false;
      let endterms = utils.grokLines(this.collectionFormModel.regexDistillationTerms);
      if ( endterms.length !== 0 ) {
        newCollection.regexDistillationEnabled = true;
        newCollection.regexDistillationTerms = endterms;
      }
    }

    if (!newCollection.bound && this.hashesEnabled && 'sha1Enabled' in this.collectionFormModel && this.collectionFormModel['sha1Enabled']) {
      newCollection.sha1Enabled = false;
      let endterms = utils.grokHashingLines(this.collectionFormModel.sha1Hashes);
      if ( endterms.length !== 0 ) {
        newCollection.sha1Enabled = true;
        newCollection.sha1Hashes = endterms;
      }
    }

    if (!newCollection.bound && this.hashesEnabled && 'sha256Enabled' in this.collectionFormModel && this.collectionFormModel['sha256Enabled']) {
      newCollection.sha256Enabled = false;
      let endterms = utils.grokHashingLines(this.collectionFormModel.sha256Hashes);
      if ( endterms.length !== 0 ) {
        newCollection.sha256Enabled = true;
        newCollection.sha256Hashes = endterms;
      }
    }

    if (!newCollection.bound && this.hashesEnabled && 'md5Enabled' in this.collectionFormModel && this.collectionFormModel['md5Enabled']) {
      newCollection.md5Enabled = false;
      let endterms = utils.grokHashingLines(this.collectionFormModel.md5Hashes);
      if ( endterms.length !== 0 ) {
        newCollection.md5Enabled = true;
        newCollection.md5Hashes = endterms;
      }
    }

    if (this.mode === 'add' || this.mode === 'editFixed') {
      log.debug('SaCollectionModalComponent: onCollectionSubmit(): new newCollection:', newCollection);
      this.dataService.addCollection(newCollection)
                      .then( () => {
                          this.toolService.executeAddCollection.next( newCollection );
                          this.closeModal();
                        });
    }

    if (this.mode === 'editRolling') {
      newCollection.id = this.editingCollectionId;
      newCollection['creator'] = this.editingCreator;
      log.debug('SaCollectionModalComponent: onCollectionSubmit(): edited newCollection:', newCollection);
      this.dataService.editCollection(newCollection)
                      .then( () => {
                          this.toolService.executeEditCollection.next( newCollection );
                          this.closeModal();
                        });
    }

    this.collectionFormModel.name = ''; // reset collection name

  }

  public addApiServerSubmit(f: NgForm): void {
    // log.debug("SaCollectionModalComponent: addApiServerSubmit(): f:", f);
    this.hideServiceAddBox();
    let encPassword = this.encryptor.encrypt(f.value.password);
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

    if (this.apiServerMode === 'add') {
      this.dataService.addSaServer(newServer)
                      .then( () => {
                          this.getApiServers()
                              .then( () => {
                                log.debug('addApiServerSubmit: returned from getSaServers');
                                log.debug('addApiServerSubmit: this.selectedApiServer:', this.selectedApiServer);
                                if (this.selectedApiServer === '') {
                                  setTimeout( () => this.selectedApiServer = newServer.id);
                                }
                              });
                        })
                        .catch( (err) => {
                          let error = JSON.parse(err);
                          log.error('SaCollectionModalComponent: addApiServerSubmit(): error response from server:', error.error);
                        });
    }

    if (this.apiServerMode === 'edit') {
      this.dataService.editSaServer(newServer)
                      .then( () => {
                          this.getApiServers()
                              .then( () => {
                                log.debug('addApiServerSubmit: returned from editSaServers');
                                log.debug('addApiServerSubmit: this.selectedApiServer:', this.selectedApiServer);
                                if (this.selectedApiServer === '') {
                                  setTimeout( () => this.selectedApiServer = newServer.id);
                                }
                              });
                        })
                        .catch( (err) => {
                          let error = JSON.parse(err);
                          log.error('SaCollectionModalComponent: addApiServerSubmit(): error response from server:', error.error);
                        });
    }

  }

  public onOpen(): void {
    // log.debug('SaCollectionModalComponent: onOpen()');
    this.dataService.getFeeds();
  }


  public onSelectedTypesChanged(): void {
    log.debug('SaCollectionModalComponent: onSelectedTypesChanged()');
    let v = this.collectionFormModel.selectedContentTypes;
    let imagesEnabled = false;
    let pdfsEnabled = false;
    let officeEnabled = false;
    let dodgyArchivesEnabled = false;
    let hashesEnabled = false;
    // log.debug('SaCollectionModalComponent: onSelectedTypesChanged: v:', v);
    // log.debug('SaCollectionModalComponent: onSelectedTypesChanged: browserEvent:', event);
    // log.debug('SaCollectionModalComponent: onSelectedTypesChanged: collectionFormModel.selectedContentTypes:', this.collectionFormModel.selectedContentTypes);
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
    setTimeout( () => {
      if ( !(officeEnabled || pdfsEnabled) ) {
        this.collectionFormModel.distillationEnabled = false;
        this.collectionFormModel.regexDistillationEnabled = false;
      }
      if (!hashesEnabled) {
        this.collectionFormModel.sha1Enabled = false;
        this.collectionFormModel.sha256Enabled = false;
        this.collectionFormModel.md5Enabled = false;
      }
      this.imagesEnabled = imagesEnabled;
      this.pdfsEnabled = pdfsEnabled;
      this.officeEnabled = officeEnabled;
      this.dodgyArchivesEnabled = dodgyArchivesEnabled;
      this.hashesEnabled = hashesEnabled;
    }, 0);
  }

  public clearTypes(): void {
    setTimeout( () => {
      this.collectionFormModel.selectedContentTypes = [];
    }, 0);
    this.onSelectedTypesChanged();
  }

  public allTypes() {
    let vals = [];
    for (let i = 0; i < this.contentTypes.length; i++) {
      vals.push( this.contentTypes[i].value );
    }
    setTimeout( () => {
      this.collectionFormModel.selectedContentTypes = vals;
    }, 0);
    this.onSelectedTypesChanged();
  }

  public onUseCaseChanged(): void {
    log.debug('SaCollectionModalComponent: onUseCaseChanged()');
    // log.debug('SaCollectionModalComponent: onUseCaseChanged: collectionFormModel.selectedUseCase:', this.collectionFormModel.selectedUseCase );

    setTimeout( () => {
      let displayUseCaseDescription = false;
      let thisUseCase: UseCase;
      for (let i = 0; i < this.useCases.length; i++) {
        if (this.useCases[i].name === this.collectionFormModel.selectedUseCase) {
          thisUseCase = this.useCases[i];
          displayUseCaseDescription = true;
          this.useCaseDescription = this.useCases[i].description;
          break;
        }
      }
      this.displayUseCaseDescription = displayUseCaseDescription;

      if (this.collectionFormModel.selectedUseCase === 'custom') {
        this.showUseCaseValues = false;
        this.onSelectedTypesChanged();
        return;
      }

      // an OOTB use case has been selected
      log.debug('SaCollectionModalComponent: onUseCaseChanged: thisUseCase:', thisUseCase);
        this.queryInputText = thisUseCase.saquery;
        this.collectionFormModel.selectedContentTypes = thisUseCase.contentTypes;
        this.collectionFormModel.distillationEnabled = false;
        if ('distillationTerms' in thisUseCase) {
          this.collectionFormModel.distillationEnabled = true;
          this.collectionFormModel.distillationTerms = thisUseCase.distillationTerms.join('\n');
        }
        this.collectionFormModel.regexDistillationEnabled = false;
        if ('regexTerms' in thisUseCase) {
          this.collectionFormModel.regexDistillationEnabled = true;
          this.collectionFormModel.regexDistillationTerms = thisUseCase.regexTerms.join('\n');
        }
        // this might be our problem
        this.collectionFormModel = JSON.parse(JSON.stringify(this.collectionFormModel));
        if (this.collectionFormModel.useCaseBinding === 'bound') {
          this.showUseCaseValues = true;
        }
        else {
          this.showUseCaseValues = false;
        }
        this.onSelectedTypesChanged();
    }, 0);
  }

  public onUseCaseBoundChanged(): void {
    log.debug('SaCollectionModalComponent: onUseCaseBoundChanged()');
    setTimeout( () => {

      if (this.collectionFormModel.type === 'fixed') {
        // log.debug('Got to 1');
        this.collectionFormModel.useCaseBinding = 'unbound';
        this.disableBindingControls = true;
      }
      else {
        // log.debug('Got to 2');
        this.disableBindingControls = false;
      }

      if (this.collectionFormModel.selectedUseCase === 'custom') {
        this.showUseCaseValues = false;
      }

      else if (this.collectionFormModel.useCaseBinding === 'bound') {
        // log.debug('Got to 3');
        this.showUseCaseValues = true;
      }
      else { // unbound
        // log.debug('Got to 4');
        this.showUseCaseValues = false;
      }
    }, 0);

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
    setTimeout( () => {
      this.hashFeedId = null;
      this.mode = 'add';
      this.nameBoxRef.first.nativeElement.focus();
      this.collectionFormModel.selectedUseCase = this.useCaseOptions[0].value; // this sets it to 'custom'
      this.showUseCaseValues = false;
      this.displayUseCaseDescription = false;
      if (Object.keys(this.apiServers).length !== 0) {
        this.selectedApiServer = Object.keys(this.apiServers)[0];
      }
      log.debug('SaCollectionModalComponent: onAddCollection(): selectedApiServer', this.selectedApiServer);
    }, 0);
  }

  private onEditCollection(collection: Collection): void {
    // Called when we receive an edit signal from toolbar
    log.debug('SaCollectionModalComponent: onEditCollection(): collection:', collection);
    setTimeout( () => {
      this.collection = collection;

      if (collection.type === 'rolling' || collection.type === 'monitoring' ) {
        this.mode = 'editRolling';
        this.editingCollectionId = collection.id;
        if ('creator' in collection) {
          this.editingCreator = collection.creator;
        }
        if (collection.type === 'rolling') {
          this.collectionFormModel.lastHours = collection.lastHours;
        }
      }
      else {
        this.mode = 'editFixed';
      }

      this.collectionFormModel.name = collection.name;
      this.collectionFormModel.type = collection.type;
      this.collectionFormModel.contentLimit = collection.contentLimit;
      this.collectionFormModel.minX = collection.minX;
      this.collectionFormModel.minY = collection.minY;
      this.collectionFormModel.selectedUseCase = collection.usecase;

      if (collection.bound) {
        this.collectionFormModel.useCaseBinding = 'bound';
        this.onUseCaseBoundChanged();
        this.onUseCaseChanged();
      }
      else {
        // unbound or custom collection
        this.collectionFormModel.useCaseBinding = 'unbound';
        this.collectionFormModel.selectedContentTypes = collection.contentTypes;
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
          this.collectionFormModel.distillationEnabled = true;
          this.collectionFormModel.distillationTerms = this.convertArrayToString(collection.distillationTerms);
        }
        else {
          this.collectionFormModel.distillationEnabled = false;
        }

        if (collection.regexDistillationEnabled) {
          this.collectionFormModel.regexDistillationEnabled = true;
          this.collectionFormModel.regexDistillationTerms = this.convertArrayToString(collection.regexDistillationTerms);
        }
        else {
          this.collectionFormModel.regexDistillationEnabled = false;
        }


      if (collection.useHashFeed) {
        this.hashingMode = 'feed';
        this.hashFeedId = collection.hashFeed;
        // now get the feed object and stick it in selectedFeed
        this.dataService.getFeeds();
      }
      else {
        this.hashingMode = 'manual';
        if (collection.sha1Enabled) {
          this.collectionFormModel.sha1Enabled = true;
          this.collectionFormModel.sha1Hashes = utils.getHashesFromConfig(collection.sha1Hashes);
        }
        else {
          this.collectionFormModel.sha1Enabled = false;
        }

        if (collection.sha256Enabled) {
          this.collectionFormModel.sha256Enabled = true;
          this.collectionFormModel.sha256Hashes = utils.getHashesFromConfig(collection.sha256Hashes);
        }
        else {
          this.collectionFormModel.sha256Enabled = false;
        }

        if (collection.md5Enabled) {
          this.collectionFormModel.md5Enabled = true;
          this.collectionFormModel.md5Hashes = utils.getHashesFromConfig(collection.md5Hashes);
        }
        else {
          this.collectionFormModel.md5Enabled = false;
        }
      }



    }, 0);
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
        password: this.encryptor.encrypt(this.serviceFormModel.password)
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
        server['password'] = this.encryptor.encrypt(this.serviceFormModel.password);
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

                      log.info('Test connection failed with error:', err);
                    });
  }


  public editApiServer(): void {
    log.debug('SaCollectionModalComponent: editApiServer()');
    if (this.formDisabled) {
      return;
    }
    setTimeout( () => {
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
    }, 0);
  }

}
