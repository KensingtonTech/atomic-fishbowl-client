import { Component, OnInit, OnDestroy, OnChanges, Input, ViewChild, ElementRef } from '@angular/core';
import { DataService } from './data.service';
import { NwSession } from './nwsession';
import { Content } from './content';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs/Subscription';
import { Preferences } from './preferences';
import * as utils from './utils';
import * as log from 'loglevel';

@Component({
  selector: 'pdf-viewer-modal',
  template: `
<modal id="{{id}}" (opened)="onOpen()" (cancelled)="cancelled()">
  <div class="modal">
    <div class="modal-body" *ngIf="isOpen && serviceType" style="position: absolute; top: 40px; bottom: 20px; left: 10px; right: 25px; background-color: white; font-size: 10pt;">

      <div style="position: absolute; left: 0; right: 365px; top: 0; height: 30px;">

        <div style="position: absolute; top: 0; bottom: 0; left: 10px; width: 85%; white-space: nowrap;">
          <!--<a (click)="downloadLinkClicked(content.contentFile)" style="display: inline-block; vertical-align: middle;" class="fa fa-arrow-circle-o-down fa-2x" pTooltip="Download Document" showDelay="750"></a>-->
          <!--<a style="display: inline-block; vertical-align: middle;" class="fa fa-arrow-circle-o-down fa-2x" pTooltip="Download Document" showDelay="750" href="{{content.contentFile}}"></a>-->
          <span style="vertical-align: middle;">{{utils.pathToFilename(content.contentFile)}}</span>
          <!--<span *ngIf="content.contentType == 'office'" style="vertical-align: middle;">{{utils.pathToFilename(content.proxyContentFile)}}</span>-->
        </div>

        <div class="noselect" style="position: absolute; top: 0; bottom: 0; right: 40px;">
          <span style="line-height: 2em; display: inline-block; vertical-align: middle;">
            <b>Zoom</b>
          </span>
          <span style="line-height: 2em; display: inline-block; vertical-align: middle;">
            <select [(ngModel)]="pdfZoom" (ngModelChange)="onZoomLevelChange($event)">
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
        <span style="display: inline-block; vertical-align: middle;">{{utils.pathToFilename(content.archiveFilename)}}&nbsp;</span>
        <span class="fa fa-file-archive-o" style="display: inline-block; vertical-align: middle;">&nbsp;</span>
      </div>

      <div style="position: absolute; top: 0; bottom: 0; right: 0; width: 350px; padding: 5px; background-color: rgba(0, 0, 0, .5);">
        <div style="width: 100%; height: 100%; overflow: hidden;" *ngIf="sessionId && meta">
          <h3 *ngIf="serviceType == 'nw'" style="margin-top: 7px; color: white;">Session {{sessionId}} Details</h3>
          <h3 *ngIf="serviceType == 'sa'" style="margin-top: 7px; color: white;">Flow {{sessionId}} Details</h3>

          <div *ngIf="!showAll" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
            <table class="wrap" style="width: 100%; table-layout: fixed;">
              <tr>
                <td class="metalabel" style="width: 40%;">time</td>
                <td *ngIf="serviceType == 'nw'" class="metavalue" style="width: 60%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
                <td *ngIf="serviceType == 'sa'" class="metavalue" style="width: 60%;">{{meta.stop_time | formatSaTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
              </tr>
              <tr *ngFor="let key of displayedKeys">
                <td class="metalabel">{{key}}</td>
                <td>
                  <meta-accordion class="metavalue" *ngIf="meta[key]" [items]="meta[key]" [key]="key"></meta-accordion>
                  <i *ngIf="!meta[key]" class="fa fa-ban" style="color: red;"></i>
                </td>
              </tr>
            </table>
          </div>

          <div *ngIf="showAll" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
            <table class="wrap" style="width: 100%; table-layout: fixed;">
              <tr>
                <td class="metalabel" style="width: 40%;">time</td>
                <td *ngIf="serviceType == 'nw'" class="metavalue" style="width: 60%;">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
                <td *ngIf="serviceType == 'sa'" class="metavalue" style="width: 60%;">{{meta.stop_time | formatSaTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td>
              </tr>
              <tr *ngFor="let key of getMetaKeys()">
                <td class="metalabel">{{key}}</td>
                <td>
                  <meta-accordion class="metavalue" [items]="meta[key]" [key]="key"></meta-accordion>
                </td>
              </tr>
            </table>
          </div>

          <!-- cancel -->
          <div (click)="cancelled()" style="position: absolute; top: 2px; right: 5px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>

          <!-- show/hide eyeball-->
          <div (click)="showAllClick()" style="position: absolute; top: 2px; right: 60px; color: white;"><i [class.fa-eye-slash]="!showAll" [class.fa-eye]="showAll" class="fa fa-2x fa-fw"></i></div>

          <!-- bullseyes -->
          <div *ngIf="serviceType == 'nw' && preferences.nw.url && deviceNumber && sessionId" style="position: absolute; top: 2px; right: 30px;">
            <a target="_blank" href="{{preferences.nw.url}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a>
          </div>
          <div *ngIf="serviceType == 'sa' && preferences.sa.url && sessionId && meta" style="position: absolute; top: 2px; right: 30px;">
            <a target="_blank" href="{{saUrlGetter(sessionId)}}"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a>
          </div>
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



export class PdfViewerModalComponent implements OnInit, OnDestroy, OnChanges {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService ) {}

  @Input() public id: string;
  @Input() public serviceType: string; // 'nw' or 'sa'

  public utils = utils;
  public showAll = false;
  private pdfFile: string;
  private page = 1;

  private session: any;
  private meta: any;
  private sessionId: number;

  public isOpen = false;
  private selectedPage = 1;
  private numPages: number;
  private preferences: any;
  private deviceNumber: number;
  public content: any;
  private rotation = 0;
  public pdfZoom = .5;
  public zoomLevels = [ {text: '25%', value: .25}, // the way it should be
                        {text: '50%', value: .5},
                        {text: '75%', value: .75},
                        {text: '100%', value: 1},
                        {text: '125%', value: 1.25},
                        {text: '150%', value: 1.5},
                        {text: '175%', value: 1.75},
                        {text: '200%', value: 2}
                      ];
  private displayedKeys: string[] =  [];

  // Subscriptions
  private preferencesChangedSubscription: Subscription;
  private deviceNumberSubscription: Subscription;
  private newSessionSubscription: Subscription;
  private newImageSubscription: Subscription;
  private confirmDownloadFileSubscription: Subscription;



  ngOnInit(): void {
    log.debug('PdfViewerModalComponent: ngOnInit()');

    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) );

    this.deviceNumberSubscription = this.toolService.deviceNumber.subscribe( ($event: any) => this.deviceNumber = $event.deviceNumber );

    this.newSessionSubscription = this.toolService.newSession.subscribe( (session: any ) => {
      log.debug('PdfViewerModalComponent: newSessionSubscription: Got new session', session);
      this.session = session;
    });

    this.newImageSubscription = this.toolService.newImage.subscribe( (content: any) => {
      log.debug('PdfViewerModalComponent: newImageSubscription: Got new content:', content);
      this.content = content;
      // this.sessionId = this.content.session;
      let pdfFile = this.content.contentFile;
      if ('proxyContentFile' in this.content) {
        pdfFile = this.content.proxyContentFile;
      }
      this.pdfFile = pdfFile;
    });

    this.confirmDownloadFileSubscription = this.toolService.confirmDownloadFile.subscribe( (f: string) => this.downloadConfirmed(f) );

    this.pdfZoom = Number(this.toolService.getPreference('pdfZoomlevel'));

  }



  ngOnDestroy() {
    log.debug('PdfViewerModalComponent onPreferencesChanged(): ngOnDestroy()');
    this.preferencesChangedSubscription.unsubscribe();
    this.deviceNumberSubscription.unsubscribe();
    this.newSessionSubscription.unsubscribe();
    this.newImageSubscription.unsubscribe();
    this.confirmDownloadFileSubscription.unsubscribe();
  }



  onPreferencesChanged(prefs: Preferences) {
    log.debug('PdfViewerModalComponent onPreferencesChanged(): prefs', prefs);
    if (Object.keys(prefs).length === 0) {
      return;
    }
    this.preferences = prefs;
    this.displayedKeys = this.preferences[this.serviceType].displayedKeys;
  }



  ngOnChanges(values: any) {
    log.debug('PdfViewerModalComponent ngOnChanges(): values', values);

    /*if ( 'serviceType' in values && this.preferences
        && ( ( values.serviceType.firstChange && values.serviceType.currentValue )
        || ( values.serviceType.currentValue && values.serviceType.currentValue !== values.serviceType.previousValue ) ) ) {

      this.displayedKeys = this.preferences[values.serviceType.currentValue].displayedKeys;
      log.debug('PdfViewerModalComponent ngOnChanges(): displayedKeys:', this.displayedKeys);

    }*/

  }



  onOpen(): void {
    log.debug('PdfViewerModalComponent onOpen(): displayedKeys', this.displayedKeys);
    this.isOpen = true;
    this.meta = this.session['meta'];
    this.sessionId = this.session['id'];
  }



  getMetaKeys(): any {
    let a = [];
    for (let k in this.meta) {
      if (this.meta.hasOwnProperty(k)) {
        a.push(k);
      }
    }
    return a;
  }



  showAllClick(): void {
    this.showAll = !this.showAll;
  }



  cancelled(): void {
    this.modalService.close(this.id);
    this.isOpen = false;
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



  convertSaTime(value: string) {
    return parseInt(value[0].substring(0, value[0].indexOf(':')), 10) * 1000;
  }



  saUrlGetter(sessionId): string {
    if (!this.meta || !sessionId || this.serviceType !== 'sa' || !('start_time' in this.meta && 'stop_time' in this.meta)) {
      return;
    }

    // {{preferences.sa.url}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO
    // let struct = { 'sc' : { 'Extractions' : { 'aC' : 'hT' , 's' : { 'p' : 1, 's' : 25, 'f' : [], 'sf' : 'date', 'sd' : 'ASC'}, 'p' : 0 }, 'Geolocation': { 'rI' : 'ipv4_conversation', 'rT' : 'g', 'sd' : 'd' , 'sc' : 2, 'p' : 0, 's' : 25, 'filters' : {'all' : []}}, 'Reports' : { 'rI' : 'application_id', 'rT' : 'r', 'cT' : 'pie', 'aS' : 'linear', 'cR' : 10, 'sd' : 'd', 'sc' : 'sessions', 'p' : 0, 's' : 25, 'comp' : 'none', 'filters' : {'all' : [] } }, 'Summary' : {'vK' : 1, 'p' : 0}}, 'pb' : ['flow_id=4898292'], 'ca' : { 'start' : 1518021720000, 'end' : 1518108120000}, 'now' : 1518108153464, 'ac': 'Summary' };

    let struct = { 'sc' : { 'Extractions' : { 'aC' : 'hT' , 's' : { 'p' : 1, 's' : 25, 'f' : [], 'sf' : 'date', 'sd' : 'ASC'}, 'p' : 0 }, 'Geolocation': { 'rI' : 'ipv4_conversation', 'rT' : 'g', 'sd' : 'd' , 'sc' : 2, 'p' : 0, 's' : 25, 'filters' : {'all' : []}}, 'Reports' : { 'rI' : 'application_id', 'rT' : 'r', 'cT' : 'pie', 'aS' : 'linear', 'cR' : 10, 'sd' : 'd', 'sc' : 'sessions', 'p' : 0, 's' : 25, 'comp' : 'none', 'filters' : {'all' : [] } }, 'Summary' : {'vK' : 1, 'p' : 0}}, 'ac': 'Summary' };
    struct['pb'] = [ 'flow_id=' + sessionId ];
    let startTime = this.convertSaTime(this.meta['start_time']);
    let stopTime = this.convertSaTime(this.meta['stop_time']);
    struct['ca'] = { 'start' : startTime, 'end': stopTime };
    struct['now'] = new Date().getTime();
    let encoded = btoa(JSON.stringify(struct));
    // log.debug('SessionDetailsModalComponent: saUrlGetter(): struct:', struct);

    return this.preferences.sa.url + '/deepsee/index#' + encoded;
  }



  onZoomLevelChange(event): void {
    log.debug('PdfViewerModalComponent: onZoomLevelChange(): event', event);
    this.toolService.setPreference('pdfZoomlevel', this.pdfZoom);
  }


}
