import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, OnChanges, ElementRef, Input, Output, EventEmitter, Renderer, ViewChild, ViewChildren, QueryList, ViewEncapsulation } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
declare var log: any;
import 'rxjs/add/operator/takeWhile';

@Component({
  selector: 'session-details-modal',
  // changeDetection: ChangeDetectionStrategy.OnPush,
  // encapsulation: ViewEncapsulation.None,
  // {{meta.time | fromEpoch}}
  template: `
<modal id="{{id}}" (opened)="opened()" (cancelled)="cancelled()">
  <div class="modal">
    <div class="modal-body" *ngIf="isOpen" style="position: absolute; top: 40px; bottom: 20px; left: 10px; right: 25px; background-color: rgba(128, 128, 128, .95); font-size: 10pt;">


      <div *ngIf="image" style="position: absolute; height: 100%; top: 0; left: 0; width: 75%;">
          <div style="position: relative;" class="imgContainer">
            <img class="myImg" *ngIf="image.contentType == 'image'" [src]="apiServerUrl + image.contentFile" draggable="false">
            <img class="myImg" *ngIf="image.contentType == 'encryptedZipEntry'"  src="/resources/zip_icon_locked.png" draggable="false">
            <img class="myImg" *ngIf="image.contentType == 'unsupportedZipEntry'"  src="/resources/zip_icon_unknown.png" draggable="false">
            <img class="myImg" *ngIf="image.contentType == 'encryptedRarEntry'"  src="/resources/rar_icon_locked.png" draggable="false">

            <div *ngIf="image.contentType == 'hash'" style="text-align: center; color: white;">
              <img class="myImg" src="/resources/executable_hash_icon.png" draggable="false">
              <table class="selectable">
                <tr>
                  <td class="column1">
                    {{toCaps(image.hashType)}} Hash:
                  </td>
                  <td class="value">
                    {{image.hashValue}}
                  </td>
                </tr>
                <tr *ngIf="image.hashFriendly">
                  <td class="column1">
                  {{toCaps(image.hashType)}} Description:
                  </td>
                  <td class="value">
                    {{image.hashFriendly}}
                  </td>
                </tr>
                <tr>
                  <td class="column1">
                    Filename:
                  </td>
                  <td class="value">
                    {{reduceContentFile(image.contentFile)}}
                  </td>
                </tr>
              </table>
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
                    <ul-accordion *ngIf="meta[key]">
                      <accordion-li *ngFor="let value of meta[key]">{{value}}</accordion-li>
                    </ul-accordion>
                    <i *ngIf="!meta[key]" class="fa fa-ban" style="color: red;"></i>
                  </td>
                </tr>
              </table>
            </div>

            <div *ngIf="!hideAllMeta && blip" style="width: 100%; height: 90%; overflow: auto; padding-right: 20px;">
              <table>
                <tr><td class="metalabel">time</td><td class="metavalue">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
                <tr *ngFor="let key of getMetaKeys()">
                  <td class="metalabel">{{key}}</td>
                  <td>
                    <ul-accordion>
                      <accordion-li *ngFor="let value of meta[key]">{{value}}</accordion-li>
                    </ul-accordion>
                  </td>
                </tr>
              </table>
            </div>

            <div (click)="cancelled()" style="position: absolute; top: 2px; right: 5px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>
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
    max-height: 95%;
    max-width: 95%;
  }

  .imgContainer {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .column1 {
    white-space: nowrap;
    width: 1px;
    font-weight: bold;
    vertical-align: top;
    text-align: right;
  }

  .value {
    word-wrap: break-word;
    word-break: break-all;
    text-align: left;
  }
  `]
})

export class SessionDetailsModalComponent implements OnInit, OnDestroy {

  constructor(private dataService : DataService,
              private modalService: ModalService,
              private renderer: Renderer,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolService ) {}

  @Input('id') public id: string;
  @Input('apiServerUrl') apiServerUrl: string;
  @ViewChild('showAll') showAll: ElementRef;

  private alive: boolean = true;
  private blip: boolean = true;
  public image: any;
  private session: any;
  public meta: any;
  public sessionId: number;
  public isOpen: boolean = false;
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
                                ]; // these are just defaults in case we can't get them from prefs

  ngOnInit(): void {
    console.log('SessionDetailsModalComponent: ngOnInit()');
    this.dataService.preferencesChanged.takeWhile(() => this.alive).subscribe( (prefs: any) => {  // console.log("prefs observable: ", prefs);
                                                                      this.preferences = prefs;
                                                                      if ( 'displayedKeys' in prefs ) {
                                                                        this.displayedKeys = prefs.displayedKeys;
                                                                      }
                                                                      // this._changeDetectionRef.detectChanges();
                                                                      // this._changeDetectionRef.markForCheck();
                                                                    });
    this.toolService.deviceNumber.takeWhile(() => this.alive).subscribe( ($event: any) => this.deviceNumber = $event.deviceNumber );
    this.dataService.getPreferences();

    this.toolService.newSession.takeWhile(() => this.alive).subscribe( (session: any) => {
      console.log('SessionDetailsModalComponent: newSessionSubscription: Got new session', session);
      this.session = session;
      this.meta = session.meta;
      this.blip = true;
    });

    this.toolService.newImage.takeWhile(() => this.alive).subscribe( (image: any) => {
      console.log('SessionDetailsModalComponent: newImageSubscription: Got new image:', image)
      this.image = image;
      this.sessionId = this.image.session;
      // this.pdfFile = this.image.contentFile;
      // this.pdfFileUrl = this.apiServerUrl + this.pdfFile;
    });
  }

  public ngOnDestroy() {
    this.alive = false;
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
    // this._changeDetectionRef.detectChanges();
    // this._changeDetectionRef.markForCheck();
  }

  opened(): void {
    this.dataService.getPreferences();
    this.isOpen = true;
    setTimeout( () => this.blip = true );
  }

  cancelled(): void {
    console.log('SessionDetailsModalComponent: cancelled()');
    this.modalService.close(this.id);
    setTimeout( () => this.blip = false );
    this.isOpen = false;
  }

  reduceContentFile(s: string): string {
    const RE = /([^/]*)$/;
    let match = RE.exec(s);
    console.log(match[0]);
    return match[0];
  }

  toCaps(s: string) {
    return s.toUpperCase();
  }

}
