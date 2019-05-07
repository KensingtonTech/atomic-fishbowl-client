import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, Input, Inject, forwardRef, ChangeDetectorRef, OnChanges, ElementRef, NgZone, ViewChild } from '@angular/core';
import { ToolService } from 'services/tool.service';
import { MasonryGridComponent } from './masonry-grid.component';
import { IsotopeBrickDirective } from '../isotope/isotope-brick.directive';
import * as utils from '../utils';
import { Logger } from 'loglevel';
import { DataService } from 'services/data.service';
import { Meta } from 'types/meta';
declare var log: Logger;

interface MasonryKey {
  key: string;
  friendly: string;
}

interface TableEntry {
  key: string;
  value: string;
}


@Component({
  selector: 'masonry-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="brickOuterDiv" *ngIf="session" [style.width.px]="masonryColumnWidth" [style.margin.px]="margin">

  <div style="position: relative; min-height: 2.631578947em;">

    <ng-container *ngIf="displayTextArea">

      <!--NetWitness Tile Overlay-->
      <ng-container *ngIf="serviceType === 'nw'; else saOverlay">

        <!-- time -->
        <div class="selectable masonryTileTime">
          {{session.meta['time'] | formatTime}}
        </div>

        <!-- file icons and session id -->
        <div class="selectable masonryTileSessionID">
          <span style="vertical-align: top; color: white; background-color: rgba(0,0,0,0.75);">{{session.id}}</span>
          <ng-container *ngTemplateOutlet="fileIcons"></ng-container>
        </div>

        <!-- network info -->
        <div class="selectable masonryTileNetworkInfo">
          {{session.meta['ip.src']}} -> {{session.meta['ip.dst']}}:{{session.meta['tcp.dstport']}}{{session.meta['udp.dstport']}} ~ {{session.meta['service']}}
        </div>

      </ng-container>

      <!--SA Tile Overlay-->
      <ng-template #saOverlay>
        <div class="selectable masonryTileTime">
          {{session.meta['stop_time'] | formatSaTime}}
        </div>
        <div class="selectable masonryTileSessionID">
          {{session.id}}
        </div>
        <div class="selectable masonryTileNetworkInfo">
          {{session.meta['initiator_ip']}} -> {{session.meta['responder_ip']}}:{{session.meta['responder_port']}} ~ {{session.meta['protocol_family']}}
        </div>
      </ng-template>

      <ng-template #fileIcons>
        <!-- file type icon overlay -->
        <div *ngIf="content.fromArchive || content.isArchive || content.contentType == 'pdf' || content.contentType == 'office'" class="selectable masonryFileTypeIcon">
          &nbsp;
          <!-- file archive icon - must be separate from regular icon -->
          <ng-container *ngIf="content.fromArchive || content.isArchive"><i class="fa fa-file-archive-o fa-2x"></i></ng-container>

          <!-- regular file type icon -->
          <i *ngIf="content.contentType == 'pdf' || content.contentType == 'office'" class="fa fa-2x" [class.fa-lock]="['encryptedZipEntry', 'unsupportedZipEntry', 'encryptedRarEntry', 'encryptedRarTable'].includes(content.contentType)" [class.fa-file-pdf-o]="content.contentType === 'pdf'" [class.fa-file-word-o]="content.contentType === 'office' && content.contentSubType === 'word'" [class.fa-file-excel-o]="content.contentType === 'office' && content.contentSubType === 'excel'" [class.fa-file-powerpoint-o]="content.contentType === 'office' && content.contentSubType === 'powerpoint'"></i>

        </div>
      </ng-template>

    </ng-container>

    <!-- the image itself -->
    <img #image class="separator" (load)="onImageLoaded()" (error)="onImageError()" [ngClass]="extraClass" [src]="imageSource" draggable="false">

  </div>

  <!-- text area -->
  <!--*ngIf="session && masonryKeys && "-->
  <div *ngIf="displayTextArea" class="textArea selectable">

    <ul *ngIf="textAreaList.length !== 0" style="list-style-type: none; padding: 0;">
      <li *ngFor="let text of textAreaList">
        <b>{{text}}</b>
      </li>
    </ul>

    <!--<ul *ngIf="content.contentType !== 'image'" style="list-style-type: none; padding: 0;">
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
    </ul>-->

    <table style="width: 100%;">
      <tr *ngIf="masonryMeta.length === 0">
        <td colspan="2">
          <div style="margin-bottom: .5em;">
            No relevant meta found for this session.
          </div>
        </td>
      </tr>
      <tr *ngFor="let struct of textAreaTableItems">
        <td class="column1">{{struct.key}}</td>
        <td class="value">{{struct.value}}</td>
      </tr>

      <!--
      <tr *ngFor="let struct of masonryMeta">
        <td class="column1">{{struct.friendly}}</td>
        <td class="value">{{struct.value}}</td>
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
        <td class="column1">Archived Filename:</td>
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
      -->
    </table>

  </div>

</div>
  `
})

export class MasonryTileComponent implements OnInit, AfterViewInit, OnChanges {

  constructor(  private toolService: ToolService,
                private changeDetectionRef: ChangeDetectorRef,
                public dataService: DataService,
                private el: ElementRef,
                private zone: NgZone,
                private isotopeBrick: IsotopeBrickDirective,
                @Inject(forwardRef(() => MasonryGridComponent)) private parent: MasonryGridComponent ) {}

  public utils = utils;

  @ViewChild('image') public imageRef: ElementRef;

  @Input() content: any;
  @Input() sessionId: number;
  @Input() masonryKeys: MasonryKey[];
  @Input() masonryColumnWidth: number;
  @Input() serviceType: string; // 'nw' or 'sa'
  @Input() collectionId: string = null;
  @Input() margin: number;
  @Input() displayTextArea = true;

  public session; // holds meta, among other things
  private masonryMeta = [];
  public imageSource: string;
  public extraClass: string;
  public textAreaList: string[] = [];
  public textAreaTableItems: TableEntry[] = [];
  public loadImage = false;



  ngOnInit(): void {
    // log.debug('MasonryTileComponent: ngOnInit()');

    let parentSession = this.parent.sessions[this.sessionId];

    let session = { meta: {}, id: this.sessionId };
    for (let key in parentSession.meta) {
      // de-dupe meta
      if (parentSession.meta.hasOwnProperty(key)) {
        session['meta'][key] = utils.uniqueArrayValues(parentSession.meta[key]);
      }
    }
    this.session = session;

    this.updateMasonryMeta();

    // set up the image
    switch (this.content.contentType) {
      case 'image':
        this.imageSource = '/collections/' + this.collectionId + '/' + utils.uriEncodeFilename(this.content.thumbnail);
        break;
      case 'pdf':
        this.imageSource = '/collections/' + this.collectionId + '/' + utils.uriEncodeFilename(this.content.thumbnail);
        this.extraClass = 'pdf';
        break;
      case 'office':
        this.imageSource = '/collections/' + this.collectionId + '/' + utils.uriEncodeFilename(this.content.thumbnail);
        this.extraClass = this.content.contentSubType;
        break;
      case 'encryptedZipEntry':
        this.imageSource = '/resources/zip_icon_locked.png';
        break;
      case 'unsupportedZipEntry':
        this.imageSource = '/resources/zip_icon_unknown.png';
        break;
      case 'encryptedRarEntry':
        this.imageSource = '/resources/rar_icon_locked.png';
        break;
      case 'encryptedRarTable':
        this.imageSource = '/resources/rar_icon_locked.png';
        break;
      case 'hash':
        switch (this.content.hashType) {
          case 'md5':
            this.imageSource = '/resources/md5_hash_icon.png';
            break;
          case 'sha1':
            this.imageSource = '/resources/sha1_hash_icon.png';
            break;
          case 'sha256':
            this.imageSource = '/resources/sha256_hash_icon.png';
            break;
        }
    }

    // set up the text area list items
    if (['encryptedRarEntry', 'encryptedZipEntry'].includes(this.content.contentType)) {
      let msg = `Encrypted file within a ${utils.toCaps(this.content.archiveType)} archive`;
      this.textAreaList.push(msg);
    }
    if (this.content.contentType === 'unsupportedZipEntry') {
      let msg = `Unsupported ZIP format`;
      this.textAreaList.push(msg);
    }
    if (this.content.contentType === 'encryptedRarTable') {
      let msg = `RAR archive has an encrypted table`;
      this.textAreaList.push(msg);
    }
    if (this.content.contentType === 'hash') {
      let msg = `Found executable matching ${utils.toCaps(this.content.hashType)} hash value`;
      this.textAreaList.push(msg);
    }
    if (['office', 'pdf'].includes(this.content.contentType) && this.content.textDistillationEnabled && 'textTermsMatched' in this.content && this.content.textTermsMatched.length > 0) {
      let type = this.content.contentType === 'pdf' ? 'PDF' : utils.capitalizeFirstLetter(this.content.contentSubType);
      let msg = `Found ${type} document containing text term`;
      this.textAreaList.push(msg);
    }
    if (['office', 'pdf'].includes(this.content.contentType) && this.content.regexDistillationEnabled && 'regexTermsMatched' in this.content && this.content.regexTermsMatched.length > 0) {
      let type = this.content.contentType === 'pdf' ? 'PDF' : utils.capitalizeFirstLetter(this.content.contentSubType);
      let msg = `Found ${type} document matching Regex term`;
      this.textAreaList.push(msg);
    }

    // set up the text area table items
    this.masonryMeta.forEach( struct => {
      this.textAreaTableItems.push( { key: struct.friendly || struct.key, value: struct.value } );
    });

    if (this.content.contentType === 'hash') {
      let struct = { key: `${utils.toCaps(this.content.hashType)} Hash:`, value: this.content.hashValue};
      this.textAreaTableItems.push(struct);

      if (this.content.hashFriendly) {
        struct = { key: `${utils.toCaps(this.content.hashType)} Description:`, value: this.content.hashFriendly};
        this.textAreaTableItems.push(struct);
      }

      struct = { key: `Filename:`, value: utils.pathToFilename(this.content.contentFile)};
      this.textAreaTableItems.push(struct);
    }

    if (['pdf', 'office'].includes(this.content.contentType) && this.content.contentFile) {
      let type = this.content.contentType === 'pdf' ? 'PDF' : 'Office';
      let struct = { key: `${type} Filename:`, value: utils.pathToFilename(this.content.contentFile)};
      this.textAreaTableItems.push(struct);
    }

    if (this.content.isArchive) {
      let struct = { key: `Archive File:`, value: utils.pathToFilename(this.content.contentFile)};
      this.textAreaTableItems.push(struct);
    }

    if (this.content.fromArchive) {
      let struct = { key: `Archived Filename:`, value: utils.pathToFilename(this.content.archiveFilename)};
      this.textAreaTableItems.push(struct);
    }

    if (['encryptedZipEntry', 'encryptedRarEntry'].includes(this.content.contentType)) {
      let struct = { key: `Encrypted File:`, value: utils.pathToFilename(this.content.contentFile)};
      this.textAreaTableItems.push(struct);
    }

    if (this.content.textDistillationEnabled && 'textTermsMatched' in this.content && this.content.textTermsMatched.length > 0) {
      let struct = { key: `Matched Text:`, value: this.content.textTermsMatched};
      this.textAreaTableItems.push(struct);
    }

    if (this.content.regexDistillationEnabled && 'regexTermsMatched' in this.content && this.content.regexTermsMatched.length > 0) {
      let struct = { key: `Matched RegEx:`, value: this.content.regexTermsMatched};
      this.textAreaTableItems.push(struct);
    }

  }



  ngAfterViewInit(): void {
    this.changeDetectionRef.detach();
  }



  ngOnChanges(values): void {
    // log.debug('MasonryTileComponent: ngOnChanges(): values:', values);
    this.updateMasonryMeta();
    this.changeDetectionRef.reattach();
    setTimeout( () => this.changeDetectionRef.detach(), 0);
  }



  onImageLoaded() {
    // log.debug('MasonryTileComponent: onImageLoaded()');
    let event = new Event('onloaded');
    this.zone.runOutsideAngular( () => {
        this.el.nativeElement.dispatchEvent(event);
    });
  }



  async onImageError() {
    log.debug('MasonryTileComponent: onImageError()');
    // we should load an error image here
    this.imageSource = '/resources/error_icon.png';
    this.changeDetectionRef.reattach();
    setTimeout( () => this.changeDetectionRef.detach(), 0);
    // this.changeDetectionRef.markForCheck();
    // this.changeDetectionRef.detectChanges();
    let event = new Event('onloaded');
    this.zone.runOutsideAngular( () => {
      this.el.nativeElement.dispatchEvent(event);
    });
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



  async getImage(origUrl: string) {
    // we don't want to bind this directly to the image with an async pipe as it gets stuck in a loop
    return  await this.dataService.getImage(origUrl);
  }



}
