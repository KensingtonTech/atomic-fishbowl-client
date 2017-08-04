import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnChanges, ElementRef, Input, Output, EventEmitter, Renderer, ViewChild, ViewChildren, QueryList, ViewEncapsulation } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
import { ToolWidgetCommsService } from './tool-widget.comms.service';
import { LoggerService } from './logger-service';

@Component({
  selector: 'session-details-modal',
  //changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  //style="width: 75%; max-width: 1100px; height: 70%; background-color: white; font-size: 10pt;"
  template: `

<modal id="{{id}}" (opened)="onOpen()" (cancelled)="closeModal()">
  <div class="modal">
    <div class="modal-body imgContainer" style="position: absolute; top: 60px; left: 100px; right: 100px; height: 85%; background-color: rgba(128, 128, 128, .95); font-size: 10pt;">


      <div *ngIf="image" style="position: absolute; height: 100%; top: 0; left: 0; width: 75%;">
        <div style="position: relative;" class="imgContainer">
          <img class="myImg" *ngIf="image.contentType != 'encryptedZipEntry' && image.contentType != 'unsupportedZipEntry' && image.contentType != 'encryptedRarEntry' && image.contentType != 'md5Matched'" [src]="apiServerUrl + image.image" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false">
          <img class="myImg" *ngIf="image.contentType == 'encryptedZipEntry'"  src="/resources/zip_icon_locked.png" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false">
          <img class="myImg" *ngIf="image.contentType == 'unsupportedZipEntry'"  src="/resources/zip_icon_unknown.png" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false">
          <img class="myImg" *ngIf="image.contentType == 'encryptedRarEntry'"  src="/resources/rar_icon_locked.png" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false">
          <div *ngIf="image.contentType == 'md5Matched'">
            <img class="myImg" src="/resources/executable_hash_icon.png" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false" [attr.md5Hash]="image.md5Hash">
            <p style="color: white;"><b>MD5 Hash:</b> {{image.md5Hash}}</p>
          </div>
        </div>
      </div>


      <div style="position: absolute; height: 100%; top: 0px; right: 0; width: 350px; padding: 5px; background-color: rgba(0, 0, 0, .5);">
        <div style="width: 100%; height: 100%; overflow: hidden;" *ngIf="sessionId && meta">
          <h3 style="margin-top: 7px; color: white;">Session {{sessionId}} Details</h3>

          <div *ngIf="hideAllMeta && blip" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
            <table>
              <tr><td class="metalabel">time</td><td class="metavalue">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
              <tr *ngFor="let key of displayedKeys">
                <td class="metalabel">{{key}}</td>
                <td>
                  <ul-accordion>
                    <accordion-li *ngFor="let value of getMetaForKey(key)">{{value}}</accordion-li>
                  </ul-accordion>
                </td>
              </tr>
            </table>
          </div>

          <div *ngIf="!hideAllMeta && blip" style="width: 100%; height: 90%; overflow: auto; padding-right: 20px;">
            <table>
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

          <div (click)="closeModal()" style="position: absolute; top: 2px; right: 5px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>
          <div (click)="showAllClick()" style="position: absolute; top: 2px; right: 60px; color: white;"><i #showAll class="fa fa-eye-slash fa-2x fa-fw"></i></div>
          <div *ngIf="preferences.nwInvestigateUrl && deviceNumber && sessionId" style="position: absolute; top: 2px; right: 30px;"><a target="_blank" href="{{preferences.nwInvestigateUrl}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a></div>
        </div>
      </div>



    </div>
  </div>
</modal>
  `,
  styles: [`

  .myImg {
    width: auto;
    height: auto;
    max-width: 99%;
  }

  .imgContainer {
    height: 100%;
    display:flex;
    align-items:center;
    justify-content:center;
  }

  .metalabel {
    color: rgb(118,143,181);
    color: white;
    font-weight: bold;
    vertical-align: top;
    font-size: 12px;
  }

  .metavalue {
    color: rgb(0,0,0);
    color: white;
    font-size: 10px;
  }

  .multiValues {
    background-color: rgba(36, 109, 226, 0.65);
    color: white;
  }
  `]
})

export class SessionDetailsModalComponent implements OnInit {

  constructor(private dataService : DataService,
              private modalService: ModalService,
//              private el: ElementRef,
              private renderer: Renderer,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolWidgetCommsService,
              private loggerService: LoggerService ) {}

  @Input('id') id: string;
  @Input('apiServerUrl') apiServerUrl: string;
  @Input('sessionDetails') sessionDetails: any = {};
  @ViewChild('showAll') showAll: ElementRef;

  private blip: boolean = true;
  public image: any;
  private session: any;
  public meta: any;
  public sessionId: number;
  private hideAllMeta: boolean = true;
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
                                ]; //these are just defaults in case we can't get them from prefs

  ngOnInit(): void {
    this.dataService.preferencesChanged.subscribe( (prefs: any) => {  //console.log("prefs observable: ", prefs);
                                                                      this.preferences = prefs;
                                                                      if ( 'displayedKeys' in prefs ) {
                                                                        this.displayedKeys = prefs.displayedKeys;
                                                                      }
                                                                      //this._changeDetectionRef.detectChanges();
                                                                      //this._changeDetectionRef.markForCheck();
                                                                    });
    this.toolService.deviceNumber.subscribe( ($event: any) => this.deviceNumber = $event.deviceNumber );
    this.dataService.getPreferences();

    this.toolService.newSession.subscribe( (session: any) => {
      console.log("got new session", session);
      this.session = session;
      this.meta = session.meta;
      this.blip = true;
    });

    this.toolService.newImage.subscribe( (image: any) => {
      console.log("got new image:", image)
      this.image = image;
      this.sessionId = this.image.session;
      //this.pdfFile = this.image.contentFile;
      //this.pdfFileUrl = this.apiServerUrl + this.pdfFile;
    });
  }

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

  onOpen(): void {
    this.dataService.getPreferences();
    //setTimeout( () => this.blip = true );
    //this.blip = true;
  }

  closeModal(): void {
    console.log("SessionDetailsModalComponent closeModal()");
    //setTimeout( () => this.blip = false );
    this.blip = false;
    this.modalService.close(this.id);
  }

}
