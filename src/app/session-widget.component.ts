import { Component, ChangeDetectorRef, OnInit, OnDestroy, OnChanges, ElementRef, ViewChild, Input, ViewEncapsulation } from '@angular/core';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
import 'rxjs/add/operator/takeWhile';
declare var log: any;

@Component( {
  selector: 'session-widget',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div style="display: flex; flex-direction: column; position: relative; width: 100%; height: 100%;" *ngIf="sessionId && meta">
      <h3 style="margin-top: 10px; margin-bottom: 5px;">Session {{sessionId}} Details</h3>
      <div style="flex-grow: 1; overflow: auto;">

        <div *ngIf="!showAll" style="position: relative; width: 100%; height: 100%; overflow: auto;">
          <table *ngIf="blip" class="wrap" style="width: 100%; table-layout: fixed;">
            <tr><td class="metalabel" style="width: 35%;">time</td><td class="metavalue" style="width: 65%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
            <tr *ngFor="let key of displayedKeys">
              <td class="metalabel">{{key}}</td>
              <td>
                <ul-accordion *ngIf="meta[key]" class="metavalue">
                  <accordion-li *ngFor="let value of meta[key]"><span class="expanded">{{value}}</span></accordion-li>
                </ul-accordion>
                <i *ngIf="!meta[key]" class="fa fa-ban" style="color: red;"></i>
              </td>
            </tr>
          </table>
        </div>

        <div *ngIf="showAll" style="position: relative; width: 100%; height: 100%; overflow: auto;">
          <table *ngIf="blip" class="wrap" style="width: 100%; table-layout: fixed;">
            <tr><td class="metalabel" style="width: 35%;">time</td><td class="metavalue" style="width: 65%;">{{meta.time | fromEpoch}}</td></tr>
            <tr *ngFor="let key of getMetaKeys()">
              <td class="metalabel">{{key}}</td>
              <td>
                <ul-accordion class="metavalue">
                  <accordion-li *ngFor="let value of meta[key]"><span class="expanded">{{value}}</span></accordion-li>
                </ul-accordion>
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

export class SessionWidgetComponent implements OnInit, OnDestroy, OnChanges {

  constructor(private dataService: DataService,
              private changeDetectionRef: ChangeDetectorRef,
              private el: ElementRef,
              private toolService: ToolService ) {}

  @Input('sessionId') sessionId: number;
  private alive = true;
  public showAll = false;

  private sessions: any;
  public meta: any;
  private blip = false;
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

  ngOnInit(): void {
    this.dataService.sessionsChanged.takeWhile(() => this.alive).subscribe( (s: any) => { // log.debug("sessionsChanged", s);
      this.sessions = s;
    });

    this.dataService.sessionPublished.takeWhile(() => this.alive).subscribe( (s: any) => {  // log.debug("sessionPublished", s);
      let sessionId = s.id;
      this.sessions[sessionId] = s;
    });

    this.dataService.preferencesChanged.takeWhile(() => this.alive).subscribe( (prefs: any) => {  // log.debug("prefs observable: ", prefs);
      this.preferences = prefs;
      if ( 'displayedKeys' in prefs ) {
        this.displayedKeys = prefs.displayedKeys;
      }
    });

    this.toolService.deviceNumber.takeWhile(() => this.alive).subscribe( ($event: any) => this.deviceNumber = $event.deviceNumber );

    this.dataService.getPreferences();
  }

  ngOnDestroy() {
    this.alive = false;
  }

  ngOnChanges(e: any): void {
    if (e.sessionId && 'currenvValue' in e.sessionId) {

    }
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
