import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, Renderer, Input, Output, EventEmitter, OnChanges } from '@angular/core';
//import { trigger, state, style, animate, transition } from '@angular/animations';
import { ToolWidgetCommsService } from './tool-widget.comms.service';
import { LoggerService } from './logger-service';

@Component({
  selector: 'img-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  //encapsulation: ViewEncapsulation.Emulated,
//[@faderAnimation]="enabledTrigger"
//(click)="onClick()"
//(load)="onImgLoad()"
/*
<div class="image-gallery-thumbnail-container">
  <img *ngIf="!showHighRes" (load)="onImgLoad()" [class.pdf]="isPdf" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + image.thumbnail" class="image-gallery-thumbnail" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile">
  <img *ngIf="showHighRes" [class.pdf]="isPdf" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + image.image" class="image-gallery-thumbnail" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile">
</div>
*/
/*2017.05.19:
<div class="image-gallery-thumbnail-container">
  <img *ngIf="!showHighRes" [class.pdf]="isPdf" (load)="onImgLoad()" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + image.thumbnail" class="image-gallery-thumbnail" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile">
  <img *ngIf="showHighRes" [class.pdf]="isPdf" (load)="onImgLoad()" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + image.image" class="image-gallery-thumbnail" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile">
*/
//[src]="apiServerUrl + image.thumbnail"
//[src]="data:{{contentType}};base64,{{imgBuffer}}"
//(load)="onImgLoad()"
//[src]="thumbnailString"
  template: `
<div class="image-gallery-thumbnail-container">
  <img *ngIf="!showHighRes" [class.pdf]="isPdf" (load)="onImgLoad()" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + image.thumbnail" class="image-gallery-thumbnail" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile">
  <img *ngIf="showHighRes" [class.pdf]="isPdf" (load)="onImgLoad()" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)" [src]="apiServerUrl + image.image" class="image-gallery-thumbnail" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile">
</div>
  `,
  styles: [`
    .image-gallery-thumbnail-container {
      //display: none;
      //display: inline-block;
      //display: block;
      position:relative;
      margin: 2px 10px 0 0;
      width: 116px;
      height: 116px;
      cursor: pointer;
      overflow:hidden;
      //opacity: 0;
      text-align:center;
      line-height:110px;
    }
    .image-gallery-thumbnail {
      //width: auto:
      //height: auto;
      max-width: 110px;
      max-height: 110px;
      //max-width: 100%;
      //max-height: 100%;
      vertical-align: middle;
    }
    .pdf {
      border: solid 3px red;
      box-sizing: border-box;
    }

    .disable {

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

export class ImgTileComponent implements OnChanges {


  @Input('apiServerUrl') apiServerUrl: string;
//  @Input('hideImage') hideImage: boolean = false;
//  @Input('hidePDF') hidePDF: boolean = false;
  @Input('highResSession') highResSession : number;
  @Input('showHighRes') showHighRes: boolean = false;
  @Input('image') image: any;
  @Input('session') session: any;
  @Output('openPDFViewer') openPDFViewerEmitter: EventEmitter<any> = new EventEmitter<any>();
  private enabledTrigger: string = 'disabled';
  private isPdf: boolean = false;

  constructor(private el: ElementRef,
              private renderer: Renderer,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolWidgetCommsService,
              private loggerService: LoggerService ) {} //private imgcacheService: ImgcacheService, private http: Http

  //private contentType: string;
  private thumbnailString: string;
  private thumbnailLoaded: boolean = false;

  handleError(error: any): Promise<any> {
    console.error('ERROR: ',error);
    return Promise.reject(error.message || error);
  }

  enableMe(): void {
    //console.log("enableMe");
    //this.renderer.setElementStyle(this.el.nativeElement, 'display', 'inline-block');
    //this.renderer.setElementStyle(this.el.nativeElement, 'display', 'block');
    this.enabledTrigger = 'enabled';
    //this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
    //this.viewContainer.createEmbeddedView(this.templateRef);
  }

  disableMe(): void {
    //console.log('disableMe()')
    this.enabledTrigger = 'disabled';
    //this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
    //setTimeout(() => this.renderer.setElementStyle(this.el.nativeElement, 'display', 'none'), 1000 )
    //setTimeout(() => this.renderer.setElementStyle(this.el.nativeElement, 'display', 'none'), 1000 )
    //this.renderer.setElementStyle(this.el.nativeElement, 'display', 'none');
    //this.viewContainer.clear();
    //this.renderer.destroyView(this.el.nativeElement);
    //this.renderer.detachFragment(this.el.nativeElement);
  }

  ngOnChanges(o: any): void {
    //console.log("onChanges:", o);
    //if (o.highResSession && this.image.session === o.highResSession.currentValue) {
//    if (o.showHighRes && !this.showHighRes) {
//    }
    if (o.highResSession && this.image.session && this.image.session == o.highResSession.currentValue) {
      //console.log("enabling high res for session", o.highResSession.currentValue);
      //console.log("o.highResSession.currentValue");
      this.showHighRes = true;
      this.changeDetectionRef.markForCheck();
      console.log("showing high res");
    }
    else if (this.showHighRes) { //this was previously high res but the session didn't match.  set it back to low-res
      this.showHighRes = false;
      this.changeDetectionRef.markForCheck();
    }
  }

  //private imgLoaded: boolean = false;

/*
  onImgLoad(): void {
    //console.log("loaded");
 //moved temporarily to aftercontentinit
    //this.changeDetectionRef.reattach();
    if ( this.image ) {
      if (this.image.contentType === 'pdf') {
        this.isPdf = true;
      }
    }
    this.enableMe();
    this.imgLoaded = true;
  }
*/

  onImgLoad(): void {
    //console.log("ImgTileComponent: Image loaded");
 //moved temporarily to aftercontentinit
    //this.changeDetectionRef.reattach();
    if ( this.image ) {
      if (this.image.contentType === 'pdf') {
        this.isPdf = true;
      }
    }
    this.changeDetectionRef.markForCheck();
  }

  private data: any = {}; //prevent opening pdf modal if dragging the view

  onMouseDown(e: any): void {
    this.data = { top: e.pageX, left: e.pageY };
  }

  onMouseUp(e: any): void {
    var top   = e.pageX;
    var left  = e.pageY;
    var ptop  = this.data.top;
    var pleft = this.data.left;
    //if (Math.abs(top - ptop) < 15 || Math.abs(left - pleft) < 15) {
    //if (Math.abs(top - ptop) < 5 || Math.abs(left - pleft) < 5) {
    if (Math.abs(top - ptop) === 0 || Math.abs(left - pleft) === 0) {
      if (this.image.contentType === 'pdf') {
        //console.log("display pdf");
        this.toolService.newImage.next(this.image);
        //this.openPDFViewerEmitter.emit( { pdfFile: this.image.contentFile, image: this.image } ); //session: this.session, image: this.image
         this.toolService.newSession.next(this.session);

         this.openPDFViewerEmitter.emit(); //session: this.session, image: this.image
      }
    }
  }

}

