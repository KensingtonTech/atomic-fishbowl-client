import { Component, ChangeDetectorRef, OnInit, ChangeDetectionStrategy, OnDestroy, Input, OnChanges, Output, EventEmitter } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { Subscription } from 'rxjs';
import { Preferences } from 'types/preferences';
import { Meta } from 'types/meta';
import { Session } from 'types/session';
import * as utils from '../utils';
import * as log from 'loglevel';

@Component( {
  selector: 'meta-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meta-widget.component.html',

  styles: [`
    .overflowBox {
      overflow-y: scroll;
      overflow-x: scroll;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .overflowBox::-webkit-scrollbar {
      display: none;
    }

    .expanded {
      background-color: rgb(186, 48, 141);;
    }

    .verticalTop {
      vertical-align: top;
    }

`]

})

export class MetaWidgetComponent implements OnInit, OnChanges, OnDestroy {

  constructor(private dataService: DataService,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolService ) {}

  @Input() serviceType: string; // 'nw' or 'sa'
  @Input() session: Session;
  @Input() styleClass = '';
  @Input() enableCloseButton = false;
  @Output() closeButtonClicked: EventEmitter<void> = new EventEmitter<void>();

  sessionId: number;
  meta: Meta;
  showAll = false;
  deviceNumber: number;
  preferences: Preferences;
  preferenceKeys: string[] =  [];
  preferenceKeysObj = {};
  displayedKeys: string[];
  enabledMeta: any;
  expandAll = false;

  // Subscriptions
  private subscriptions = new Subscription;


  ngOnInit(): void {
    this.subscriptions.add(this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) ));
    this.subscriptions.add(this.toolService.deviceNumber.subscribe( (event) => this.onDeviceNumberChanged(event) ));
  }



  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }



  ngOnChanges(values: any): void {
    log.debug('MetaWidgetComponent ngOnChanges(): values', values);
    if ( 'serviceType' in values
        && this.preferences
        && ( ( values.serviceType.firstChange && values.serviceType.currentValue )
        || ( values.serviceType.currentValue && values.serviceType.currentValue !== values.serviceType.previousValue ) ) ) {
      this.preferenceKeys = this.preferences[values.serviceType.currentValue].displayedKeys;
      // log.debug('ClassicSessionPopupComponent ngOnChanges(): preferenceKeys:', this.preferenceKeys);
    }

    if ('session' in values && values.session.currentValue) {
      this.meta = utils.deepCopy(this.session['meta']);
      this.sessionId = this.session.id;
      this.displayedKeys = this.getCombinedMetaKeys();
      this.buildEnabledMeta();
    }
    log.debug('MetaWidgetComponent ngOnChanges(): values', values);
    this.changeDetectionRef.markForCheck();
  }



  onPreferencesChanged(prefs: Preferences): void {
    if (!prefs || Object.keys(prefs).length === 0) {
      return;
    }
    log.debug('MetaWidgetComponent: onPreferencesChanged(): preferences:', prefs);
    if (!this.serviceType) {
      log.debug('MetaWidgetComponent: onPreferencesChanged(): did not have serviceType.  Returning');
      return;
    }
    this.preferences = prefs;
    this.preferenceKeys = this.preferences[this.serviceType].displayedKeys.slice(0);
    const preferenceKeysObj = {};
    this.preferenceKeys.forEach( prefKey => {
      preferenceKeysObj[prefKey] = 0;
    });
    this.preferenceKeysObj = preferenceKeysObj;
    if (this.meta) {
      this.displayedKeys = this.getCombinedMetaKeys();
      this.buildEnabledMeta();
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onDeviceNumberChanged(event) {
    this.deviceNumber = event.deviceNumber;
    log.debug('MetaWidgetComponent: onDeviceNumberChanged(): deviceNumber:', this.deviceNumber);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  buildEnabledMeta(): void {
    // sets this.enabledMeta to be an object of meta Keys,
    // with the value of each key being a boolean of whether
    // to display the key or not
    const tmpEnabledMeta = {};
    Object.keys(this.meta).forEach( key => {
      let enabled = true;
      if (!this.showAll && !this.checkForKeyInPreferences(key)) {
        enabled = false;
      }
      tmpEnabledMeta[key] = enabled;
    });
    this.enabledMeta = tmpEnabledMeta;
  }



  getMetaForKey(key: string): string[] {
    // log.debug('MetaWidgetComponent: getMetaForKey()', this.meta[k]);
    // returns all meta values for a specific meta key as an array
    return this.meta[key];
  }



  getAllMetaKeys(): string[] {
    // builds a list of all keynames from the session's meta
    // doesn't contain any reference displayed keys which aren't present in the meta
    // only called from  getCombinedMetaKeys()
    const keys: string[] = [];
    Object.keys(this.meta).forEach( key => {
      keys.push(key);
    });
    return keys;
  }



  getCombinedMetaKeys(): string[] {
    // adds any preferred displayed keys to the list of all meta keys
    // we do this so that we can display an indicator if the session meta
    // doesn't contain preferred keys
    const metaKeys: string[] = this.getAllMetaKeys();
    this.preferenceKeys.forEach( prefKey => {
      if ( !(prefKey in this.meta) ) {
        metaKeys.push(prefKey);
      }
    });
    return metaKeys.sort();
  }



  showAllClick(): void {
    this.showAll = !this.showAll;
    this.buildEnabledMeta();
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  checkForKeyInPreferences(key: string): boolean {
    // checks if the preferences meta keys conatins a specific meta key
    if (key in this.preferenceKeysObj) {
      return true;
    }
    return false;
  }



  checkForKeyInMeta(key: string): boolean {
    // returns whether meta exists for the specified key in the session meta
    if (key in this.meta) {
      return true;
    }
    return false;
  }



  getMetaValue(key: string): string[] {
    // returns the value of the specified meta key
    return this.meta[key];
  }



  isKeyHidden(key: string): boolean {
    // returns a boolean of whether the specified key is hidden (false) or not hidden (true)
    if (this.showAll) {
      return false;
    }
    if (!this.showAll && this.checkForKeyInPreferences(key)) {
      return false;
    }
    return true;
  }



  convertSaTime(value: string) {
    return parseInt(value[0].substring(0, value[0].indexOf(':')), 10) * 1000;
  }



  saUrlGetter(sessionId): string {
    if (!this.meta || !sessionId || this.serviceType !== 'sa' || !('start_time' in this.meta && 'stop_time' in this.meta)) {
      return;
    }
    // {{preferences.sa.url}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO
    // let struct = { 'sc' : { 'Extractions' : { 'aC' : 'hT' , 's' : { 'p' : 1, 's' : 25, 'f' : [], 'sf' : 'date', 'sd' : 'ASC'}, 'p' : 0 }, 'Geolocation': { 'rI' : 'ipv4_conversation', 'rT' : 'g', 'sd' : 'd' , 'sc' : 2, 'p' : 0, 's' : 25, 'filters' : {'all' : []}}, 'Reports' : { 'rI' : 'application_id', 'rT' : 'r', 'cT' : 'pie', 'aS' : 'linear', 'cR' : 10, 'sd' : 'd', 'sc' : 'sessions', 'p' : 0, 's' : 25, 'comp' : 'none', 'filters' : {'all' : [] } }, 'Summary' : {'vK' : 1, 'p' : 0}}, 'pb' : ['flow_id=4898292'], 'ca' : { 'start' : 1518021720000, 'end' : 1518108120000}, 'now' : 1518108153464, 'ac': 'Summary' };

    const struct = { 'sc' : { 'Extractions' : { 'aC' : 'hT' , 's' : { 'p' : 1, 's' : 25, 'f' : [], 'sf' : 'date', 'sd' : 'ASC'}, 'p' : 0 }, 'Geolocation': { 'rI' : 'ipv4_conversation', 'rT' : 'g', 'sd' : 'd' , 'sc' : 2, 'p' : 0, 's' : 25, 'filters' : {'all' : []}}, 'Reports' : { 'rI' : 'application_id', 'rT' : 'r', 'cT' : 'pie', 'aS' : 'linear', 'cR' : 10, 'sd' : 'd', 'sc' : 'sessions', 'p' : 0, 's' : 25, 'comp' : 'none', 'filters' : {'all' : [] } }, 'Summary' : {'vK' : 1, 'p' : 0}}, 'ac': 'Summary' };
    struct['pb'] = [ 'flow_id=' + sessionId ];
    const startTime = this.convertSaTime(<any>this.meta['start_time']);

    const stopTime = this.convertSaTime(<any>this.meta['stop_time']);
    struct['ca'] = { 'start' : startTime, 'end': stopTime };
    struct['now'] = new Date().getTime();
    const encoded = btoa(JSON.stringify(struct));
    // log.debug('ClassicSessionPopupComponent: saUrlGetter(): struct:', struct);

    return this.preferences.sa.url + '/deepsee/index#' + encoded;
  }



  onExpandCollapseClicked() {
    this.expandAll = !this.expandAll;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }

}
