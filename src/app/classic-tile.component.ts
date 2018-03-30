import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, AfterViewInit, Inject, forwardRef } from '@angular/core';
import { ToolService } from './tool.service';
import { Content } from './content';
import { Subscription } from 'rxjs/Subscription';
import { ClassicGridComponent } from './classic-grid.component';
declare var log;
// import * as math from 'mathjs';
declare var math: any;

@Component({
  selector: 'classic-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="thumbnail-container">

  <div [hidden]="showHighRes">
    <img *ngIf="content.contentType == 'image'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" class="thumbnail" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">
    <img *ngIf="content.contentType == 'pdf'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" class="thumbnail pdf" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">

    <img *ngIf="content.contentType == 'office'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" class="thumbnail" [ngClass]="content.contentSubType" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentSubType]="content.contentSubType" [attr.contentFile]="content.contentFile" [attr.proxyContentFile]="content.proxyContentFile">

    <img *ngIf="content.contentType == 'encryptedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'unsupportedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_unknown.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedRarTable'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/rar_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'hash' && content.hashType == 'md5'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/md5_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'hash' && content.hashType == 'sha1'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/sha1_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'hash' && content.hashType == 'sha256'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/sha256_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
  </div>

  <div [hidden]="!showHighRes">
    <img *ngIf="content.contentType == 'image'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.contentFile" class="thumbnail" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">
    <img *ngIf="content.contentType == 'pdf'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.pdfImage" class="thumbnail pdf" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">

    <img *ngIf="content.contentType == 'office'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.pdfImage" class="thumbnail" [ngClass]="content.contentSubType" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentSubType]="content.contentSubType" [attr.contentFile]="content.contentFile">

    <img *ngIf="content.contentType == 'encryptedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'unsupportedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_unknown.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedRarTable'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/rar_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'hash' && content.hashType == 'md5'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/md5_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'hash' && content.hashType == 'sha1'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/sha1_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'hash' && content.hashType == 'sha256'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/sha256_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
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
})

export class ClassicTileComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {

  constructor(private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolService,
              @Inject(forwardRef(() => ClassicGridComponent)) private parent: ClassicGridComponent ) {}

  @Input() content: Content;
  @Input() sessionId: number;
  @Input() serviceType: string; // 'nw' or 'sa'
  @Input() public collectionId: string = null;
  @Output() openPDFViewer: EventEmitter<void> = new EventEmitter<void>();
  @Output() openSessionDetails: EventEmitter<void> = new EventEmitter<void>();
  public session: any;
  public showHighRes = false;
  private mouseDownData: any = {}; // prevent opening pdf modal if dragging the view

  private showHighResSessionsSubscription: Subscription;



  ngOnInit(): void {
    this.showHighResSessionsSubscription = this.toolService.showHighResSessions.subscribe( (sessions: any) => this.onShowHighResSessions(sessions) );
    this.session = this.parent.sessions[this.sessionId];
  }



  onShowHighResSessions(sessions: any): void {
    let oldHighRes = this.showHighRes;

    if (this.sessionId && this.sessionId in sessions ) {
      this.showHighRes = true;
    }
    else {
      this.showHighRes = false;
    }

    if (this.showHighRes !== oldHighRes) {
      this.changeDetectionRef.detectChanges();
    }

  }



  ngAfterViewInit(): void {
    this.changeDetectionRef.detach();
  }



  ngOnDestroy(): void {
    this.showHighResSessionsSubscription.unsubscribe();
  }



  ngOnChanges(values: any): void {
    // log.debug('ClassicTileComponent: onChanges():', values);
    this.changeDetectionRef.reattach();
    setTimeout( () => this.changeDetectionRef.detach(), 0);
  }



  onMouseDown(e: any): void {
    this.mouseDownData = { top: e.pageX, left: e.pageY };
  }



  onMouseUp(e: any): void {
    let top   = e.pageX;
    let left  = e.pageY;
    let ptop  = this.mouseDownData.top;
    let pleft = this.mouseDownData.left;
    // prevent opening pdf modal if dragging the view
    if (math.abs(top - ptop) === 0 || math.abs(left - pleft) === 0) {

      this.toolService.newSession.next( this.session );
      this.toolService.newImage.next(this.content);

      if (this.content.contentType === 'pdf' || this.content.contentType === 'office') {
        this.openPDFViewer.emit();
      }
      else {
        this.openSessionDetails.emit();
      }


    }
  }



}

