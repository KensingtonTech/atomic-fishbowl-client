import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, Renderer, Input, Output, EventEmitter, OnChanges } from '@angular/core';
// import { trigger, state, style, animate, transition } from '@angular/animations';
import { ToolService } from './tool.service';
import { Content } from './content';
declare var log: any;

@Component({
  selector: 'img-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="thumbnail-container">

  <div *ngIf="!showHighRes">
    <img *ngIf="content.contentType == 'image'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + content.thumbnail" class="thumbnail" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">
    <img *ngIf="content.contentType == 'pdf'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + content.thumbnail" class="thumbnail pdf" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">
    <img *ngIf="content.contentType == 'encryptedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'unsupportedZipEntry'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/zip_icon_unknown.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedRarTable'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/rar_icon_locked.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
    <img *ngIf="content.contentType == 'hash'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" class="thumbnail" src="/resources/executable_hash_icon.png" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile" draggable="false">
  </div>

  <div *ngIf="showHighRes">
    <img *ngIf="content.contentType == 'image'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + content.contentFile" class="thumbnail" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">
    <img *ngIf="content.contentType == 'pdf'" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + content.pdfImage" class="thumbnail pdf" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">
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

    .disable {}
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

export class ImgTileComponent implements OnChanges {

  constructor(private el: ElementRef,
              private renderer: Renderer,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolService ) {} // private imgcacheService: ImgcacheService, private http: Http

  @Input() apiServerUrl: string;
  @Input() highResSession: number;
  @Input() showHighRes = false;
  @Input() content: Content;
  @Input() session: any;
  @Output() openPDFViewer: EventEmitter<any> = new EventEmitter<any>();
  private thumbnailString: string;
  private thumbnailLoaded = false;
  private enabledTrigger = 'disabled';
  private isPdf = false;
  private data: any = {}; // prevent opening pdf modal if dragging the view

  handleError(error: any): Promise<any> {
    log.error('ERROR: ', error);
    return Promise.reject(error.message || error);
  }

  enableMe(): void {
    // log.debug("enableMe");
    // this.renderer.setElementStyle(this.el.nativeElement, 'display', 'inline-block');
    // this.renderer.setElementStyle(this.el.nativeElement, 'display', 'block');
    this.enabledTrigger = 'enabled';
    // this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
    // this.viewContainer.createEmbeddedView(this.templateRef);
  }

  disableMe(): void {
    // log.debug('disableMe()')
    this.enabledTrigger = 'disabled';
    // this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
    // setTimeout(() => this.renderer.setElementStyle(this.el.nativeElement, 'display', 'none'), 1000 )
    // setTimeout(() => this.renderer.setElementStyle(this.el.nativeElement, 'display', 'none'), 1000 )
    // this.renderer.setElementStyle(this.el.nativeElement, 'display', 'none');
    // this.viewContainer.clear();
    // this.renderer.destroyView(this.el.nativeElement);
    // this.renderer.detachFragment(this.el.nativeElement);
  }

  ngOnChanges(o: any): void {
    // log.debug("onChanges:", o);
    // if (o.highResSession && this.content.session === o.highResSession.currentValue) {
    //    if (o.showHighRes && !this.showHighRes) {
    //    }
    if (o.highResSession && this.content.session && this.content.session === o.highResSession.currentValue) {
      // log.debug("enabling high res for session", o.highResSession.currentValue);
      // log.debug("o.highResSession.currentValue");
      this.showHighRes = true;
      this.changeDetectionRef.markForCheck();
      // log.debug('showing high res');
    }
    else if (this.showHighRes) { // this was previously high res but the session didn't match.  set it back to low-res
      this.showHighRes = false;
      this.changeDetectionRef.markForCheck();
    }
  }

/*
  onImgLoad(): void {
    //log.debug("loaded");
 //moved temporarily to aftercontentinit
    //this.changeDetectionRef.reattach();
    if ( this.content ) {
      if (this.content.contentType === 'pdf') {
        this.isPdf = true;
      }
    }
    this.enableMe();
    this.imgLoaded = true;
  }
*/

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
    if (Math.abs(top - ptop) === 0 || Math.abs(left - pleft) === 0) {
      if (this.content.contentType === 'pdf') {
        this.toolService.newImage.next(this.content);
        this.toolService.newSession.next(this.session);
        this.openPDFViewer.emit();
      }
    }
  }

}

