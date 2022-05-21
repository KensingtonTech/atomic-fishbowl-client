import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectorRef,
  Output,
  EventEmitter
} from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { Subscription } from 'rxjs';
import {
  Feed,
  FeedScheduleInterval,
  FeedTestParams,
  FeedType,
  ManualFeed,
  ScheduledFeed
} from 'types/feed';
import { v4 as UUIDv4 } from 'uuid';
import { SelectItem } from 'primeng/api/selectitem';
import * as utils from '../utils';
import * as log from 'loglevel';
import { FileUpload } from 'primeng/fileupload';

interface ColumnId {
  id: string;
  name: string;
}

interface ColumnDropPort {
  enabled: boolean;
  columnId: ColumnId;
}

@Component({
  selector: 'app-feed-wizard-modal',
  templateUrl: './feed-wizard.component.html',
  styleUrls: [
    './feed-wizard.component.scss'
  ]
})


export class FeedWizardComponent implements OnInit, OnDestroy, AfterViewInit {

  constructor(
    private dataService: DataService,
    private toolService: ToolService,
    private changeDetectionRef: ChangeDetectorRef
  ) {}

  @Output() closeTabContainerModal = new EventEmitter<void>();

  editing = false; // true = editing, false = adding
  feed: Feed; // the feed we're working on
  page = 1;
  utils = utils;

  name = '';

  feedTypeOptions: SelectItem[] = [
    { label: 'Manual', value: 'manual' },
    { label: 'Scheduled', value: 'scheduled' }
  ];
  feedType: FeedType = 'manual'; // manual or scheduled

  selectedScheduleInterval: FeedScheduleInterval = 'hours'; // 'hours', 'minutes', or 'day'
  selectedScheduleHours = 1;
  selectedScheduleMinutes = 30;
  selectedScheduleDays = 1;
  url = '';
  lastUrl = '';
  rawCSV = '';
  reOpenTabsModal = false;
  delimiter = ',';
  lines: string[][] = [];
  hasHeader = true;
  columns = 1;
  columnNumArr: number[] = [];
  columnDropPorts: Record<number, ColumnDropPort> = {};
  private file?: File;
  filename = '';
  label = 'Browse';
  error = '';
  testError = '';
  urlAuthentication = 'disabled';
  urlUser = '';
  urlPassword = '';
  urlVerified = false;
  urlTested = false;
  csvLoaded = false;
  private editingId: string;
  private fileChanged = false;
  authChanged = false; // used only when editing scheduled collections
  urlChanged = false;
  urlVerifyClicked = false;

  nameValid = false;
  private feedNames: string[];

  private initialColumnIDs: ColumnId[] = [
    { id: 'value', name: 'Hash Value' },
    { id: 'type', name: 'Hash Type' },
    { id: 'friendly', name: 'Friendly Name' }
  ];

  availableColumnIDs: ColumnId[] = [
    { id: 'value', name: 'Hash Value' },
    { id: 'type', name: 'Hash Type' },
    { id: 'friendly', name: 'Friendly Name' }
  ];
  draggingColumnID?: ColumnId;

  enabledOptions: SelectItem[] = [
    { label: 'Disabled', value: 'disabled' },
    { label: 'Enabled', value: 'enabled' }
  ];

  intervalOptions: SelectItem[] = [
    { label: 'Hours', value: 'hours' },
    { label: 'Minutes', value: 'minutes' },
    { label: 'Days', value: 'day' }
  ];

  // subscriptions
  private subscriptions = new Subscription();


  ngOnInit(): void {
    log.debug('FeedWizardComponent: ngOnInit()');

    this.subscriptions.add(
      this.toolService.addFeedNext.subscribe(
        () => this.editing = false
      )
    );

    this.subscriptions.add(
      this.toolService.editFeedNext.subscribe(
        (feed) => {
          this.editing = true;
          this.feed = feed;
        }
      )
    );

    this.subscriptions.add(
      this.toolService.reOpenTabsModal.subscribe(
        TorF => this.reOpenTabsModal = TorF
      )
    );

    this.subscriptions.add(
      this.dataService.feedsChanged.subscribe(
        (feeds) => this.feedNames = Object.values(feeds)
          .map( (feed) => feed.name)
      )
    );
  }



  ngAfterViewInit(): void {
    log.debug('FeedWizardComponent: ngAfterViewInit()');
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }



  onNameChanged(name: string): void {
    // log.debug('NwCollectionModalComponent: onNameChanged()');
    if (!(name in this.feedNames) || this.editing)  {
      this.nameValid = true;
    }
    else {
      this.nameValid = false;
    }
    this.changeDetectionRef.markForCheck();
  }



  async onOpen(): Promise<void> {
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
      this.feedType = 'manual';

      this.delimiter = ',';
      this.hasHeader = true;

      this.lines = [];
      this.columns = 1;
      this.columnNumArr = [];
      this.columnDropPorts = {};
      this.file = undefined;
      this.filename = '';
      this.label = 'Browse';

      this.url = '';
      this.urlAuthentication = 'disabled';
      this.urlVerified = false;
      this.urlTested = false;
      this.draggingColumnID = undefined;
      this.availableColumnIDs = utils.deepCopy(this.initialColumnIDs);
      this.csvLoaded = false;
    }
    else {
      // we're editing an existing feed
      this.name = this.feed.name;
      this.onNameChanged(this.feed.name);
      this.feedType = this.feed.type;
      this.delimiter = this.feed.delimiter;
      this.editingId = this.feed.id;

      if (this.feedType === 'manual' && this.feed.type === 'manual' && this.feed.filename) {
        this.filename = this.feed.filename;
      }

      this.lines = [];
      this.columns = 1;
      this.columnNumArr = [];
      this.columnDropPorts = {};

      // now do column id's
      this.availableColumnIDs = utils.deepCopy(this.initialColumnIDs);
      this.columnDropPorts[this.feed.valueColumn] = {
        enabled: true,
        columnId: this.availableColumnIDs.shift() as ColumnId
      };
      this.columnDropPorts[this.feed.typeColumn] = {
        enabled: true,
        columnId: this.availableColumnIDs.shift() as ColumnId
      };
      if ('friendlyNameColumn' in this.feed) {
        this.columnDropPorts[this.feed.friendlyNameColumn] = {
          enabled: true,
          columnId: this.availableColumnIDs.shift() as ColumnId
        };
      }
      log.debug('FeedWizardComponent: onOpen(): columnDropPort:', this.columnDropPorts);
      log.debug('FeedWizardComponent: onOpen(): availableColumnIDs:', this.availableColumnIDs);


      if (this.feedType === 'scheduled' && this.feed.type === 'scheduled') {
        this.url = this.feed.url;
        this.urlVerified = true;
        this.urlTested = true;
        this.selectedScheduleInterval = this.feed.schedule.interval;
        if (this.feed.schedule.interval === 'hours') {
          this.selectedScheduleHours = this.feed.schedule.value;
        }
        if (this.feed.schedule.interval === 'minutes') {
          this.selectedScheduleMinutes = this.feed.schedule.value;
        }
        if (this.feed.schedule.interval === 'day') {
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
      try {
        const res = await this.dataService.getFeedFilehead(this.feed.id);
        log.debug('FeedWizardComponent: onOpen(): got res:', res);
        if (!('success' in res) || ('success' in res && !res.success) || !('rawCSV' in res) ) {
          // this shouldn't ever happen but we want to know about it if it does
          log.error('Failure pulling content from feed with id', this.feed.id);
          return;
        }
        this.rawCSV = res.rawCSV;
        this.parseCSV(this.rawCSV);
        this.changeDetectionRef.markForCheck();
      }
      catch (err: any) {
        log.error('FeedWizardComponent: onOpen(): caught error getting filehead:', err);
        this.changeDetectionRef.markForCheck();
      }
    }
  }



  close() {
    this.toolService.displayFeedWizardModal.next(false);
  }



  onClosed(): void {
    // add a bit to re-open feeds modal
    if ( this.reOpenTabsModal ) {
      this.closeTabContainerModal.next();
    }
    this.reOpenTabsModal = false; // re-sets the value to default
    this.changeDetectionRef.markForCheck();
  }



  pageOneToPageTwoSubmit() {
    this.page = 2;
    this.changeDetectionRef.markForCheck();
  }



  pageTwoToPageThreeSubmit() {
    this.page = 3;
    this.changeDetectionRef.markForCheck();
  }



  pageTwoToPageOneSubmit() {
    this.page = 1;
    this.changeDetectionRef.markForCheck();
  }



  pageThreeToPageTwoSubmit() {
    this.page = 2;
    this.changeDetectionRef.markForCheck();
  }



  validateUrlInput(): boolean {
    // ^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$
    // /^(?:http(s)?:\/\/)[\w.-]+$/
    const re = /^(?:http(s)?:\/\/)[\w.-]+/;
    return re.test(this.url);
  }



  onUrlChange(): void {
    // log.debug('FeedWizardComponent: onUrlChange()');
    if (this.url !== this.lastUrl) {
      this.lastUrl = this.url;
      this.urlVerified = false;
      this.urlTested = false;
      this.urlChanged = true;
      this.changeDetectionRef.markForCheck();
    }
  }



  async verifyUrl(): Promise<void> {
    // verify the URL here
    this.urlVerifyClicked = true;
    const host: FeedTestParams = {
      url: this.url,
      authentication: false
    };
    if (this.urlAuthentication === 'enabled' && this.editing && !this.authChanged) {
      host.useCollectionCredentials = this.editingId;
    }
    else if (this.urlAuthentication === 'enabled') {
      host.authentication = true;
      host.username = this.urlUser;
      host.password = this.dataService.encrypt(this.urlPassword);
    }

    this.availableColumnIDs = utils.deepCopy(this.initialColumnIDs);
    this.columnDropPorts = {};
    this.columnNumArr = [];
    this.changeDetectionRef.markForCheck();

    try {
      const res = await this.dataService.testFeedUrl(host);
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
      this.changeDetectionRef.markForCheck();
    }
    catch (error: any) {
      log.debug('FeedWizardComponent: verifyUrl(): error:', error);
      this.urlVerified = false;
      this.urlTested = true;
      this.testError = '';
      if ('error' in error) {
        this.testError = error.error;
      }
      this.changeDetectionRef.markForCheck();
    }
  }



  onAuthChanged(): void {
    log.debug('FeedWizardComponent: onAuthChanged()');
    this.authChanged = true;
    this.urlVerified = false;
    this.urlTested = false;
    this.changeDetectionRef.markForCheck();
  }



  uploadHandler(event: {files: File[]}, fileUploadComponent: FileUpload): void {
    log.debug('FeedWizardComponent: uploadHandler(): event:', event);
    this.fileChanged = true;
    this.availableColumnIDs = utils.deepCopy(this.initialColumnIDs);
    this.columnDropPorts = {};
    this.columnNumArr = [];

    this.rawCSV = '';
    const file: File = event.files[0];
    this.file = file;
    this.filename = file.name;
    this.label = file.name;
    const fileSize = file.size;
    const chunkSize = 1024; // the number of bytes to read in every slice
    let lowByte = 0;
    let highByte = chunkSize;
    if (fileSize < chunkSize) {
      highByte = fileSize;
    }
    let bytesRead = 0;

    // we want to get precisely 6 lines of text - 1 for a header, and 5 for csv data
    const readFunc = () => {
      const slice = file.slice(lowByte, highByte, 'UTF-8'); // get a new blob
      const reader = new FileReader();
      const loadHandler = () => {
        const result = reader.result;
        log.debug('FeedWizardComponent: uploadHandler()', {result});
        bytesRead = highByte;
        reader.removeEventListener('load', loadHandler);
        this.rawCSV += result as string;

        let count = -1; // the number of newline chars we've found this time
        for (let index = -2; index !== -1; count++, index = this.rawCSV.indexOf('\n', index + 1) ) {} // count newlines

        if ( count < 6 && bytesRead < fileSize) {
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
          const lines = this.rawCSV.split('\n');
          const maxLines = lines.length >= 6
            ? 6
            : lines.length;
          this.rawCSV = lines
            .slice(0, maxLines)
            .join('\n');
          this.parseCSV(this.rawCSV);
          return;
        }
      };
      reader.onload = loadHandler;
      reader.readAsText(slice, 'UTF-8');
    };

    readFunc();
    fileUploadComponent.clear();
    this.changeDetectionRef.markForCheck();

  }



  private parseCSV(csvText: string): void {
    const sepLines = csvText.split('\n');
    if (!this.editing) {
      this.columnDropPorts = {};
    }
    log.debug('FeedWizardComponent: parseCSV: sepLines:', sepLines);
    let maxColumns = 1;
    const splitLines = sepLines.map(
      (line) => {
        const splitLine = line.split(this.delimiter, 7);
        const columns = splitLine.length;
        if (columns > maxColumns) {
          maxColumns = columns;
        }
        return splitLine;
      }
    );
    log.debug('FeedWizardComponent: parseCSV: splitLines:', splitLines);

    this.lines = splitLines;
    this.columns = maxColumns;
    this.columnNumArr = [];
    for (let i = 0; i < this.columns; i++) {
      this.columnNumArr.push(i + 1);
      if (
        ! this.editing
        || this.fileChanged
        || (this.editing && this.urlChanged)
        || (this.editing && this.urlVerified && this.urlVerifyClicked && !this.urlChanged)
      ) {
        this.columnDropPorts[i] = {
          enabled: false,
          columnId: {
            id: '',
            name: ''
          }
        };
      }
    }
    this.changeDetectionRef.markForCheck();

  }



  delimiterChanged(): void {
    log.debug('FeedWizardComponent: delimiterChanged()');
    if (this.delimiter) {
      this.parseCSV(this.rawCSV);
      this.availableColumnIDs = utils.deepCopy(this.initialColumnIDs);
    }
    else {
      this.lines = [];
      this.columnDropPorts = {};
      this.availableColumnIDs = [];
    }
    this.changeDetectionRef.markForCheck();
  }



  onDragStart(columnId: ColumnId): void {
    // log.debug('FeedWizardComponent: onDragStart(): event:', event);
    log.debug('FeedWizardComponent: onDragStart(): columnId:', columnId);
    this.draggingColumnID = columnId;
    this.changeDetectionRef.markForCheck();
  }



  onDragEnd(columnId: ColumnId): void {
    // log.debug('FeedWizardComponent: onDragEnd(): event:', event);
    log.debug('FeedWizardComponent: onDragEnd(): columnId:', columnId);
    this.draggingColumnID = undefined;
    this.changeDetectionRef.markForCheck();
  }



  onDrop(index: number): void {
    log.debug('FeedWizardComponent: onDrop(): index:', index);
    log.debug('FeedWizardComponent: onDrop(): draggingColumnID:', this.draggingColumnID);
    log.debug('FeedWizardComponent: onDrop(): columnDropPort:', this.columnDropPorts);

    // add logic here to send existing identifier back to dock if one is already selected
    const columnDropPort = this.columnDropPorts[index];
    if (index in this.columnDropPorts && columnDropPort.enabled && columnDropPort.columnId) {
      this.availableColumnIDs.push(columnDropPort.columnId);
    }

    if (this.draggingColumnID) {
      columnDropPort.columnId = this.draggingColumnID;
    }
    columnDropPort.enabled = true;
    for (let i = 0; i < this.availableColumnIDs.length; i++) {
      const columnId = this.availableColumnIDs[i];
      if (columnId.name === this.draggingColumnID?.name) {
        this.availableColumnIDs.splice(i, 1);
        break;
      }
    }
    this.changeDetectionRef.markForCheck();
  }



  onDeselectColumnId(index: number): void {
    log.debug('FeedWizardComponent: onDeselectColumnId(): index:', index);
    this.columnDropPorts[index].enabled = false;
    this.availableColumnIDs.push(this.columnDropPorts[index].columnId);
    this.changeDetectionRef.markForCheck();
  }



  feedDetailsFormValid(): boolean {
    let hashValue = true;
    let hashType = true;
    for (const columnId of this.availableColumnIDs) {
      if (columnId.id === 'value') {
        hashValue = false;
      }
      if (columnId.id === 'type') {
        hashType = false;
      }
    }
    if ( hashValue && hashType ) {
      return true;
    }
    return false;
  }



  getColumnNumber(type: string): number {
    for (const key in this.columnDropPorts) {
      if (this.columnDropPorts.hasOwnProperty(key)) {
        const column = this.columnDropPorts[key];
        if ('columnId' in column && column.columnId.id === type) {
          return (parseInt(key, 10));
        }
      }
    }
    throw new Error(`Didn't find column number.  We shouldn't get here`);
  }



  async finalSubmit(): Promise<void> {
    log.debug('FeedWizardComponent: finalSubmit()');

    if (this.feedType === 'manual' && !this.editing) {
      // submitting a new manual feed
      await this.submitNewManualFeed();
    }

    else if (this.feedType === 'manual' && this.editing) {
      // submitting an edited manual feed
      await this.submitEditedManualFeed();
    }

    else if (this.feedType === 'scheduled' && !this.editing) {
      // submitting a new scheduled feed
      await this.submitNewScheduledFeed();
    }

    else if (this.feedType === 'scheduled' && this.editing) {
      // submitting an edited scheduled feed
      await this.submitEditedScheduledFeed();
    }
  }



  async submitNewManualFeed(): Promise<void> {
    // submitting a new manual feed
    if (!this.filename) {
      throw new Error(`'filename' was not defined`);
    }
    if (!this.file) {
      throw new Error(`'file' was not defined`);
    }
    const feed: Omit<ManualFeed, 'version' | 'internalFilename' | 'creator'> = {
      id: UUIDv4(),
      name: this.name,
      type: 'manual',
      delimiter: this.delimiter,
      headerRow: this.hasHeader,
      valueColumn: this.getColumnNumber('value'),
      typeColumn: this.getColumnNumber('type'),
      friendlyNameColumn: this.getColumnNumber('friendly'),
      filename: this.filename
    };
    try {
      await this.dataService.addFeedManual(feed, this.file);
      this.close();
    }
    catch (error: any) {
      log.error('FeedWizardComponent: finalSubmit(): server returned error:', error);
      this.error = error.error;
      this.changeDetectionRef.markForCheck();
    }
  }



  async submitEditedManualFeed(): Promise<void> {
    // submitting an edited manual feed
    if (!this.filename) {
      throw new Error(`'filename' was not defined`);
    }
    if (!this.file) {
      throw new Error(`'file' was not defined`);
    }
    const feed: Omit<ManualFeed, 'version' | 'internalFilename' | 'creator'> = {
      id: this.editingId,
      name: this.name,
      type: 'manual',
      delimiter: this.delimiter,
      headerRow: this.hasHeader,
      valueColumn: this.getColumnNumber('value'),
      typeColumn: this.getColumnNumber('type'),
      friendlyNameColumn: this.getColumnNumber('friendly'),
      filename: this.filename
    };
    try {
      if (this.fileChanged) {
        // we uploaded a new file after editing
        await this.dataService.editFeedWithFile(feed, this.file);
      }
      else {
        // we didn't upload a new file
        await this.dataService.editFeedWithoutFile(feed);
      }
      this.close();
    }
    catch (error: any) {
      log.error('FeedWizardComponent: finalSubmit(): server returned error:', error);
      this.error = error.error;
      this.changeDetectionRef.markForCheck();
    }
  }



  async submitNewScheduledFeed(): Promise<void> {
    // submitting a new scheduled feed
    let scheduleValue: number;
    if (this.selectedScheduleInterval === 'hours') {
      scheduleValue = this.selectedScheduleHours;
    }
    else if (this.selectedScheduleInterval === 'minutes') {
      scheduleValue = this.selectedScheduleMinutes;
    }
    else {
      scheduleValue = this.selectedScheduleDays;
    }

    const feed: Partial<ScheduledFeed> = {
      id: UUIDv4(),
      name: this.name,
      type: 'scheduled',
      delimiter: this.delimiter,
      headerRow: this.hasHeader,
      valueColumn: this.getColumnNumber('value'),
      typeColumn: this.getColumnNumber('type'),
      friendlyNameColumn: this.getColumnNumber('friendly'),
      version: 1,
      url: this.url,
      authentication: false,
      schedule: {
        interval: this.selectedScheduleInterval,
        value: scheduleValue
      }
    };

    if (this.urlAuthentication === 'enabled' && this.feed.type === 'scheduled') {
      feed.authentication = true;
      feed.username = this.urlUser;
      feed.password = this.dataService.encrypt(this.urlPassword);
    }

    try {
      await this.dataService.addFeedScheduled(feed as ScheduledFeed);
      this.close();
    }
    catch (err: any) {
      log.error('FeedWizardComponent: finalSubmit(): server returned error:', err);
      this.error = err.error;
      this.changeDetectionRef.markForCheck();
    }
  }



  async submitEditedScheduledFeed(): Promise<void> {
    // submitting an edited scheduled feed
    let scheduleValue: number;
    if (this.selectedScheduleInterval === 'hours') {
      scheduleValue = this.selectedScheduleHours;
    }
    else if (this.selectedScheduleInterval === 'minutes') {
      scheduleValue = this.selectedScheduleMinutes;
    }
    else {
      scheduleValue = this.selectedScheduleDays;
    }

    const feed: Partial<ScheduledFeed> = {
      id: this.editingId,
      name: this.name,
      type: 'scheduled',
      delimiter: this.delimiter,
      headerRow: this.hasHeader,
      valueColumn: this.getColumnNumber('value'),
      typeColumn: this.getColumnNumber('type'),
      friendlyNameColumn: this.getColumnNumber('friendly'),
      url: this.url,
      authentication: false,
      schedule: {
        interval: this.selectedScheduleInterval,
        value: scheduleValue
      }
    };

    if (this.urlAuthentication === 'enabled' && this.authChanged) {
      feed.authentication = true;
      feed.username = this.urlUser;
      feed.password = this.dataService.encrypt(this.urlPassword);
      feed.authChanged = true;
    }
    else if (this.urlAuthentication === 'enabled' && !this.authChanged) {
      feed.authentication = true;
      feed.authChanged = false;
    }

    try {
      await this.dataService.editFeedWithoutFile(feed as ScheduledFeed);
      this.close();
    }
    catch (err: any) {
      log.error('FeedWizardComponent: finalSubmit(): server returned error:', err);
      this.error = err.error;
      this.changeDetectionRef.markForCheck();
    }
  }
}
