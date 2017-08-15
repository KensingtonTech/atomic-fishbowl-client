import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { NgStyle } from '@angular/common';
// import { MasonryOptions } from 'angular2-masonry';
import { ToolService } from './tool.service';
declare var log: any;

@Component({
  selector: 'masonry-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<masonry-brick>
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
        <div *ngIf="image.fromArchive || image.isArchive || image.contentType == 'pdf'" style="position: absolute; bottom: 5px; right: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
          <i *ngIf="image.fromArchive || image.isArchive" class="fa fa-file-archive-o fa-2x"></i>
          <i *ngIf="image.contentType == 'encryptedZipEntry' || image.contentType == 'unsupportedZipEntry' || image.contentType == 'encryptedRarEntry' || image.contentType == 'encryptedRarTable'" class="fa fa-lock fa-2x"></i>
          <i *ngIf="image.contentType == 'pdf'" class="fa fa-file-pdf-o fa-2x"></i>
        </div>
      </div>

      <img *ngIf="image.contentType == 'image'" class="separator" (click)="onClick($event)" [src]="apiServerUrl + image.thumbnail" draggable="false">
      <img *ngIf="image.contentType == 'pdf'" class="separator pdf" (click)="onClick($event)" [src]="apiServerUrl + image.thumbnail" draggable="false">
      <img *ngIf="image.contentType == 'encryptedZipEntry'" class="separator" (click)="onClick($event)" src="/resources/zip_icon_locked.png" draggable="false">
      <img *ngIf="image.contentType == 'unsupportedZipEntry'" class="separator" (click)="onClick($event)" src="/resources/zip_icon_unknown.png" draggable="false">
      <img *ngIf="image.contentType == 'encryptedRarEntry' || image.contentType == 'encryptedRarTable'" class="separator" (click)="onClick($event)" src="/resources/rar_icon_locked.png" draggable="false">
      <img *ngIf="image.contentType == 'hash'" class="separator" (click)="onClick($event)" src="/resources/executable_hash_icon.png" draggable="false">

    </div>
    <div class="textArea" *ngIf="session && masonryKeys" style="position: relative;">
      <div *ngIf="image.contentType == 'encryptedRarEntry' || image.contentType == 'encryptedZipEntry'">
        <b>Encrypted file within a {{toCaps(image.archiveType)}} archive</b>
      </div>
      <div *ngIf="image.contentType == 'unsupportedZipEntry'">
        <b>Unsupported ZIP format</b>
      </div>
      <div *ngIf="image.contentType == 'encryptedRarTable'">
        <b>RAR archive has an encrypted table</b>
      </div>
      <div *ngIf="image.contentType == 'hash'">
        <b>Found executable matching {{toCaps(image.hashType)}} hash value</b>
      </div>
      <table class="selectable" style="width: 100%;">
        <tr *ngFor="let key of masonryKeys">
          <td *ngIf="session.meta[key.key]" class="column1">{{key.friendly}}</td>
          <td *ngIf="session.meta[key.key]" class="value">{{session.meta[key.key]}}</td>
        </tr>
        <tr *ngIf="image.contentType == 'hash'">
          <td class="column1">{{toCaps(image.hashType)}} Hash:</td>
          <td class="value">{{image.hashValue}}</td>
        </tr>
        <tr *ngIf="image.contentType == 'hash' && image.hashFriendly">
          <td class="column1">{{toCaps(image.hashType)}} Description:</td>
          <td class="value">{{image.hashFriendly}}</td>
        </tr>
        <tr *ngIf="image.contentType == 'hash'">
          <td class="column1">Filename:</td>
          <td class="value">{{reduceContentFile(image.contentFile)}}</td>
        </tr>
        <tr *ngIf="image.contentType =='pdf' && image.contentFile">
          <td class="column1">PDF Filename:</td>
          <td class="value">{{reduceContentFile(image.contentFile)}}</td>
        </tr>
        <tr *ngIf="image.contentType == 'encryptedZipEntry' || image.contentType == 'encryptedRarEntry'">
          <td class="column1">Encrypted File:</td>
          <td class="value">{{reduceContentFile(image.contentFile)}}</td>
        </tr>
        <tr *ngIf="image.isArchive">
          <td class="column1">Archive File:</td>
          <td class="value">{{reduceContentFile(image.contentFile)}}</td>
        </tr>
        <tr *ngIf="image.fromArchive">
          <td class="column1">Archive Filename:</td>
          <td class="value">{{reduceContentFile(image.archiveFilename)}}</td>
        </tr>
      </table>
    </div>
  </div>
</masonry-brick>
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

export class MasonryTileComponent implements OnChanges {

  constructor(  public el: ElementRef,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService ) {} // this.changeDetectionRef.detach(); private http: Http

  @Input() private apiServerUrl: string;
  @Input() private image: any;
  @Input() private session: any;
  @Input() private masonryKeys: any;
  @Input() public masonryColumnSize: number;
  @Output() public openPDFViewer: EventEmitter<any> = new EventEmitter<any>();
  @Output() private openSessionDetails: EventEmitter<any> = new EventEmitter<any>();
  private enabledTrigger = 'disabled';
  private data: any = {}; // prevent opening pdf modal if dragging the view

/*
  private displayedMetaKeys = [ {key: 'alias.host', name: 'Hostname'},
                                {key: 'service', name: 'Service'},
                                {key: 'search.text', name: 'Search Text'}
                              ];
*/

  ngOnChanges(e: any): void {
    // log.debug("MasonryTileComponent: OnChanges():", e);
    /*if ('image' in e && e.image.currentValue) {
     log.debug('MasonryTileComponent: ngOnChanges: image:', e.image.currentValue);
    }*/
    if ('session' in e && e.session.currentValue !== undefined) { // de-dupe meta keys
      for (let key in e.session.currentValue.meta) {
        this.session.meta[key] = this.unique(e.session.currentValue.meta[key]);
      }
    }
  }

  onClick(e: any): void {
    // log.debug("onClick")
    // if (Math.abs(top - ptop) < 15 || Math.abs(left - pleft) < 15) {
    if (this.image.contentType === 'pdf') {
      // log.debug("display pdf");
      // log.debug("emitting openPDFViewerEmitter")
      this.toolService.newSession.next(this.session);
      this.toolService.newImage.next(this.image);

      // this.openPDFViewer.emit( { pdfFile: this.image.contentFile, session: this.session, image: this.image } );
      this.openPDFViewer.emit();
    }
    else {
      // log.debug("display pdf");
      // log.debug("emitting openPDFViewer")
      this.toolService.newSession.next(this.session);
      this.toolService.newImage.next(this.image);
      // this.openSessionDetails.emit( { image: this.image, session: this.session } );
      this.openSessionDetails.emit();
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

  reduceContentFile(s: string): string {
    const RE = /([^/]*)$/;
    let match = RE.exec(s);
    // log.debug(match[0]);
    return match[0];
  }

  toCaps(s: string) {
    return s.toUpperCase();
  }

}
