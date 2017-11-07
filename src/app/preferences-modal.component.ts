import { Component, ChangeDetectionStrategy, ElementRef, ViewChild, Input, Output, EventEmitter, ChangeDetectorRef, OnInit } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
import { NgForm } from '@angular/forms';
import { defaultQueries } from './default-queries';
import { SelectItem } from 'primeng/primeng';
declare var log: any;

@Component({
  selector: 'preferences-modal',
  templateUrl: './preferences-modal.component.html',
  styles: [`

  table td {
    white-space: nowrap;
    width: 1px;
  }
  `]
})

export class PreferencesModalComponent implements OnInit {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private changeDetectionRef: ChangeDetectorRef ) {}

  @Input('enabled') enabled: boolean;
  @ViewChild('topDiv') topDiv: ElementRef;

  public id = 'preferences-modal';

  private defaultNwInvestigateUrl = '';
  private defaultDefaultNwquery = `vis.level exists || content = 'application/pdf'`;
  private defaultMinX = 1;
  private defaultMinY = 1;
  private defaultDisplayedKeys = [ 'size', 'service', 'ip.src', 'ip.dst', 'alias.host', 'city.dst', 'country.dst', 'action', 'content', 'ad.username.src', 'ad.computer.src', 'filename', 'client'];
  private defaultDefaultImageLimit = 1000;
  private defaultDefaultRollingHours = 1;
  public defaultQueries = defaultQueries;
  public defaultQueriesOptions: SelectItem[] = [];
  private defaultMasonryColumnSize = 350;

  private defaultMasonryKeys: any = [
                                { key: 'alias.host', friendly: 'Hostname' },
                                { key: 'ad.username.src', friendly: 'AD User' },
                                { key: 'ad.computer.src', friendly: 'AD Computer' },
                                { key: 'ad.domain.src', friendly: 'AD Domain' }
                              ];

  public preferencesModel: any = { nwInvestigateUrl: this.defaultNwInvestigateUrl,
                                    defaultNwQuery: this.defaultDefaultNwquery,
                                    minX: this.defaultMinX,
                                    minY: this.defaultMinY,
                                    displayedKeys: this.getDisplayedKeysValue(this.defaultDisplayedKeys),
                                    defaultImageLimit: this.defaultDefaultImageLimit,
                                    defaultRollingHours: this.defaultDefaultRollingHours,
                                    defaultQuerySelection: this.defaultQueries[0].text, // this only has effect on the first run of 221B.  After the prefs have been set, it will be read in from the prefs
                                    masonryColumnSize: this.defaultMasonryColumnSize,
                                    masonryKeys: this.getMasonryKeysValue(this.defaultMasonryKeys),
                                    contentTimeout: null,
                                    queryTimeout: null,
                                    queryDelayMinutes: null,
                                    maxContentErrors: null
                                  };

  ngOnInit(): void {
    for (let i = 0; i < this.defaultQueries.length; i++) {
      let query = this.defaultQueries[i];
      let option: SelectItem = { label: query.text, value: query.text };
      this.defaultQueriesOptions.push(option);
    }
  }

  getDisplayedKeysValue(a: any): string {
    let text = '';
    for (let i = 0; i < a.length; i++) {
      text += a[i];
      if (i < a.length - 1) { // omit the newline on the last line
       text += '\n';
      }
    }
    return text;
  }

  getMasonryKeysValue(a: any): string {
    let text = '';
    for (let i = 0; i < a.length; i++) {
      text += a[i].key + ',' + a[i].friendly;
      if (i < a.length - 1) { // omit the newline on the last line
       text += '\n';
      }
    }
    return text;
  }

  setDisplayedKeysValue(v: string): any {
    let n = v.split('\n');
    let newArray = [];
    for (let x = 0; x < n.length; x++) {
      // remove blank lines
      if (!n[x].match(/^\s*$/)) {
        newArray.push(n[x]);
      }
    }
    let keysArray = [];
    for (let x = 0; x < newArray.length; x++) {
      newArray[x] = newArray[x].replace(/^\s+/, '').replace(/\s+$/, ''); // remove leading and trailing whitespace
      if (newArray[x].match(/\s/)) {
        // we will skip this row if the key contains any remaining whitespace
        continue;
      }
      keysArray.push(newArray[x]);
    }
    // log.debug('PreferencesModalComponent: setDisplayedKeysValue(): keysArray:', keysArray);
    return keysArray;
  }


  setMasonryKeysValue(v: string): any {
    let n = v.split('\n'); // split by newline
    let newArray = [];
    // log.debug('PreferencesModalComponent: setMasonryKeysValue(): n:', n);

    for (let x = 0; x < n.length; x++) {
      // remove blank lines
      if (!n[x].match(/^\s*$/)) {
        newArray.push(n[x]);
      }
    }
    // log.debug('PreferencesModalComponent: setMasonryKeysValue(): newArray:', newArray);

    let keysArray = [];

    for (let i = 0; i < newArray.length; i++) {
      let x = {};
      let y = newArray[i].split(',');
      // log.debug('y:', y);

      y[0] = y[0].replace(/\s+$/, '').replace(/^\s+/, ''); // remove trailing and leading whitespace from key name, if any

      if (y[0].match(/\s/)) {
        // We will skip this row if the key contains any remaining whitespace
        continue;
      }

      x['key'] = y[0]; // assign key name

      if (y.length >= 2) {
        // if user specifies CSV notation, save the second part as the friendly name
        let s = y[1].replace(/^\s+/, '').replace(/\s+$/, ''); // remove leading and trailing whitespace
        x['friendly'] = s;
      }
      else {
        // if not in CSV notation, save the key name as the friendly name
        x['friendly'] = y[0];
      }
      keysArray.push(x);
    }
    // log.debug('PreferencesModalComponent: setMasonryKeysValue(): keysArray:', keysArray);
    return keysArray;
  }

  cancel(): void {
    // this.resetForm();
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

  cancelledEventReceived(): void {
    // log.debug('PreferencesModalComponent: cancelledEventReceived()';
    // this.resetForm();
  }

  onOpen(): void {
    log.debug('PreferencesModalComponent: onOpen()');
    this.dataService.getPreferences()
                    .then( (prefs: any) => {  log.debug('PreferencesModalComponent: onOpen(): prefs:', prefs);
                                              if ( 'nwInvestigateUrl' in prefs ) {
                                                this.preferencesModel.nwInvestigateUrl = prefs.nwInvestigateUrl;
                                              }
                                              if ( 'defaultQuerySelection' in prefs ) {
                                                this.preferencesModel.defaultQuerySelection = prefs.defaultQuerySelection;
                                              }
                                              if ( 'defaultNwQuery' in prefs ) {
                                                this.preferencesModel.defaultNwQuery = prefs.defaultNwQuery;
                                              }
                                              if ( 'minX' in prefs ) {
                                                this.preferencesModel.minX = prefs.minX;
                                              }
                                              if ( 'minY' in prefs ) {
                                                this.preferencesModel.minY = prefs.minY;
                                              }
                                              if ( 'displayedKeys' in prefs ) {
                                                this.preferencesModel.displayedKeys = this.getDisplayedKeysValue(prefs.displayedKeys);
                                              }
                                              if ( 'defaultImageLimit' in prefs ) {
                                                this.preferencesModel.defaultImageLimit = prefs.defaultImageLimit;
                                              }
                                              if ( 'defaultRollingHours' in prefs ) {
                                                this.preferencesModel.defaultRollingHours = prefs.defaultRollingHours;
                                              }
                                              if ( 'masonryColumnSize' in prefs ) {
                                                this.preferencesModel.masonryColumnSize = prefs.masonryColumnSize;
                                              }
                                              if ( 'masonryKeys' in prefs ) {
                                                this.preferencesModel.masonryKeys = this.getMasonryKeysValue(prefs.masonryKeys);
                                              }
                                              if ( 'contentTimeout' in prefs ) {
                                                this.preferencesModel.contentTimeout = prefs.contentTimeout;
                                              }
                                              if ( 'queryTimeout' in prefs ) {
                                                this.preferencesModel.queryTimeout = prefs.queryTimeout;
                                              }
                                              if ( 'queryDelayMinutes' in prefs ) {
                                                this.preferencesModel.queryDelayMinutes = prefs.queryDelayMinutes;
                                              }
                                              if ( 'maxContentErrors' in prefs ) {
                                                this.preferencesModel.maxContentErrors = prefs.maxContentErrors;
                                              }
                                              this.changeDetectionRef.markForCheck();
                                            })
                    .then( () => log.debug(this.preferencesModel) );
  }

  submitPreferences(f: any): void {
    log.debug('PreferencesModalComponent: submitPreferences(): f', f);
    let prefs = {
      nwInvestigateUrl: f.value.nwInvestigateUrl,
      defaultNwQuery: f.value.defaultNwQuery,
      minX: f.value.minX,
      minY: f.value.minY,
      displayedKeys: this.setDisplayedKeysValue(f.value.displayedKeys),
      defaultRollingHours: f.value.defaultRollingHours,
      defaultQuerySelection: f.value.defaultQuerySelection,
      defaultImageLimit: f.value.defaultImageLimit,
      masonryColumnSize: f.value.masonryColumnSize,
      masonryKeys: this.setMasonryKeysValue(f.value.masonryKeys),
      queryTimeout: f.value.queryTimeout,
      contentTimeout: f.value.contentTimeout,
      queryDelayMinutes: f.value.queryDelayMinutes,
      maxContentErrors: f.value.maxContentErrors
    };
    this.dataService.setPreferences(prefs)
                    .then( () => this.closeModal() );
  }

}
