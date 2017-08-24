import { Component, ChangeDetectorRef, OnInit, OnDestroy, ElementRef, Input, Output, EventEmitter, Renderer2, ViewChild, ViewChildren, QueryList, ViewEncapsulation } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
import { NgForm } from '@angular/forms';
import { UUID } from 'angular2-uuid';
import { defaultQueries } from './default-queries';
declare var moment: any;
declare var log: any;

/*
declare global {
  interface String {
    hasWhitespace: boolean;
    isBlank: boolean;
  }
}

String.prototype.hasWhitespace = function(c): boolean {
  if (c.match(/\s/)) { return true; }
  return false;
}

String.prototype.isBlank = function(c) {
  if (this.length === 0) {return true;}
  return false;
}
*/

@Component({
  selector: 'add-collection-modal',
  // changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,

  templateUrl: './addcollection-modal.component.html',
  styles: [`

    .column1 {
      white-space: nowrap;
      width: 1px;
    }

    .ourFont {
      font-family: system-ui !important;
      font-size: 11px !important;
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
  `]
})

export class AddCollectionModalComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private renderer: Renderer2,
              private changeDetectionRef: ChangeDetectorRef) {}

  @Input() id: string;
  @Output() executeCollection: EventEmitter<any> = new EventEmitter();
  @ViewChild('addServiceBox') addServiceBoxRef: ElementRef;
  @ViewChildren('nameBox') nameBoxRef: QueryList<any>;
  @ViewChildren('hostName') hostNameRef: QueryList<any>;
  private enabledTrigger: string;
  public collectionFormDisabled = false;

  private defaultColName = '';
  // tslint:disable-next-line:quotemark
  private defaultColQuery = "vis.level exists || content = 'application/pdf'";
  private defaultColImageLimit = 1000;
  private defaultColService: any = undefined;
  private defaultNwserver = '';
  private defaultMinX = 1;
  private defaultMinY = 1;
  private defaultDistillationEnabled = false;
  private defaultDistillationTerms = '';
  private defaultRegexDistillationEnabled = false;
  private defaultRegexDistillationTerms = '';
  private defaultCollectionType = 'fixed';
  private defaultMd5Hashes = '';
  private defaultSha1Hashes = '';
  private defaultSha256Hashes = '';
  private hashTooltip = 'This is used to find suspicious executables that match a certain hash pattern.  It presently works with Windows and Mac executables.  It also supports executables contained within ZIP or RAR archives.  This will not limit the display of other types of content pulled in from the query.  If found, a tile will be displayed with the hash value and an optional friendly name which can be specified by using CSV syntax of hashValue,friendlyIdentifier';

  public collectionFormModel = {
    name: this.defaultColName,
    query: this.defaultColQuery,
    imageLimit: this.defaultColImageLimit,
    nwserver: this.defaultNwserver,
    minX: this.defaultMinX,
    minY: this.defaultMinY,
    distillationEnabled: this.defaultDistillationEnabled,
    distillationTerms: this.defaultDistillationTerms,
    regexDistillationEnabled: this.defaultRegexDistillationEnabled,
    regexDistillationTerms: this.defaultRegexDistillationTerms,
    timeBegin: new Date(),
    timeEnd: new Date(),
    type: this.defaultCollectionType,
    lastHours: 1,
    md5Enabled: false,
    md5Hashes: this.defaultMd5Hashes,
    sha1Enabled: false,
    sha1Hashes: this.defaultSha1Hashes,
    sha256Enabled: false,
    sha256Hashes: this.defaultSha256Hashes
  };

  public nwservers: any;
  private defaultHostname = '';
  private defaultUser = '';
  private defaultPassword = '';
  private defaultRestPort = 50103;
  private defaultSSL = false;
  private defaultDeviceNumber = 13;
  public serviceFormModel = {
    hostname: this.defaultHostname,
    restPort: this.defaultRestPort,
    ssl: this.defaultSSL,
    user: this.defaultUser,
    password: this.defaultPassword,
    deviceNumber: this.defaultDeviceNumber
  };
  public queryList = defaultQueries;
  public selectedQuery: any = this.queryList[2];
  private preferences: any;
  private timeframes: any = ['Last 5 Minutes', 'Last 10 Minutes', 'Last 15 Minutes', 'Last 30 Minutes', 'Last Hour', 'Last 3 Hours', 'Last 6 Hours', 'Last 12 Hours', 'Last 24 Hours', 'Last 48 Hours', 'Last 5 Days (120 Hours)', 'Today', 'Yesterday', 'This Week', 'Last Week', 'Custom'];
  private selectedTimeframe = 'Last Hour';
  public displayCustomTimeframeSelector = false;
  private firstRun = true;

  private preferencesChangedSubscription: any;


  ngOnInit(): void {
    this.getNwServers();
    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: any) =>  {
      log.debug('AddCollectionModalComponent: prefs observable: ', prefs);
      this.preferences = prefs;

      // We can update this every time
      if ( 'defaultNwQuery' in prefs ) {
        this.defaultColQuery = prefs.defaultNwQuery;
        // this.collectionFormModel.query = prefs.defaultNwQuery;
      }

      if (this.firstRun) { // we only want to update these the first time we open.  After that, leave them alone
        if ( 'defaultQuerySelection' in prefs ) {
          for (let q = 0; q < this.queryList.length; q++) {
            if (this.queryList[q].text === prefs.defaultQuerySelection) {
              setTimeout(() => this.selectedQuery = this.queryList[q]); // changes the query in the query select box dropdown
              this.collectionFormModel.query = this.queryList[q].queryString; // changes the query string in the query string input
              break;
            }
          }
        }
        if ( 'minX' in prefs && 'minY' in prefs ) {
          this.collectionFormModel.minX = prefs.minX;
          this.collectionFormModel.minY = prefs.minY;
        }
        if ( 'defaultImageLimit' in prefs ) {
          this.collectionFormModel.imageLimit = prefs.defaultImageLimit;
        }
        if ( 'defaultRollingHours' in prefs ) {
          this.collectionFormModel.lastHours = prefs.defaultRollingHours;
        }
        if ( 'defaultNwQuery' in prefs ) {
          // this.defaultColQuery = prefs.defaultNwQuery;
          this.collectionFormModel.query = prefs.defaultNwQuery; // changes the query string in the query string input
        }
      }


      this.firstRun = false;
      this.changeDetectionRef.markForCheck();
    });

    this.dataService.getPreferences();
  }

  public ngOnDestroy() {
    this.preferencesChangedSubscription.unsubscribe();
  }

  querySelected(e: any): void {
    // log.debug('AddCollectionModalComponent: querySelected(): e', e);
    if (e.text === 'Default Query') {
      this.collectionFormModel.query = this.defaultColQuery;
    }
    else {
      this.collectionFormModel.query = e.queryString;
    }
  }

  timeframeSelected(e: any): void {
    if (this.selectedTimeframe === 'Custom') {
      // display custom timeframe selector
      this.displayCustomTimeframeSelector = true;
    }
    else {
      this.displayCustomTimeframeSelector = false;
    }
  }

  displayServiceAddBox(): void {
    this.renderer.setStyle(this.addServiceBoxRef.nativeElement, 'display', 'block');
    this.collectionFormDisabled = true;
    // setTimeout( () => this.hostNameRef.first.nativeElement.focus(), .2 );
    this.hostNameRef.first.nativeElement.focus();
  }

  hideServiceAddBox(): void {
    this.renderer.setStyle(this.addServiceBoxRef.nativeElement, 'display', 'none');
    this.serviceFormModel.hostname = this.defaultHostname;
    this.serviceFormModel.restPort = this.defaultRestPort;
    this.serviceFormModel.ssl = this.defaultSSL;
    this.serviceFormModel.user = this.defaultUser;
    this.serviceFormModel.password = this.defaultPassword;
    this.collectionFormDisabled = false;
  }

  cancel(): void {
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

  cancelledEventReceived(): void {
    log.debug('AddCollectionModalComponent: cancelledEventReceived()');
  }

  getNwServers(): void {
    // log.debug("AddCollectionModalComponent: getNwServers()");
    this.dataService.getNwServers().then(n => {
                                                this.nwservers = n;
                                                // log.debug("AddCollectionModalComponent: getNwServers(): this.nwservers:", this.nwservers);
                                                this.collectionFormModel.nwserver = this.getFirstNwServer();
                                                this.changeDetectionRef.markForCheck();
                                              });
  }

  getFirstNwServer(): any { // a bit of a hack since dicts aren't really ordered
    for (let s in this.nwservers) {
      // log.debug(AddCollectionModalComponent: getFirstNwServer: s, s);
      return s;
    }
  }

  deleteNwServer(): void {
    log.debug('AddCollectionModalComponent: deleteNwServer(): this.collectionFormModel.nwserver', this.collectionFormModel.nwserver);
    // log.debug(this.nwservers[this.collectionFormModel.nwserver].friendlyName);
    this.dataService.deleteNwServer(this.collectionFormModel.nwserver).then ( () => this.getNwServers() );
  }

  convertTimeSelection(): any {
    const t = { timeBegin: 0, timeEnd: 0 };
    const d = new Date();
    if (this.selectedTimeframe === 'Last 5 Minutes') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = ( now - 60 * 5 );
    }
    if (this.selectedTimeframe === 'Last 10 Minutes') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = ( now - 60 * 10 );
    }
    if (this.selectedTimeframe === 'Last 15 Minutes') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = ( now - 60 * 15 );
    }
    if (this.selectedTimeframe === 'Last 30 Minutes') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = ( now - 60 * 30 );
    }
    if (this.selectedTimeframe === 'Last Hour') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = ( now - 60 * 60 );
    }
    if (this.selectedTimeframe === 'Last 3 Hours') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = ( now - 60 * (60 * 3) );
    }
    if (this.selectedTimeframe === 'Last 6 Hours') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = ( now - 60 * (60 * 6) );
    }
    if (this.selectedTimeframe === 'Last 12 Hours') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = ( now - 60 * (60 * 12) );
    }
    if (this.selectedTimeframe === 'Last 24 Hours') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = ( now - 60 * (60 * 24) );
    }
    if (this.selectedTimeframe === 'Last 48 Hours') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = ( now - 60 * (60 * 24) * 2 );
    }
    if (this.selectedTimeframe === 'Last 5 Days (120 Hours)') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = ( now - 60 * (60 * 24) * 5 );
    }
    if (this.selectedTimeframe === 'Today') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = moment().startOf('day').unix();
    }
    if (this.selectedTimeframe === 'Yesterday') {
      t.timeEnd = moment().startOf('day').unix() - 1;
      t.timeBegin = moment().startOf('day').unix() - 86400;
    }
    if (this.selectedTimeframe === 'This Week') {
      const now = Math.round(d.getTime() / 1000);
      t.timeEnd = now;
      t.timeBegin = moment().startOf('week').unix();
    }
    if (this.selectedTimeframe === 'Last Week') {
      t.timeBegin = moment().startOf('week').unix() - 604800;
      t.timeEnd = moment().startOf('week').unix() - 1;
    }
    if (this.selectedTimeframe === 'Custom') {
      t.timeBegin = this.collectionFormModel.timeBegin.getTime() / 1000;
      t.timeEnd = this.collectionFormModel.timeEnd.getTime() / 1000;
    }
    return t;
  }

  unique(a: any): any {
    let unique = [];
    for (let i = 0; i < a.length; i++) {
      let current = a[i];
      if (unique.indexOf(current) < 0) { unique.push(current); }
    }
    return unique;
  }

  grokLines(t: string): any {
    let terms = t.split('\n');
    let midterms: any = [];
    for (let i = 0; i < terms.length; i++) {
      let term = terms[i];
      // log.debug("term:", term);
      term = term.replace(/\s+$/g, '');
      term = term.replace(/^\s+/g, '');
      if ( ! term.match(/^\s*$/g) ) { // remove blank lines from array
        midterms.push(term);
      }
    }
    let endterms = this.unique(midterms); // de-deduplicate array
    return endterms;
  }

   grokHashingLines(v: string): any {
     log.debug('v:', v);
    let n = v.split('\n'); // split by newline
    log.debug('n:', n);
    let newArray = [];
    let hashTracker = []; // used for de-duplicating hash entries
    // log.debug('AddCollectionModalComponent: grokHashingLines(): n:', n);

    for (let x = 0; x < n.length; x++) {
      // remove blank lines
      if (!n[x].match(/^\s*$/)) {
        newArray.push(n[x]);
      }
    }
    // log.debug('AddCollectionModalComponent: grokHashingLines(): newArray:', newArray);

    let keysArray = [];

    for (let i = 0; i < newArray.length; i++) {
      let x = {};
      let y = newArray[i].split(',');
      // log.debug('y:', y);

      y[0] = y[0].trim(); // remove trailing and leading whitespace from key name, if any
      log.debug('y[0]', y[0]);

      if (y[0].match(/\s/)) {
        // log.debug('got to 1');
        // We will skip this row if the key contains any remaining whitespace
        continue;
      }
      // log.debug('got to 2');

      if (!hashTracker.includes(y[0])) { // de-dupe hashes
        hashTracker.push(y[0]);
        x['hash'] = y[0]; // assign hash id

        if (y.length >= 2) {
          // if user specifies CSV notation, save the second part as the friendly identifier
          let s = y[1].trim(); // remove leading and trailing whitespace
          x['friendly'] = s;
        }

        /*else { //we don't want to define the file key if the user doesn't specify one
          // if not in CSV notation, save the key name as the file name
          x['file'] = y[0];
        }*/
        keysArray.push(x);
      }
    }
    log.debug('AddCollectionModalComponent: grokHashingLines(): keysArray:', keysArray);
    return keysArray;
  }

  addCollectionSubmit(f: NgForm): void {
    log.debug('AddCollectionModalComponent: addCollectionSubmit(): f:', f);
    const time = <number>(Math.round( <any>(new Date()) / 1000) );

    let newCollection = {
      type: f.value.type,
      name: f.value.name,
      query: f.value.query,
      imageLimit: f.value.imageLimit,
      nwserver: f.value.nwserver,
      id: UUID.UUID(),
      minX: f.value.minX,
      minY: f.value.minY,
      distillationEnabled: f.value.distillationEnabled,
      regexDistillationEnabled: f.value.regexDistillationEnabled,
      md5Enabled: f.value.md5Enabled,
      sha1Enabled: f.value.sha1Enabled,
      sha256Enabled: f.value.sha256Enabled,
      executeTime: time
    };

    if ( f.value.type === 'rolling' ) {
      newCollection['lastHours'] = f.value.lastHours;
    }
    else if ( f.value.type === 'fixed' ) {
      let t = this.convertTimeSelection();
      newCollection['timeBegin'] = t.timeBegin;
      newCollection['timeEnd'] = t.timeEnd;
    }

    newCollection['nwserverName'] = this.nwservers[newCollection.nwserver].friendlyName;
    newCollection['deviceNumber'] = this.nwservers[newCollection.nwserver].deviceNumber;


    if (f.value.distillationEnabled) {
      let endterms = this.grokLines(f.value.distillationTerms);
      if ( endterms.length !== 0 ) {
        newCollection.distillationEnabled = true;
        newCollection['distillationTerms'] = endterms;
      }
      else {
        newCollection.distillationEnabled = false;
      }
    }

    if (f.value.regexDistillationEnabled) {
      let endterms = this.grokLines(f.value.regexDistillationTerms);
      if ( endterms.length !== 0 ) {
        newCollection.regexDistillationEnabled = true;
        newCollection['regexDistillationTerms'] = endterms;
      }
      else {
        newCollection.regexDistillationEnabled = false;
      }
    }

    if (f.value.sha1Enabled) {
      let endterms = this.grokHashingLines(f.value.sha1Hashes);
      if ( endterms.length !== 0 ) {
        newCollection.sha1Enabled = true;
        newCollection['sha1Hashes'] = endterms;
      }
      else {
        newCollection.sha1Enabled = false;
      }
    }

    if (f.value.sha256Enabled) {
      let endterms = this.grokHashingLines(f.value.sha256Hashes);
      if ( endterms.length !== 0 ) {
        newCollection.sha256Enabled = true;
        newCollection['sha256Hashes'] = endterms;
      }
      else {
        newCollection.sha256Enabled = false;
      }
    }

    if (f.value.md5Enabled) {
      let endterms = this.grokHashingLines(f.value.md5Hashes);
      if ( endterms.length !== 0 ) {
        newCollection.md5Enabled = true;
        newCollection['md5Hashes'] = endterms;
      }
      else {
        newCollection.md5Enabled = false;
      }
    }

    log.debug('AddCollectionModalComponent: addCollectionSubmit(): newCollection:', newCollection);
    this.dataService.addCollection(newCollection)
                    .then( () => {
                                    this.executeCollection.emit(newCollection);
                                    this.closeModal();
                                  });
  }

  addNwServerSubmit(f: NgForm): void {
    // log.debug("AddCollectionModalComponent: addNwServer(): f:", f);
    this.hideServiceAddBox();
    let newServer = {
      host: f.value.hostname,
      port: f.value.restPort,
      ssl: f.value.ssl,
      user: f.value.user,
      password: f.value.password,
      deviceNumber: f.value.deviceNumber,
      friendlyName: f.value.user + '@' + f.value.hostname + ':' + f.value.restPort + ' (' + f.value.deviceNumber + ')'
    };
    if (newServer.ssl) {
      // newServer.friendlyName = newServer.friendlyName + ':ssl';
      newServer.friendlyName = f.value.user + '@' + f.value.hostname + ':' + f.value.restPort + ':ssl' + ' (' + f.value.deviceNumber + ')';
    }
    log.debug('AddCollectionModalComponent: addNwServer() newServer:', newServer);
    this.dataService.addNwServer(newServer).then( () => this.getNwServers() );
  }

  onOpen(): void {
    log.debug('AddCollectionModalComponent: onOpen()');
    this.dataService.getPreferences();
    this.nameBoxRef.first.nativeElement.focus();
  }

  timeValue(): void {
    log.debug('time1:', this.collectionFormModel.timeBegin.getTime() / 1000);
    log.debug('time2:', this.collectionFormModel.timeEnd.getTime() / 1000);
  }

}
