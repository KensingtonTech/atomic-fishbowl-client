import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, Input, Output, EventEmitter, OnChanges } from '@angular/core';
// import { trigger, state, style, animate, transition } from '@angular/animations';
import { ToolService } from './tool.service';
import { Content } from './content';
import { abs } from 'mathjs';
import * as log from 'loglevel';

@Component({
  selector: 'classic-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="thumbnail-container">

  <div [hidden]="showHighRes">
    <img *ngIf="content.contentType == 'image'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + content.thumbnail" class="thumbnail" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">
    <img *ngIf="content.contentType == 'pdf'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + content.thumbnail" class="thumbnail pdf" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">

    <img *ngIf="content.contentType == 'office'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + content.thumbnail" class="thumbnail" [ngClass]="content.contentSubType" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentSubType]="content.contentSubType" [attr.contentFile]="content.contentFile" [attr.proxyContentFile]="content.proxyContentFile">

    <img *ngIf="content.contentType == 'encryptedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'unsupportedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_unknown.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedRarTable'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/rar_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'hash'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/executable_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
  </div>

  <div [hidden]="!showHighRes">
    <img *ngIf="content.contentType == 'image'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + content.contentFile" class="thumbnail" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">
    <img *ngIf="content.contentType == 'pdf'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + content.pdfImage" class="thumbnail pdf" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">

    <img *ngIf="content.contentType == 'office'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + content.pdfImage" class="thumbnail" [ngClass]="content.contentSubType" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentSubType]="content.contentSubType" [attr.contentFile]="content.contentFile">

    <img *ngIf="content.contentType == 'encryptedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'unsupportedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_unknown.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedRarTable'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/rar_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'hash'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/executable_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
  </div>

</div>
  `,
  styles: [`
    .thumbnail-container {
      position:relative;
      margin: 2px 10px 0 0;
      width: 116px;
      height: 116px;
      cursor: pointer;
      overflow:hidden;
      text-align:center;
      line-height:110px;
    }

    .thumbnail {
      max-width: 110px;
      max-height: 110px;
      vertical-align: middle;
    }

    .pdf {
      box-sizing: border-box;
      border: solid 3px red;
    }

    .word {
      box-sizing: border-box;
      border: solid 3px rgb(42,86,153);
    }

    .excel {
      box-sizing: border-box;
      border: solid 4px rgb(32,114,71);
    }

    .powerpoint {
      box-sizing: border-box;
      border: solid 3px rgb(211,71,38);
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

export class ClassicTileComponent implements OnChanges {

  constructor(private el: ElementRef,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolService ) {}

  @Input() apiServerUrl: string;
  @Input() highResSessions: number[];
  @Input() content: Content;
  @Input() session: any;
  @Input() sessionId: number;
  @Output() openPDFViewer: EventEmitter<any> = new EventEmitter<any>();
  public showHighRes = false;
  private thumbnailString: string;
  private thumbnailLoaded = false;
  private enabledTrigger = 'disabled';
  private data: any = {}; // prevent opening pdf modal if dragging the view

  enableMe(): void {
    // log.debug("enableMe");
    this.enabledTrigger = 'enabled';
    this.changeDetectionRef.markForCheck();
  }

  disableMe(): void {
    // log.debug('disableMe()')
    this.enabledTrigger = 'disabled';
    this.changeDetectionRef.markForCheck();
  }

  ngOnChanges(o: any): void {
    // log.debug("onChanges:", o);
    let foundHighRes = false;
    if (o.highResSessions && this.sessionId) {
      let highResSessions = o.highResSessions.currentValue;
      if ( highResSessions.includes(this.sessionId) ) {
        this.showHighRes = true;
        foundHighRes = true;
      }
    }
    if (this.showHighRes && !foundHighRes) { // this was previously high res but the session didn't match.  set it back to low-res
      this.showHighRes = false;
    }
  }

  onMouseDown(e: any): void {
    this.data = { top: e.pageX, left: e.pageY };
  }

  onMouseUp(e: any): void {
    let top   = e.pageX;
    let left  = e.pageY;
    let ptop  = this.data.top;
    let pleft = this.data.left;
    // if (Math.abs(top - ptop) < 15 || Math.abs(left - pleft) < 15) {
    // if (Math.abs(top - ptop) < 5 || Math.abs(left - pleft) < 5) {
    if (abs(top - ptop) === 0 || abs(left - pleft) === 0) {
      if (this.content.contentType === 'pdf' || this.content.contentType === 'office') {
        this.toolService.newImage.next(this.content);
        this.toolService.newSession.next(this.session);
        this.openPDFViewer.emit();
      }
    }
  }

}

