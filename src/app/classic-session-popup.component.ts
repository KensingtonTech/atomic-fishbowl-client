import { Component, ChangeDetectorRef, OnInit, OnDestroy, OnChanges, ElementRef, ViewChild, Input, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs';
import { Preferences } from './preferences';
declare var log;

@Component( {
  selector: 'classic-session-popup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div [@faderAnimation]="enabledTrigger" style="position: absolute; right: 0; top: 30px; bottom: 0; width: 350px; background-color: rgba(0,0,0,.8); padding-left: 5px; color: white; font-size: 12px;">
  <div style="display: flex; flex-direction: column; position: relative; width: 100%; height: 100%;" *ngIf="sessionId && meta">
    <h3 *ngIf="serviceType == 'nw'" style="margin-top: 10px; margin-bottom: 5px;">Session {{sessionId}} Details</h3>
    <h3 *ngIf="serviceType == 'sa'" style="margin-top: 10px; margin-bottom: 5px;">Flow {{sessionId}} Details</h3>

    <div style="flex-grow: 1; overflow: auto;">

      <div *ngIf="!showAll" style="position: relative; width: 100%; height: 100%; overflow: auto;">
        <table class="wrap" style="width: 100%; table-layout: fixed;">
          <tr>
            <td class="metalabel" style="width: 35%;">time</td>
            <td *ngIf="serviceType == 'nw'" class="metavalue" style="width: 65%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
            <td *ngIf="serviceType == 'sa' && meta.stop_time" class="metavalue" style="width: 65%;">{{meta.stop_time | formatSaTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
          </tr>
          <tr *ngFor="let key of displayedKeys">
            <td class="metalabel">{{key}}</td>
            <td>
              <meta-accordion *ngIf="meta[key]" [items]="meta[key]" [key]="key" class="metavalue">
              </meta-accordion>
              <i *ngIf="!meta[key]" class="fa fa-ban" style="color: red;"></i>
            </td>
          </tr>
        </table>
      </div>

      <div *ngIf="showAll" style="position: relative; width: 100%; height: 100%; overflow: auto;">
        <table class="wrap" style="width: 100%; table-layout: fixed;">
          <tr>
            <td class="metalabel" style="width: 35%;">time</td>
            <td *ngIf="serviceType == 'nw'" class="metavalue" style="width: 65%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
            <td *ngIf="serviceType == 'sa' && meta.stop_time" class="metavalue" style="width: 65%;">{{meta.stop_time | formatSaTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
          </tr>
          <tr *ngFor="let key of getMetaKeys()">
            <td class="metalabel">{{key}}</td>
            <td>
              <meta-accordion class="metavalue" [items]="meta[key]" [key]="key">
              </meta-accordion>
            </td>
          </tr>
        </table>
      </div>

    </div>

    <!-- Show all toggle -->
    <div (click)="showAllClick()" style="position: absolute; top: 5px; right: 40px;"><i [class.fa-eye-slash]="!showAll" [class.fa-eye]="showAll" class="fa fa-2x fa-fw"></i></div>

    <!-- bullseye -->
    <div *ngIf="serviceType == 'nw' && preferences.nw.url && deviceNumber && sessionId" style="position: absolute; top: 5px; right: 3px;">
      <a target="_blank" href="{{preferences.nw.url}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a>
    </div>
    <div *ngIf="serviceType == 'sa' && preferences.sa.url && sessionId && meta" style="position: absolute; top: 5px; right: 3px;">
      <a target="_blank" href="{{saUrlGetter(sessionId)}}"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a>
    </div>
  </div>
</div>
`,

  animations: [
    trigger('faderAnimation', [
      state('disabled', style({ opacity: 0, display: 'none' })),
      state('enabled',  style({ opacity: 1, display: 'block' })),
      transition('disabled => enabled, enabled => disabled', animate('.25s')),
    ])
  ],

  styles: [`
    .metalabel {
      color: rgb(118,143,181);
      vertical-align: top;
      font-size: 12px;
    }

    .metavalue {
      color: rgb(230,234,234);
      font-size: 10px;
    }

    .multiValues {
      background-color: rgba(36, 109, 226, 0.65);
    }

    .expanded {
      background-color: rgb(186, 48, 141);;
    }

  `]

} )

export class ClassicSessionPopupComponent implements OnInit, OnDestroy, OnChanges {

  constructor(private dataService: DataService,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolService ) {}

  @Input() public enabled: boolean;
  @Input() public serviceType: string; // 'nw' or 'sa'
  @Input() public session: any;
  private lastServiceType: string = null;  // 'nw' or 'sa'
  public sessionId;
  public meta: any;

  public showAll = false;
  private deviceNumber: number;
  public enabledTrigger: string;
  private preferences: Preferences;
  private displayedKeys: string[] =  [];

  private preferencesChangedSubscription: Subscription;
  private deviceNumberSubscription: Subscription;



  ngOnInit(): void {
    this.enabledTrigger = 'disabled';

    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) );

    this.deviceNumberSubscription = this.toolService.deviceNumber.subscribe( (event: any) => this.deviceNumber = event.deviceNumber );
  }



  ngOnDestroy(): void {
    log.debug('ClassicSessionPopupComponent: ngOnDestroy()');

    this.preferencesChangedSubscription.unsubscribe();
    this.deviceNumberSubscription.unsubscribe();
  }



  onPreferencesChanged(prefs: Preferences): void {
    this.preferences = prefs;
    this.displayedKeys = this.preferences[this.serviceType].displayedKeys;
  }



  getMetaForKey(k: string): any {
    // log.debug('ClassicSessionPopupComponent: getMetaForKey()', this.meta[k]);
    return this.meta[k];
  }



  getMetaKeys(): any {
    let a = [];
    for (let k in this.meta) {
      if (this.meta.hasOwnProperty(k)) {
        a.push(k);
      }
    }
    return a;
  }



  ngOnChanges(values: any): void {
    log.debug('ClassicSessionPopupComponent ngOnChanges(): values', values);

    /*if ( 'serviceType' in values && values.serviceType.currentValue && this.preferences && values.serviceType.currentValue !== this.lastServiceType) {
      let serviceType = values.serviceType.currentValue;
      this.displayedKeys = this.preferences[serviceType].displayedKeys;
      this.lastServiceType = serviceType;
    }*/

    if ( 'serviceType' in values
        && this.preferences
        && ( ( values.serviceType.firstChange && values.serviceType.currentValue )
        || ( values.serviceType.currentValue && values.serviceType.currentValue !== values.serviceType.previousValue ) ) ) {
      this.displayedKeys = this.preferences[values.serviceType.currentValue].displayedKeys;
      // log.debug('ClassicSessionPopupComponent ngOnChanges(): displayedKeys:', this.displayedKeys);
    }

    if ('session' in values && values.session.currentValue) {
      this.meta = values.session.currentValue['meta'];
      this.sessionId = values.session.currentValue['id'];
    }

    if (this.enabled ) {
      this.enabledTrigger = 'enabled';
    }
    else {
      this.enabledTrigger = 'disabled';
    }

  }



  showAllClick(): void {
    this.showAll = !this.showAll;
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



}
