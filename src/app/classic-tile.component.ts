import { Component, ChangeDetectionStrategy, ChangeDetectorRef, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, AfterViewInit, Inject, forwardRef } from '@angular/core';
import { ToolService } from './tool.service';
import { Content } from './content';
import { Subscription } from 'rxjs';
import { ClassicGridComponent } from './classic-grid.component';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'classic-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div *ngIf="content" class="thumbnail-container">

  <ng-container [ngSwitch]="content.contentType">

    <!-- low-res images -->
    <img *ngSwitchCase="'image'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" class="thumbnail" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" [hidden]="showHighRes">
    <img *ngSwitchCase="'pdf'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" class="thumbnail pdf" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false" [hidden]="showHighRes">
    <img *ngSwitchCase="'office'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.thumbnail" class="thumbnail" [ngClass]="content.contentSubType" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentSubType]="content.contentSubType" [attr.contentFile]="content.contentFile" [attr.proxyContentFile]="content.proxyContentFile" draggable="false" [hidden]="showHighRes">

    <!-- archives -->
    <img *ngSwitchCase="'encryptedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngSwitchCase="'unsupportedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_unknown.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngSwitchCase="'encryptedRarEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/rar_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngSwitchCase="'encryptedRarTable'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/rar_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">

    <!-- hashes -->
    <ng-container *ngSwitchCase="'hash'">
      <ng-container [ngSwitch]="content.hashType">
        <img *ngSwitchCase="'md5'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/md5_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
        <img *ngSwitchCase="'sha1'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/sha1_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
        <img *ngSwitchCase="'sha256'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/sha256_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
      </ng-container>
    </ng-container>

  </ng-container>

  <!-- high res images -->
  <ng-container *ngIf="showHighRes || loadHighRes">
    <ng-container [ngSwitch]="content.contentType">
      <img *ngSwitchCase="'image'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.contentFile" class="thumbnail" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" [hidden]="!showHighRes">
      <img *ngSwitchCase="'pdf'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.pdfImage" class="thumbnail pdf" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false" [hidden]="!showHighRes">
      <img *ngSwitchCase="'office'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="'/collections/' + collectionId + '/' + content.pdfImage" class="thumbnail" [ngClass]="content.contentSubType" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentSubType]="content.contentSubType" [attr.contentFile]="content.contentFile" draggable="false" [hidden]="!showHighRes">
    </ng-container>
  </ng-container>

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
  @Input() collectionId: string = null;
  @Input() loadHighRes = false; // this triggers initial loading of the high-res image (not the displaying of it)
  @Output() openPDFViewer: EventEmitter<void> = new EventEmitter<void>();
  @Output() openSessionDetails: EventEmitter<void> = new EventEmitter<void>();
  public session: any;
  public showHighRes = false;
  private mouseDownData: any = {}; // prevent opening pdf modal if dragging the view

  private showHighResSessionsSubscription: Subscription;
  private imgElement: Element;



  ngOnInit(): void {
    this.showHighResSessionsSubscription = this.toolService.showHighResSessions.subscribe( (sessions: any) => this.onShowHighResSessions(sessions) );
    this.session = this.parent.sessions[this.sessionId];
  }



  onShowHighResSessions(sessions: any): void {
    let oldHighRes = this.showHighRes;

    if (!sessions) {
      this.showHighRes = false;
    }
    else if (this.sessionId && this.sessionId in sessions ) {
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
    /*setTimeout( () => {
      // this.changeDetectionRef.reattach();
      this.loadHighRes = true;
      // this.changeDetectionRef.detectChanges();
      setTimeout( () => this.changeDetectionRef.detach(), 0);
      // this.changeDetectionRef.detach();
    }, 1000);*/
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
    if (Math.abs(top - ptop) === 0 || Math.abs(left - pleft) === 0) {

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

