import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, OnChanges, ElementRef, ViewChild, Input, Renderer, ViewEncapsulation } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
import 'rxjs/add/operator/takeWhile';
declare var log: any;

@Component( {
  selector: 'session-widget',
  // encapsulation: ViewEncapsulation.None,
  // changeDetection: ChangeDetectionStrategy.OnPush,
  // [updated]="updated"

  template: `
<div #topDiv [@faderAnimation]="enabledTrigger" style="position: absolute; right: 0; top: 0px; width: 325px; height: 100%; background-color: rgba(0,0,0,.8); padding: 5px; color: white; font-size: 12px;">
  <div style="width: 100%; height: 100%; overflow: hidden;" *ngIf="sessionId && meta">
    <h3>Session {{sessionId}} Details</h3>

    <div *ngIf="hideAllMeta" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
      <table *ngIf="blip">
        <tr><td class="metalabel">time</td><td class="metavalue">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
        <tr *ngFor="let key of displayedKeys">
          <td class="metalabel">{{key}}</td>
          <td>
            <ul-accordion *ngIf="meta[key]">
              <accordion-li *ngFor="let value of meta[key]">{{value}}</accordion-li>
            </ul-accordion>
            <i *ngIf="!meta[key]" class="fa fa-ban" style="color: red;"></i>
          </td>
        </tr>
      </table>
    </div>

    <div *ngIf="!hideAllMeta" style="width: 100%; height: 90%; overflow: auto; padding-right: 20px;">
      <table *ngIf="blip">
        <tr><td class="metalabel">time</td><td class="metavalue">{{meta.time | fromEpoch}}</td></tr>
        <tr *ngFor="let key of getMetaKeys()">
          <td class="metalabel">{{key}}</td>
          <td>
            <ul-accordion >
              <accordion-li *ngFor="let value of meta[key]">{{value}}</accordion-li>
            </ul-accordion>
          </td>
        </tr>
      </table>
    </div>

    <div (click)="showAllClick()" style="position: absolute; top: 15px; right: 40px;"><i #showAll class="fa fa-eye-slash fa-2x fa-fw"></i></div>
    <div *ngIf="preferences.nwInvestigateUrl && deviceNumber && sessionId" style="position: absolute; top: 15px; right: 3px;"><a target="_blank" href="{{preferences.nwInvestigateUrl}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a></div>
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
  `]

} )

//https://172.16.0.56/investigation/13/reconstruction/893035630/AUTO

export class SessionWidgetComponent implements OnInit, OnDestroy, OnChanges {

  constructor(private dataService : DataService,
              private renderer: Renderer,
              private _changeDetectionRef : ChangeDetectorRef,
              private el: ElementRef,
              private toolService: ToolService ) {}

  @ViewChild('topDiv') topDiv: ElementRef;
  @ViewChild('showAll') showAll: ElementRef;
  @Input('sessionId') sessionId: number;
  @Input('enabled') enabled: number;
  private alive: boolean = true;
  private deviceNumber: number;
  public enabledTrigger: string;
  private preferences: any;
  private sessions: any;
  public meta: any; //contains meta
  private nativeElement = this.el.nativeElement;
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


  ngOnInit() : void {
    this.enabledTrigger = 'disabled';
    this.dataService.sessionsChanged.takeWhile(() => this.alive).subscribe( (s: any) => { //console.log("sessionsChanged", s);
                                                              this.sessions = s;
                                                              //this._changeDetectionRef.detectChanges();
                                                              //this._changeDetectionRef.markForCheck();
                                                            });
    this.dataService.sessionPublished.takeWhile(() => this.alive).subscribe( (s: any) => {  //console.log("sessionPublished", s);
                                                                let sessionId = s.id;
                                                                this.sessions[sessionId] = s;
                                                                //this._changeDetectionRef.detectChanges();
                                                                //this._changeDetectionRef.markForCheck();
                                                              });
    this.dataService.preferencesChanged.takeWhile(() => this.alive).subscribe( (prefs: any) => {  //console.log("prefs observable: ", prefs);
                                                                      this.preferences = prefs;
                                                                      if ( 'displayedKeys' in prefs ) {
                                                                        this.displayedKeys = prefs.displayedKeys;
                                                                      }
                                                                      //this._changeDetectionRef.detectChanges();
                                                                      //this._changeDetectionRef.markForCheck();
                                                                    });
    this.toolService.deviceNumber.takeWhile(() => this.alive).subscribe( ($event: any) => this.deviceNumber = $event.deviceNumber );
    this.dataService.getPreferences();
  }

  public ngOnDestroy() {
    this.alive = false;
  }

  private metaUpdated: boolean = false;

  getMetaForKey(k: string): any {
    //console.log("getMetaForKey()", this.meta[k]);
    return this.meta[k];
  }

  getMetaKeys(): any {
    var a = [];
    for (var k in this.meta) {
      a.push(k);
    }
    return a;
  }

  private blip: boolean = false;

  ngOnChanges(): void {
    //console.log("SessionWidgetComponent ngOnChanges()", this.enabled);

    if (this.enabled ) { this.blip = true; this.enabledTrigger = 'enabled'; } //for some odd reason, we can't use shortcut syntax as it evidently doesn't change the var reference
    else { this.blip = false; this.enabledTrigger = 'disabled'}
    console.log("enabled:", this.enabled);
    console.log("blip:", this.blip);
    console.log("enabledTrigger:", this.enabledTrigger);

    //this._changeDetectionRef.markForCheck();

    if (this.sessionId) {
      if ( this.sessionId in this.sessions ) {
        //console.log("session id " + this.sessionId + ' found');
        this.meta = this.sessions[this.sessionId].meta;
        this.toolService.newSession.next(this.sessions[this.sessionId]);
        //this.updated = this.updated + 1;
        //this.metaUpdated = false;
        //this.metaUpdated = true;
        //this._changeDetectionRef.detectChanges();
        //this._changeDetectionRef.markForCheck();
      }
//      else {
//        console.log("session id " + this.sessionId + ' not found!');
//      }
    }
    //this.enabledTrigger = this.enabled ? 'enabled' : 'disabled';
    //this._changeDetectionRef.detectChanges();
    //this._changeDetectionRef.markForCheck();
  }

  private hideAllMeta: boolean = true;

  showAllClick(): void {
    if ( this.hideAllMeta ) {
      this.renderer.setElementClass(this.showAll.nativeElement, 'fa-eye-slash', false);
      this.renderer.setElementClass(this.showAll.nativeElement, 'fa-eye', true);
    }
    else {
      this.renderer.setElementClass(this.showAll.nativeElement, 'fa-eye', false);
      this.renderer.setElementClass(this.showAll.nativeElement, 'fa-eye-slash', true);
    }
    this.hideAllMeta = !this.hideAllMeta;
    //this._changeDetectionRef.detectChanges();
    //this._changeDetectionRef.markForCheck();
  }

}
