import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
// import { NgForm } from '@angular/forms';
import { defaultNwQueries } from './default-nw-queries';
import { defaultSaQueries } from './default-sa-queries';
import { SelectItem } from 'primeng/components/common/selectitem';
import { Preferences } from './preferences';
import * as log from 'loglevel';

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
              private modalService: ModalService) {}

  public id = 'preferences-modal';

  public defaultNwQueries = defaultNwQueries;
  public defaultNwQueriesOptions: SelectItem[] = [];

  public defaultSaQueries = defaultSaQueries;
  public defaultSaQueriesOptions: SelectItem[] = [];

  private defaultMasonryKeys: any = [
                                { key: 'alias.host', friendly: 'Hostname' },
                                { key: 'ad.username.src', friendly: 'AD User' },
                                { key: 'ad.computer.src', friendly: 'AD Computer' },
                                { key: 'ad.domain.src', friendly: 'AD Domain' }
                              ];

  public displayedNwKeysString: string = null;
  public masonryNwKeysString: string = null;
  public displayedSaKeysString: string = null;
  public masonrySaKeysString: string = null;

  public preferencesModel: Preferences = {
                                    // global
                                    minX: null,
                                    minY: null,
                                    defaultContentLimit: null,
                                    defaultRollingHours: null,
                                    masonryColumnSize: null,
                                    serviceTypes: { nw: false, sa: false },
                                    debugLogging: false,

                                    // netwitness
                                    nw: {
                                      nwInvestigateUrl: null,
                                      presetQuery: null,
                                      displayedKeys: null, // this.getDisplayedKeysValue(this.defaultDisplayedKeys),
                                      defaultQuerySelection: null, // this.defaultNwQueries[0].text, // this only has effect on the first run of Atomic Fishbowl.  After the prefs have been set, it will be read in from the prefs
                                      masonryKeys: null, // this.getMasonryKeysValue(this.defaultMasonryKeys),
                                      contentTimeout: null,
                                      queryTimeout: null,
                                      queryDelayMinutes: null,
                                      maxContentErrors: null
                                    },

                                    // solera
                                    sa: {
                                      url: null,
                                      contentTimeout: null,
                                      queryTimeout: null,
                                      queryDelayMinutes: null,
                                      maxContentErrors: null,
                                      presetQuery: null,
                                      defaultQuerySelection: null,
                                      displayedKeys: null,
                                      masonryKeys: null
                                    }
                                  };

  public serviceTypeOptions: SelectItem[] = [
    { label: 'RSA NetWitness', value: 'nw' },
    { label: 'Symantec Security Analytics', value: 'sa' }
  ];
  public selectedServiceTypes: string[] = [ null, null ]; // just netwitness by default
  public selectedTabIndex = 0;

  ngOnInit(): void {
    for (let i = 0; i < this.defaultNwQueries.length; i++) {
      let query = this.defaultNwQueries[i];
      let option: SelectItem = { label: query.text, value: query.text };
      this.defaultNwQueriesOptions.push(option);
    }
    for (let i = 0; i < this.defaultSaQueries.length; i++) {
      let query = this.defaultSaQueries[i];
      let option: SelectItem = { label: query.text, value: query.text };
      this.defaultSaQueriesOptions.push(option);
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
                    .then( (prefs: Preferences) => {
                      log.debug('PreferencesModalComponent: onOpen(): prefs:', prefs);
                      delete prefs['_id'];
                      this.preferencesModel = prefs;
                      this.displayedNwKeysString = this.getDisplayedKeysValue(this.preferencesModel.nw.displayedKeys);
                      this.masonryNwKeysString = this.getMasonryKeysValue(this.preferencesModel.nw.masonryKeys);
                      this.displayedSaKeysString = this.getDisplayedKeysValue(this.preferencesModel.sa.displayedKeys);
                      this.masonrySaKeysString = this.getMasonryKeysValue(this.preferencesModel.sa.masonryKeys);
                      // selectedServiceTypes: string[] = ['nw', null ]; // just netwitness by default
                      if (prefs.serviceTypes.nw) {
                        log.debug('got to 1');
                        this.selectedServiceTypes[0] = 'nw';
                      }
                      if (prefs.serviceTypes.sa) {
                        log.debug('got to 2');
                        this.selectedServiceTypes[1] = 'sa';
                      }
                    })
                    .then( () => log.debug(this.preferencesModel) );
  }

  submitPreferences(): void {
    log.debug('PreferencesModalComponent: submitPreferences()');
    let prefs: Preferences = this.preferencesModel;
    prefs.nw.masonryKeys = this.setMasonryKeysValue(this.masonryNwKeysString);
    prefs.nw.displayedKeys = this.setDisplayedKeysValue(this.displayedNwKeysString);
    prefs.sa.masonryKeys = this.setMasonryKeysValue(this.masonrySaKeysString);
    prefs.sa.displayedKeys = this.setDisplayedKeysValue(this.displayedSaKeysString);

    this.dataService.setPreferences(prefs)
                    .then( () => this.closeModal() );
  }

  public onServiceTypeChanged(): void {
    log.debug('PreferencesModalComponent: onServiceTypeChanged()');
    let nw = false;
    let sa = false;
    for (let i = 0; i < this.selectedServiceTypes.length; i++) {
      let type = this.selectedServiceTypes[i];
      if (type === 'nw') {
        nw = true;
      }
      if (type === 'sa') {
        sa = true;
      }
    }
    this.preferencesModel.serviceTypes.nw = nw;
    this.preferencesModel.serviceTypes.sa = sa;
  }

}
