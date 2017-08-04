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
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
//[page]="page"
//<div *ngIf="isOpen" class="modal-body" style="width: 1000px; height: 95%; top: 10px; background-color: white; font-size: 10pt;">

  template: `
<modal id="{{id}}" (opened)="opened()" (cancelled)="cancelled()">
  <div class="modal">

    <div *ngIf="isOpen" class="modal-body" style="position: absolute; top: 10px; left: 100px; right: 100px; height: 95%; background-color: white; font-size: 10pt;">

      <div style="position: absolute; left: 0; width: 75%; height: 99%; overflow: scroll;">
        <div>
          <pdf-viewer [rotation]="rotation" [(page)]="selectedPage" (after-load-complete)="absorbPdfInfo($event)" [src]="pdfFile" [original-size]="false" [show-all]="true" style="display: block; width: 100%; margin: 0 auto;"></pdf-viewer>
        </div>
        <div style="position: absolute; top: 2px; left: 10px; width: 85%; white-space: nowrap; overflow: auto;">{{getFileNameFromPath(pdfFile)}}</div>
        <div class="noselect" style="position: absolute; top: 2px; right: 40px;">
          <i (click)="rotate()" class="fa fa-repeat fa-lg"></i>&nbsp;&nbsp;{{numPages}} pages
        </div>
      </div>



      <div style="position: absolute; height: 100%; top: 0px; right: 0; width: 350px; padding: 5px; background-color: rgba(0, 0, 0, .5);">
        <div style="width: 100%; height: 100%; overflow: hidden;" *ngIf="sessionId && meta">
          <h3 style="margin-top: 7px; color: white;">Session {{sessionId}} Details</h3>

          <div *ngIf="hideAllMeta && blip" style="width: 100%; height: 100%; overflow: auto; padding-right: 20px;">
            <table>
              <tr><td class="metalabel">time</td><td class="metavalue">{{meta.time | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</td></tr>
              <tr *ngFor="let key of displayedKeys">
                <td class="metalabel">{{key}}</td>
                <td>
                  <ul-accordion>
                    <accordion-li *ngFor="let value of getMetaForKey(key)">{{value}}</accordion-li>
                  </ul-accordion>
                </td>
              </tr>
            </table>
          </div>

          <div *ngIf="!hideAllMeta && blip" style="width: 100%; height: 90%; overflow: auto; padding-right: 20px;">
            <table>
              <tr><td class="metalabel">time</td><td class="metavalue">{{meta.time | fromEpoch}}</td></tr>
              <tr *ngFor="let key of getMetaKeys()">
                <td class="metalabel">{{key}}</td>
                <td>
                  <ul-accordion >
                    <accordion-li *ngFor="let value of meta[key]">{{value}}</accordion-li>
                  </ul-accordion>
                </td>
              </tr>
            </table>
          </div>

          <div (click)="showAllClick()" style="position: absolute; top: 2px; right: 60px; color: white;"><i #showAll class="fa fa-eye-slash fa-2x fa-fw"></i></div>
          <div *ngIf="preferences.nwInvestigateUrl && deviceNumber && sessionId" style="position: absolute; top: 2px; right: 30px;"><a target="_blank" href="{{preferences.nwInvestigateUrl}}/investigation/{{deviceNumber}}/reconstruction/{{sessionId}}/AUTO"><i class="fa fa-bullseye fa-2x fa-fw" style="color: red;"></i></a></div>
        </div>
        <div (click)="closeModal()" style="position: absolute; top: 2px; right: 5px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>
      </div>


    </div>
  </div>
</modal>
  `,
  styles: [`
    .noselect {
      -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
      -khtml-user-select: none; /* Konqueror HTML */
      -moz-user-select: none; /* Firefox */
      -ms-user-select: none; /* Internet Explorer/Edge */
      user-select: none; /* Non-prefixed version, currently supported by Chrome and Opera */
    }
  `]
})

export class PdfViewerModalComponent implements OnInit, OnDestroy {

  constructor(private dataService : DataService,
              private modalService: ModalService,
              private toolService: ToolWidgetCommsService,
              private renderer: Renderer,
              private loggerService: LoggerService ) {}

  @Input('apiServerUrl') apiServerUrl: string;
  //@Input('pdfFile') pdfFile: string;
  @Input('sessionDetails') sessionDetails: any = {};
  @ViewChild('showAll') showAll: ElementRef;

  private alive: boolean = true;
  private pdfFilename: string;
  private page: number = 1;
  public id: string = 'pdf-viewer';
  public isOpen: boolean = false;
  private selectedPage: number = 1;
  private numPages: number;
  private session: any;
  private meta: any;
  private sessionId: number;
  private hideAllMeta: boolean = true;
  private preferences: any;
  private deviceNumber: number;
  private image: any;
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
                                ]; //these are just defaults in case we can't get them from prefs

  ngOnInit(): void {
    this.dataService.preferencesChanged.takeWhile(() => this.alive).subscribe( (prefs: any) => {  //console.log("prefs observable: ", prefs);
                                                                      this.preferences = prefs;
                                                                      if ( 'displayedKeys' in prefs ) {
                                                                        this.displayedKeys = prefs.displayedKeys;
                                                                      }
                                                                      //this._changeDetectionRef.detectChanges();
                                                                      //this._changeDetectionRef.markForCheck();
                                                                    });
    this.toolService.deviceNumber.takeWhile(() => this.alive).subscribe( ($event: any) => this.deviceNumber = $event.deviceNumber );
    this.dataService.getPreferences();

    this.toolService.newSession.takeWhile(() => this.alive).subscribe( (session: any) => {
      //console.log("got new session", session);
      this.session = session;
      this.meta = session.meta;
    });

    this.toolService.newImage.takeWhile(() => this.alive).subscribe( (image: any) => {
      //console.log("got new image:", image)
      this.image = image;
      this.sessionId = this.image.session;
      this.pdfFile = this.image.contentFile;
      //this.pdfFileUrl = this.apiServerUrl + this.pdfFile;
    });
  }

  public ngOnDestroy() {
    this.alive = false;
  }

  private pdfFile: string;

  getMetaForKey(k: string): any {
    //console.log("getMetaForKey()", this.meta[k]);
    return this.meta[k];
  }

  getMetaKeys(): any {
    var a = [];
    for (var k in this.meta) {
      a.push(k);
    }
    return a;
  }

  private blip: boolean = true;

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
    //this._changeDetectionRef.detectChanges();
    //this._changeDetectionRef.markForCheck();
  }

  opened(): void {
    this.isOpen = true;
    setTimeout( () => this.blip = true );
  }

  cancelled(): void {
    this.isOpen = false;
  }

  closeModal(): void {
    setTimeout( () => this.blip = false );
    this.modalService.close(this.id);
  }

  getFileNameFromPath(p: string): string {
    return this.pdfFile.split('/').pop();
  }

  absorbPdfInfo(p: any): void {
    //console.log('absorbPdfInfo', p);
    this.numPages = p.numPages;
  }

  private rotation: number = 0;
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
