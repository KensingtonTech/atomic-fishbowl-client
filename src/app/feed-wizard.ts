import { Component, OnInit, OnDestroy, AfterViewInit, Input, ChangeDetectorRef } from '@angular/core';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
import { ModalService } from './modal/modal.service';
import { Subscription } from 'rxjs/Subscription';
import { Feed, FeedSchedule } from './feed';
import { UUID } from 'angular2-uuid';
import { SelectItem } from 'primeng/components/common/selectitem';
import * as utils from './utils';
import * as log from 'loglevel';
declare var JSEncrypt: any;

interface ColumnId {
  'id': string;
  'name': string;
}

@Component({
  selector: 'feed-wizard-modal',
  templateUrl: './feed-wizard.html',
  styles: [`
    .modal-body {
      position: absolute;
      width: 1200px;
      height: 500px;
      top: 50%;
      left: 50%;
      margin: -250px 0 0 -600px;
      overflow: hidden;
      background-color: rgba(255,255,255,1);
    }

    .table {
      display: table;
      border-collapse: separate;
      border-spacing: 15px;
      width: 100%;
    }

    .csv-table {
      border-spacing: 0;
    }

    .header {
      display: table-header-group;
    }

    .header-cell {
      display: table-cell;
      font-weight: bold;
      font-size: 14pt;
    }

    .row {
      display: table-row;
    }

    .left-column {
      white-space: nowrap;
      font-weight: bold;
    }

    .right-column {
      width: 100%;
    }

    .cell {
      display: table-cell;
      padding: 2px;
      /*border-bottom: 1px solid black;*/
    }

    .csv-cell {
      border: 1px solid black;
    }

    .row-group {
      display: table-row-group;
      border: 1px solid black;
    }

    .row-group > .row:nth-child(even) {background: #CCC;}
    .row-group > .row:nth-child(odd) {background: #FFF;}

    .grabbable {
      cursor: move; /* fallback if grab cursor is unsupported */
      cursor: grab;
      cursor: -moz-grab;
      cursor: -webkit-grab;
    }

    /* (Optional) Apply a "closed-hand" cursor during drag operation. */
    .grabbable:active {
      cursor: grabbing;
      cursor: -moz-grabbing;
      cursor: -webkit-grabbing;
    }

    .center {
      text-align: center;
    }

    .bold {
      font-weight: bold;
    }

    .ui-float-label {
      display: inline-block;
    }

    .csv-header {
      background: red !important;
      color: white;
    }
  `]
})

export class FeedWizardComponent implements OnInit, OnDestroy, AfterViewInit {

  constructor(private dataService: DataService,
              private toolService: ToolService,
              private modalService: ModalService,
              private changeDetectionRef: ChangeDetectorRef ) {}

  @Input() public id: string;

  public editing = false; // true = editing, false = adding
  public feed: Feed; // the feed we're working on
  public page = 1;
  public utils = utils;
  private encryptor: any = new JSEncrypt();
  private pubKey: string;

  public name = '';

  public feedTypeOptions: SelectItem[] = [
    { label: 'Manual', value: 'manual' },
    { label: 'Scheduled', value: 'scheduled' }
  ];
  public type = 'manual'; // manual or scheduled

  public selectedSchedule = 'hours'; // 'hours', 'minutes', or 'day'
  public selectedScheduleHours = 1;
  public selectedScheduleMinutes = 30;
  public selectedScheduleDays = 1;
  public url = '';
  public lastUrl = '';
  public rawCSV = '';
  public reOpenTabsModal = false;
  public delimiter = ',';
  public lines = [];
  public hasHeader = true;
  public columns = 1;
  public columnNumArr = [];
  public columnDropPort = {};
  private file: File;
  public filename = '';
  public label = 'Browse';
  public error = '';
  public testError = '';
  public urlAuthentication = 'disabled';
  public urlUser = '';
  public urlPassword = '';
  public urlVerified = false;
  public urlTested = false;
  public csvLoaded = false;
  private editingId: string;
  private fileChanged = false;
  private internalFilename = ''; // used only when editing
  public authChanged = false; // used only when editing scheduled collections
  public urlChanged = false;
  public urlVerifyClicked = false;

  public nameValid = false;
  private feedNames: any;

  private initialColumnIDs: ColumnId[] = [
    { id: 'value', name: 'Hash Value'},
    { id: 'type', name: 'Hash Type'},
    { id: 'friendly', name: 'Friendly Name'}
  ];

  public availableColumnIDs: ColumnId[] = [
    { id: 'value', name: 'Hash Value'},
    { id: 'type', name: 'Hash Type'},
    { id: 'friendly', name: 'Friendly Name'}
  ];
  draggingColumnID: ColumnId = null;

  public enabledOptions: SelectItem[] = [
    { label: 'Disabled', value: 'disabled' },
    { label: 'Enabled', value: 'enabled' }
  ];

  public intervalOptions: SelectItem[] = [
    { label: 'Hours', value: 'hours' },
    { label: 'Minutes', value: 'minutes' },
    { label: 'Days', value: 'day' }
  ];

  // subscriptions
  private addFeedNextSubscription: Subscription;
  private editFeedNextSubscription: Subscription;
  private reOpenTabsModalSubscription: Subscription;
  private feedsChangedSubscription: Subscription;
  private publicKeyChangedSubscription: Subscription;


  ngOnInit(): void {
    log.debug('FeedWizardComponent: ngOnInit()');

    this.addFeedNextSubscription = this.toolService.addFeedNext.subscribe( () => this.editing = false );

    this.editFeedNextSubscription = this.toolService.editFeedNext.subscribe( (feed) => {
      this.editing = true;
      this.feed = feed;
     } );

    this.reOpenTabsModalSubscription = this.toolService.reOpenTabsModal.subscribe( TorF => this.reOpenTabsModal = TorF );

    this.publicKeyChangedSubscription = this.dataService.publicKeyChanged.subscribe( key => this.onPublicKeyChanged(key) );

    this.feedsChangedSubscription = this.dataService.feedsChanged.subscribe( (feeds: any) => {
      let temp = {};
      for (let c in feeds) {
        if (feeds.hasOwnProperty(c)) {
          let feed = feeds[c];
          temp[feed.name] = null;
        }
      }
      this.feedNames = temp;
    } );

  }



  ngAfterViewInit(): void {
    log.debug('FeedWizardComponent: ngAfterViewInit()');
    // setTimeout( () => this.type = 'manual', 250);
    this.changeDetectionRef.detectChanges();
  }



  ngOnDestroy(): void {
    this.addFeedNextSubscription.unsubscribe();
    this.editFeedNextSubscription.unsubscribe();
    this.reOpenTabsModalSubscription.unsubscribe();
    this.feedsChangedSubscription.unsubscribe();
    this.publicKeyChangedSubscription.unsubscribe();
  }



  onPublicKeyChanged(key: string) {
    if (!key) {
      return;
    }
    this.encryptor.log = true;
    this.pubKey = key;
    this.encryptor.setPublicKey(this.pubKey);
  }



  public onNameChanged(name): void {
    // log.debug('NwCollectionModalComponent: onNameChanged()');

    if (!(name in this.feedNames) || this.editing)  {
      this.nameValid = true;
    }
    else {
      this.nameValid = false;
    }
  }



  public onOpen(): void {
    log.debug('FeedWizardComponent: onOpen()');
    this.page = 1;
    this.error = '';
    this.testError = '';
    this.rawCSV = '';
    this.fileChanged = false;
    this.authChanged = false;
    this.urlChanged = false;
    this.urlVerifyClicked = false;
    this.urlUser = '';
    this.urlPassword = '';

    if (!this.editing) {
      // we're adding a new feed
      this.name = '';
      this.type = 'manual';

      this.delimiter = ',';
      this.hasHeader = true;

      this.lines = [];
      this.columns = 1;
      this.columnNumArr = [];
      this.columnDropPort = {};
      this.file = null;
      this.filename = '';
      this.label = 'Browse';

      this.url = '';
      this.urlAuthentication = 'disabled';
      this.urlVerified = false;
      this.urlTested = false;
      this.draggingColumnID = null;
      this.availableColumnIDs = JSON.parse(JSON.stringify(this.initialColumnIDs));
      this.csvLoaded = false;
    }
    else {
      // we're editing an existing feed
      this.name = this.feed.name;
      this.onNameChanged(this.feed.name);
      this.type = this.feed.type;
      this.delimiter = this.feed.delimiter;
      this.editingId = this.feed.id;
      this.internalFilename = this.feed.internalFilename;

      if (this.type === 'manual') {
        this.filename = this.feed.filename;
      }

      this.lines = [];
      this.columns = 1;
      this.columnNumArr = [];
      this.columnDropPort = {};

      // now do column id's
      this.availableColumnIDs = JSON.parse(JSON.stringify(this.initialColumnIDs));
      this.columnDropPort[this.feed.valueColumn] = { 'enabled': true, 'columnId': this.availableColumnIDs.shift() };
      this.columnDropPort[this.feed.typeColumn] = { 'enabled': true, 'columnId': this.availableColumnIDs.shift() };
      if ('friendlyNameColumn' in this.feed) {
        this.columnDropPort[this.feed.friendlyNameColumn] = { 'enabled': true, 'columnId': this.availableColumnIDs.shift() };
      }
      log.debug('FeedWizardComponent: onOpen(): columnDropPort:', this.columnDropPort);
      log.debug('FeedWizardComponent: onOpen(): availableColumnIDs:', this.availableColumnIDs);


      if (this.type === 'scheduled') {
        this.url = this.feed.url;
        this.urlVerified = true;
        this.urlTested = true;
        this.selectedSchedule = this.feed.schedule.type;
        if (this.feed.schedule.type === 'hours') {
          this.selectedScheduleHours = this.feed.schedule.value;
        }
        if (this.feed.schedule.type === 'minutes') {
          this.selectedScheduleMinutes = this.feed.schedule.value;
        }
        if (this.feed.schedule.type === 'day') {
          this.selectedScheduleDays = this.feed.schedule.value;
        }

        if (this.feed.authentication) {
          this.urlAuthentication = 'enabled';
          this.urlUser = this.feed.username;
        }
        else {
          this.urlAuthentication = 'disabled';
        }
      }
      // log.debug('FeedWizardComponent: onOpen(): type:', this.type);
      this.dataService.getFeedFilehead(this.feed.id)
          .then( res => {
            log.debug('FeedWizardComponent: onOpen(): got res:', res);
            if (!('success' in res) || ('success' in res && !res.success) || !('rawCSV' in res) ) {
              // this shouldn't ever happen but we want to know about it if it does
              log.error('Failure pulling content from feed with id', this.feed.id);
              return;
            }
            this.rawCSV = res.rawCSV;
            this.parseCSV(this.rawCSV);
          })
          .catch( (err) => {
            log.error('FeedWizardComponent: onOpen(): caught error getting filehead:', err);
          });
    }
  }



  public onCancel(): void {
    this.modalService.close(this.id);
    // add a bit to re-open feeds modal
    if ( this.reOpenTabsModal ) {
      this.modalService.open('tab-container-modal');
    }
    this.reOpenTabsModal = false; // re-sets the value to default
  }



  public pageOneToPageTwoSubmit(form) {
    this.page = 2;
  }



  public pageTwoToPageThreeSubmit(form) {
    this.page = 3;
  }



  public pageTwoToPageOneSubmit() {
    this.page = 1;
  }



  public pageThreeToPageTwoSubmit() {
    this.page = 2;
  }



  public validateUrlInput(): boolean {
    // ^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$
    // /^(?:http(s)?:\/\/)[\w.-]+$/
    let re = /^(?:http(s)?:\/\/)[\w.-]+/;
    return re.test(this.url);
  }



  public onUrlChange(): void {
    // log.debug('FeedWizardComponent: onUrlChange()');
    if (this.url !== this.lastUrl) {
      this.lastUrl = this.url;
      this.urlVerified = false;
      this.urlTested = false;
      this.urlChanged = true;
    }
  }



  public verifyUrl(): void {
    // verify the URL here
    this.urlVerifyClicked = true;
    let host = { url: this.url, authentication: false };
    if (this.urlAuthentication === 'enabled' && this.editing && !this.authChanged) {
      host['useCollectionCredentials'] = this.editingId;
    }
    else if (this.urlAuthentication === 'enabled') {
      host.authentication = true;
      host['username'] = this.urlUser;
      host['password'] = this.encryptor.encrypt(this.urlPassword);
    }

    this.availableColumnIDs = JSON.parse(JSON.stringify(this.initialColumnIDs));
    this.columnDropPort = {};
    this.columnNumArr = [];

    this.dataService.testFeedUrl(host)
        .then( (res: any) => {
          log.debug('FeedWizardComponent: verifyUrl(): res:', res);
          this.urlTested = true;
          if (res.success) {
            this.urlVerified = true;
            this.testError = '';
            this.rawCSV = res.rawCSV;
            this.parseCSV(this.rawCSV);
          }
          else {
            this.urlVerified = false;
            if ('error' in res && 'statusCode' in res) {
              this.testError = `${res.statusCode}: ${res.error}`;
            }
            else if ('error' in res) {
              this.testError = res.error;
            }
          }
        })
        .catch( (res) => {
          log.debug('FeedWizardComponent: verifyUrl(): error:', res);
          this.urlVerified = false;
          this.urlTested = true;
          this.testError = '';
          if ('error' in res) {
            this.testError = res.error;
          }
        });

  }



  public onAuthChanged(): void {
    log.debug('FeedWizardComponent: onAuthChanged()');
    this.authChanged = true;
    this.urlVerified = false;
    this.urlTested = false;
  }



  public uploadHandlerOld(event): void {
    log.debug('FeedWizardComponent: uploadHandler(): event:', event);
    let file = event['files'][0];
    let slice = file.slice(0, 1024, 'UTF-8'); // get a new blob from the first 1024 bytes of the supplied CSV
    let reader = new FileReader();
    let loadHandler = (res) => {
      log.debug('FeedWizardComponent: uploadHandler(): res:', res);
      log.debug('FeedWizardComponent: uploadHandler(): res.target:', res.target);
      log.debug('FeedWizardComponent: uploadHandler(): res.target.result:', res.target.result);
      reader.removeEventListener('onload', loadHandler);
      this.rawCSV = res.target.result;
      if (this.rawCSV) {
        this.parseCSV(this.rawCSV);
      }
    };
    reader.onload = loadHandler;
    reader.readAsText(slice, 'UTF-8');
  }



  public uploadHandler(event): void {
    log.debug('FeedWizardComponent: uploadHandler(): event:', event);
    this.fileChanged = true;
    this.availableColumnIDs = JSON.parse(JSON.stringify(this.initialColumnIDs));
    this.columnDropPort = {};
    this.columnNumArr = [];

    this.rawCSV = '';
    let file: File = event['files'][0];
    this.file = file;
    this.filename = file.name;
    this.label = file.name;
    let fileSize = file.size;
    let chunkSize = 1024; // the number of bytes to read in every slice
    let lowByte = 0;
    let highByte = chunkSize;
    if (fileSize < chunkSize) {
      highByte = fileSize;
    }
    let bytesRead = 0;

    // we want to get precisely 6 lines of text - 1 for a header, and 5 for csv data
    let readFunc = () => {
      let slice = file.slice(lowByte, highByte, 'UTF-8'); // get a new blob
      let reader = new FileReader();
      let loadHandler = (res) => {
        log.debug('FeedWizardComponent: uploadHandler(): res:', res.target.result);
        bytesRead = highByte;
        reader.removeEventListener('onload', loadHandler);
        this.rawCSV += res.target.result;

        let count = -1; // the number of newline chars we've found this time
        for (let index = -2; index !== -1; count++, index = this.rawCSV.indexOf('\n', index + 1) ) {} // count newlines

        if ( (count) < 6 && bytesRead < fileSize) {
          // we've found fewer than 6 newlines and we've not reached the end of file, boo
          if (bytesRead + chunkSize <= fileSize ) {
            lowByte = highByte + 1;
            highByte += chunkSize;
          }
          else {
            lowByte = highByte + 1;
            highByte = fileSize;
          }
          readFunc();
        }
        else {
          // we found 6 newlines, yay
          let lines = this.rawCSV.split('\n');
          while (lines.length > 6) {
            lines.pop();
          }
          this.rawCSV = lines.join('\n');
          this.parseCSV(this.rawCSV);
          return;
        }

      };
      reader.onload = loadHandler;
      reader.readAsText(slice, 'UTF-8');
    };

    readFunc();

  }



  private parseCSV(csvText: string): void {
    let sepLines = csvText.split('\n');
    let splitLines = [];
    if (!this.editing) {
      this.columnDropPort = {};
    }
    log.debug('FeedWizardComponent: parseCSV: sepLines:', sepLines);
    let maxColumns = 1;
    for (let i = 0; i < sepLines.length; i++) {
      let line = sepLines[i];
      let splitLine = line.split(this.delimiter, 7);

      let columns = splitLine.length;
      if (columns > maxColumns) {
        maxColumns = columns;
      }
      splitLines.push(splitLine);
    }
    log.debug('FeedWizardComponent: parseCSV: splitLines:', splitLines);

    this.lines = splitLines;
    this.columns = maxColumns;
    this.columnNumArr = [];
    for (let i = 0; i < this.columns; i++) {
      this.columnNumArr.push(i + 1);
      if (!this.editing || this.fileChanged || (this.editing && this.urlChanged) || (this.editing && this.urlVerified && this.urlVerifyClicked && !this.urlChanged)) {
        this.columnDropPort[i] = { enabled: false };
      }
    }

  }



  public delimiterChanged(): void {
    log.debug('FeedWizardComponent: delimiterChanged()');
    if (this.delimiter) {
      this.parseCSV(this.rawCSV);
      this.availableColumnIDs = JSON.parse(JSON.stringify(this.initialColumnIDs));
    }
    else {
      this.lines = [];
      this.columnDropPort = {};
      this.availableColumnIDs = [];
    }
  }



  public onDragStart(event, columnId: ColumnId): void {
    log.debug('FeedWizardComponent: onDragStart(): event:', event);
    log.debug('FeedWizardComponent: onDragStart(): columnId:', columnId);
    this.draggingColumnID = columnId;
  }



  public onDragEnd(event, columnId: ColumnId): void {
    log.debug('FeedWizardComponent: onDragEnd(): event:', event);
    log.debug('FeedWizardComponent: onDragEnd(): columnId:', columnId);
    this.draggingColumnID = null;
  }



  public onDrop(event, index): void {
    log.debug('FeedWizardComponent: onDrop(): event:', event);
    log.debug('FeedWizardComponent: onDrop(): index:', index);
    log.debug('FeedWizardComponent: onDrop(): draggingColumnID:', this.draggingColumnID);
    log.debug('FeedWizardComponent: onDrop(): columnDropPort:', this.columnDropPort);

    // add logic here to send existing identifier back to dock if one is already selected
    if (index in this.columnDropPort && this.columnDropPort[index].enabled) {
      this.availableColumnIDs.push(this.columnDropPort[index].columnId);
    }

    this.columnDropPort[index]['columnId'] = this.draggingColumnID;
    this.columnDropPort[index]['enabled'] = true;
    for (let i = 0; i < this.availableColumnIDs.length; i++) {
      let columnId = this.availableColumnIDs[i];
      if (columnId.name === this.draggingColumnID.name) {
        this.availableColumnIDs.splice(i, 1);
        break;
      }
    }
  }



  public onDeselectColumnId(index): void {
    log.debug('FeedWizardComponent: onDeselectColumnId(): index:', index);
    this.columnDropPort[index].enabled = false;
    this.availableColumnIDs.push(this.columnDropPort[index].columnId);
  }



  public feedDetailsFormValid(): boolean {
    let hashValue = true;
    let hashType = true;
    // let friendlyName = true;
    for (let i = 0; i < this.availableColumnIDs.length; i++) {
      let columnId = this.availableColumnIDs[i];
      // log.debug('FeedWizardComponent: feedDetailsFormValid(): columnId: ', columnId);
      if (columnId.id === 'value') {
        hashValue = false;
      }
      if (columnId.id === 'type') {
        hashType = false;
      }
      /*if (columnId.id === 'friendly') {
        friendlyName = false;
      }*/
    }
    // log.debug('FeedWizardComponent: feedDetailsFormValid(): hashValue, hashType, friendlyName: ', hashValue, hashType, friendlyName);
    if ( hashValue && hashType ) {
      return true;
    }
    return false;
  }



  public getColumnNumber(type): number {
    for (let key in this.columnDropPort) {
      if (this.columnDropPort.hasOwnProperty(key)) {
        let column = this.columnDropPort[key];
        // log.debug('FeedWizardComponent: getColumnNumber(): column:', column);
        if ('columnId' in column && column.columnId.id === type) {
          // log.debug('FeedWizardComponent: getColumnNumber(): key', parseInt(key, 10));
          return (parseInt(key, 10));
        }
      }
    }
    return null;
  }



  public finalSubmit(): void {
    log.debug('FeedWizardComponent: finalSubmit()');

    if (this.type === 'manual' && !this.editing) {
      // adding a new manual feed
      let feed: Feed = {
        id: UUID.UUID(),
        name: this.name,
        type: this.type,
        delimiter: this.delimiter,
        headerRow: this.hasHeader,
        valueColumn: this.getColumnNumber('value'),
        typeColumn: this.getColumnNumber('type'),
        friendlyNameColumn: this.getColumnNumber('friendly'),
        filename: this.filename || null
      };
      this.dataService.addFeedManual(feed, this.file)
          .then( () => {
            this.onCancel();
          })
          .catch( (err) => {
            log.error('FeedWizardComponent: finalSubmit(): server returned error:', err);
            this.error = err.error;
          });
    }

      if (this.type === 'manual' && this.editing) {
        // adding a new manual feed
        let feed: Feed = {
          id: this.editingId,
          name: this.name,
          type: this.type,
          delimiter: this.delimiter,
          headerRow: this.hasHeader,
          valueColumn: this.getColumnNumber('value'),
          typeColumn: this.getColumnNumber('type'),
          friendlyNameColumn: this.getColumnNumber('friendly'),
          filename: this.filename || null
        };
        if (this.fileChanged) {
          // we uploaded a new file after editing
          this.dataService.editFeedWithFile(feed, this.file)
              .then( () => {
                this.onCancel();
              })
              .catch( (err) => {
                log.error('FeedWizardComponent: finalSubmit(): server returned error:', err);
                this.error = err.error;
              });
        }
        else {
          // we didn't upload a new file
          this.dataService.editFeedWithoutFile(feed)
          .then( () => {
            this.onCancel();
          })
          .catch( (err) => {
            log.error('FeedWizardComponent: finalSubmit(): server returned error:', err);
            this.error = err.error;
          });
        }

      }

    else if (this.type === 'scheduled' && !this.editing) {
      // adding a new scheduled feed
      let feed: Feed = {
        id: UUID.UUID(),
        name: this.name,
        type: this.type,
        delimiter: this.delimiter,
        headerRow: this.hasHeader,
        valueColumn: this.getColumnNumber('value'),
        typeColumn: this.getColumnNumber('type'),
        friendlyNameColumn: this.getColumnNumber('friendly'),
        version: 1,
        url: this.url,
        authentication: false,
        schedule: { type: this.selectedSchedule, value: null }
      };

      if (this.urlAuthentication === 'enabled') {
        feed.authentication = true;
        feed.username = this.urlUser;
        feed.password = this.encryptor.encrypt(this.urlPassword);
      }

      if (this.selectedSchedule === 'hours') {
        feed.schedule.value = this.selectedScheduleHours;
      }
      else if (this.selectedSchedule === 'minutes') {
        feed.schedule.value = this.selectedScheduleMinutes;
      }
      else if (this.selectedSchedule === 'day') {
        feed.schedule.value = this.selectedScheduleDays;
      }

      this.dataService.addFeedScheduled(feed)
      .then( () => {
        this.onCancel();
      })
      .catch( (err) => {
        log.error('FeedWizardComponent: finalSubmit(): server returned error:', err);
        this.error = err.error;
      });
    }

    else if (this.type === 'scheduled' && this.editing) {
      // adding a new scheduled feed
      let feed: Feed = {
        id: this.editingId,
        name: this.name,
        type: this.type,
        delimiter: this.delimiter,
        headerRow: this.hasHeader,
        valueColumn: this.getColumnNumber('value'),
        typeColumn: this.getColumnNumber('type'),
        friendlyNameColumn: this.getColumnNumber('friendly'),
        url: this.url,
        authentication: false,
        schedule: { type: this.selectedSchedule, value: null }
      };

      if (this.urlAuthentication === 'enabled' && this.authChanged) {
        feed.authentication = true;
        feed.username = this.urlUser;
        feed.password = this.encryptor.encrypt(this.urlPassword);
        feed.authChanged = true;
      }
      else if (this.urlAuthentication === 'enabled' && !this.authChanged) {
        feed.authentication = true;
        feed.authChanged = false;
      }

      if (this.selectedSchedule === 'hours') {
        feed.schedule.value = this.selectedScheduleHours;
      }
      else if (this.selectedSchedule === 'minutes') {
        feed.schedule.value = this.selectedScheduleMinutes;
      }
      else if (this.selectedSchedule === 'day') {
        feed.schedule.value = this.selectedScheduleDays;
      }

      this.dataService.editFeedWithoutFile(feed)
      .then( () => {
        this.onCancel();
      })
      .catch( (err) => {
        log.error('FeedWizardComponent: finalSubmit(): server returned error:', err);
        this.error = err.error;
      });
    }

  }

}
