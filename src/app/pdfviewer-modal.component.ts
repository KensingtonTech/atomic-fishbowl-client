import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, OnChanges, Input, Renderer, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { DataService } from './data.service';
import { NwSession } from './nwsession';
import { Image } from './image';
import { ModalService } from './modal/modal.service';
import { ToolWidgetCommsService } from './tool-widget.comms.service';
import { LoggerService } from './logger-service';
import "rxjs/add/operator/takeWhile";

@Component({
  selector: 'pdf-viewer-modal',
  // changeDetection: ChangeDetectionStrategy.OnPush,
  // encapsulation: ViewEncapsulation.None,
  template: `
<modal id="{{id}}" (opened)="opened()" (cancelled)="cancelled()">
  <div class="modal">
    <div class="modal-body" *ngIf="isOpen" style="position: absolute; top: 40px; bottom: 20px; left: 10px; right: 25px; background-color: white; font-size: 10pt;">

      <div style="position: absolute; left: 0; right: 365px; height: 30px;">
        <div style="position: absolute; top: 2px; left: 10px; width: 85%; white-space: nowrap;">
          {{getFileNameFromPath(pdfFile)}}
        </div>
        <div class="noselect" style="position: absolute; top: 2px; right: 40px;">
          <span>Zoom
            <select [(ngModel)]="pdfZoom"> <!--(ngModelChange)="collectionSelected($event)"-->
              <option *ngFor="let zoomLevel of zoomLevels" [ngValue]="zoomLevel.value">{{zoomLevel.text}}</option>
            </select>
            &nbsp;&nbsp;
          </span>
          <i (click)="rotate()" class="fa fa-repeat fa-lg"></i>&nbsp;&nbsp;{{numPages}} pages
        </div>
      </div>

      <div style="position: absolute; top: 30px; bottom: 10px; left: 0; right: 365px;"> <!--overflow-y: scroll; overflow-x: auto;-->
        <div style="position: relative; width: 100%; height: 100%; overflow-x: scroll; overflow-y: scroll;">
          <pdf-viewer [rotation]="rotation" [zoom]="pdfZoom" [(page)]="selectedPage" (after-load-complete)="absorbPdfInfo($event)" [src]="pdfFile" [original-size]="false" [show-all]="true" style="display: block; width: 100%; margin: 0 auto;"></pdf-viewer>
        </div>
      </div> <!--overflow: auto;-->


      <div style="position: absolute; height: 100%; top: 0px; right: 0; width: 350px; padding: 5px; background-color: rgba(0, 0, 0, .5);">
        <div style="width: 100%; height: 100%; overflow: hidden;" *ngIf="sessionId && meta">
          <h3 style="margin-top: 7px; color: white;">Session {{sessionId}} Details</h3>

          <div *ngIf="hideAllMeta && blip" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
            <table>
              <tr><td class="metalabel">time</td><td class="metavalue">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
              <tr *ngFor="let key of displayedKeys">
                <td class="metalabel">{{key}}</td>
                <td>
                  <ul-accordion *ngIf="meta[key]">
                    <accordion-li *ngFor="let value of meta[key]">{{value}}</accordion-li>
                  </ul-accordion>
                  <i *ngIf="!meta[key]" class="fa fa-ban" style="color: red;"></i>
                </td>
              </tr>
            </table>
          </div>

          <div *ngIf="!hideAllMeta && blip" style="width: 100%; height: 90%; overflow: auto; padding-right: 20px;">
            <table>
              <tr><td class="metalabel">time</td><td class="metavalue">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
              <tr *ngFor="let key of getMetaKeys()">
                <td class="metalabel">{{key}}</td>
                <td>
                  <ul-accordion>
                    <accordion-li *ngFor="let value of meta[key]">{{value}}</accordion-li>
                  </ul-accordion>
                </td>
              </tr>
            </table>
          </div>

          <div (click)="showAllClick()" style="position: absolute; top: 2px; right: 60px; color: white;"><i #showAll class="fa fa-eye-slash fa-2x fa-fw"></i></div>
          <div *ngIf="preferences.nwInvestigateUrl && deviceNumber && sessionId" style="position: absolute; top: 2px; right: 30px;"><a target="_blank" href="{{preferences.nwInvestigateUrl}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a></div>
        </div>
        <div (click)="cancelled()" style="position: absolute; top: 2px; right: 5px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>
      </div>


    </div>
  </div>
</modal>
  `,
  styles: [`
  `]
})

export class PdfViewerModalComponent implements OnInit, OnDestroy {

  constructor(private dataService : DataService,
              private modalService: ModalService,
              private toolService: ToolWidgetCommsService,
              private renderer: Renderer,
              private loggerService: LoggerService ) {}

  @Input('id') public id: string;
  @Input('apiServerUrl') apiServerUrl: string;
  @ViewChild('showAll') showAll: ElementRef;

  private alive = true;
  private pdfFile: string;
  private pdfFilename: string;
  private page = 1;

  public isOpen = false;
  private selectedPage = 1;
  private numPages: number;
  private session: any;
  private meta: any;
  private sessionId: number;
  private hideAllMeta = true;
  private preferences: any;
  private deviceNumber: number;
  private image: any;
  private rotation = 0;
  private blip = true;
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
  public zoomLevels = [ {text: '25%', value: 1.75}, // this is ass-backwards thanks to a bug in the library https://github.com/VadimDez/ng2-pdf-viewer/issues/95
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

  ngOnInit(): void {
    console.log('PdfViewerModalComponent: ngOnInit()');
    this.dataService.preferencesChanged.takeWhile( () => this.alive ).subscribe( (prefs: any) => {  // console.log("prefs observable: ", prefs);
                                                                      this.preferences = prefs;
                                                                      if ( 'displayedKeys' in prefs ) {
                                                                        this.displayedKeys = prefs.displayedKeys;
                                                                      }
                                                                      // this._changeDetectionRef.detectChanges();
                                                                      // this._changeDetectionRef.markForCheck();
                                                                    });
    this.toolService.deviceNumber.takeWhile(() => this.alive).subscribe( ($event: any) => this.deviceNumber = $event.deviceNumber );
    this.dataService.getPreferences();

    this.toolService.newSession.takeWhile(() => this.alive).subscribe( (session: any) => {
      console.log('PdfViewerModalComponent: newSessionSubscription: Got new session', session);
      this.session = session;
      this.meta = session.meta;
    });

    this.toolService.newImage.takeWhile(() => this.alive).subscribe( (image: any) => {
      console.log('PdfViewerModalComponent: newImageSubscription: Got new image:', image)
      this.image = image;
      this.sessionId = this.image.session;
      this.pdfFile = this.image.contentFile;
      // this.pdfFileUrl = this.apiServerUrl + this.pdfFile;
    });
  }

  public ngOnDestroy() {
    this.alive = false;
  }

  getMetaKeys(): any {
    let a = [];
    for (var k in this.meta) {
      a.push(k);
    }
    return a;
  }

  showAllClick(): void {
    if ( this.hideAllMeta ) {
      this.renderer.setElementClass(this.showAll.nativeElement, 'fa-eye-slash', false);
      this.renderer.setElementClass(this.showAll.nativeElement, 'fa-eye', true);
    }
    else {
      this.renderer.setElementClass(this.showAll.nativeElement, 'fa-eye', false);
      this.renderer.setElementClass(this.showAll.nativeElement, 'fa-eye-slash', true);
    }
    this.hideAllMeta = !this.hideAllMeta;
    // this._changeDetectionRef.detectChanges();
    // this._changeDetectionRef.markForCheck();
  }

  opened(): void {
    this.isOpen = true;
    setTimeout( () => this.blip = true );
  }

  cancelled(): void {
    this.modalService.close(this.id);
    setTimeout( () => this.blip = false );
    this.isOpen = false;
  }

  getFileNameFromPath(p: string): string {
    return this.pdfFile.split('/').pop();
  }

  absorbPdfInfo(p: any): void {
    // console.log('absorbPdfInfo', p);
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

}
