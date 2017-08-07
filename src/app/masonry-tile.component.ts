import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, Renderer, Input, Output, EventEmitter, OnChanges, AfterContentInit, AfterViewInit } from '@angular/core';
import { NgStyle } from '@angular/common';
//import { trigger, state, style, animate, transition } from '@angular/animations';
//import { MasonryOptions } from 'angular2-masonry';
import { ToolWidgetCommsService } from './tool-widget.comms.service';
import { LoggerService } from './logger-service';

@Component({
  selector: 'masonry-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  //(layoutComplete)="layoutComplete()"
  //(load)="onImgLoad()"

// <masonry-brick class="brick">
//   <img [class.pdf]="isPdf" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + image.thumbnail" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile">
// </masonry-brick>
//  <img [class.pdf]="isPdf" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + image.thumbnail" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile">
// class="brick"

//  <div *ngIf="width" style="background-color: white; border-radius: 5px; font-size: 9pt; font-weight: lighter; width: 350px;" [style.width]="{{width}}px">
//[ngStyle]="{'width.px': width}"
//*ngIf="masonryColumnSize" [ngStyle]="{'width.px': masonryColumnSize}"
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
        <div *ngIf="image.fromArchive == 'zip' || image.fromArchive == 'rar' || image.contentType == 'pdf' || image.contentType == 'encryptedZipEntry' || image.contentType == 'unsupportedZipEntry' || image.contentType == 'encryptedRarEntry'" style="position: absolute; bottom: 5px; right: 5px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
          <i *ngIf="image.contentType == 'encryptedZipEntry' || image.contentType == 'unsupportedZipEntry' || image.contentType == 'encryptedRarEntry' || image.fromArchive == 'zip' || image.fromArchive == 'rar'" class="fa fa-file-archive-o fa-2x"></i>
          <i *ngIf="image.contentType == 'encryptedZipEntry' || image.contentType == 'unsupportedZipEntry' || image.contentType == 'encryptedRarEntry'" class="fa fa-lock fa-2x"></i>
          <i *ngIf="image.contentType == 'pdf'" class="fa fa-file-pdf-o fa-2x"></i>
        </div>
      </div>
      <img *ngIf="image.contentType != 'encryptedZipEntry' && image.contentType != 'unsupportedZipEntry' && image.contentType != 'encryptedRarEntry' && image.contentType != 'md5Matched' && image.contentType != 'sha1Matched' && image.contentType != 'sha256Matched'" class="separator" (click)="onClick($event)" (load)="onImgLoad()" [class.pdf]="isPdf" [src]="apiServerUrl + image.thumbnail" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false">

      <img *ngIf="image.contentType == 'encryptedZipEntry'" class="separator" (click)="onClick($event)" src="/resources/zip_icon_locked.png" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false">
      <img *ngIf="image.contentType == 'unsupportedZipEntry'" class="separator" (click)="onClick($event)" src="/resources/zip_icon_unknown.png" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false">
      <img *ngIf="image.contentType == 'encryptedRarEntry'" class="separator" (click)="onClick($event)" src="/resources/rar_icon_locked.png" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false">
      <img *ngIf="image.contentType == 'md5Matched'" class="separator" (click)="onClick($event)" src="/resources/executable_hash_icon.png" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false" [attr.md5Hash]="image.md5Hash">
      <img *ngIf="image.contentType == 'sha1Matched'" class="separator" (click)="onClick($event)" src="/resources/executable_hash_icon.png" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false" [attr.sha1Hash]="image.sha1Hash">
      <img *ngIf="image.contentType == 'sha256Matched'" class="separator" (click)="onClick($event)" src="/resources/executable_hash_icon.png" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" draggable="false" [attr.sha256Hash]="image.sha256Hash">

    </div>
    <div class="textArea" *ngIf="session && masonryKeys">
      <table class="selectable" style="width: 100%;">
        <tr *ngFor="let key of masonryKeys">
          <td *ngIf="session.meta[key.key]" class="column1">{{key.friendly}}</td>
          <td *ngIf="session.meta[key.key]" class="value">{{session.meta[key.key]}}</td>
        </tr>
        <tr *ngIf="image.md5Hash">
          <td class="column1">MD5 Hash:</td>
          <td class="value">{{image.md5Hash}}</td>
        </tr>
        <tr *ngIf="image.sha1Hash">
          <td class="column1">SHA1 Hash:</td>
          <td class="value">{{image.sha1Hash}}</td>
        </tr>
        <tr *ngIf="image.sha256Hash">
          <td class="column1">SHA256 Hash:</td>
          <td class="value">{{image.sha256Hash}}</td>
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
      //width: 70px;
      font-weight: bold;
      vertical-align: top;
    }

    .value {
      //white-space: nowrap;
      word-wrap: break-word;
      color: black;
    }

    img {
      width: 100%;
      height: auto;

    }

    .pdf {
      box-sizing: border-box;
      border: solid 3px red;
//      width: 344px;
//      height: auto;
    }

  `],

/*
  animations: [
    trigger('faderAnimation', [
      //state('enabled',  style({ opacity: 1, display: 'inline-block' })),
      state('enabled',  style({ opacity: 1 })),
      state('disabled', style({ opacity: 0 })),
      transition('* => *', animate('1s')),
    ])
  ]
*/
})

export class MasonryTileComponent implements OnChanges, AfterViewInit {

  constructor(  public el: ElementRef,
                private renderer: Renderer,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolWidgetCommsService,
                private loggerService: LoggerService ) {} //this.changeDetectionRef.detach(); private http: Http

  @Input() private apiServerUrl: string;
  @Input() private image: any;
  @Input() private session: any;
  @Input() private masonryKeys: any;
  @Input() public masonryColumnSize: number;
  @Output('openPDFViewer') private openPDFViewerEmitter: EventEmitter<any> = new EventEmitter<any>();
  @Output('openSessionDetails') private openSessionDetails: EventEmitter<any> = new EventEmitter<any>();
  private enabledTrigger: string = 'disabled';
  private isPdf: boolean = false;
/*
  private displayedMetaKeys = [ {key: 'alias.host', name: 'Hostname'},
                                {key: 'service', name: 'Service'},
                                {key: 'search.text', name: 'Search Text'}
                              ];
*/

  ngOnChanges(e: any): void {
    //console.log("MasonryTileComponent: OnChanges():", e);
    //if (e.session) { //de-dupe meta keys
    if ('session' in e && e.session.currentValue != undefined) { //de-dupe meta keys
      for (let key in e.session.currentValue.meta) {
        this.session.meta[key] = this.unique(e.session.currentValue.meta[key]);
        //console.log("this.session.meta[key]:", this.session.meta[key])
      }
      //this.changeDetectionRef.detectChanges();
      //this.changeDetectionRef.markForCheck();
    }

/*    if ('masonryKeys' in e && this.masonryKeys.length != e.masonryKeys.currentValue.length ) {  //array lengths differ so detect changes
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    }
    else if ('masonryKeys' in e) {
      for (let i=0; i < e.masonryKeys.currentValue.length) {

      }
    }
*/

  }

  ngAfterViewInit(): void {
    //this.changeDetectionRef.detectChanges();
    //this.changeDetectionRef.markForCheck();
  }

  onImgLoad(): void {
    //console.log("Image loaded");
 //moved temporarily to aftercontentinit
    //this.changeDetectionRef.reattach();
    if ( this.image ) {
      if (this.image.contentType === 'pdf') {
        this.isPdf = true;
      }
    }
    //this.changeDetectionRef.reattach();
    //this.changeDetectionRef.markForCheck();
  }


  private data: any = {}; //prevent opening pdf modal if dragging the view


  onClick(e: any): void {
    //console.log("onClick")
    //if (Math.abs(top - ptop) < 15 || Math.abs(left - pleft) < 15) {
    if (this.image.contentType === 'pdf') {
      //console.log("display pdf");
      //console.log("emitting openPDFViewerEmitter")
      this.toolService.newSession.next(this.session);
      this.toolService.newImage.next(this.image);

      //this.openPDFViewerEmitter.emit( { pdfFile: this.image.contentFile, session: this.session, image: this.image } );
      this.openPDFViewerEmitter.emit();
    }
    else {
      //console.log("display pdf");
      //console.log("emitting openPDFViewerEmitter")
      this.toolService.newSession.next(this.session);
      this.toolService.newImage.next(this.image);
      //this.openSessionDetails.emit( { image: this.image, session: this.session } );
      this.openSessionDetails.emit();
    }
  }

  handleError(error: any): Promise<any> {
    console.error('ERROR:',error);
    return Promise.reject(error.message || error);
  }

  unique(a: any): any {
    var unique = [];
    for (let i = 0; i < a.length; i++) {
      let current = a[i];
      if (unique.indexOf(current) < 0) unique.push(current);
    }
    return unique;
  }

}
