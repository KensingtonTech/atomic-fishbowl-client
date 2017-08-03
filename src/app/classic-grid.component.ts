import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer, ChangeDetectorRef } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ISubscription } from "rxjs/Subscription";
import { ToolWidgetCommsService } from './tool-widget.comms.service';
import { PanZoomConfigService } from './panzoom/panzoom-config.service';
import { PanZoomModelService } from './panzoom/panzoom-model.service';
import { PanZoomApiService } from './panzoom/panzoom-api.service';
import { WindowRefService } from './panzoom/panzoom-windowref.service';
import { DataService } from './data.service';
import { Image } from './image';
import { ModalService } from './modal/modal.service';
import { LoggerService } from './logger-service';
import * as $ from 'jquery';
//declare var $: any;

@Component({
  selector: 'classic-grid-view',
  template: `
<div style="position: relative; width: 100%; height: 100%;">
  <panzoom id="abc" addStyle="width: 100%; height: 100%; background-color: black;">
    <div class="bg noselect items" style="width: 2400px;" *ngIf="images && sessions">
      <img-tile *ngFor="let image of displayedImages" [highResSession]="hoveredImageSession" (openPDFViewer)="openPdfViewer()" [image]="image" [apiServerUrl]="apiServerUrl" [session]="sessions[image.session]"></img-tile>
    </div>
  </panzoom>
  <grid-control-bar [canvasWidth]="canvasWidth" [initialZoomHeight]="initialZoomHeight" ></grid-control-bar>
  <session-widget [enabled]="sessionWidgetEnabled" [sessionId]="hoveredImageSession" #sessionWidget></session-widget>
  <pdf-viewer-modal [apiServerUrl]="apiServerUrl" [sessionDetails]="selectedSessionDetails"></pdf-viewer-modal>
</div>
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

export class ClassicGridComponent implements OnInit, OnDestroy {

  constructor(  private panzoomConfig: PanZoomConfigService,
                private panZoomApiService: PanZoomApiService,
                private modelService: PanZoomModelService,
                private dataService: DataService,
                private renderer: Renderer,
                private windowRef: WindowRefService,
                private elRef: ElementRef,
                private modalService: ModalService,
                private _changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolWidgetCommsService,
                private loggerService: LoggerService ) {}

  @ViewChild('sessionWidget') sessionWidget: ElementRef;
  private images: Image[];
  private sessionWidgetEnabled: boolean = false
  private hoveredImageSession: number;
  private apiServerUrl: string = '//' + window.location.hostname;
  private deviceNumber: number;
  private panzoomModel = this.modelService.model;
  private panZoomAPI: any;
  private search: any = [];
  private canvasWidth = 2400;
  private initialZoomHeight = 1080;
  private displayedImages: any = [];
  private pdfImages: Image[] = [];
  private imageImages: Image[] = [];
  private imageCount: any; //{ images: number, pdfs: number, total: number }
  private selectedSessionDetails: any;
  private sessions: any;

  private caseSensitiveSearchChangedSubscription: ISubscription;
  private searchTermsChangedSubscription: ISubscription;
  private maskChangedSubscription: ISubscription;
  private collectionStateChangedSubscription: ISubscription;
  private imagesChangedSubscription: ISubscription;
  private imagePublishedSubscription: ISubscription;
  private searchChangedSubscription: ISubscription;
  private searchPublishedSubscription: ISubscription;
  private sessionsPurgedSubscription: ISubscription;
  private sessionsChangedSubscription: ISubscription;
  private sessionPublishedSubscription: ISubscription;

  ngOnDestroy(): void {
    console.log("ClassicGridComponent: ngOnDestroy()");
    this.caseSensitiveSearchChangedSubscription.unsubscribe();
    this.searchTermsChangedSubscription.unsubscribe();
    this.maskChangedSubscription.unsubscribe();
    //this.selectedCollectionChangedSubscription.unsubscribe();
    this.collectionStateChangedSubscription.unsubscribe();
    this.sessionsChangedSubscription.unsubscribe();
    this.sessionPublishedSubscription.unsubscribe();
    this.imagesChangedSubscription.unsubscribe();
    this.imagePublishedSubscription.unsubscribe();
    this.searchChangedSubscription.unsubscribe();
    this.searchPublishedSubscription.unsubscribe();
    this.sessionsPurgedSubscription.unsubscribe();
  }

  ngOnInit() : void {
    console.log("ClassicGridComponent: ngOnInit()");

    //bind ToolWidgetCommsService observables to our own variables
    this.caseSensitiveSearchChangedSubscription = this.toolService.caseSensitiveSearchChanged.subscribe( () => this.toggleCaseSensitiveSearch() );
    this.searchTermsChangedSubscription = this.toolService.searchTermsChanged.subscribe( ($event: any) => this.searchTermsChanged($event) );
    this.maskChangedSubscription = this.toolService.maskChanged.subscribe( ($event: any) => this.maskChanged($event) );

    this.panzoomConfig.invertMouseWheel = true;
    this.panzoomConfig.useHardwareAcceleration = true;
    this.panzoomConfig.chromeUseTransform = true;

    this.panzoomConfig.zoomLevels = 10;
    this.panzoomConfig.scalePerZoomLevel = 2.0;
    this.panzoomConfig.zoomStepDuration = 0.2;
    this.panzoomConfig.initialZoomToFit = {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight };

    //this.panzoomConfig.zoomLevels = 20;
    //this.panzoomConfig.scalePerZoomLevel = 1.1;
    //this.panzoomConfig.neutralZoomLevel = 5;
    //this.panzoomConfig.zoomStepDuration = 0.01;


    this.panzoomConfig.haltSpeed = 100;
    this.panzoomConfig.modelChangedCallback = (model: any) => this.sessionWidgetDecider();
    //this.panzoomConfig.keepInBounds = true;

    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (collection: any) => {
                                                                              //console.log("collection", collection);
                                                                              if (collection.state === 'refreshing')  {
                                                                                //this.toolService.changingCollections.next(true);
                                                                                //this.changeDetectionRef.markForCheck();
                                                                                this.images = [];
                                                                                this.displayedImages = [];
                                                                                this.pdfImages = [];
                                                                                this.imageImages = [];
                                                                                this.search = [];
                                                                                this.sessions=[];
                                                                                this.imageCount = { images: 0, pdfs: 0, total: 0 };
                                                                                this.toolService.imageCount.next( this.imageCount );
                                                                                this.toolService.changingCollections.next(false);
                                                                                this.panZoomAPI.zoomToFit( {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight })
                                                                                //this.changeDetectionRef.markForCheck();
                                                                              }
                                                                            });

    this.imagesChangedSubscription = this.dataService.imagesChanged.subscribe( (i: any) => { console.log("images:", i); //when a new collection is selected
                                                            i.sort(this.sortImages);
                                                            this.images = i;
                                                            this.displayedImages = i;
                                                            this.pdfImages = [];
                                                            this.imageImages = [];
                                                            this.search = []; //testing this
                                                            for (var x=0; x < this.images.length; x++) {  //pre-calculate image masks
                                                              if (this.images[x].contentType === 'pdf') {
                                                                this.pdfImages.push(this.images[x]);
                                                              }
                                                              if (this.images[x].contentType === 'image') {
                                                                this.imageImages.push(this.images[x]);
                                                              }
                                                            }
                                                            this.imageCount = { images: this.imageImages.length, pdfs: this.pdfImages.length, total: this.images.length };
                                                            this.toolService.imageCount.next( this.imageCount );
                                                            this.sessionWidgetDecider();
                                                            this.panZoomAPI.zoomToFit( {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight });
                                                          });
    this.imagePublishedSubscription = this.dataService.imagePublished.subscribe( (i: any) =>  { //when images are pushed from a still-building collection
                                                              for (var img of i) {
                                                                this.images.push(img);
                                                                if (img.contentType === 'pdf') {
                                                                  this.pdfImages.push(img);
                                                                }
                                                                if (img.contentType === 'image') {
                                                                  this.imageImages.push(img);
                                                                }
                                                              }
                                                              this.imageCount = { images: this.imageImages.length, pdfs: this.pdfImages.length, total: this.images.length };
                                                              this.toolService.imageCount.next( this.imageCount );
                                                              this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
                                                            });
    this.searchChangedSubscription = this.dataService.searchChanged.subscribe( (s: any) =>  { //this receives complete search term data from complete collection
                                                                this.search = s;
                                                                console.log('search update', this.search);
                                                              });
    this.searchPublishedSubscription = this.dataService.searchPublished.subscribe( (s: any) => {
                                                              console.log("search term published:", s);
                                                              this.search.push(s);
                                                              this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
                                                            }); //this receives a partial search term data from a building collection

    this.sessionsPurgedSubscription = this.dataService.sessionsPurged.subscribe( (sessionsToPurge: number[]) =>  {
                                                              console.log("sessions purged:", sessionsToPurge);
                                                              let c=0;

                                                              let purgedImagePositions = [];
                                                              let purgedSearchPositions = [];

                                                              for (let x=0; x < sessionsToPurge.length; x++) {
                                                                var sidToPurge = sessionsToPurge[x];
                                                                //console.log("s:", s);

                                                                for (let i=0; i < this.images.length; i++) {
                                                                  //console.log("this.images[i].session", this.images[i].session);
                                                                  if (this.images[i].session === sidToPurge) {
                                                                    console.log("removing image with session id", sidToPurge);
                                                                    //this.images.splice(i, 1);
                                                                    purgedImagePositions.push(i);
                                                                  }
                                                                }

                                                                for (let i=0; i < this.search.length; i++) {
                                                                  if (this.search[i].session === sidToPurge) {
                                                                    console.log("removing search text with session id", sidToPurge);
                                                                    //this.search.splice(i, 1);
                                                                    purgedSearchPositions.push(i);
                                                                    c++;
                                                                  }
                                                                }
                                                              }

                                                              purgedImagePositions.sort(this.sortNumber);
                                                              for (let i=0; i < purgedImagePositions.length; i++) {
                                                                this.images.splice(purgedImagePositions[i], 1);
                                                              }
                                                              purgedSearchPositions.sort(this.sortNumber);
                                                              for (let i=0; i < purgedSearchPositions.length; i++) {
                                                                this.search.splice(purgedSearchPositions[i], 1);
                                                              }

                                                              this.displayedImages = this.images;
                                                              this.pdfImages = [];
                                                              this.imageImages = [];
                                                              this.search = []; //testing this
                                                              for (var x=0; x < this.images.length; x++) {  //pre-calculate image masks
                                                                if (this.images[x].contentType === 'pdf') {
                                                                  this.pdfImages.push(this.images[x]);
                                                                }
                                                                //if (this.images[x].contentType === 'image' || this.images[x].contentType === 'encryptedRarEntry' || this.images[x].contentType === 'encryptedZipEntry') {
                                                                if (this.images[x].contentType in ['image', 'encryptedRarEntry', 'encryptedZipEntry', 'unsupportedZipEntry']) {
                                                                  this.imageImages.push(this.images[x]);
                                                                }
                                                              }
                                                              this.imageCount = { images: this.imageImages.length, pdfs: this.pdfImages.length, total: this.images.length };
                                                              this.toolService.imageCount.next( this.imageCount );
                                                              this.sessionWidgetDecider();
                                                              if (c > 0) {
                                                                this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
                                                              }
                                                            });

    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'black');
    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'overflow', 'hidden');
    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'margin', '0');

    this.panZoomApiService.getAPI('abc').then( (v: any) => {this.panZoomAPI = v;});

    this.sessionsChangedSubscription = this.dataService.sessionsChanged.subscribe( (s: any) => { console.log("sessionsChanged", s);
                                                              this.sessions = s;
                                                              //this.changeDetectionRef.detectChanges();
                                                              //this.changeDetectionRef.markForCheck();
                                                            });

    this.sessionPublishedSubscription = this.dataService.sessionPublished.subscribe( (s: any) => {  //console.log("sessionPublished", s);
                                                                let sessionId = s.id;
                                                                this.sessions[sessionId] = s;
                                                                //this.changeDetectionRef.detectChanges();
                                                                //this.changeDetectionRef.markForCheck();
                                                              });
    //this.createListStyles( ".items img-tile:nth-child({0})", 556, 18);
    //this.createListStyles( ".items div:nth-child({0})", 50, 18);
    //this.createListStyles( ".item div:first-child", 50, 18);
  }

  sortNumber(a: number, b: number): number {
      return b - a;
  }

  sortImages(a: any, b: any): number {
   if (a.session < b.session) {
    return -1;
   }
   if (a.session > b.session) {
    return 1;
   }
   return 0;
  }


  //used by an experiment to animate thumbnail movements
  createListStyles(rulePattern: any, rows: number, cols: number): void {
    var rules = [];
    var index = 0;
    for (var rowIndex = 0; rowIndex < rows; rowIndex++) {
        for (var colIndex = 0; colIndex < cols; colIndex++) {
            var x = (colIndex * 100) + "%",
                y = (rowIndex * 100) + "%",
                transforms = "{ -webkit-transform: translate3d(" + x + ", " + y + ", 0); transform: translate3d(" + x + ", " + y + ", 0); }";
            rules.push(rulePattern.replace("{0}", ++index) + transforms);
        }
    }
    //console.log("rules:");
    //for (var i=0; i < rules.length; i++) {
    //  console.log(rules[i]);
    //}

    var headElem = document.getElementsByTagName("head")[0];
    //console.log("headElem:", headElem)
    var styleElem = $("<style>").attr("type", "text/css").appendTo(headElem)[0];
    //if (styleElem.styleSheet) {
    if ('styleSheet' in styleElem) {
        styleElem['styleSheet'].cssText = rules.join("\n");
    }
    else {
        styleElem.textContent = rules.join("\n");
    }
  }

  private pdfFile: string;

  openPdfViewer(e: any): void {
    this.selectedSessionDetails = e;
    //this.pdfFile = e.pdfFile;
    this.modalService.open('pdf-viewer');
  }

  private imagesHidden: boolean = false;

  imageMaskChanged(e: any) : void {
    this.imagesHidden = !this.imagesHidden;
  }

  private pdfsHidden: boolean = false;

  maskChanged(e: any): void {
    //e = { showPdf: boolean, showImage: boolean }
    //console.log("mask:", e);
    //console.log("e.showPdf", e.showPdf);
    //console.log("e.showImage", e.showImage);
    var showPdf = e.showPdf;
    var showImage = e.showImage;
    if (showPdf && showImage) {
      this.displayedImages = this.images;
    }
    else if ( showPdf && !showImage ) {
      //console.log("got to 1");
      this.displayedImages = this.pdfImages;
    }
    else if ( !showPdf && showImage ) {
      //console.log("got to 2");
      this.displayedImages = this.imageImages;
    }
    else if ( !showPdf && !showImage ) {
      //console.log("got to 3");
      this.displayedImages = [];
    }
  }

  pdfMaskChanged(e: any) : void {
    this.pdfsHidden = !this.pdfsHidden;
    var pdfs = [];

    if (!this.pdfsHidden) {
      for (var x=0; x < this.images.length; x++) {
        if (this.images[x].contentType === 'pdf') {
          pdfs.push(this.images[x]);
        }
      }
      this.displayedImages = pdfs;
    }
  }

  //sessionWidgetDecider(model: any): void {
  sessionWidgetDecider(): void {
    console.log("sessionWidgetDecider():", this.panzoomModel.zoomLevel);
    let transitionZoomLevel = 3.9;
    //this._changeDetectionRef.markForCheck();
    let height=this.windowRef.nativeWindow.innerHeight;
    let width=this.windowRef.nativeWindow.innerWidth;
    let center : any = {};
    center.x = width / 2;
    center.y = height / 2;
    let e = document.elementFromPoint(center.x, center.y);
    var je: any = $(e);
    if (!$(je).hasClass('image-gallery-thumbnail')) {
      this.hideSessionWidget();
    }
    if (this.panzoomModel.zoomLevel <= transitionZoomLevel) {
      this.hideSessionWidget();
    }
    if (this.panzoomModel.zoomLevel >= transitionZoomLevel && $(je).hasClass('image-gallery-thumbnail')) {
      if (je[0].attributes.sessionid) {
        this.showSessionWidget(je[0].attributes.sessionid.value);
      }
    }

/*
    //at around a zoomLevel of 4 (3.9) or greater, we want to show high res images for all onscreen
    if (this.panzoomModel.zoomLevel >= transitionZoomLevel) {
      let thumbnails = $(".image-gallery-thumbnail")
      //console.log("thumbnails:", thumbnails);
      let onscreenThumbnails = [];
      for (let t=0; t < thumbnails.length; t++) {
        //console.log("thumbnails[t]:", thumbnails[t]);
        if ( this.isElementInViewport(thumbnails[t])) {
          onscreenThumbnails.push(thumbnails[t]);
        }

      }
      //let onscreenElements = $(":onScreen")
      console.log("onscreenThumbnails:", onscreenThumbnails);
    }
*/

  }

  isElementInViewport(el: any): any {

      //special bonus for those using jQuery
      if (typeof jQuery === "function" && el instanceof jQuery) {
          el = el[0];
      }

      var rect = el.getBoundingClientRect();

      return (
          rect.top >= 0 &&
          rect.left >= 0 && //panzoom
          //rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
          rect.bottom <= ( $(".pan-zoom-frame").innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
          //rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
          rect.right <= ( $(".pan-zoom-frame").innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
      );
  }

  private hoveredImageSessions: number[];

  showSessionWidget(i: number): void {
    //console.log("showSessionWidget()", i);
    this.hoveredImageSession = i;
    //this.sessionWidgetEnabled = true;
    this.sessionWidgetEnabled = true;
    this._changeDetectionRef.detectChanges();
  }

  hideSessionWidget(): void {
    //console.log("hideSessionWidget()");
    //this.sessionWidgetEnabled = false;
    this.sessionWidgetEnabled = false;
    this._changeDetectionRef.detectChanges();
  }

  private caseSensitiveSearch: boolean = false;

  toggleCaseSensitiveSearch(): void {
    console.log("toggleCaseSensitiveSearch()");
    this.caseSensitiveSearch = !this.caseSensitiveSearch;
    this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
  }

  private showOnlyImages: any = [];
  private lastSearchTerm: string = '';

  getImageById(n: number): any {
    for (var x=0; x < this.images.length; x++) {
      if (this.images[x].session === n) {
        return this.images[x];
      }
    }
  }


  searchTermsChanged(e: any): void {
    var searchTerms = e.searchTerms;
    this.lastSearchTerm = searchTerms;
    console.log("searchTerms update:", searchTerms);
    var matchedSessions = [];
    var matchedSessionIds = [];
    if (searchTerms === '') {
      //console.log("matched!");
      this.showOnlyImages = [];
      this.displayedImages = this.images;
      return;
    }
    if (this.search.length > 0) {
      for (var i=0; i < this.search.length; i++) {
        //all searches are case-insensitive for now
        if (!this.caseSensitiveSearch && this.search[i].searchString.toLowerCase().indexOf(searchTerms.toLowerCase()) >= 0) {
          console.log("case insensitive");
          var sessionId = this.search[i].session;
          console.log("matched session", sessionId);
          matchedSessions.push(this.search[i]);
          matchedSessionIds.push(sessionId);
        }
        else if (this.caseSensitiveSearch && this.search[i].searchString.indexOf(searchTerms) >= 0) {
          console.log("case sensitive");
          var sessionId = this.search[i].session;
          console.log("matched session", sessionId);
          matchedSessions.push(this.search[i]);
          matchedSessionIds.push(sessionId);
        }
      }
    }
    if ( matchedSessions.length != 0 ) {
      console.log("matchedSessions:", matchedSessions);
      console.log("matchedSessionIds:", matchedSessionIds);
      this.showOnlyImages = matchedSessions;
      this.displayedImages = [];
      for (var x=0; x < matchedSessionIds.length; x++) {
        this.displayedImages.push(this.getImageById(matchedSessionIds[x]));
      }
      console.log("displayedImages:", this.displayedImages)
    }
    else {
      console.log("no matches");
      this.showOnlyImages = [ 'none' ];
      this.displayedImages = [];
      //this.showOnlyImages.push('none');
    }
  }

}
