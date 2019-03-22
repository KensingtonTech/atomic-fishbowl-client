import { Component, OnInit, OnDestroy, Input, Renderer2, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs';
import * as utils from './utils';
import { Logger } from 'loglevel';
declare var log: Logger;

(<any>window).pdfWorkerSrc = '/resources/pdf.worker.min.js';

export enum KEY_CODE {
  RIGHT_ARROW = 39,
  LEFT_ARROW = 37
}

@Component({
  selector: 'pdf-viewer-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<modal id="{{id}}" (opened)="onOpen()" (closed)="onClosed()" bodyStyle="position: absolute; top: 40px; bottom: 20px; left: 10px; right: 25px; background-color: white; font-size: 10pt;">

      <!-- close -->
      <div (click)="onCloseClicked()" style="position: absolute; top: 2px; right: 10px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>

      <!-- Top Bar / Menu Bar -->
      <div *ngIf="isOpen && content" style="position: absolute; left: 0; right: 350px; top: 0; height: 30px; padding-bottom: 2px; background-color: rgba(0, 0, 0, .8); color: white;">

        <!-- filename and download link (disabled) -->
        <div style="position: absolute; top: 5px; left: 10px; width: 85%; white-space: nowrap;">
          <span class="fa fa-lg" [ngClass]="iconClass" style="background-color: white;"></span>&nbsp;
          <!--<a (click)="downloadLinkClicked(content.contentFile)" style="display: inline-block; vertical-align: middle;" class="fa fa-arrow-circle-o-down fa-2x" pTooltip="Download Document" showDelay="750"></a>-->
          <!--<a style="display: inline-block; vertical-align: middle;" class="fa fa-arrow-circle-o-down fa-2x" pTooltip="Download Document" showDelay="750" href="{{content.contentFile}}"></a>-->
          <span style="vertical-align: middle;">{{utils.pathToFilename(content.contentFile)}}</span>
          <!--<span *ngIf="content.contentType == 'office'" style="vertical-align: middle;">{{utils.pathToFilename(content.proxyContentFile)}}</span>-->
        </div>

        <!-- zoom, rotation, next / previous controls -->
        <div class="noselect" style="position: absolute; top: 5px; right: 15px; text-align: right;">

          <!-- zoom level -->
          <span style="line-height: 2em; display: inline-block; vertical-align: middle;">
            <b>Zoom&nbsp;</b>
            <select name="pdfZoomSelector" [(ngModel)]="pdfZoom" (ngModelChange)="onZoomLevelChange($event)">
              <option *ngFor="let zoomLevel of zoomLevels" [ngValue]="zoomLevel.value">{{zoomLevel.text}}</option>
            </select>
            &nbsp;&nbsp;
          </span>

          <!-- rotate button -->
          <span style="line-height: 2em; display: inline-block; vertical-align: middle;">
            <i (click)="rotate()" class="fa fa-repeat fa-lg"></i>&nbsp;&nbsp;{{numPages}} pages&nbsp;&nbsp;
          </span>

          <!-- next / previous buttons -->
          <span class="fa fa-arrow-circle-o-left fa-2x" style="vertical-align: bottom;" [class.disabled]="noPreviousSession" (click)="onPreviousSessionArrowClicked()" pTooltip="Previous session"></span>&nbsp;<span class="fa fa-arrow-circle-o-right fa-2x" style="vertical-align: bottom;" [class.disabled]="noNextSession" (click)="onNextSessionArrowClicked()" pTooltip="Next session"></span>

        </div>

      </div>

      <!-- pdf viewer -->
      <div *ngIf="pdfFile" style="position: absolute; top: 40px; bottom: 10px; left: 0; right: 350px;"> <!--overflow-y: scroll; overflow-x: auto;-->
        <div style="position: relative; width: 100%; height: 100%; overflow-x: scroll; overflow-y: scroll;">
          <pdf-viewer [rotation]="rotation" [zoom]="pdfZoom" [(page)]="selectedPage" (after-load-complete)="absorbPdfInfo($event)" [src]="'/collections/' + collectionId + '/' + pdfFile" [original-size]="false" [show-all]="true" (error)="onPdfViewerError($event)" style="display: block; width: 100%; margin: 0 auto;"></pdf-viewer>
        </div>
      </div> <!--overflow: auto;-->

      <!-- display archive filename, archive icon and archive type -->
      <div *ngIf="isOpen && content && content.fromArchive" style="position: absolute; top: 40px; right: 365px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 4px; text-align: right;">
        <span style="display: inline-block; vertical-align: middle;">{{utils.pathToFilename(content.archiveFilename)}}&nbsp;</span>
        <span class="fa fa-file-archive-o fa-lg" style="display: inline-block; vertical-align: middle;">&nbsp;</span>
        <span>{{content.archiveType | allCaps}}</span>
      </div>

      <!-- show meta -->
      <div *ngIf="isOpen" style="position: absolute; top: 0; bottom: 0; right: 0; width: 350px; padding-left: 5px; box-sizing: border-box; background-color: rgba(0, 0, 0, .8);">

        <session-widget [session]="session" [serviceType]="serviceType" styleClass="pdfViewerSessionWidget"></session-widget>

      </div>

</modal>
<downloadfile-confirm-modal></downloadfile-confirm-modal>
  `,
  styles: [`

  .disabled {
    color: grey;
  }

  .fa-file-pdf-o {
    color: red;
  }

  .fa-file-excel-o {
    color: rgb(32,114,71);
  }

  .fa-file-word-o {
    color: rgb(42,86,153);
  }

  .fa-file-powerpoint-o {
    color: rgb(211,71,38);
  }

  `]
})



export class PdfViewerModalComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService,
              private renderer: Renderer2,
              private changeDetectionRef: ChangeDetectorRef ) {}

  @Input() public id: string;
  @Input() public serviceType: string; // 'nw' or 'sa'
  @Input() public collectionId: string = null;

  public utils = utils;
  public showAll = false;
  public pdfFile: string;
  private page = 1;
  public iconClass = '';

  private session: any;

  public isOpen = false;
  private selectedPage = 1;
  private numPages: number;
  public content: any;
  private rotation = 0;
  public pdfZoom = this.toolService.getPreference('pdfZoomlevel') || .5;
  public zoomLevels = [ {text: '25%', value: .25},
                        {text: '50%', value: .5},
                        {text: '75%', value: .75},
                        {text: '100%', value: 1},
                        {text: '125%', value: 1.25},
                        {text: '150%', value: 1.5},
                        {text: '175%', value: 1.75},
                        {text: '200%', value: 2}
                      ];
  public noNextSession = false;
  public noPreviousSession = false;
  private removeKeyupFunc: any;

  // Subscriptions
  private newSessionSubscription: Subscription;
  private newImageSubscription: Subscription;
  private confirmDownloadFileSubscription: Subscription;
  private noNextSessionSubscription: Subscription;
  private noPreviousSessionSubscription: Subscription;

  onKeyEvent(event: KeyboardEvent): void {
    event.stopPropagation();
    log.debug('PdfViewerModalComponent: keyEvent(): isOpen:', this.isOpen);
    if (this.isOpen) {
      if (event.keyCode === KEY_CODE.RIGHT_ARROW) {
        this.onNextSessionArrowClicked();
      }

      if (event.keyCode === KEY_CODE.LEFT_ARROW) {
        this.onPreviousSessionArrowClicked();
      }
    }
  }



  ngOnInit(): void {
    log.debug('PdfViewerModalComponent: ngOnInit()');

    this.newSessionSubscription = this.toolService.newSession.subscribe( (session: any ) => {
      log.debug('PdfViewerModalComponent: newSessionSubscription: Got new session', session);
      this.session = session;
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    });

    this.newImageSubscription = this.toolService.newImage.subscribe( (content: any) => {
      if (! ['pdf', 'office'].includes(content.contentType)) {
        return;
      }
      log.debug('PdfViewerModalComponent: newImageSubscription: Got new content:', content);
      this.content = content;
      if (this.content.contentType === 'pdf') {
        this.iconClass = 'fa-file-pdf-o';
      }
      else {
        switch (this.content.contentSubType) {
          case 'excel':
            this.iconClass = 'fa-file-excel-o';
            break;
          case 'word':
            this.iconClass = 'fa-file-word-o';
            break;
          case 'powerpoint':
            this.iconClass = 'fa-file-powerpoint-o';
            break;
        }
      }
      let pdfFile = this.content.contentFile;
      if ('proxyContentFile' in this.content) {
        pdfFile = this.content.proxyContentFile;
      }
      this.pdfFile = pdfFile;
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    });

    this.confirmDownloadFileSubscription = this.toolService.confirmDownloadFile.subscribe( (f: string) => this.downloadConfirmed(f) );

    this.noNextSessionSubscription = this.toolService.noNextSession.subscribe( (TorF) => this.noNextSession = TorF);
    this.noPreviousSessionSubscription = this.toolService.noPreviousSession.subscribe( (TorF) => this.noPreviousSession = TorF);

  }



  ngOnDestroy() {
    log.debug('PdfViewerModalComponent: ngOnDestroy()');
    this.newSessionSubscription.unsubscribe();
    this.newImageSubscription.unsubscribe();
    this.confirmDownloadFileSubscription.unsubscribe();
    this.noNextSessionSubscription.unsubscribe();
    this.noPreviousSessionSubscription.unsubscribe();
  }



  onOpen(): void {
    log.debug('PdfViewerModalComponent: onOpen()');
    this.isOpen = true;
    this.removeKeyupFunc = this.renderer.listen('window', 'keyup', (event) => this.onKeyEvent(event));
  }



  onCloseClicked(): void {
    log.debug('PdfViewerModalComponent: onCloseClicked()');
    this.modalService.close(this.id);
    // onClosed() will get called by the modalService
  }



  onClosed(): void {
    log.debug('PdfViewerModalComponent: onClosed()');
    this.isOpen = false;
    if (this.removeKeyupFunc) {
      this.removeKeyupFunc();
      this.removeKeyupFunc = null;
    }
  }



  absorbPdfInfo(p: any): void {
    // log.debug('absorbPdfInfo', p);
    this.numPages = p.numPages;
  }



  rotate(): void {
    if (this.rotation === 0) {
      this.rotation = 90;
    }
    else if (this.rotation === 90) {
      this.rotation = 180;
    }
    else if (this.rotation === 180) {
      this.rotation = 270;
    }
    else if (this.rotation === 270) {
      this.rotation = 0;
    }
  }



  downloadLinkClicked(file: string): void {
    log.debug('PdfViewerModalComponent: downloadLinkClicked(): file', file);
    this.toolService.fileToDownload.next(file);
    this.modalService.open('downloadfile-confirm-modal');
  }



  downloadConfirmed(file: string): void {
    /*log.debug('PdfViewerModalComponent: downloadConfirmed(): file', file);
      var text = $("#textarea").val();
      var filename = $("#input-fileName").val()
      var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
      saveAs(blob, filename+".txt");*/
  }



  onZoomLevelChange(event): void {
    log.debug('PdfViewerModalComponent: onZoomLevelChange(): event', event);
    this.toolService.setPreference('pdfZoomlevel', this.pdfZoom);
  }



  onNextSessionArrowClicked(): void {
    if (this.noNextSession) {
      return;
    }
    log.debug('PdfViewerModalComponent: onNextSessionArrowClicked()');
    this.toolService.nextSessionClicked.next();
  }



  onPreviousSessionArrowClicked(): void {
    if (this.noPreviousSession) {
      return;
    }
    log.debug('PdfViewerModalComponent: onPreviousSessionArrowClicked()');
    this.toolService.previousSessionClicked.next();
  }



  onPdfViewerError(error): void {
    log.error('PdfViewerModalComponent: onPdfViewerError(): pdf viewer threw error:', error);
  }


}
