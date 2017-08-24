import { Component, OnInit, OnDestroy, OnChanges, Input, ViewChild, ElementRef } from '@angular/core';
import { DataService } from './data.service';
import { NwSession } from './nwsession';
import { Content } from './content';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
declare var log: any;

@Component({
  selector: 'pdf-viewer-modal',
  // encapsulation: ViewEncapsulation.None,
  template: `
<modal id="{{id}}" (opened)="opened()" (cancelled)="cancelled()">
  <div class="modal">
    <div class="modal-body" *ngIf="isOpen" style="position: absolute; top: 40px; bottom: 20px; left: 10px; right: 25px; background-color: white; font-size: 10pt;">

      <div style="position: absolute; left: 0; right: 365px; top: 0; height: 30px;">

        <div style="position: absolute; top: 0; bottom: 0; left: 10px; width: 85%; white-space: nowrap;">
          <!--<a (click)="downloadLinkClicked(pdfFile)" style="display: inline-block; vertical-align: middle;" class="fa fa-arrow-circle-o-down fa-2x" pTooltip="Download PDF Document" showDelay="750"></a>-->
          <!--<a style="display: inline-block; vertical-align: middle;" class="fa fa-arrow-circle-o-down fa-2x" pTooltip="Download PDF Document" showDelay="750" href="{{pdfFile}}"></a>-->
          <span style="vertical-align: middle;">{{getFileNameFromPath(pdfFile)}}</span>
        </div>

        <div class="noselect" style="position: absolute; top: 0; bottom: 0; right: 40px;">
          <span style="line-height: 2em; display: inline-block; vertical-align: middle;">
            <b>Zoom</b>
          </span>
          <span style="line-height: 2em; display: inline-block; vertical-align: middle;">
            <select [(ngModel)]="pdfZoom">
              <option *ngFor="let zoomLevel of zoomLevels" [ngValue]="zoomLevel.value">{{zoomLevel.text}}</option>
            </select>
            &nbsp;&nbsp;
          </span>
          <span style="line-height: 2em; display: inline-block; vertical-align: middle;">
            <i (click)="rotate()" class="fa fa-repeat fa-lg"></i>&nbsp;&nbsp;{{numPages}} pages
          </span>
        </div>

      </div>

      <div style="position: absolute; top: 40px; bottom: 10px; left: 0; right: 365px;"> <!--overflow-y: scroll; overflow-x: auto;-->
        <div style="position: relative; width: 100%; height: 100%; overflow-x: scroll; overflow-y: scroll;">
          <pdf-viewer [rotation]="rotation" [zoom]="pdfZoom" [(page)]="selectedPage" (after-load-complete)="absorbPdfInfo($event)" [src]="pdfFile" [original-size]="false" [show-all]="true" style="display: block; width: 100%; margin: 0 auto;"></pdf-viewer>
        </div>
      </div> <!--overflow: auto;-->

      <div *ngIf="content.fromArchive" style="position: absolute; top: 25px; right: 400px; background-color: rgba(0,0,0,0.75); color: white; border-radius: 5px; padding: 2px;">
        <span style="display: inline-block; vertical-align: middle;">{{pathToFilename(content.archiveFilename)}}&nbsp;</span>
        <span class="fa fa-file-archive-o" style="display: inline-block; vertical-align: middle;">&nbsp;</span>
      </div>

      <div style="position: absolute; top: 0; bottom: 0; right: 0; width: 350px; padding: 5px; background-color: rgba(0, 0, 0, .5);">
        <div style="width: 100%; height: 100%; overflow: hidden;" *ngIf="sessionId && meta">
          <h3 style="margin-top: 7px; color: white;">Session {{sessionId}} Details</h3>

          <div *ngIf="!showAll" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
            <table class="wrap" style="width: 100%; table-layout: fixed;">
              <tr><td class="metalabel" style="width: 40%;">time</td><td class="metavalue" style="width: 60%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
              <tr *ngFor="let key of displayedKeys">
                <td class="metalabel">{{key}}</td>
                <td>
                  <meta-accordion class="metavalue" *ngIf="meta[key]" [items]="meta[key]"></meta-accordion>
                  <i *ngIf="!meta[key]" class="fa fa-ban" style="color: red;"></i>
                </td>
              </tr>
            </table>
          </div>

          <div *ngIf="showAll" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
            <table class="wrap" style="width: 100%; table-layout: fixed;">
              <tr><td class="metalabel" style="width: 40%;">time</td><td class="metavalue" style="width: 60%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
              <tr *ngFor="let key of getMetaKeys()">
                <td class="metalabel">{{key}}</td>
                <td>
                  <meta-accordion class="metavalue" [items]="meta[key]"></meta-accordion>
                </td>
              </tr>
            </table>
          </div>

          <div (click)="cancelled()" style="position: absolute; top: 2px; right: 5px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>
          <div (click)="showAllClick()" style="position: absolute; top: 2px; right: 60px; color: white;"><i [class.fa-eye-slash]="!showAll" [class.fa-eye]="showAll" class="fa fa-2x fa-fw"></i></div>
          <div *ngIf="preferences.nwInvestigateUrl && deviceNumber && sessionId" style="position: absolute; top: 2px; right: 30px;"><a target="_blank" href="{{preferences.nwInvestigateUrl}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a></div>
        </div>
      </div>

    </div>
  </div>
</modal>
<downloadfile-confirm-modal></downloadfile-confirm-modal>
  `,
  styles: [`

  .column1 {
    white-space: nowrap;
    width: 1px;
    font-weight: bold;
    vertical-align: top;
    text-align: right;
  }

  .value {
    word-wrap: break-word;
    word-break: break-all;
    text-align: left;
  }

  .expanded {
    background-color: rgb(186, 48, 141);;
  }

  `]
})

export class PdfViewerModalComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService ) {}

  @Input('id') public id: string;
  @Input('apiServerUrl') apiServerUrl: string;

  public showAll = false;
  private pdfFile: string;
  private pdfFilename: string;
  private page = 1;

  public isOpen = false;
  private selectedPage = 1;
  private numPages: number;
  private session: any;
  private meta: any;
  private sessionId: number;
  private preferences: any;
  private deviceNumber: number;
  public content: any;
  private rotation = 0;
  public pdfZoom = 1;
  /*public zoomLevels = [ {text: '25%', value: .25}, // the way it should be
                        {text: '50%', value: .5},
                        {text: '75%', value: .75},
                        {text: '100%', value: 1},
                        {text: '125%', value: 1.25},
                        {text: '150%', value: 1.5},
                        {text: '175%', value: 1.75},
                        {text: '200%', value: 2}
                      ];
*/
  public zoomLevels = [
    {text: '25%', value: 1.75}, // this is ass-backwards thanks to a bug in the library https://github.com/VadimDez/ng2-pdf-viewer/issues/95
    {text: '50%', value: 1.5},
    {text: '75%', value: 1.25},
    {text: '100%', value: 1},
    {text: '125%', value: 0.75},
    {text: '150%', value: 0.5},
    {text: '175%', value: 0.25},
    {text: '200%', value: 0}
  ];
  private displayedKeys: any =  [
    'size',
    'service',
    'ip.src',
    'ip.dst',
    'alias.host',
    'city.dst',
    'country.dst',
    'action',
    'content',
    'ad.username.src',
    'ad.computer.src',
    'filename',
    'client'
  ]; // these are just defaults in case we can't get them from prefs

  // Subscriptions
  private preferencesChangedSubscription: any;
  private deviceNumberSubscription: any;
  private newSessionSubscription: any;
  private newImageSubscription: any;
  private confirmDownloadFileSubscription: any;

  ngOnInit(): void {
    log.debug('PdfViewerModalComponent: ngOnInit()');
    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: any) => { 
      // log.debug("prefs observable: ", prefs);
      this.preferences = prefs;
      if ( 'displayedKeys' in prefs ) {
        this.displayedKeys = prefs.displayedKeys;
      }
    });
    this.deviceNumberSubscription = this.toolService.deviceNumber.subscribe( ($event: any) => this.deviceNumber = $event.deviceNumber );
    this.dataService.getPreferences();

    this.newSessionSubscription = this.toolService.newSession.subscribe( (session: any) => {
      log.debug('PdfViewerModalComponent: newSessionSubscription: Got new session', session);
      this.session = session;
      this.meta = session.meta;
    });

    this.newImageSubscription = this.toolService.newImage.subscribe( (content: any) => {
      log.debug('PdfViewerModalComponent: newImageSubscription: Got new content:', content);
      this.content = content;
      this.sessionId = this.content.session;
      this.pdfFile = this.content.contentFile;
      // this.pdfFileUrl = this.apiServerUrl + this.pdfFile;
    });

    this.confirmDownloadFileSubscription = this.toolService.confirmDownloadFile.subscribe( (f: string) => this.downloadConfirmed(f) );
  }

  public ngOnDestroy() {
    this.preferencesChangedSubscription.unsubscribe();
    this.deviceNumberSubscription.unsubscribe();
    this.newSessionSubscription.unsubscribe();
    this.newImageSubscription.unsubscribe();
    this.confirmDownloadFileSubscription.unsubscribe();
  }

  getMetaKeys(): any {
    let a = [];
    for (let k in this.meta) {
      a.push(k);
    }
    return a;
  }

  showAllClick(): void {
    this.showAll = !this.showAll;
  }

  opened(): void {
    this.isOpen = true;
  }

  cancelled(): void {
    this.modalService.close(this.id);
    this.isOpen = false;
  }

  getFileNameFromPath(p: string): string {
    return this.pdfFile.split('/').pop();
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

  pathToFilename(s: string): string {
    const RE = /([^/]*)$/;
    let match = RE.exec(s);
    return match[0];
  }

}
