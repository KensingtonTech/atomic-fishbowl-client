import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, ElementRef, Input, Inject, forwardRef, ChangeDetectorRef, OnChanges } from '@angular/core';
import { NgStyle } from '@angular/common';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs';
import { MasonryGridComponent } from './masonry-grid.component';
import * as utils from './utils';
import { Logger } from 'loglevel';
declare var log: Logger;

interface MasonryKey {
  key: string;
  friendly: string;
}


@Component({
  selector: 'masonry-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div *ngIf="masonryColumnWidth && session" [ngStyle]="{'width.px': masonryColumnWidth}" class="brickOuterDiv">

  <div style="position: relative; min-height: 50px;">

    <ng-container *ngIf="displayTextArea">

      <!--NetWitness Tile Overlay-->
      <ng-container *ngIf="serviceType == 'nw'" >
        <div class="selectable masonryTileTime">
          {{session.meta['time'] | formatTime}}
        </div>
        <div class="selectable masonryTileSessionID">
          {{session.id}}
        </div>
        <div class="selectable masonryTileNetworkInfo">
          {{session.meta['ip.src']}} -> {{session.meta['ip.dst']}}:{{session.meta['tcp.dstport']}}{{session.meta['udp.dstport']}} ~ {{session.meta['service']}}
        </div>
      </ng-container>

      <!--SA Tile Overlay-->
      <ng-container *ngIf="serviceType == 'sa'">
        <div class="selectable masonryTileTime">
          {{session.meta['stop_time'] | formatSaTime}}
        </div>
        <div class="selectable masonryTileSessionID">
          {{session.id}}
        </div>
        <div class="selectable masonryTileNetworkInfo">
          {{session.meta['initiator_ip']}} -> {{session.meta['responder_ip']}}:{{session.meta['responder_port']}} ~ {{session.meta['protocol_family']}}
        </div>
      </ng-container>

      <!-- file type icon overlay -->
      <div *ngIf="content.fromArchive || content.isArchive || content.contentType == 'pdf' || content.contentType == 'office'" class="selectable masonryFileTypeIcon">
        <i *ngIf="content.fromArchive || content.isArchive" class="fa fa-file-archive-o fa-2x"></i>
        <ng-container [ngSwitch]="content.contentType">
          <i *ngSwitchCase="'encryptedZipEntry'" class="fa fa-lock fa-2x"></i>
          <i *ngSwitchCase="'unsupportedZipEntry'" class="fa fa-lock fa-2x"></i>
          <i *ngSwitchCase="'encryptedRarEntry'" class="fa fa-lock fa-2x"></i>
          <i *ngSwitchCase="'encryptedRarTable'" class="fa fa-lock fa-2x"></i>
          <i *ngSwitchCase="'pdf'" class="fa fa-file-pdf-o fa-2x"></i>
          <i *ngSwitchCase="'office'" [class.fa-file-word-o]="content.contentSubType == 'word'" [class.fa-file-excel-o]="content.contentSubType == 'excel'" [class.fa-file-powerpoint-o]="content.contentSubType == 'powerpoint'" class="fa fa-2x"></i>
        </ng-container>
      </div>
    </ng-container>

    <!-- the images itself -->
    <ng-container [ngSwitch]="content.contentType">
      <img *ngSwitchCase="'image'" class="separator" (click)="onClick($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" draggable="false">
      <img *ngSwitchCase="'pdf'" class="separator pdf" (click)="onClick($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" draggable="false">
      <img *ngSwitchCase="'office'" [ngClass]="content.contentSubType" class="separator" (click)="onClick($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" draggable="false">
      <img *ngSwitchCase="'encryptedZipEntry'" class="separator" (click)="onClick($event)" src="/resources/zip_icon_locked.png" draggable="false">
      <img *ngSwitchCase="'unsupportedZipEntry'" class="separator" (click)="onClick($event)" src="/resources/zip_icon_unknown.png" draggable="false">
      <img *ngSwitchCase="'encryptedRarEntry'" class="separator" (click)="onClick($event)" src="/resources/rar_icon_locked.png" draggable="false">
      <img *ngSwitchCase="'encryptedRarTable'" class="separator" (click)="onClick($event)" src="/resources/rar_icon_locked.png" draggable="false">
      <ng-container *ngSwitchCase="'hash'">
        <ng-container [ngSwitch]="content.hashType">
          <img *ngSwitchCase="'md5'" class="separator" (click)="onClick($event)" src="/resources/md5_hash_icon.png" draggable="false">
          <img *ngSwitchCase="'sha1'" class="separator" (click)="onClick($event)" src="/resources/sha1_hash_icon.png" draggable="false">
          <img *ngSwitchCase="'sha256'" class="separator" (click)="onClick($event)" src="/resources/sha256_hash_icon.png" draggable="false">
        </ng-container>
      </ng-container>
    </ng-container>

  </div>

  <!-- text area -->
  <div class="textArea selectable" *ngIf="session && masonryKeys && displayTextArea" style="position: relative;">

    <ul *ngIf="content.contentType != 'image'" style="list-style-type: none; padding: 0;">
      <li *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedZipEntry'">
        <b>Encrypted file within a {{utils.toCaps(content.archiveType)}} archive</b>
      </li>
      <li *ngIf="content.contentType == 'unsupportedZipEntry'">
        <b>Unsupported ZIP format</b>
      </li>
      <li *ngIf="content.contentType == 'encryptedRarTable'">
        <b>RAR archive has an encrypted table</b>
      </li>
      <li *ngIf="content.contentType == 'hash'">
        <b>Found executable matching {{utils.toCaps(content.hashType)}} hash value</b>
      </li>
      <li *ngIf="content.contentType == 'pdf' && content.textDistillationEnabled && content.textTermsMatched?.length > 0">
        <b>Found PDF document containing text term</b>
      </li>
      <li *ngIf="content.contentType == 'office' && content.textDistillationEnabled && content.textTermsMatched?.length > 0">
        <b>Found Office {{utils.capitalizeFirstLetter(content.contentSubType)}} document containing text term</b>
      </li>
      <li *ngIf="content.contentType == 'pdf' && content.regexDistillationEnabled && content.regexTermsMatched?.length > 0">
        <b>Found PDF document matching Regex term</b>
      </li>
      <li *ngIf="content.contentType == 'office' && content.regexDistillationEnabled && content.regexTermsMatched?.length > 0">
        <b>Found Office {{utils.capitalizeFirstLetter(content.contentSubType)}} document matching Regex term</b>
      </li>
    </ul>

    <table style="width: 100%;">
      <tr *ngFor="let struct of masonryMeta">
        <td class="column1">{{struct.friendly}}</td>
        <td class="value">{{struct.value}}</td>
      </tr>
      <tr *ngIf="masonryMeta.length == 0">
        <td colspan="2">No relevant meta for this session.</td>
      </tr>
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
      <tr *ngIf="content.contentType =='pdf' && content.contentFile">
        <td class="column1">PDF Filename:</td>
        <td class="value">{{utils.pathToFilename(content.contentFile)}}</td>
      </tr>
      <tr *ngIf="content.contentType =='office' && content.contentFile">
        <td class="column1">Office Filename:</td>
        <td class="value">{{utils.pathToFilename(content.contentFile)}}</td>
      </tr>
      <tr *ngIf="content.isArchive">
        <td class="column1">Archive File:</td>
        <td class="value">{{utils.pathToFilename(content.contentFile)}}</td>
      </tr>
      <tr *ngIf="content.fromArchive">
        <td class="column1">Archive Filename:</td>
        <td class="value">{{utils.pathToFilename(content.archiveFilename)}}</td>
      </tr>
      <tr *ngIf="content.contentType == 'encryptedZipEntry' || content.contentType == 'encryptedRarEntry'">
        <td class="column1">Encrypted File:</td>
        <td class="value">{{utils.pathToFilename(content.contentFile)}}</td>
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
  `,

  styles: [`

    .separator {
        margin: 0;
        padding: 0;
        display: block;
    }

    .textArea {
      border-top: 1px solid black;
      padding: 5px;
      font-size: 9pt;
    }

    .column1 {
      white-space: nowrap;
      width: 1px;
      font-weight: bold;
      vertical-align: top;
    }

    .value {
      word-wrap: break-word;
      word-break: break-all;
      color: black;
    }

    img {
      width: 100%;
      height: auto;

    }

    .pdf {
      box-sizing: border-box;
      border: solid 3px red;
    }

    .word {
      box-sizing: border-box;
      border: solid 4px rgb(42,86,153);
    }

    .excel {
      box-sizing: border-box;
      border: solid 4px rgb(32,114,71);
    }

    .powerpoint {
      box-sizing: border-box;
      border: solid 3px rgb(211,71,38);
    }

    .brickOuterDiv {
      background-color: white;
      border-radius: 5px;
      font-size: 9pt;
      font-weight: lighter;
      margin: 10px;
    }

  `]
})

export class MasonryTileComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {

  constructor(  private toolService: ToolService,
                private changeDetectionRef: ChangeDetectorRef,
                @Inject(forwardRef(() => MasonryGridComponent)) private parent: MasonryGridComponent ) {}

  public utils = utils;

  @Input() private content: any;
  @Input() public sessionId: number;
  @Input() private masonryKeys: MasonryKey[];
  @Input() public masonryColumnWidth: number;
  @Input() public serviceType: string; // 'nw' or 'sa'
  @Input() public collectionId: string = null;

  public session; // holds meta, among other things
  public displayTextArea = true;
  private originalSession: any; // Session data that hasn't been de-duped
  private showMasonryTextAreaSubscription: Subscription;
  private masonryMeta = [];

  private times = 0;



  ngOnInit(): void {
    // log.debug('MasonryTileComponent: ngOnInit()');
    this.displayTextArea = this.toolService.showMasonryTextAreaState;
    this.showMasonryTextAreaSubscription = this.toolService.showMasonryTextArea.subscribe( (TorF) => this.onToggleTextArea(TorF) );

    let parentSession = this.parent.sessions[this.sessionId];
    this.originalSession = utils.deepCopy(parentSession);

    let session = { meta: {}, id: this.sessionId };
    for (let key in parentSession.meta) {
      // de-dupe meta
      if (parentSession.meta.hasOwnProperty(key)) {
        session['meta'][key] = utils.uniqueArrayValues(parentSession.meta[key]);
      }
    }
    this.session = session;
    this.updateMasonryMeta();
  }



  ngAfterViewInit(): void {
    this.changeDetectionRef.detach();
  }


  ngOnDestroy(): void {
    this.showMasonryTextAreaSubscription.unsubscribe();
  }



  onToggleTextArea(TorF): void {
    this.displayTextArea = TorF;
    this.changeDetectionRef.detectChanges();
  }



  ngOnChanges(values): void {
    // log.debug('MasonryTileComponent: ngOnChanges(): values:', values);
    this.updateMasonryMeta();
    this.changeDetectionRef.reattach();
    setTimeout( () => this.changeDetectionRef.detach(), 0);
  }



  updateMasonryMeta() {
    if (this.masonryKeys && this.session && this.masonryKeys.length !== 0 && 'meta' in this.session && Object.keys(this.session.meta).length !== 0) {
      let masonryMeta = [];
      for (let i = 0; i < this.masonryKeys.length; i++) {
        let masonryKey = this.masonryKeys[i];
        if (masonryKey.key in this.session.meta) {
          let struct = { key: masonryKey.key, friendly: masonryKey.friendly, value: this.session.meta[masonryKey.key]};
          masonryMeta.push(struct);
        }
      }
      this.masonryMeta = masonryMeta;
    }
  }



  onClick(e: any): void {
    // log.debug('MasonryTileComponent: onClick()')

    this.toolService.newSession.next( this.originalSession );
    this.toolService.newImage.next(this.content);

    if (this.content.contentType === 'pdf' || this.content.contentType === 'office') {
      this.toolService.openPDFViewer.next();
    }
    else {
      this.toolService.openSessionViewer.next();
    }
  }



}
