import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, OnChanges, ElementRef, Input, Output, EventEmitter, ViewChild, ViewChildren, QueryList, Renderer2 } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs/Subscription';
import { Preferences } from './preferences';
import * as utils from './utils';
declare var log;

export enum KEY_CODE {
  RIGHT_ARROW = 39,
  LEFT_ARROW = 37
}

@Component({
  selector: 'session-details-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // encapsulation: ViewEncapsulation.None,
  template: `
<modal id="{{id}}" (opened)="onOpen()" (closed)="onClosed()">
  <div class="modal">

    <div class="modal-body" *ngIf="isOpen" style="position: absolute; top: 40px; bottom: 20px; left: 10px; right: 25px; background-color: rgba(128, 128, 128, .95); font-size: 10pt;">

      <!-- Top Bar / Menu Bar -->
      <div style="position: absolute; left: 0; right: 365px; top: 0; height: 30px;">

        <!-- filename -->
        <div style="position: absolute; top: 5px; left: 10px; width: 85%; white-space: nowrap; color: white;">
          <span class="fa fa-lg" [class.fa-lock]="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedRarTable' || content.contentType == 'encryptedZipEntry'" [class.fa-file-image-o]="content.contentType == 'image'" [class.fa-hashtag]="content.contentType == 'hash'"></span>
          <span style="vertical-align: middle;">{{utils.pathToFilename(content.contentFile)}}</span>
        </div>

        <div style="position: absolute; top: 5px; right: 15px; text-align: right;">

          <div *ngIf="content.fromArchive || content.isArchive" style="display: inline-block; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 4px;">
            <span *ngIf="content.isArchive" style="display: inline-block; vertical-align: middle;">{{utils.pathToFilename(content.contentFile)}}&nbsp;</span>
            <span *ngIf="content.fromArchive" style="display: inline-block; vertical-align: middle;">{{utils.pathToFilename(content.archiveFilename)}}&nbsp;</span>
            <span *ngIf="content.contentType == 'encryptedZipEntry' || content.contentType == 'unsupportedZipEntry' || content.contentType == 'encryptedRarEntry' || content.contentType ==  'encryptedRarTable'" class="fa fa-lock fa-lg" style="display: inline-block; vertical-align: middle;">&nbsp;</span>
            <span class="fa fa-file-archive-o fa-lg" style="display: inline-block; vertical-align: middle;">&nbsp;</span>
            <span>{{content.archiveType | allCaps}}</span>
          </div>

          <!-- next / previous buttons -->
          <span class="fa fa-arrow-circle-o-left fa-2x" style="vertical-align: bottom;" [class.disabled]="noPreviousSession" (click)="onPreviousSessionArrowClicked()" pTooltip="Previous session"></span>
          <span class="fa fa-arrow-circle-o-right fa-2x" style="vertical-align: bottom;" [class.disabled]="noNextSession" (click)="onNextSessionArrowClicked()" pTooltip="Next session"></span>

        </div>

      </div>

      <!--<div *ngIf="content" style="position: absolute; height: 100%; top: 0; left: 0; right: 350px;">-->
      <div *ngIf="content" style="position: absolute; top: 40px; bottom: 10px; left: 0; right: 365px;">

        <div style="position: relative;" class="imgContainer">
          <img class="myImg" *ngIf="content.contentType == 'image'" [src]="'/collections/' + collectionId + '/' + content.contentFile" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'encryptedZipEntry'"  src="/resources/zip_icon_locked.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'unsupportedZipEntry'"  src="/resources/zip_icon_unknown.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'encryptedRarEntry'"  src="/resources/rar_icon_locked.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'encryptedRarTable'"  src="/resources/rar_icon_locked.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'hash' && content.hashType == 'md5'" src="/resources/md5_hash_icon.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'hash' && content.hashType == 'sha1'" src="/resources/sha1_hash_icon.png" draggable="false">
          <img class="myImg" *ngIf="content.contentType == 'hash' && content.hashType == 'sha256'" src="/resources/sha256_hash_icon.png" draggable="false">

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
          <h3 *ngIf="serviceType == 'nw'" style="margin-top: 7px; color: white;">Session {{sessionId}} Details</h3>
          <h3 *ngIf="serviceType == 'sa'" style="margin-top: 7px; color: white;">Flow {{sessionId}} Details</h3>

          <div *ngIf="!showAll" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
            <table class="wrap" style="width: 100%; table-layout: fixed;">
              <tr>
                <td class="metalabel" style="width: 40%;">time</td>
                <td *ngIf="serviceType == 'nw'" class="metavalue" style="width: 60%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
                <td *ngIf="serviceType == 'sa'" class="metavalue" style="width: 60%;">{{meta.stop_time | formatSaTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
              </tr>
              <tr *ngFor="let key of displayedKeys">
                <td class="metalabel">{{key}}</td>
                <td>
                  <meta-accordion class="metavalue" *ngIf="meta[key]" [items]="meta[key]" [key]="key"></meta-accordion>
                  <i *ngIf="!meta[key]" class="fa fa-ban" style="color: red;"></i>
                </td>
              </tr>
            </table>
          </div>

          <div *ngIf="showAll" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
            <table class="wrap" style="width: 100%; table-layout: fixed;">
              <tr>
                <td class="metalabel" style="width: 40%;">time</td>
                <td *ngIf="serviceType == 'nw'" class="metavalue" style="width: 60%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
                <td *ngIf="serviceType == 'sa'" class="metavalue" style="width: 60%;">{{meta.stop_time | formatSaTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
              </tr>
              <tr *ngFor="let key of getMetaKeys()">
                <td class="metalabel">{{key}}</td>
                <td>
                  <meta-accordion class="metavalue" [items]="meta[key]" [key]="key"></meta-accordion>
                </td>
              </tr>
            </table>
          </div>

          <!-- cancel -->
          <div (click)="onCancelClicked()" style="position: absolute; top: 2px; right: 5px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>

          <!-- show/hide eyeball-->
          <div (click)="showAllClick()" style="position: absolute; top: 2px; right: 60px; color: white;"><i [class.fa-eye-slash]="!showAll" [class.fa-eye]="showAll" class="fa fa-2x fa-fw"></i></div>

          <!-- bullseyes -->
          <div *ngIf="serviceType == 'nw' && preferences.nw.url && deviceNumber && sessionId" style="position: absolute; top: 2px; right: 30px;">
            <a target="_blank" href="{{preferences.nw.url}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a>
          </div>
          <div *ngIf="serviceType == 'sa' && preferences.sa.url && sessionId" style="position: absolute; top: 2px; right: 30px;">
            <a target="_blank" href="{{saUrlGetter(sessionId)}}"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a>
          </div>
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

  .disabled {
    color: white;
  }

  .fa-lock, .fa-hashtag {
    color: red;
  }

  .fa-file-image-o {
    color: yellow;
  }
  `]
})

export class SessionDetailsModalComponent implements OnInit, OnDestroy, OnChanges {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService,
              private changeDetectionRef: ChangeDetectorRef,
              private renderer: Renderer2 ) {}

  @Input('id') public id: string;
  @Input() public serviceType: string; // 'nw' or 'sa'
  @Input() public collectionId: string = null;

  public utils = utils;
  public showAll = false;
  public content: any;
  private session: any;
  public meta: any;
  public sessionId: number;
  public isOpen = false;
  private hideAllMeta = true;
  private preferences: Preferences;
  private deviceNumber: number;
  private displayedKeys: string[] =  [];
  public noNextSession = false;
  public noPreviousSession = false;
  private removeKeyupFunc: any;

  // Subscriptions
  private deviceNumberSubscription: Subscription;
  private preferencesChangedSubscription: Subscription;
  private newSessionSubscription: Subscription;
  private newImageSubscription: Subscription;
  private noNextSessionSubscription: Subscription;
  private noPreviousSessionSubscription: Subscription;

  onKeyEvent(event: KeyboardEvent): void {
    event.stopPropagation();
    log.debug('SessionDetailsModalComponent: keyEvent(): isOpen:', this.isOpen);
    if (event.keyCode === KEY_CODE.RIGHT_ARROW) {
      this.onNextSessionArrowClicked();
    }

    if (event.keyCode === KEY_CODE.LEFT_ARROW) {
      this.onPreviousSessionArrowClicked();
    }
  }


  ngOnInit(): void {
    log.debug('SessionDetailsModalComponent: ngOnInit()');
    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) );

    this.deviceNumberSubscription = this.toolService.deviceNumber.subscribe( ($event: any) => {
      this.deviceNumber = $event.deviceNumber;
      this.changeDetectionRef.markForCheck();
    });

    this.newSessionSubscription = this.toolService.newSession.subscribe( (session: any ) => this.onNewSession(session) );

    this.newImageSubscription = this.toolService.newImage.subscribe( (content: any) => this.onNewImage(content) );

    this.noNextSessionSubscription = this.toolService.noNextSession.subscribe( (TorF) => this.noNextSession = TorF);
    this.noPreviousSessionSubscription = this.toolService.noPreviousSession.subscribe( (TorF) => this.noPreviousSession = TorF);
  }



  public ngOnDestroy() {
    this.preferencesChangedSubscription.unsubscribe();
    this.deviceNumberSubscription.unsubscribe();
    this.newSessionSubscription.unsubscribe();
    this.newImageSubscription.unsubscribe();
    this.noNextSessionSubscription.unsubscribe();
    this.noPreviousSessionSubscription.unsubscribe();
  }



  ngOnChanges(values: any) {
    log.debug('SessionDetailsModalComponent ngOnChanges(): values', values);

    /*if ( 'serviceType' in values
        && ( ( values.serviceType.firstChange && values.serviceType.currentValue )
        || ( values.serviceType.currentValue && values.serviceType.currentValue !== values.serviceType.previousValue ) ) ) {
      this.displayedKeys = this.preferences[values.serviceType.currentValue].displayedKeys;
      log.debug('SessionDetailsModalComponent ngOnChanges(): displayedKeys:', this.displayedKeys);
    }*/

  }



  onPreferencesChanged(prefs: Preferences): void {
    log.debug('SessionDetailsModalComponent: onPreferencesChanged(): prefs:', prefs);
    this.preferences = prefs;
    this.displayedKeys = this.preferences[this.serviceType].displayedKeys;
  }



  onNewSession(session): void {
    log.debug('SessionDetailsModalComponent: onNewSession: session:', session);
    this.session = session;
    this.sessionId = this.session['id'];
    this.meta = this.session['meta'];
  }



  onNewImage(content): void {
    log.debug('SessionDetailsModalComponent: onNewImage: content:', content);
    this.content = content;
    this.changeDetectionRef.markForCheck();
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



  onOpen(): void {
    log.debug('SessionDetailsModalComponent: onOpen()');
    this.isOpen = true;
    this.removeKeyupFunc = this.renderer.listen('window', 'keyup', (event) => this.onKeyEvent(event));
  }



  onCancelClicked(): void {
    log.debug('SessionDetailsModalComponent: onCancelClicked()');
    this.isOpen = false;
    this.removeKeyupFunc();
    this.modalService.close(this.id);
  }



  onClosed(): void {
    log.debug('SessionDetailsModalComponent: onClosed()');
    this.isOpen = false;
    this.removeKeyupFunc();
  }



  convertSaTime(value: string) {
    return parseInt(value[0].substring(0, value[0].indexOf(':')), 10) * 1000;
  }



  saUrlGetter(sessionId): string {
    // {{preferences.sa.url}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO
    // let struct = { 'sc' : { 'Extractions' : { 'aC' : 'hT' , 's' : { 'p' : 1, 's' : 25, 'f' : [], 'sf' : 'date', 'sd' : 'ASC'}, 'p' : 0 }, 'Geolocation': { 'rI' : 'ipv4_conversation', 'rT' : 'g', 'sd' : 'd' , 'sc' : 2, 'p' : 0, 's' : 25, 'filters' : {'all' : []}}, 'Reports' : { 'rI' : 'application_id', 'rT' : 'r', 'cT' : 'pie', 'aS' : 'linear', 'cR' : 10, 'sd' : 'd', 'sc' : 'sessions', 'p' : 0, 's' : 25, 'comp' : 'none', 'filters' : {'all' : [] } }, 'Summary' : {'vK' : 1, 'p' : 0}}, 'pb' : ['flow_id=4898292'], 'ca' : { 'start' : 1518021720000, 'end' : 1518108120000}, 'now' : 1518108153464, 'ac': 'Summary' };

    let struct = { 'sc' : { 'Extractions' : { 'aC' : 'hT' , 's' : { 'p' : 1, 's' : 25, 'f' : [], 'sf' : 'date', 'sd' : 'ASC'}, 'p' : 0 }, 'Geolocation': { 'rI' : 'ipv4_conversation', 'rT' : 'g', 'sd' : 'd' , 'sc' : 2, 'p' : 0, 's' : 25, 'filters' : {'all' : []}}, 'Reports' : { 'rI' : 'application_id', 'rT' : 'r', 'cT' : 'pie', 'aS' : 'linear', 'cR' : 10, 'sd' : 'd', 'sc' : 'sessions', 'p' : 0, 's' : 25, 'comp' : 'none', 'filters' : {'all' : [] } }, 'Summary' : {'vK' : 1, 'p' : 0}}, 'ac': 'Summary' };
    struct['pb'] = [ 'flow_id=' + sessionId ];
    let startTime = this.convertSaTime(this.meta['start_time']);
    let stopTime = this.convertSaTime(this.meta['stop_time']);
    struct['ca'] = { 'start' : startTime, 'end': stopTime };
    struct['now'] = new Date().getTime();
    let encoded = btoa(JSON.stringify(struct));
    // log.debug('SessionDetailsModalComponent: saUrlGetter(): struct:', struct);

    return this.preferences.sa.url + '/deepsee/index#' + encoded;
  }



  onNextSessionArrowClicked(): void {
    if (this.noNextSession) {
      return;
    }
    log.debug('SessionDetailsModalComponent: onNextSessionArrowClicked()');
    this.toolService.nextSessionClicked.next();
  }



  onPreviousSessionArrowClicked(): void {
    if (this.noPreviousSession) {
      return;
    }
    log.debug('SessionDetailsModalComponent: onPreviousSessionArrowClicked()');
    this.toolService.previousSessionClicked.next();
  }

}
