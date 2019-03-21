import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, Input, Renderer2 } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs';
import * as utils from './utils';
import { Logger } from 'loglevel';
declare var log: Logger;

export enum KEY_CODE {
  RIGHT_ARROW = 39,
  LEFT_ARROW = 37
}

@Component({
  selector: 'session-details-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<modal id="{{id}}" (opened)="onOpen()" (closed)="onClosed()">
  <div class="modal">

    <div class="modal-body" *ngIf="isOpen" style="position: absolute; top: 40px; bottom: 20px; left: 10px; right: 25px; background-color: rgba(128, 128, 128, .95); font-size: 10pt;">

      <!-- close -->
      <div (click)="onCloseClicked()" style="position: absolute; top: 2px; right: 10px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>

      <!-- Top Bar / Menu Bar -->
      <div *ngIf="isOpen && content" style="position: absolute; left: 0; right: 350px; top: 0; height: 30px; padding-bottom: 2px; background-color: rgba(0, 0, 0, .8); color: white;">

        <!-- filename -->
        <div style="position: absolute; top: 5px; left: 10px; width: 85%; white-space: nowrap; color: white;">
          <span class="fa fa-lg" [ngClass]="iconClass" style="background-color: white;"></span>&nbsp;
          <span style="vertical-align: middle;">{{utils.pathToFilename(content.contentFile)}}</span>
        </div>

        <div style="position: absolute; top: 5px; right: 15px; text-align: right;">

          <div *ngIf="content.fromArchive || content.isArchive" style="display: inline-block; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 4px;">
            <span *ngIf="content.isArchive" style="display: inline-block; vertical-align: middle;">{{utils.pathToFilename(content.contentFile)}}&nbsp;</span>
            <span *ngIf="content.fromArchive" style="display: inline-block; vertical-align: middle;">{{utils.pathToFilename(content.archiveFilename)}}&nbsp;</span>
            <span *ngIf="content.contentType == 'encryptedZipEntry' || content.contentType == 'unsupportedZipEntry' || content.contentType == 'encryptedRarEntry' || content.contentType ==  'encryptedRarTable'" class="fa fa-lock fa-lg" style="display: inline-block; vertical-align: middle;">&nbsp;</span>
            <span class="fa fa-file-archive-o fa-lg" style="display: inline-block; vertical-align: middle;">&nbsp;</span>
            <span>{{content.archiveType | allCaps}}</span>&nbsp;&nbsp;
          </div>

          <!-- next / previous buttons -->
          <span class="fa fa-arrow-circle-o-left fa-2x enabled" style="vertical-align: bottom;" [class.disabled]="noPreviousSession" (click)="onPreviousSessionArrowClicked()" pTooltip="Previous session"></span>&nbsp;<span class="fa fa-arrow-circle-o-right fa-2x enabled" style="vertical-align: bottom;" [class.disabled]="noNextSession" (click)="onNextSessionArrowClicked()" pTooltip="Next session"></span>

        </div>

      </div>

      <!--<div *ngIf="content" style="position: absolute; height: 100%; top: 0; left: 0; right: 350px;">-->
      <div *ngIf="content" style="position: absolute; top: 40px; bottom: 10px; left: 0; right: 350px;">

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

      <!-- show meta -->
      <div *ngIf="isOpen" style="position: absolute; top: 0; bottom: 0; right: 0; width: 350px; padding-left: 5px; box-sizing: border-box; background-color: rgba(0, 0, 0, .8);">

        <session-widget [session]="session" [serviceType]="serviceType" styleClass="pdfViewerSessionWidget"></session-widget>

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

  .enabled {
    color: white;
  }

  .disabled {
    color: grey;
  }

  .fa-lock, .fa-hashtag {
    color: red;
  }

  .fa-file-image-o {
    color: blue;
  }
  `]
})

export class SessionDetailsModalComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService,
              private changeDetectionRef: ChangeDetectorRef,
              private renderer: Renderer2 ) {}

  @Input() public id: string;
  @Input() public serviceType: string; // 'nw' or 'sa'
  @Input() public collectionId: string = null;

  public utils = utils;
  public content: any;
  private session: any;
  public sessionId: number;
  public isOpen = false;
  public noNextSession = false;
  public noPreviousSession = false;
  private removeKeyupFunc: any;
  public iconClass = '';

  // Subscriptions
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

    this.newSessionSubscription = this.toolService.newSession.subscribe( (session: any ) => this.onNewSession(session) );

    this.newImageSubscription = this.toolService.newImage.subscribe( (content: any) => this.onNewImage(content) );

    this.noNextSessionSubscription = this.toolService.noNextSession.subscribe( (TorF) => this.noNextSession = TorF);
    this.noPreviousSessionSubscription = this.toolService.noPreviousSession.subscribe( (TorF) => this.noPreviousSession = TorF);
  }



  public ngOnDestroy() {
    this.newSessionSubscription.unsubscribe();
    this.newImageSubscription.unsubscribe();
    this.noNextSessionSubscription.unsubscribe();
    this.noPreviousSessionSubscription.unsubscribe();
  }



  onNewSession(session): void {
    log.debug('SessionDetailsModalComponent: onNewSession: session:', session);
    this.session = session;
    this.sessionId = this.session['id'];
  }



  onNewImage(content): void {
    log.debug('SessionDetailsModalComponent: onNewImage: content:', content);
    this.content = content;
    switch (this.content.contentType) {
      case 'encryptedRarEntry':
        this.iconClass = 'fa-lock';
        break;
      case 'encryptedRarTable':
        this.iconClass = 'fa-lock';
        break;
      case 'encryptedZipEntry':
        this.iconClass = 'fa-lock';
        break;
      case 'image':
        this.iconClass = 'fa-file-image-o';
        break;
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onOpen(): void {
    log.debug('SessionDetailsModalComponent: onOpen()');
    this.isOpen = true;
    this.removeKeyupFunc = this.renderer.listen('window', 'keyup', (event) => this.onKeyEvent(event));
  }



  onCloseClicked(): void {
    log.debug('SessionDetailsModalComponent: onCloseClicked()');
    this.modalService.close(this.id);
    // onClosed() will get called by the modalService
  }



  onClosed(): void {
    log.debug('SessionDetailsModalComponent: onClosed()');
    this.isOpen = false;
    this.removeKeyupFunc();
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
