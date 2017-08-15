import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, OnChanges, ElementRef, Input, Output, EventEmitter, ViewChild, ViewChildren, QueryList, ViewEncapsulation } from '@angular/core';
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


        <div style="position: absolute; top: 0; bottom: 0; right: 0; width: 350px; padding: 5px; background-color: rgba(0, 0, 0, .5);">
          <div style="width: 100%; height: 100%; overflow: hidden;" *ngIf="sessionId && meta">
            <h3 style="margin-top: 7px; color: white;">Session {{sessionId}} Details</h3>

            <div *ngIf="!showAll && blip" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
              <table class="wrap" style="width: 100%; table-layout: fixed;">
                <tr><td class="metalabel" style="width: 40%;">time</td><td class="metavalue" style="width: 60%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
                <tr *ngFor="let key of displayedKeys">
                  <td class="metalabel">{{key}}</td>
                  <td>
                    <ul-accordion class="metavalue" *ngIf="meta[key]">
                      <accordion-li *ngFor="let value of meta[key]"><span class="expanded">{{value}}</span></accordion-li>
                    </ul-accordion>
                    <i *ngIf="!meta[key]" class="fa fa-ban" style="color: red;"></i>
                  </td>
                </tr>
              </table>
            </div>

            <div *ngIf="showAll && blip" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
              <table class="wrap" style="width: 100%; table-layout: fixed;">
                <tr><td class="metalabel" style="width: 40%;">time</td><td class="metavalue" style="width: 60%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
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

            <div (click)="cancelled()" style="position: absolute; top: 2px; right: 5px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>
            <div (click)="showAllClick()" style="position: absolute; top: 2px; right: 60px; color: white;"><i [class.fa-eye-slash]="!showAll" [class.fa-eye]="showAll" class="fa fa-2x fa-fw"></i></div>
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

  .expanded {
    background-color: rgb(186, 48, 141);;
  }
  `]
})

export class SessionDetailsModalComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService ) {}

  @Input('id') public id: string;
  @Input('apiServerUrl') apiServerUrl: string;

  public showAll = false;
  private alive = true;
  private blip = true;
  public image: any;
  private session: any;
  public meta: any;
  public sessionId: number;
  public isOpen = false;
  private hideAllMeta = true;
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
    log.debug('SessionDetailsModalComponent: ngOnInit()');
    this.dataService.preferencesChanged.takeWhile(() => this.alive).subscribe( (prefs: any) => {  // log.debug("prefs observable: ", prefs);
                                                                      this.preferences = prefs;
                                                                      if ( 'displayedKeys' in prefs ) {
                                                                        this.displayedKeys = prefs.displayedKeys;
                                                                      }
                                                                    });
    this.toolService.deviceNumber.takeWhile(() => this.alive).subscribe( ($event: any) => this.deviceNumber = $event.deviceNumber );
    this.dataService.getPreferences();

    this.toolService.newSession.takeWhile(() => this.alive).subscribe( (session: any) => {
      log.debug('SessionDetailsModalComponent: newSessionSubscription: Got new session', session);
      this.session = session;
      this.meta = session.meta;
      this.blip = true;
    });

    this.toolService.newImage.takeWhile(() => this.alive).subscribe( (image: any) => {
      log.debug('SessionDetailsModalComponent: newImageSubscription: Got new image:', image);
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
    let a = [];
    for (let k in this.meta) {
      a.push(k);
    }
    return a;
  }

  showAllClick(): void {
    this.showAll = !this.showAll;
  }

  opened(): void {
    this.dataService.getPreferences();
    this.isOpen = true;
    setTimeout( () => this.blip = true );
  }

  cancelled(): void {
    log.debug('SessionDetailsModalComponent: cancelled()');
    this.modalService.close(this.id);
    setTimeout( () => this.blip = false );
    this.isOpen = false;
  }

  reduceContentFile(s: string): string {
    const RE = /([^/]*)$/;
    let match = RE.exec(s);
    log.debug(match[0]);
    return match[0];
  }

  toCaps(s: string) {
    return s.toUpperCase();
  }

}
