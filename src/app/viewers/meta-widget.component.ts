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
  template: `
  <div *ngIf="sessionId && meta" style="display: flex; flex-direction: column; position: relative; width: 100%; height: 100%;" [ngClass]="styleClass">

    <!-- session id -->
    <h3 *ngIf="serviceType == 'nw'">Session {{sessionId}} Details</h3>
    <h3 *ngIf="serviceType == 'sa'">Flow {{sessionId}} Details</h3>

    <!-- icon buttons -->
    <div class="iconsAlignTop noselect" style="position: absolute; width: 100%; height: 2em;">
      <span style="float: right;">

        <!-- expand all / collapse all -->
        <span (click)="onExpandCollapseClicked()" style="color: white; line-height: 2em; font-weight: bold;">{{!expandAll ? 'Expand' : 'Collapse'}}</span>&nbsp;

        <!-- netwitness bullseye -->
        <a *ngIf="serviceType == 'nw' && preferences.nw.url && deviceNumber && sessionId" target="_blank" href="{{preferences.nw.url}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw verticalTop" style="color: red;"></i></a>

        <!-- sa bullseye -->
        <a *ngIf="serviceType == 'sa' && preferences.sa.url && sessionId && meta" target="_blank" href="{{saUrlGetter(sessionId)}}"><i class="fa fa-bullseye fa-2x fa-fw verticalTop" style="color: red;"></i></a>

        <!-- show / hide all eyeball toggle -->
        <span class="eyeball fa fa-2x fa-fw verticalTop" (click)="showAllClick()" [class.fa-eye-slash]="!showAll" [class.fa-eye]="showAll"></span>

        <!-- close -->
        <span *ngIf="enableCloseButton" class="fa fa-times-circle-o fa-2x fa-fw verticalTop" (click)="closeButtonClicked.emit()" style="color: white;"></span>&nbsp;&nbsp;

      </span>
    </div>




    <div class="overflowBox" style="flex-grow: 1;">

      <!--scrollbar-width: none;-->
      <div style="position: relative; width: 100%; height: 100%;">
        <table class="wrap" style="width: 100%; table-layout: fixed;">

          <!-- show time -->
          <tr>

            <td class="metalabel" style="width: 35%;">time</td>
            <td *ngIf="serviceType == 'nw'" class="metavalue" style="width: 65%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
            <td *ngIf="serviceType == 'sa' && meta.stop_time" class="metavalue" style="width: 65%;">{{meta.stop_time | formatSaTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>

          </tr>

          <!-- show all other meta -->
          <!-- displayedKeys is all keys, both real or if only a preferred meta key.  It will be hidden via its display property -->
          <tr *ngFor="let key of displayedKeys" [style.display]="isKeyHidden(key) ? 'none' : 'table-row'">

            <!-- only display a column if showAll is true or if its key is in the preferred meta keys -->
            <td *ngIf="!showAll || (showAll && checkForKeyInMeta(key))" class="metalabel">{{key}}</td>
            <td>
              <!-- only show the accordion if we have meta for its key -->
              <meta-accordion *ngIf="checkForKeyInMeta(key)" class="metavalue" [items]="meta[key]" [key]="key" [enabled]="enabledMeta[key]" [expandAll]="expandAll"></meta-accordion>

              <!-- if we're showing preferred meta and we don't have meta for a key, show the red no meta icon -->
              <i *ngIf="!showAll && !checkForKeyInMeta(key)" class="fa fa-ban" style="color: red;"></i>
            </td>

          </tr>

        </table>
      </div>

    </div>

  </div>
  `,

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
    let preferenceKeysObj = {};
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
    let tmpEnabledMeta = {};
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
    let keys: string[] = [];
    Object.keys(this.meta).forEach( key => {
      keys.push(key);
    });
    return keys;
  }



  getCombinedMetaKeys(): string[] {
    // adds any preferred displayed keys to the list of all meta keys
    // we do this so that we can display an indicator if the session meta
    // doesn't contain preferred keys
    let metaKeys: string[] = this.getAllMetaKeys();
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

    let struct = { 'sc' : { 'Extractions' : { 'aC' : 'hT' , 's' : { 'p' : 1, 's' : 25, 'f' : [], 'sf' : 'date', 'sd' : 'ASC'}, 'p' : 0 }, 'Geolocation': { 'rI' : 'ipv4_conversation', 'rT' : 'g', 'sd' : 'd' , 'sc' : 2, 'p' : 0, 's' : 25, 'filters' : {'all' : []}}, 'Reports' : { 'rI' : 'application_id', 'rT' : 'r', 'cT' : 'pie', 'aS' : 'linear', 'cR' : 10, 'sd' : 'd', 'sc' : 'sessions', 'p' : 0, 's' : 25, 'comp' : 'none', 'filters' : {'all' : [] } }, 'Summary' : {'vK' : 1, 'p' : 0}}, 'ac': 'Summary' };
    struct['pb'] = [ 'flow_id=' + sessionId ];
    let startTime = this.convertSaTime(<any>this.meta['start_time']);

    let stopTime = this.convertSaTime(<any>this.meta['stop_time']);
    struct['ca'] = { 'start' : startTime, 'end': stopTime };
    struct['now'] = new Date().getTime();
    let encoded = btoa(JSON.stringify(struct));
    // log.debug('ClassicSessionPopupComponent: saUrlGetter(): struct:', struct);

    return this.preferences.sa.url + '/deepsee/index#' + encoded;
  }



  onExpandCollapseClicked() {
    this.expandAll = !this.expandAll;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }

}
