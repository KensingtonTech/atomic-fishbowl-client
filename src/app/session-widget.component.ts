import { Component, ChangeDetectorRef, OnInit, ChangeDetectionStrategy, OnDestroy, Input, OnChanges } from '@angular/core';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs';
import { Logger } from 'loglevel';
import { Preferences } from './preferences';
import * as utils from './utils';
declare var log: Logger;

@Component( {
  selector: 'session-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div *ngIf="sessionId && meta" style="display: flex; flex-direction: column; position: relative; width: 100%; height: 100%;" [ngClass]="styleClass">

    <!-- session id -->
    <h3 *ngIf="serviceType == 'nw'">Session {{sessionId}} Details</h3>
    <h3 *ngIf="serviceType == 'sa'">Flow {{sessionId}} Details</h3>

    <!-- Show all toggle -->
    <div class="iconsAlignTop eyeball" (click)="showAllClick()" style="position: absolute;"><i [class.fa-eye-slash]="!showAll" [class.fa-eye]="showAll" class="fa fa-2x fa-fw"></i></div>

    <!-- bullseye -->
    <!-- test
    <div class="iconsAlignTop bullseye" style="position: absolute;">
      <i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i>
    </div>
    -->
    <div class="iconsAlignTop bullseye" style="position: absolute;">
      <a *ngIf="serviceType == 'nw' && preferences.nw.url && deviceNumber && sessionId" target="_blank" href="{{preferences.nw.url}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a>
      <a *ngIf="serviceType == 'sa' && preferences.sa.url && sessionId && meta" target="_blank" href="{{saUrlGetter(sessionId)}}"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a>
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
          <!-- displayedKeys is all keys, both real or if only a preferred meta key -->
          <tr *ngFor="let key of displayedKeys" style="display: table-row;" [hidden]="isKeyHidden(key)">

            <!-- only display a row if showAll is true or if its key is in the preferred meta keys -->
            <td *ngIf="!showAll || (showAll && checkForKeyInMeta(key))" class="metalabel">{{key}}</td>
            <td>
              <!-- only show the accordion if we have meta for its key -->
              <meta-accordion *ngIf="checkForKeyInMeta(key)" class="metavalue" [items]="meta[key]" [key]="key" [enabled]="enabledMeta[key]"></meta-accordion>

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
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .overflowBox::-webkit-scrollbar {
      display: none;
    }

    /*.metalabel {
      color: rgb(118,143,181);
      vertical-align: top;
      font-size: 12px;
    }

    .metavalue {
      color: rgb(230,234,234);
      font-size: 10px;
    }*/

    .multiValues {
      background-color: rgba(36, 109, 226, 0.65);
    }

    .expanded {
      background-color: rgb(186, 48, 141);;
    }

`]

})

export class SessionWidgetComponent implements OnInit, OnChanges, OnDestroy {

  constructor(private dataService: DataService,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolService ) {}

  @Input() public serviceType: string; // 'nw' or 'sa'
  @Input() public session: any;
  @Input() public styleClass = '';

  public sessionId;
  public meta: any;
  public showAll = false;
  public deviceNumber: number;
  private preferences: Preferences;
  public preferenceKeys: string[] =  [];
  public preferenceKeysObj = {};
  public displayedKeys;
  public enabledMeta: any;

  // Subscriptions
  private preferencesChangedSubscription: Subscription;
  private deviceNumberSubscription: Subscription;


  ngOnInit(): void {
    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) );
    this.deviceNumberSubscription = this.toolService.deviceNumber.subscribe( (event: any) => {
      this.deviceNumber = event.deviceNumber;
      log.debug('SessionWidgetComponent: deviceNumberSubscription: deviceNumber:', this.deviceNumber);
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
     } );
  }



  ngOnDestroy() {
    this.preferencesChangedSubscription.unsubscribe();
    this.deviceNumberSubscription.unsubscribe();
  }



  ngOnChanges(values: any): void {
    log.debug('SessionWidgetComponent ngOnChanges(): values', values);
    if ( 'serviceType' in values
        && this.preferences
        && ( ( values.serviceType.firstChange && values.serviceType.currentValue )
        || ( values.serviceType.currentValue && values.serviceType.currentValue !== values.serviceType.previousValue ) ) ) {
      this.preferenceKeys = this.preferences[values.serviceType.currentValue].displayedKeys;
      // log.debug('ClassicSessionPopupComponent ngOnChanges(): preferenceKeys:', this.preferenceKeys);
    }

    if ('session' in values && values.session.currentValue) {
      this.meta = utils.deepCopy(this.session['meta']);
      this.sessionId = this.session['id'];
      this.displayedKeys = this.getCombinedMetaKeys();
      this.buildEnabledMeta();
    }
    this.changeDetectionRef.markForCheck();
  }



  onPreferencesChanged(prefs: Preferences): void {
    // log.debug('SessionWidgetComponent: onPreferencesChanged(): preferences:', prefs);
    if (!this.serviceType) {
      log.debug('SessionWidgetComponent: onPreferencesChanged(): did not have serviceType.  Returning');
      return;
    }
    this.preferences = prefs;
    this.preferenceKeys = this.preferences[this.serviceType].displayedKeys.slice(0);
    let preferenceKeysObj = {};
    for (let i = 0; i < this.preferenceKeys.length; i++) {
      let key = this.preferenceKeys[i];
      preferenceKeysObj[key] = 0;
    }
    this.preferenceKeysObj = preferenceKeysObj;
    if (this.meta) {
      this.displayedKeys = this.getCombinedMetaKeys();
      this.buildEnabledMeta();
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  buildEnabledMeta() {
    let tmpKeys = {};
    for (let key in this.meta) {
      if (this.meta.hasOwnProperty(key)) {
        let enabled = true;
        if (!this.showAll && !this.checkForKeyInPreferences(key)) {
          enabled = false;
        }
        tmpKeys[key] = enabled;
      }
    }
    this.enabledMeta = tmpKeys;
  }



  getMetaForKey(k: string): any {
    // log.debug('SessionWidgetComponent: getMetaForKey()', this.meta[k]);
    return this.meta[k];
  }



  getMetaKeys(): any {
    // builds a list of keynames from the session's meta
    // doesn't contain any reference displayed keys which aren't present in the meta
    let a = [];
    for (let k in this.meta) {
      if (this.meta.hasOwnProperty(k)) {
        a.push(k);
      }
    }
    return a;
  }



  getCombinedMetaKeys() {
    // adds any preferred displayed keys to the list of meta keys
    let metaKeys = this.getMetaKeys();
    for (let i = 0; i < this.preferenceKeys.length; i++) {
      let prefKey = this.preferenceKeys[i];
      if ( !(prefKey in this.meta) ) {
        metaKeys.push(prefKey);
      }
    }
    return metaKeys;
  }



  showAllClick(): void {
    this.showAll = !this.showAll;
    this.buildEnabledMeta();
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
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
    let startTime = this.convertSaTime(this.meta['start_time']);

    let stopTime = this.convertSaTime(this.meta['stop_time']);
    struct['ca'] = { 'start' : startTime, 'end': stopTime };
    struct['now'] = new Date().getTime();
    let encoded = btoa(JSON.stringify(struct));
    // log.debug('ClassicSessionPopupComponent: saUrlGetter(): struct:', struct);

    return this.preferences.sa.url + '/deepsee/index#' + encoded;
  }



  checkForKeyInPreferences(key: string) {
    if (key in this.preferenceKeysObj) {
      return true;
    }
    return false;
  }



  checkForKeyInMeta(key: string) {
    if (key in this.meta) {
      return true;
    }
    return false;
  }



  getMetaValue(key: string) {
    return this.meta[key];
  }



  isKeyHidden(key: string) {
    if (this.showAll) {
      return false;
    }
    if (!this.showAll && this.checkForKeyInPreferences(key)) {
      return false;
    }
    return true;
  }

}
