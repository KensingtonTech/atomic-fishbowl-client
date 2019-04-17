import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnChanges, OnDestroy, Input, Renderer2, SimpleChanges, Inject, forwardRef } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { ModalService } from '../modal/modal.service';
import { Content } from 'types/content';
import { Session } from 'types/session';
import { SelectItem } from 'primeng/components/common/selectitem';
import { AbstractGrid } from '../abstract-grid.class';
import { SessionsAvailable } from 'types/sessions-available';
import * as utils from '../utils';
import { Logger } from 'loglevel';
declare var log: Logger;

(<any>window).pdfWorkerSrc = '/resources/pdf.worker.min.js';

export enum KEY_CODE {
  RIGHT_ARROW = 39,
  LEFT_ARROW = 37
}

@Component({
  selector: 'content-details-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<modal id="{{id}}" (opened)="onOpen()" (closed)="onClosed()" modalClass="content-details-modal" bodyClass="content-details-modal-body" bodyStyle="background-color: rgba(128, 128, 128, .95);">

  <div class="grid-container" style="height: 100%;">

    <!-- Top Bar / Menu Bar -->
    <div class="menubar noselect" *ngIf="isOpen && content" style="padding: .5em; background-color: rgba(0, 0, 0, .8); color: white;">

      <!-- filename -->
      <div style="display: inline; float: left; white-space: nowrap; color: white;">
        <!-- style="background-color: white;" -->
        &nbsp;&nbsp;<span class="fa fa-lg" style="vertical-align: middle;" [ngClass]="iconClass"></span>&nbsp;
        <span class="selectable">{{utils.pathToFilename(content.contentFile)}}</span>

        <!-- disabled download stuff -->
        <!--
        <a (click)="downloadLinkClicked(content.contentFile)" style="display: inline-block; vertical-align: middle;" class="fa fa-arrow-circle-o-down fa-2x" pTooltip="Download Document" showDelay="750"></a>
        <a style="display: inline-block; vertical-align: middle;" class="fa fa-arrow-circle-o-down fa-2x" pTooltip="Download Document" showDelay="750" href="{{content.contentFile}}"></a>
        -->
      </div>


      <div style="display: inline; float: right;">

        <!-- zoom, rotation, next / previous controls -->
        <div *ngIf="['pdf', 'office'].includes(content.contentType)" class="noselect" style="display: inline;">

          <!-- zoom level -->
          <!-- vertical-align: middle; line-height: 2em; -->
          <span style="">
            <b>Zoom&nbsp;</b>
            <p-dropdown name="pdfZoomSelector" [options]="zoomLevels" [(ngModel)]="pdfZoom" (click)="onZoomLevelClicked()" (onChange)="onZoomLevelChange($event)" [ngModelOptions]="{standalone: true}"></p-dropdown>
            &nbsp;&nbsp;
          </span>

          <!-- rotate button -->
          <!-- vertical-align: middle; line-height: 2em; -->
          <span style="">
            <i (click)="rotate()" class="fa fa-repeat fa-lg" style="vertical-align: middle;"></i>&nbsp;&nbsp;{{numPages}} pages&nbsp;&nbsp;
          </span>

        </div>

        <!-- display archive filename, archive icon and archive type -->
        <div *ngIf="content.fromArchive || content.isArchive" style="display: inline; background-color: rgba(0,0,0,0.75); color: white; border-radius: 0.263157895em; padding: 0.210526316em;">
          <span *ngIf="content.isArchive" class="selectable">{{utils.pathToFilename(content.contentFile)}}&nbsp;</span>
          <span *ngIf="content.fromArchive" class="selectable">{{utils.pathToFilename(content.archiveFilename)}}&nbsp;</span>
          <span *ngIf="['encryptedZipEntry', 'unsupportedZipEntry', 'encryptedRarEntry', 'encryptedRarTable'].includes(content.contentType)" class="fa fa-lock fa-lg">&nbsp;</span>
          <span class="fa fa-file-archive-o fa-lg">&nbsp;</span>
          <span class="selectable">{{content.archiveType | allCaps}}</span>&nbsp;&nbsp;&nbsp;&nbsp;
        </div>

        <!-- next / previous buttons -->
        <span class="fa fa-arrow-circle-o-left fa-2x enabled" style="vertical-align: bottom;" [class.disabled]="!sessionsAvailable.previous" (click)="onPreviousSessionArrowClicked()" pTooltip="Previous session"></span>&nbsp;&nbsp;<span class="fa fa-arrow-circle-o-right fa-2x enabled" style="vertical-align: bottom;" [class.disabled]="!sessionsAvailable.next" (click)="onNextSessionArrowClicked()" pTooltip="Next session"></span>

        &nbsp;&nbsp;&nbsp;

      </div>

    </div>

    <!-- content viewers -->
    <!--style="position: absolute; top: 2.105263158em; bottom: 0.526315789em; left: 0; right: 18.42105263em;"-->
    <div class="viewers" *ngIf="content" style="overflow: auto;">

      <!-- non-pdf / office viewer -->
      <content-viewer *ngIf="!(['pdf', 'office'].includes(content.contentType)); else pdfViewer" [collectionId]="collectionId" [content]="content"></content-viewer>

      <!-- pdf / office viewer -->
      <ng-template #pdfViewer>
        <div style="position: relative; width: 100%; height: 100%; overflow-x: auto; overflow-y: auto; white-space: nowrap;">
          <pdf-viewer [rotation]="rotation" [src]="pdfFile" [zoom]="pdfZoom" [(page)]="selectedPage" (after-load-complete)="absorbPdfInfo($event)" [original-size]="false" [show-all]="true" (error)="onPdfViewerError($event)" style="display: block; width: 100%; margin: 0 auto;"></pdf-viewer>
        </div>
      </ng-template>

    </div>

    <!-- meta viewer -->
    <div class="meta-widget" *ngIf="isOpen" style="padding-left: 0.263157895em; box-sizing: border-box; background-color: rgba(0, 0, 0, .8);">

      <meta-widget [session]="session" [serviceType]="serviceType" styleClass="pdfViewerSessionWidget" [enableCloseButton]="true" (closeButtonClicked)="onCloseClicked()"></meta-widget>

    </div>

  </div>

</modal>
  `,
  styles: [`
  .enabled {
    color: white;
  }

  .disabled {
    color: grey;
  }

  .fa-lock, .fa-hashtag {
    color: red;
  }

  .fa-file-image-o {
    color: blue;
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

  .menubar .fa {
    // font-size: 1em;
    line-height: .5;
    vertical-align: bottom;
  }
  `]
})

export class SessionDetailsModalComponent implements OnInit, OnChanges, OnDestroy {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService,
              private changeDetectionRef: ChangeDetectorRef,
              private renderer: Renderer2,
              @Inject(forwardRef(() => AbstractGrid )) private parent: AbstractGrid ) {}

  @Input() serviceType: string; // 'nw' or 'sa'
  @Input() collectionId: string = null;
  @Input() session: Session;
  @Input() content: Content;
  @Input() sessionsAvailable: SessionsAvailable;

  public id = this.toolService.contentDetailsModalId;

  public utils = utils;
  public sessionId: number;
  public isOpen = false;
  private removeKeyupFunc: any;
  public iconClass = '';

  // pdf / office - specific
  public pdfFile: string;
  public page = 1;
  public selectedPage = 1;
  public numPages: number;
  public rotation = 0;
  public pdfZoom = this.toolService.getPreference('pdfZoomlevel') || .5;
  public zoomLevels: SelectItem[] = [
                        {label: '25%', value: .25},
                        {label: '50%', value: .5},
                        {label: '75%', value: .75},
                        {label: '100%', value: 1},
                        {label: '125%', value: 1.25},
                        {label: '150%', value: 1.5},
                        {label: '175%', value: 1.75},
                        {label: '200%', value: 2}
                      ];


  onKeyEvent(event: KeyboardEvent): void {
    event.stopPropagation();
    log.debug('SessionDetailsModalComponent: keyEvent(): isOpen:', this.isOpen);
    if (event.keyCode === KEY_CODE.RIGHT_ARROW) {
      this.onNextSessionArrowClicked();
    }

    if (event.keyCode === KEY_CODE.LEFT_ARROW) {
      this.onPreviousSessionArrowClicked();
    }
  }


  ngOnInit(): void {
    log.debug('SessionDetailsModalComponent: ngOnInit()');
  }



  ngOnDestroy() {
    if (this.removeKeyupFunc) {
      this.removeKeyupFunc();
    }
  }



  ngOnChanges(values: SimpleChanges) {
    log.debug('SessionDetailsModalComponent: ngOnChanges(): values:', values);
    if ('session' in values && values.session.currentValue) {
      this.onNewSession();
    }
    if ('content' in values && values.content.currentValue) {
      this.onNewContent();
    }
  }



  onNewSession(): void {
    log.debug('SessionDetailsModalComponent: onNewSession: session:', this.session);
    // this.session = session;
    this.sessionId = this.session.id;
  }



  async onNewContent() {
    log.debug('SessionDetailsModalComponent: onNewContent: content:', this.content);
    // this.content = content;
    this.page = 1;

    switch (this.content.contentType) {
      case 'encryptedRarEntry':
        this.iconClass = 'fa-lock';
        break;
      case 'encryptedRarTable':
        this.iconClass = 'fa-lock';
        break;
      case 'encryptedZipEntry':
        this.iconClass = 'fa-lock';
        break;
      case 'unsupportedZipEntry':
        this.iconClass = 'fa-lock';
        break;
      case 'image':
        this.iconClass = 'fa-file-image-o';
        break;
      case 'pdf':
        this.iconClass = 'fa-file-pdf-o';
        break;
      case 'office':
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
        break;
    }

    if (['pdf', 'office'].includes(this.content.contentType)) {
      let pdfFile = 'proxyContentFile' in this.content ? this.content.proxyContentFile : this.content.contentFile;
      this.pdfFile = '/collections/' + this.collectionId + '/' + utils.uriEncodeFilename(pdfFile);
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onOpen(): void {
    log.debug('SessionDetailsModalComponent: onOpen()');
    this.isOpen = true;
    this.removeKeyupFunc = this.renderer.listen('window', 'keyup', (event) => this.onKeyEvent(event));
  }



  onCloseClicked(): void {
    log.debug('SessionDetailsModalComponent: onCloseClicked()');
    this.modalService.close(this.id);
    // onClosed() will get called by the modalService
  }



  onClosed(): void {
    log.debug('SessionDetailsModalComponent: onClosed()');
    this.isOpen = false;
    if (this.removeKeyupFunc) {
      this.removeKeyupFunc();
      this.removeKeyupFunc = null;
    }
  }



  onNextSessionArrowClicked(): void {
    if (!this.sessionsAvailable.next) {
      return;
    }
    log.debug('SessionDetailsModalComponent: onNextSessionArrowClicked()');
    this.parent.onNextSessionClicked();
  }



  onPreviousSessionArrowClicked(): void {
    if (!this.sessionsAvailable.previous) {
      return;
    }
    log.debug('SessionDetailsModalComponent: onPreviousSessionArrowClicked()');
    this.parent.onPreviousSessionClicked();
  }



  onZoomLevelClicked() {
    log.debug('SessionDetailsModalComponent: onZoomLevelClicked()');
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onZoomLevelChange(event): void {
    log.debug('PdfViewerModalComponent: onZoomLevelChange(): event', event);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.toolService.setPreference('pdfZoomlevel', this.pdfZoom);
  }



  absorbPdfInfo(p: any): void {
    // log.debug('absorbPdfInfo', p);
    this.numPages = p.numPages;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
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
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onPdfViewerError(error): void {
    log.error('PdfViewerModalComponent: onPdfViewerError(): pdf viewer threw error:', error);
  }

}
