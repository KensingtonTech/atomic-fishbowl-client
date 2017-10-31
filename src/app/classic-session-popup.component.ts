import { Component, ChangeDetectorRef, OnInit, OnDestroy, OnChanges, ElementRef, ViewChild, Input, ViewEncapsulation } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
declare var log: any;

@Component( {
  selector: 'classic-session-popup',
  // encapsulation: ViewEncapsulation.None,
  template: `
<div [@faderAnimation]="enabledTrigger" style="position: absolute; right: 0; top: 0; bottom: 0; width: 350px; background-color: rgba(0,0,0,.8); padding-left: 5px; color: white; font-size: 12px;">
  <div style="display: flex; flex-direction: column; position: relative; width: 100%; height: 100%;" *ngIf="sessionId && meta">
    <h3 style="margin-top: 10px; margin-bottom: 5px;">Session {{sessionId}} Details</h3>

    <div style="flex-grow: 1; overflow: auto;">

      <div *ngIf="!showAll" style="position: relative; width: 100%; height: 100%; overflow: auto;">
        <table class="wrap" style="width: 100%; table-layout: fixed;">
          <tr><td class="metalabel" style="width: 35%;">time</td><td class="metavalue" style="width: 65%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
          <tr *ngFor="let key of displayedKeys">
            <td class="metalabel">{{key}}</td>
            <td>
              <meta-accordion *ngIf="meta[key]" [items]="meta[key]" class="metavalue">
              </meta-accordion>
              <i *ngIf="!meta[key]" class="fa fa-ban" style="color: red;"></i>
            </td>
          </tr>
        </table>
      </div>

      <div *ngIf="showAll" style="position: relative; width: 100%; height: 100%; overflow: auto;">
        <table class="wrap" style="width: 100%; table-layout: fixed;">
          <tr><td class="metalabel" style="width: 35%;">time</td><td class="metavalue" style="width: 65%;">{{meta.time | fromEpoch}}</td></tr>
          <tr *ngFor="let key of getMetaKeys()">
            <td class="metalabel">{{key}}</td>
            <td>
              <meta-accordion class="metavalue" [items]="meta[key]">
              </meta-accordion>
            </td>
          </tr>
        </table>
      </div>

    </div>

    <div (click)="showAllClick()" style="position: absolute; top: 5px; right: 40px;"><i [class.fa-eye-slash]="!showAll" [class.fa-eye]="showAll" class="fa fa-2x fa-fw"></i></div>
    <div *ngIf="preferences.nwInvestigateUrl && deviceNumber && sessionId" style="position: absolute; top: 5px; right: 3px;"><a target="_blank" href="{{preferences.nwInvestigateUrl}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a></div>
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

// https://172.16.0.56/investigation/13/reconstruction/893035630/AUTO

export class ClassicSessionPopupComponent implements OnInit, OnDestroy, OnChanges {

  constructor(private dataService: DataService,
              private changeDetectionRef: ChangeDetectorRef,
              private el: ElementRef,
              private toolService: ToolService ) {}

  @Input('sessionId') sessionId: number;
  @Input('enabled') enabled: number;
  public showAll = false;
  private deviceNumber: number;
  public enabledTrigger: string;
  private preferences: any;
  private sessions: any;
  public meta: any;
  private nativeElement = this.el.nativeElement;
  private metaUpdated = false;
  private hideAllMeta = true;
  private displayedKeys: any =  [
    'size',
    'service',
    'ip.src',
    'ip.dst',
    'alias.host',
    'city.dst',
    'country.dst',
    'action',
    'content',
    'ad.username.src',
    'ad.computer.src',
    'filename',
    'client'
  ];

  private sessionsReplacedSubscription: any;
  private sessionPublishedSubscription: any;
  private preferencesChangedSubscription: any;
  private deviceNumberSubscription: any;


  ngOnInit(): void {
    this.enabledTrigger = 'disabled';

    this.sessionsReplacedSubscription = this.dataService.sessionsReplaced.subscribe( (s: any) => { // log.debug("sessionsReplaced", s);
      this.sessions = s;
    });

    this.sessionPublishedSubscription = this.dataService.sessionPublished.subscribe( (s: any) => {  // log.debug("sessionPublished", s);
      let sessionId = s.id;
      this.sessions[sessionId] = s;
    });

    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: any) => {  // log.debug("prefs observable: ", prefs);
      this.preferences = prefs;
      if ( 'displayedKeys' in prefs ) {
        this.displayedKeys = prefs.displayedKeys;
      }
    });

    this.deviceNumberSubscription = this.toolService.deviceNumber.subscribe( ($event: any) => this.deviceNumber = $event.deviceNumber );
  }

  ngOnDestroy(): void {
    log.debug('ClassicSessionPopupComponent: ngOnDestroy()');

    this.sessionsReplacedSubscription.unsubscribe();
    this.sessionPublishedSubscription.unsubscribe();
    this.preferencesChangedSubscription.unsubscribe();
    this.deviceNumberSubscription.unsubscribe();
  }

  getMetaForKey(k: string): any {
    // log.debug("getMetaForKey()", this.meta[k]);
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

  ngOnChanges(): void {
    // log.debug("SessionWidgetComponent ngOnChanges()", this.enabled);

    if (this.enabled ) {
      // for some odd reason, we can't use shortcut syntax as it evidently doesn't change the var reference
      this.enabledTrigger = 'enabled';
    }
    else {
      this.enabledTrigger = 'disabled';
    }

    if (this.sessionId) {
      if ( this.sessionId in this.sessions ) {
        // log.debug("session id " + this.sessionId + ' found');
        this.meta = this.sessions[this.sessionId].meta;
        this.toolService.newSession.next(this.sessions[this.sessionId]);
        // this.updated = this.updated + 1;
        // this.metaUpdated = false;
        // this.metaUpdated = true;
      }
//      else {
//        log.debug("session id " + this.sessionId + ' not found!');
//      }
    }
    // this.enabledTrigger = this.enabled ? 'enabled' : 'disabled';
  }

  showAllClick(): void {
    this.showAll = !this.showAll;
  }

}
