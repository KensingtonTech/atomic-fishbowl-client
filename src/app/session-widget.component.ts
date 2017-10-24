import { Component, ChangeDetectorRef, OnInit, OnDestroy, ElementRef, ViewChild, Input, ViewEncapsulation } from '@angular/core';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
declare var log: any;

@Component( {
  selector: 'session-widget',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div style="display: flex; flex-direction: column; position: relative; width: 100%; height: 100%;" *ngIf="sessionId && meta">
      <h3 style="margin-top: 10px; margin-bottom: 5px;">Session {{sessionId}} Details</h3>
      <div style="flex-grow: 1; overflow: auto;">

        <div *ngIf="!showAll" style="position: relative; width: 100%; height: 100%; overflow: auto;">
          <table class="wrap" style="width: 100%; table-layout: fixed;">
            <tr><td class="metalabel" style="width: 35%;">time</td><td class="metavalue" style="width: 65%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
            <tr *ngFor="let key of displayedKeys">
              <td class="metalabel">{{key}}</td>
              <td>
                <meta-accordion *ngIf="meta[key]" class="metavalue" [items]="meta[key]"></meta-accordion>
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
                <meta-accordion class="metavalue" [items]="meta[key]"></meta-accordion>
              </td>
            </tr>
          </table>
        </div>

      </div>
      <div (click)="showAllClick()" style="position: absolute; top: 5px; right: 40px;"><i [class.fa-eye-slash]="!showAll" [class.fa-eye]="showAll" class="fa fa-2x fa-fw"></i></div>
      <div *ngIf="preferences.nwInvestigateUrl && deviceNumber && sessionId" style="position: absolute; top: 5px; right: 3px;"><a target="_blank" href="{{preferences.nwInvestigateUrl}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a></div>
    </div>
  `

})

export class SessionWidgetComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private changeDetectionRef: ChangeDetectorRef,
              private el: ElementRef,
              private toolService: ToolService ) {}

  @Input('sessionId') sessionId: number;
  public showAll = false;

  private sessions: any;
  public meta: any;
  private preferences: any;
  private deviceNumber: number;
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

  // Subscriptions
  private sessionsReplacedSubscription: any;
  private sessionPublishedSubscription: any;
  private preferencesChangedSubscription: any;
  private deviceNumberSubscription: any;

  ngOnInit(): void {
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

  ngOnDestroy() {
    this.sessionsReplacedSubscription.unsubscribe();
    this.sessionPublishedSubscription.unsubscribe();
    this.preferencesChangedSubscription.unsubscribe();
    this.deviceNumberSubscription.unsubscribe();
  }

  getMetaKeys(): any {
    let a = [];
    for (let k in this.meta) {
      a.push(k);
    }
    return a;
  }

  showAllClick(): void {
    this.showAll = !this.showAll;
  }

}
