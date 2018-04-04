import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, ElementRef, Input, Inject, forwardRef, ChangeDetectorRef, OnChanges } from '@angular/core';
import { NgStyle } from '@angular/common';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs/Subscription';
import { MasonryGridComponent } from './masonry-grid.component';
import * as utils from './utils';
declare var log;

@Component({
  selector: 'masonry-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div *ngIf="masonryColumnWidth && session" [ngStyle]="{'width.px': masonryColumnWidth}" style="background-color: white; border-radius: 5px; font-size: 9pt; font-weight: lighter;">

  <div style="position: relative; min-height: 50px;">

    <!--NetWitness Tiles-->
    <div *ngIf="serviceType == 'nw'" class="selectable">
      <div style="position: absolute; top: 5px; left: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        {{session.meta['time'] | formatTime}}
      </div>
      <div style="position: absolute; top: 5px; right: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        {{session.id}}
      </div>
      <div style="position: absolute; bottom: 5px; left: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        {{session.meta['ip.src']}} -> {{session.meta['ip.dst']}}:{{session.meta['tcp.dstport']}}{{session.meta['udp.dstport']}} ~ {{session.meta['service']}}
      </div>
      <div *ngIf="content.fromArchive || content.isArchive || content.contentType == 'pdf' || content.contentType == 'office'" style="position: absolute; bottom: 5px; right: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        <i *ngIf="content.fromArchive || content.isArchive" class="fa fa-file-archive-o fa-2x"></i>
        <i *ngIf="content.contentType == 'encryptedZipEntry' || content.contentType == 'unsupportedZipEntry' || content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedRarTable'" class="fa fa-lock fa-2x"></i>
        <i *ngIf="content.contentType == 'pdf'" class="fa fa-file-pdf-o fa-2x"></i>
        <i *ngIf="content.contentType == 'office'" [class.fa-file-word-o]="content.contentSubType == 'word'" [class.fa-file-excel-o]="content.contentSubType == 'excel'" [class.fa-file-powerpoint-o]="content.contentSubType == 'powerpoint'" class="fa fa-2x"></i>
      </div>
    </div>

    <!--SA Tiles-->
    <div *ngIf="serviceType == 'sa'" class="selectable">
      <div style="position: absolute; top: 5px; left: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        {{session.meta['stop_time'] | formatSaTime}}
      </div>
      <div style="position: absolute; top: 5px; right: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        {{session.id}}
      </div>
      <div style="position: absolute; bottom: 5px; left: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        {{session.meta['initiator_ip']}} -> {{session.meta['responder_ip']}}:{{session.meta['responder_port']}} ~ {{session.meta['protocol_family']}}
      </div>
      <div *ngIf="content.fromArchive || content.isArchive || content.contentType == 'pdf' || content.contentType == 'office'" style="position: absolute; bottom: 5px; right: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        <i *ngIf="content.fromArchive || content.isArchive" class="fa fa-file-archive-o fa-2x"></i>
        <i *ngIf="content.contentType == 'encryptedZipEntry' || content.contentType == 'unsupportedZipEntry' || content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedRarTable'" class="fa fa-lock fa-2x"></i>
        <i *ngIf="content.contentType == 'pdf'" class="fa fa-file-pdf-o fa-2x"></i>
        <i *ngIf="content.contentType == 'office'" [class.fa-file-word-o]="content.contentSubType == 'word'" [class.fa-file-excel-o]="content.contentSubType == 'excel'" [class.fa-file-powerpoint-o]="content.contentSubType == 'powerpoint'" class="fa fa-2x"></i>
      </div>
    </div>

    <img *ngIf="content.contentType == 'image'" class="separator" (click)="onClick($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" draggable="false">
    <img *ngIf="content.contentType == 'pdf'" class="separator pdf" (click)="onClick($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" draggable="false">
    <img *ngIf="content.contentType == 'office'" [ngClass]="content.contentSubType" class="separator" (click)="onClick($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" draggable="false">
    <img *ngIf="content.contentType == 'encryptedZipEntry'" class="separator" (click)="onClick($event)" src="/resources/zip_icon_locked.png" draggable="false">
    <img *ngIf="content.contentType == 'unsupportedZipEntry'" class="separator" (click)="onClick($event)" src="/resources/zip_icon_unknown.png" draggable="false">
    <img *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedRarTable'" class="separator" (click)="onClick($event)" src="/resources/rar_icon_locked.png" draggable="false">
    <img *ngIf="content.contentType == 'hash' && content.hashType == 'md5'" class="separator" (click)="onClick($event)" src="/resources/md5_hash_icon.png" draggable="false">
    <img *ngIf="content.contentType == 'hash' && content.hashType == 'sha1'" class="separator" (click)="onClick($event)" src="/resources/sha1_hash_icon.png" draggable="false">
    <img *ngIf="content.contentType == 'hash' && content.hashType == 'sha256'" class="separator" (click)="onClick($event)" src="/resources/sha256_hash_icon.png" draggable="false">

  </div>

  <div class="textArea" *ngIf="session && masonryKeys && displayTextArea" style="position: relative;">

    <div *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedZipEntry'">
      <b>Encrypted file within a {{utils.toCaps(content.archiveType)}} archive</b>
    </div>
    <div *ngIf="content.contentType == 'unsupportedZipEntry'">
      <b>Unsupported ZIP format</b>
    </div>
    <div *ngIf="content.contentType == 'encryptedRarTable'">
      <b>RAR archive has an encrypted table</b>
    </div>
    <div *ngIf="content.contentType == 'hash'">
      <b>Found executable matching {{utils.toCaps(content.hashType)}} hash value</b>
    </div>
    <div *ngIf="content.contentType == 'pdf' && content.textDistillationEnabled && content.textTermsMatched?.length > 0">
      <b>Found PDF document containing text term</b>
    </div>
    <div *ngIf="content.contentType == 'office' && content.textDistillationEnabled && content.textTermsMatched?.length > 0">
      <b>Found Office {{utils.capitalizeFirstLetter(content.contentSubType)}} document containing text term</b>
    </div>
    <div *ngIf="content.contentType == 'pdf' && content.regexDistillationEnabled && content.regexTermsMatched?.length > 0">
      <b>Found PDF document matching Regex term</b>
    </div>
    <div *ngIf="content.contentType == 'office' && content.regexDistillationEnabled && content.regexTermsMatched?.length > 0">
      <b>Found Office {{utils.capitalizeFirstLetter(content.contentSubType)}} document matching Regex term</b>
    </div>

    <table class="selectable" style="width: 100%;">
      <tr *ngFor="let key of masonryKeys">
        <td *ngIf="session.meta[key.key]" class="column1">{{key.friendly}}</td>
        <td *ngIf="session.meta[key.key]" class="value">{{session.meta[key.key]}}</td>
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
      <tr *ngIf="content.contentType == 'encryptedZipEntry' || content.contentType == 'encryptedRarEntry'">
        <td class="column1">Encrypted File:</td>
        <td class="value">{{utils.pathToFilename(content.contentFile)}}</td>
      </tr>
      <tr *ngIf="content.fromArchive">
        <td class="column1">Archive Filename:</td>
        <td class="value">{{utils.pathToFilename(content.archiveFilename)}}</td>
      </tr>
      <tr *ngIf="content.isArchive">
        <td class="column1">Archive File:</td>
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

  `]
})

export class MasonryTileComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {

  constructor(  private toolService: ToolService,
                private changeDetectionRef: ChangeDetectorRef,
                @Inject(forwardRef(() => MasonryGridComponent)) private parent: MasonryGridComponent ) {}

  public utils = utils;

  @Input() private content: any;
  @Input() public sessionId: number;
  @Input() private masonryKeys: any;
  @Input() public masonryColumnWidth: number;
  @Input() public serviceType: string; // 'nw' or 'sa'
  @Input() public collectionId: string = null;

  public session;
  public displayTextArea = true;
  private originalSession: any; // Session data that hasn't been de-duped
  private showMasonryTextAreaSubscription: Subscription;

  private times = 0;



  ngOnInit(): void {
    // log.debug('MasonryTileComponent: ngOnInit()');
    this.displayTextArea = this.toolService.showMasonryTextAreaState;
    this.showMasonryTextAreaSubscription = this.toolService.showMasonryTextArea.subscribe( (TorF) => this.onToggleTextArea(TorF) );

    let parentSession = this.parent.sessions[this.sessionId];
    this.originalSession = JSON.parse(JSON.stringify(parentSession));
    let session = { meta: {}, id: this.sessionId };
    for (let key in parentSession.meta) {
      // de-dupe meta
      if (parentSession.meta.hasOwnProperty(key)) {
        session['meta'][key] = utils.uniqueArrayValues(parentSession.meta[key]);
      }
    }
    this.session = session;
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
    this.changeDetectionRef.reattach();
    setTimeout( () => this.changeDetectionRef.detach(), 0);
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
