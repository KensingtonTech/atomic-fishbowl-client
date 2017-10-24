import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, Input, Output, EventEmitter, OnChanges, ViewEncapsulation } from '@angular/core';
import { NgStyle } from '@angular/common';
import { ToolService } from './tool.service';
declare var log: any;

@Component({
  selector: 'masonry-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // encapsulation: ViewEncapsulation.None,
  template: `
<div *ngIf="masonryColumnSize" [ngStyle]="{'width.px': masonryColumnSize}" style="background-color: white; border-radius: 5px; font-size: 9pt; font-weight: lighter;">
  <div style="position: relative; min-height: 50px;">
    <div class="selectable">
      <div style="position: absolute; top: 5px; left: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        {{session.meta['time'] | formatTime}}
      </div>
      <div style="position: absolute; top: 5px; right: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        {{session.id}}
      </div>
      <div style="position: absolute; bottom: 5px; left: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        {{session.meta['ip.src']}} -> {{session.meta['ip.dst']}}:{{session.meta['tcp.dstport']}}{{session.meta['udp.dstport']}} ~ {{session.meta['service']}}
      </div>
      <div *ngIf="content.fromArchive || content.isArchive || content.contentType == 'pdf'" style="position: absolute; bottom: 5px; right: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        <i *ngIf="content.fromArchive || content.isArchive" class="fa fa-file-archive-o fa-2x"></i>
        <i *ngIf="content.contentType == 'encryptedZipEntry' || content.contentType == 'unsupportedZipEntry' || content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedRarTable'" class="fa fa-lock fa-2x"></i>
        <i *ngIf="content.contentType == 'pdf'" class="fa fa-file-pdf-o fa-2x"></i>
      </div>
    </div>

    <img *ngIf="content.contentType == 'image'" class="separator" (click)="onClick($event)" [src]="apiServerUrl + content.thumbnail" draggable="false">
    <img *ngIf="content.contentType == 'pdf'" class="separator pdf" (click)="onClick($event)" [src]="apiServerUrl + content.thumbnail" draggable="false">
    <img *ngIf="content.contentType == 'encryptedZipEntry'" class="separator" (click)="onClick($event)" src="/resources/zip_icon_locked.png" draggable="false">
    <img *ngIf="content.contentType == 'unsupportedZipEntry'" class="separator" (click)="onClick($event)" src="/resources/zip_icon_unknown.png" draggable="false">
    <img *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedRarTable'" class="separator" (click)="onClick($event)" src="/resources/rar_icon_locked.png" draggable="false">
    <img *ngIf="content.contentType == 'hash'" class="separator" (click)="onClick($event)" src="/resources/executable_hash_icon.png" draggable="false">

  </div>

  <div class="textArea" *ngIf="session && masonryKeys && displayTextArea" style="position: relative;">

    <div *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedZipEntry'">
      <b>Encrypted file within a {{toCaps(content.archiveType)}} archive</b>
    </div>
    <div *ngIf="content.contentType == 'unsupportedZipEntry'">
      <b>Unsupported ZIP format</b>
    </div>
    <div *ngIf="content.contentType == 'encryptedRarTable'">
      <b>RAR archive has an encrypted table</b>
    </div>
    <div *ngIf="content.contentType == 'hash'">
      <b>Found executable matching {{toCaps(content.hashType)}} hash value</b>
    </div>
    <div *ngIf="content.contentType == 'pdf' && content.textDistillationEnabled && content.textTermsMatched?.length > 0">
      <b>Found PDF document containing text term</b>
    </div>
    <div *ngIf="content.contentType == 'pdf' && content.regexDistillationEnabled && content.regexTermsMatched?.length > 0">
      <b>Found PDF document matching Regex term</b>
    </div>

    <table class="selectable" style="width: 100%;">
      <tr *ngFor="let key of masonryKeys">
        <td *ngIf="session.meta[key.key]" class="column1">{{key.friendly}}</td>
        <td *ngIf="session.meta[key.key]" class="value">{{session.meta[key.key]}}</td>
      </tr>
      <tr *ngIf="content.contentType == 'hash'">
        <td class="column1">{{toCaps(content.hashType)}} Hash:</td>
        <td class="value">{{content.hashValue}}</td>
      </tr>
      <tr *ngIf="content.contentType == 'hash' && content.hashFriendly">
        <td class="column1">{{toCaps(content.hashType)}} Description:</td>
        <td class="value">{{content.hashFriendly}}</td>
      </tr>
      <tr *ngIf="content.contentType == 'hash'">
        <td class="column1">Filename:</td>
        <td class="value">{{pathToFilename(content.contentFile)}}</td>
      </tr>
      <tr *ngIf="content.contentType =='pdf' && content.contentFile">
        <td class="column1">PDF Filename:</td>
        <td class="value">{{pathToFilename(content.contentFile)}}</td>
      </tr>
      <tr *ngIf="content.contentType == 'encryptedZipEntry' || content.contentType == 'encryptedRarEntry'">
        <td class="column1">Encrypted File:</td>
        <td class="value">{{pathToFilename(content.contentFile)}}</td>
      </tr>
      <tr *ngIf="content.isArchive">
        <td class="column1">Archive File:</td>
        <td class="value">{{pathToFilename(content.contentFile)}}</td>
      </tr>
      <tr *ngIf="content.fromArchive">
        <td class="column1">Archive Filename:</td>
        <td class="value">{{pathToFilename(content.archiveFilename)}}</td>
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

  `]
})

export class MasonryTileComponent implements OnInit, OnDestroy, OnChanges {

  constructor(  public el: ElementRef,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService ) {} // this.changeDetectionRef.detach(); private http: Http

  @Input() private apiServerUrl: string;
  @Input() private content: any;
  @Input() private session: any;
  @Input() private masonryKeys: any;
  @Input() public masonryColumnSize: number;
  public displayTextArea = true;
  private originalSession: any; // Session data that hasn't been de-duped
  private enabledTrigger = 'disabled';
  private data: any = {}; // prevent opening pdf modal if dragging the view
  private showMasonryTextAreaSubscription: any;
/*
  private displayedMetaKeys = [ {key: 'alias.host', name: 'Hostname'},
                                {key: 'service', name: 'Service'},
                                {key: 'search.text', name: 'Search Text'}
                              ];
*/

  ngOnInit(): void {
    this.displayTextArea = this.toolService.showMasonryTextAreaState;
    this.showMasonryTextAreaSubscription = this.toolService.showMasonryTextArea.subscribe( (show) => {
      this.displayTextArea = show;
      this.changeDetectionRef.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.showMasonryTextAreaSubscription.unsubscribe();
  }

  ngOnChanges(e: any): void {
    // log.debug("MasonryTileComponent: OnChanges():", e);
    /*if ('content' in e && e.content.currentValue) {
     log.debug('MasonryTileComponent: ngOnChanges: content:', e.content.currentValue);
    }*/
    if ('session' in e && e.session.currentValue !== undefined) { // de-dupe meta keys
      this.originalSession = JSON.parse(JSON.stringify(e.session.currentValue)); // silly way of copying an object, but it works
      for (let key in e.session.currentValue.meta) {
        this.session.meta[key] = this.unique(e.session.currentValue.meta[key]);
      }
    }
  }

  onClick(e: any): void {
    // log.debug("onClick")
    // if (Math.abs(top - ptop) < 15 || Math.abs(left - pleft) < 15) {

    this.toolService.newSession.next(this.originalSession);
    this.toolService.newImage.next(this.content);

    if (this.content.contentType === 'pdf') {
      // log.debug("display pdf");
      this.toolService.openPDFViewer.next();
    }
    else {
      // log.debug("display image");
      this.toolService.openSessionViewer.next();
    }
  }

  handleError(error: any): Promise<any> {
    log.error('ERROR:', error);
    return Promise.reject(error.message || error);
  }

  unique(a: any): any {
    let unique = [];
    for (let i = 0; i < a.length; i++) {
      let current = a[i];
      if (unique.indexOf(current) < 0) { unique.push(current); }
    }
    return unique;
  }

  pathToFilename(s: string): string {
    const RE = /([^/]*)$/;
    let match = RE.exec(s);
    // log.debug(match[0]);
    return match[0];
  }

  toCaps(s: string) {
    return s.toUpperCase();
  }

}
