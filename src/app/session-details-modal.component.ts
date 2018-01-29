import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, OnChanges, ElementRef, Input, Output, EventEmitter, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs/Subscription';
import * as utils from './utils';
import * as log from 'loglevel';

@Component({
  selector: 'session-details-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // encapsulation: ViewEncapsulation.None,
  // {{meta.time | fromEpoch}}
  template: `
<modal id="{{id}}" (opened)="opened()" (cancelled)="cancelled()">
  <div class="modal">
    <div class="modal-body" *ngIf="isOpen" style="position: absolute; top: 40px; bottom: 20px; left: 10px; right: 25px; background-color: rgba(128, 128, 128, .95); font-size: 10pt;">


      <div *ngIf="content" style="position: absolute; height: 100%; top: 0; left: 0; right: 350px;">
        <div style="position: relative;" class="imgContainer">
          <img class="myImg" *ngIf="content.contentType == 'image'" [src]="apiServerUrl + content.contentFile" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'encryptedZipEntry'"  src="/resources/zip_icon_locked.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'unsupportedZipEntry'"  src="/resources/zip_icon_unknown.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'encryptedRarEntry'"  src="/resources/rar_icon_locked.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'encryptedRarTable'"  src="/resources/rar_icon_locked.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'hash' && content.hashType == 'md5'" src="/resources/md5_hash_icon.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'hash' && content.hashType == 'sha1'" src="/resources/sha1_hash_icon.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'hash' && content.hashType == 'sha256'" src="/resources/sha256_hash_icon.png" draggable="false">

          <div *ngIf="content.fromArchive || content.isArchive" style="position: absolute; top: 5px; right: 15px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
            <span *ngIf="content.isArchive" style="display: inline-block; vertical-align: middle;">{{utils.pathToFilename(content.contentFile)}}</span>
            <span *ngIf="content.fromArchive" style="display: inline-block; vertical-align: middle;">{{utils.pathToFilename(content.archiveFilename)}}</span>
            <span *ngIf="content.contentType == 'encryptedZipEntry' || content.contentType == 'unsupportedZipEntry' || content.contentType == 'encryptedRarEntry' || content.contentType ==  'encryptedRarTable'" class="fa fa-lock" style="display: inline-block; vertical-align: middle;">&nbsp;</span>
            <span class="fa fa-file-archive-o" style="display: inline-block; vertical-align: middle;">&nbsp;</span>
          </div>

          <div style="position: relative; text-align: center; color: white; max-width: 50%;">

            <div style="text-align: left;">
              <div *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedZipEntry'">
                <h3>Encrypted file within a {{utils.toCaps(content.archiveType)}} archive</h3>
              </div>
              <div *ngIf="content.contentType == 'unsupportedZipEntry'">
                <h3>Unsupported ZIP format</h3>
              </div>
              <div *ngIf="content.contentType == 'encryptedRarTable'">
                <h3>RAR archive has an encrypted table</h3>
              </div>
              <div *ngIf="content.contentType == 'hash'">
                <h3>Found executable matching {{utils.toCaps(content.hashType)}} hash value</h3>
              </div>
              <div *ngIf="content.contentType == 'pdf' && content.textDistillationEnabled && content.textTermsMatched?.length > 0">
                <h3>Found PDF document containing text term</h3>
              </div>
              <div *ngIf="content.contentType == 'office' && content.textDistillationEnabled && content.textTermsMatched?.length > 0">
                <h3>Found Office {{utils.capitalizeFirstLetter(content.contentSubType)}} document containing text term</h3>
              </div>
              <div *ngIf="content.contentType == 'pdf' && content.regexDistillationEnabled && content.regexTermsMatched?.length > 0">
                <h3>Found PDF document matching Regex term</h3>
              </div>
              <div *ngIf="content.contentType == 'office' && content.regexDistillationEnabled && content.regexTermsMatched?.length > 0">
                <h3>Found Office {{utils.capitalizeFirstLetter(content.contentSubType)}} document matching Regex term</h3>
              </div>
            </div>

            <table *ngIf="content.contentType != 'img'" class="selectable">
              <tr *ngIf="content.contentType == 'hash'">
                <td class="column1">{{utils.toCaps(content.hashType)}} Hash:</td>
                <td class="value">{{content.hashValue}}</td>
              </tr>
              <tr *ngIf="content.contentType == 'hash' && content.hashFriendly">
                <td class="column1">{{utils.toCaps(content.hashType)}} Description:</td>
                <td class="value">{{content.hashFriendly}}</td>
              </tr>
              <tr *ngIf="content.contentType == 'hash'">
                <td class="column1">Filename:</td>
                <td class="value">{{utils.pathToFilename(content.contentFile)}}</td>
              </tr>
              <tr *ngIf="content.contentType == 'encryptedZipEntry' || content.contentType == 'encryptedRarEntry'">
                <td class="column1">Encrypted File:</td>
                <td class="value">{{utils.pathToFilename(content.contentFile)}}</td>
              </tr>
              <tr *ngIf="content.isArchive">
                <td class="column1">Archive File:</td>
                <td class="value">{{utils.pathToFilename(content.contentFile)}}</td>
              </tr>
              <tr *ngIf="content.fromArchive && content.contentType != 'image'">
                <td class="column1">Archive Filename:</td>
                <td class="value">{{utils.pathToFilename(content.archiveFilename)}}</td>
              </tr>
              <tr *ngIf="content.textDistillationEnabled && content.textTermsMatched?.length > 0">
                <td class="column1">Matched Text:</td>
                <td class="value">{{content.textTermsMatched}}</td>
              </tr>
              <tr *ngIf="content.regexDistillationEnabled && content.regexTermsMatched?.length > 0">
                <td class="column1">Matched RegEx:</td>
                <td class="value">{{content.regexTermsMatched}}</td>
              </tr>
            </table>
          </div>



        </div>
      </div>

      <div style="position: absolute; top: 0; bottom: 0; right: 0; width: 350px; padding: 5px; background-color: rgba(0, 0, 0, .5);">
        <div style="width: 100%; height: 100%; overflow: hidden;" *ngIf="sessionId && meta">
          <h3 style="margin-top: 7px; color: white;">Session {{sessionId}} Details</h3>

          <div *ngIf="!showAll" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
            <table class="wrap" style="width: 100%; table-layout: fixed;">
              <tr><td class="metalabel" style="width: 40%;">time</td><td class="metavalue" style="width: 60%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
              <tr *ngFor="let key of displayedKeys">
                <td class="metalabel">{{key}}</td>
                <td>
                  <meta-accordion class="metavalue" *ngIf="meta[key]" [items]="meta[key]"></meta-accordion>
                  <i *ngIf="!meta[key]" class="fa fa-ban" style="color: red;"></i>
                </td>
              </tr>
            </table>
          </div>

          <div *ngIf="showAll" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
            <table class="wrap" style="width: 100%; table-layout: fixed;">
              <tr><td class="metalabel" style="width: 40%;">time</td><td class="metavalue" style="width: 60%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
              <tr *ngFor="let key of getMetaKeys()">
                <td class="metalabel">{{key}}</td>
                <td>
                  <meta-accordion class="metavalue" [items]="meta[key]"></meta-accordion>
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
    text-align: left;
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
              private toolService: ToolService,
              private changeDetectionRef: ChangeDetectorRef ) {}

  @Input('id') public id: string;
  @Input('apiServerUrl') apiServerUrl: string;

  public utils = utils;
  public showAll = false;
  public content: any;
  private session: any;
  public meta: any;
  public sessionId: number;
  public isOpen = false;
  private hideAllMeta = true;
  private preferences: any;
  private deviceNumber: number;
  private displayedKeys: any =  [
    // these are just defaults in case we can't get them from prefs
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
  private deviceNumberSubscription: Subscription;
  private preferencesChangedSubscription: Subscription;
  private newSessionSubscription: Subscription;
  private newImageSubscription: Subscription;


  ngOnInit(): void {
    log.debug('SessionDetailsModalComponent: ngOnInit()');
    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: any) => {
                                                                      // log.debug("prefs observable: ", prefs);
                                                                      this.preferences = prefs;
                                                                      if ( 'displayedKeys' in prefs ) {
                                                                        this.displayedKeys = prefs.displayedKeys;
                                                                        this.changeDetectionRef.markForCheck();
                                                                      }
                                                                    });
    this.deviceNumberSubscription = this.toolService.deviceNumber.subscribe( ($event: any) => {
      this.deviceNumber = $event.deviceNumber;
      this.changeDetectionRef.markForCheck();
    });

    this.newSessionSubscription = this.toolService.newSession.subscribe( (session: any) => {
      log.debug('SessionDetailsModalComponent: newSessionSubscription: Got new session', session);
      this.session = session;
      this.meta = session.meta;
      this.changeDetectionRef.markForCheck();
    });

    this.newImageSubscription = this.toolService.newImage.subscribe( (content: any) => {
      log.debug('SessionDetailsModalComponent: newcontentSubscription: Got new content:', content);
      this.content = content;
      this.sessionId = this.content.session;
      this.changeDetectionRef.markForCheck();
      // this.pdfFile = this.content.contentFile;
      // this.pdfFileUrl = this.apiServerUrl + this.pdfFile;
    });
  }

  public ngOnDestroy() {
    this.preferencesChangedSubscription.unsubscribe();
    this.deviceNumberSubscription.unsubscribe();
    this.newSessionSubscription.unsubscribe();
    this.newImageSubscription.unsubscribe();
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

  showAllClick(): void {
    this.showAll = !this.showAll;
  }

  opened(): void {
    this.isOpen = true;
  }

  cancelled(): void {
    log.debug('SessionDetailsModalComponent: cancelled()');
    this.modalService.close(this.id);
    this.isOpen = false;
  }

}
