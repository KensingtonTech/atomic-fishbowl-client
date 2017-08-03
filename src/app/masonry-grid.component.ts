import { Component, OnInit, OnDestroy, ViewChild, ComponentRef, ElementRef, Renderer, ChangeDetectorRef, AfterViewInit, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { NgStyle } from '@angular/common';
import { Observable } from 'rxjs/Observable';
import { ISubscription } from "rxjs/Subscription";
import { ToolWidgetCommsService } from './tool-widget.comms.service';
import { DataService } from './data.service';
import { Image } from './image';
import { ModalService } from './modal/modal.service';
import { MasonryOptions } from './masonry/masonry-options';
import { MasonryComponent } from './masonry/masonry.component';
import { LoggerService } from './logger-service';
import * as $ from 'jquery';
//declare var $: any;

@Component({
  selector: 'masonry-grid-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  //[ngStyle]="{'width.px': masonryColumnSize}"
  template: `
<div style="position:relative; width: 100%; height: 100%; background-color: black;">
  <masonry-control-bar></masonry-control-bar>
  <div *ngIf="selectedCollectionType == 'monitoring'" style="position: absolute; left: 15px; top: 100px; color: white; z-index: 100;">
    <i *ngIf="!pauseMonitoring" class="fa fa-pause-circle-o fa-4x" (click)="togglePauseMonitoring()"></i>
    <i *ngIf="pauseMonitoring" class="fa fa-play-circle-o fa-4x" (click)="togglePauseMonitoring()"></i>
  </div>
  <div *ngIf="!destroyMasonry" class="scrollContainer noselect" style="position: relative; overflow: scroll; width: 100%; height: 100%;">
    <masonry class="grid" *ngIf="images && sessionsDefined && masonryKeys && masonryColumnSize" [options]="masonryOptions" [shownBricks]="shownBricks" [loadAllBeforeLayout]="loadAllBeforeLayout" style="margin-left: 100px; width: 100%;">
      <masonry-tile class="brick" [ngStyle]="{'width.px': masonryColumnSize}" *ngFor="let image of images" [image]="image" [apiServerUrl]="apiServerUrl" (openSessionDetails)="openSessionDetails($event)" (openPDFViewer)="openPdfViewer()" [session]="sessions[image.session]" [attr.image]="image.image" [attr.sessionId]="image.session" [attr.contentType]="image.contentType" [attr.contentFile]="image.contentFile" [masonryKeys]="masonryKeys" [masonryColumnSize]="masonryColumnSize"></masonry-tile>
    </masonry>
    <div class="scrollTarget"></div>
  </div>
  <pdf-viewer-modal [apiServerUrl]="apiServerUrl"></pdf-viewer-modal>
  <session-details-modal [apiServerUrl]="apiServerUrl" id="sessionDetails" [sessionDetails]="selectedSessionDetails"></session-details-modal>
</div>
  `,

  styles: [`

    .brick {
      //width: 600px;
      //margin: 5px;
      margin-top: 20px;
      //padding: 15px;
      //transform:translate3d(0,0,0);
      //-webkit-transform:translate3d(0,0,0);
      //-moz-transform:translate3d(0,0,0);
    }

  `]
})

export class MasonryGridComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(  private dataService: DataService,
                private renderer: Renderer,
                private elRef: ElementRef,
                private modalService: ModalService,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolWidgetCommsService,
                private ngZone: NgZone,
                private loggerService: LoggerService ) {}

  private images: Image[];
  //private sessionWidgetEnabled: boolean = false
  private hoveredImageSession: number;
  private apiServerUrl: string = '//' + window.location.hostname;
  private deviceNumber: number;
  private search: any = [];
  private displayedImages: any = [];
  private pdfImages: Image[] = [];
  private imageImages: Image[] = [];
  private imageCount: any; //{ images: number, pdfs: number, total: number }
  //private deviceInfo = {};
  //private pdfFile: string;
  private caseSensitiveSearch: boolean = false;
  private showOnlyImages: any = [];
  private lastSearchTerm: string = '';
  private masonryColumnSize: number = 350; //default is 350
  //private masonryColumnSize: number;
  private masonryOptions: MasonryOptions =  {  //columnWidth: this.masonryColumnSize,
                                    layoutMode: 'masonry',
                                    itemSelector: '.brick',
                                    initLayout: false,
                                    resize: true,
                                    masonry: {
                                                columnWidth: this.masonryColumnSize,
                                                //columnWidth: '.brick',
                                                gutter: 20,
                                                horizontalOrder: true,
                                                fitWidth: true,
                                    }
                                  };
  private sessions: any;
  private sessionsDefined: boolean = false;
  private selectedCollectionType: string;
  private collectionId: string;
  private destroyMasonry: boolean = true;
  private shownBricks: any = [];
  private pixelsPerSecond: number = 200;
  @ViewChild(MasonryComponent) private masonryComponentRef: MasonryComponent;
  //@ViewChild('scrollTarget') scrollTarget: ElementRef;
  //@ViewChild('scrollContainer') scrollContainer: ElementRef;
  private loadAllBeforeLayout: boolean = true;
  private imageIncludedTypes: any = ['image', 'encryptedRarEntry', 'encryptedZipEntry', 'unsupportedZipEntry'];
  private masonryKeys: any;

  private caseSensitiveSearchChangedSubscription: ISubscription;
  private searchTermsChangedSubscription: ISubscription;
  private maskChangedSubscription: ISubscription;
  private scrollToBottomSubscription: ISubscription;
  private layoutCompleteSubscription: ISubscription;
  private stopScrollToBottomSubscription: ISubscription;
  private selectedCollectionChangedSubscription: ISubscription;
  private collectionStateChangedSubscription: ISubscription;
  private sessionsChangedSubscription: ISubscription;
  private sessionPublishedSubscription: ISubscription;
  private imagesChangedSubscription: ISubscription;
  private imagePublishedSubscription: ISubscription;
  private searchChangedSubscription: ISubscription;
  private searchPublishedSubscription: ISubscription;
  private sessionsPurgedSubscription: ISubscription;
  private preferencesChangedSubscription: ISubscription;

  ngOnDestroy(): void {
    console.log("MasonryGridComponent: ngOnDestroy()");
    this.caseSensitiveSearchChangedSubscription.unsubscribe();
    this.searchTermsChangedSubscription.unsubscribe();
    this.maskChangedSubscription.unsubscribe();
    this.scrollToBottomSubscription.unsubscribe();
    this.layoutCompleteSubscription.unsubscribe();
    this.stopScrollToBottomSubscription.unsubscribe();
    this.selectedCollectionChangedSubscription.unsubscribe();
    this.collectionStateChangedSubscription.unsubscribe();
    this.sessionsChangedSubscription.unsubscribe();
    this.sessionPublishedSubscription.unsubscribe();
    this.imagesChangedSubscription.unsubscribe();
    this.imagePublishedSubscription.unsubscribe();
    this.searchChangedSubscription.unsubscribe();
    this.searchPublishedSubscription.unsubscribe();
    this.sessionsPurgedSubscription.unsubscribe();
  }

  ngOnInit(): void {
    console.log("MasonryGridComponent: ngOnInit()");

    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'black');
    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'overflow', 'hidden');
    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'margin', '0');

    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: any) =>  {
      this.masonryKeys = prefs.masonryKeys;
      //console.log('masonryKeys:', this.masonryKeys)
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();

      if (this.masonryColumnSize != prefs.masonryColumnSize) {
        console.log("MasonryGridComponent: preferencesChangedSubscription: Changing masonry column size to prefs.masonryColumnSize");
        this.masonryColumnSize = prefs.masonryColumnSize;
        this.changeDetectionRef.detectChanges();
        this.changeDetectionRef.markForCheck();
        var newMasonryOptions: MasonryOptions = Object.assign({}, this.masonryOptions); //deep copy so that the reference is changed and can thus be detected
        newMasonryOptions.masonry.columnWidth = this.masonryColumnSize;
        this.masonryOptions = newMasonryOptions;
      }
      else {
        if (this.masonryComponentRef) this.masonryComponentRef.layout(); //we don't execute the layout after changing masonry meta key preferences if we're changing the column size, so that layout is only triggered once
      }
    });


    //bind ToolWidgetCommsService observables to our own variables
    this.caseSensitiveSearchChangedSubscription = this.toolService.caseSensitiveSearchChanged.subscribe( () => this.toggleCaseSensitiveSearch() );

    this.searchTermsChangedSubscription = this.toolService.searchTermsChanged.subscribe( ($event: any) => this.searchTermsChanged($event) );

    this.maskChangedSubscription = this.toolService.maskChanged.subscribe( ($event: any) => this.maskChanged($event) );

    //this.toolService.deviceNumber.subscribe( ($event: any) => this.deviceNumberUpdate($event) );

    this.scrollToBottomSubscription = this.toolService.scrollToBottom.subscribe( () => {this.autoScrollerStopped = false; this.autoScroller();} );

    this.layoutCompleteSubscription = this.toolService.layoutComplete.subscribe( () => {
                                                        console.log("MasonryGridComponent: layoutCompleteSubscription: layoutComplete");
                                                        if (this.selectedCollectionType === 'monitoring' && !this.autoScrollerStopped) {
                                                          this.autoScroller();
                                                        }
                                                        //this.changeDetectionRef.detectChanges();
                                                        this.changeDetectionRef.markForCheck();
                                                     });


    this.stopScrollToBottomSubscription = this.toolService.stopScrollToBottom.subscribe( () =>  {
                                                            this.autoScrollerStopped = true;
                                                            this.stopAutoScroller();
                                                          });
    //this.toolService.selectedCollection.subscribe( ($event: any) => {

    this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (collection: any) => { //this triggers whenever we choose a new collection
                                                                      console.log("MasonryGridComponent: selectedCollectionChangedSubscription: selectedCollectionChanged:", collection);
                                                                      if (this.masonryComponentRef) this.masonryComponentRef.destroyMe();
                                                                      this.destroyMasonry = true;
                                                                      this.sessionsDefined = false;
                                                                      //this.changeDetectionRef.detectChanges();
                                                                      //this.changeDetectionRef.markForCheck();
                                                                      this.images = []; //undefined
                                                                      this.shownBricks = []; //undefined
                                                                      this.pdfImages = []; //undefined
                                                                      this.imageImages = []; //undefined
                                                                      this.search = []; //undefined
                                                                      this.sessions = {}; //undefined
                                                                      this.imageCount = { images: 0, pdfs: 0, total: 0 };
                                                                      this.toolService.imageCount.next( this.imageCount );
                                                                      this.changeDetectionRef.detectChanges();
                                                                      this.changeDetectionRef.markForCheck();
                                                                      this.selectedCollectionType = collection.type;
                                                                      this.collectionId = collection.id;
                                                                      if (this.selectedCollectionType === 'monitoring' || this.selectedCollectionType === 'rolling') {
                                                                        this.loadAllBeforeLayout = false;
                                                                      }
                                                                      else {
                                                                        this.loadAllBeforeLayout = true;
                                                                      }
                                                                    });

    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (collection: any) => { //this triggers when a monitoring collection refreshes
                                                                              console.log("MasonryGridComponent: collectionStateChangedSubscription: collectionStateChanged:", collection.state);
                                                                              //console.log("collection", collection);
                                                                              //this.iconDecider(collection.state);
                                                                              //this.collections[collection.id].state = collection.state;
                                                                              //this.stopAutoScroller();
                                                                              if (collection.state === 'refreshing')  {
                                                                                //this.masonryComponentRef.loadAllBeforeLayout = false;
                                                                                //this.toolService.changingCollections.next(true);
                                                                                //setTimeout( () => this.destroyMasonry = true );
                                                                                if (this.masonryComponentRef) this.masonryComponentRef.destroyMe();
                                                                                this.destroyMasonry = true;
                                                                                this.changeDetectionRef.detectChanges();
                                                                                this.changeDetectionRef.markForCheck();
                                                                                this.images = [];
                                                                                //this.displayedImages = [];
                                                                                this.shownBricks = [];
                                                                                this.pdfImages = [];
                                                                                this.imageImages = [];
                                                                                this.search = [];
                                                                                this.sessionsDefined = false;
                                                                                this.sessions={};
                                                                                this.imageCount = { images: 0, pdfs: 0, total: 0 };
                                                                                this.toolService.imageCount.next( this.imageCount );
                                                                                this.toolService.changingCollections.next(false);
                                                                                //setTimeout( () => this.destroyMasonry = false );
                                                                                this.destroyMasonry = false;
                                                                                this.changeDetectionRef.detectChanges();
                                                                                this.changeDetectionRef.markForCheck();
                                                                              }
                                                                            });

    this.sessionsChangedSubscription = this.dataService.sessionsChanged.subscribe( (s: any) => { console.log("sessionsChanged:", s); //when an a whole new collection is selected
                                                              this.sessionsDefined = true;
                                                              this.sessions = s;
                                                              this.changeDetectionRef.detectChanges();
                                                              this.changeDetectionRef.markForCheck();
                                                              //setTimeout( () => this.sessions = s );
                                                              //this.ngZone.run( () => this.sessions = s );
                                                              //this.changeDetectionRef.detectChanges();
                                                              //this.changeDetectionRef.markForCheck();
                                                            });

    this.sessionPublishedSubscription = this.dataService.sessionPublished.subscribe( (s: any) => {  console.log("sessionPublished", s); //when an individual session is pushed from a building collection (or monitoring or rolling)
                                                                let sessionId = s.id;
                                                                //setTimeout( () => this.sessions[sessionId] = s );
                                                                this.sessionsDefined = true;
                                                                this.sessions[sessionId] = s;
                                                                //this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
                                                                //this.changeDetectionRef.detectChanges();
                                                                //this.changeDetectionRef.markForCheck();
                                                              });

    this.imagesChangedSubscription = this.dataService.imagesChanged.subscribe( (i: any) => { console.log("imagesChanged:", i); //when a new collection is selected
                                                            //this.toolService.changingCollections.next(true);
                                                            this.stopAutoScroller();
                                                            //setTimeout( () => {this.destroyMasonry = true}, 0 );
                                                            if (i.length == 0 && this.masonryComponentRef) this.masonryComponentRef.destroyMe(); //we need this when we remove the only collection and it is biggish.  Prevents performance issues
                                                            this.destroyMasonry = true;
                                                            //this.changeDetectionRef.detectChanges();
                                                            //this.changeDetectionRef.markForCheck();

                                                            //console.log("masonryRef:", this.masonryRef);
                                                            //if (this.masonryRef) this.masonryRef.destroy();
                                                            i.sort(this.sortImages);
                                                            this.images = i;
                                                            this.shownBricks = this.imagesToBricks(i);
                                                            this.pdfImages = [];
                                                            this.imageImages = [];
                                                            this.search = [];
                                                            for (var x=0; x < this.images.length; x++) {  //pre-calculate image masks
                                                              if (this.images[x].contentType === 'pdf') {
                                                                this.pdfImages.push(this.images[x]);
                                                              }
                                                              if ( this.imageIncludedTypes.includes(this.images[x].contentType)) {
                                                                this.imageImages.push(this.images[x]);
                                                              }
                                                            }
                                                            this.imageCount = { images: this.imageImages.length, pdfs: this.pdfImages.length, total: this.images.length };
                                                            this.toolService.imageCount.next( this.imageCount );
                                                            //this.toolService.changingCollections.next(false);
                                                            //setTimeout( () => {this.destroyMasonry = false;}, 0 );
                                                            this.destroyMasonry = false;
                                                            //this.toolService.changingCollections.next(false);
                                                            this.changeDetectionRef.detectChanges();
                                                            this.changeDetectionRef.markForCheck();
                                                          });

    this.imagePublishedSubscription = this.dataService.imagePublished.subscribe( (imgs: any) =>  { //when images are pushed from a still-building, rolling, or monitoring collection \
                                                              console.log("MasonryGridComponent: imagePublishedSubscription: imagePublished:", imgs);
                                                              //for (var img of i) {

                                                              for (let x=0; x < imgs.length; x++) {
                                                                //setTimeout( () => this.images.push(img) );
                                                                this.images.push(imgs[x]);
                                                                //this.changeDetectionRef.detectChanges();
                                                                if (imgs[x].contentType === 'pdf') {
                                                                  this.pdfImages.push(imgs[x]);
                                                                }
                                                                if (this.imageIncludedTypes.includes(imgs[x].contentType)) {
                                                                  this.imageImages.push(imgs[x]);
                                                                }
                                                              }

                                                              this.imageCount = { images: this.imageImages.length, pdfs: this.pdfImages.length, total: this.images.length };
                                                              this.toolService.imageCount.next( this.imageCount );
                                                              this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
                                                              //console.log("images length:",this.images.length);
                                                              //console.log("images:",JSON.parse(JSON.stringify(this.images)));
                                                              //console.log(JSON.stringify(obj));
                                                              this.changeDetectionRef.detectChanges();
                                                              this.changeDetectionRef.markForCheck();
                                                            });

    this.searchChangedSubscription = this.dataService.searchChanged.subscribe( (s: any) =>  { //this receives complete search term data from complete collection
                                                                this.search = s;
                                                                console.log('MasonryGridComponent: searchChangedSubscription: searchChanged:', this.search);
                                                                this.changeDetectionRef.detectChanges();
                                                                this.changeDetectionRef.markForCheck();
                                                              });

    this.searchPublishedSubscription = this.dataService.searchPublished.subscribe( (s: any) => {
                                                              console.log("MasonryGridComponent: searchPublishedSubscription: searchPublished:", s);
                                                              this.search.push(s);
                                                              this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
                                                              this.changeDetectionRef.detectChanges();
                                                              this.changeDetectionRef.markForCheck();
                                                            }); //this receives a partial search term data from a building collection

    this.sessionsPurgedSubscription = this.dataService.sessionsPurged.subscribe( (sessionsToPurge: number[]) =>  {
                                                              console.log("MasonryGridComponent: sessionsPurgedSubscription: sessionsPurged:", sessionsToPurge);
                                                              //console.log("images", this.images);
                                                              //console.log("images length:",this.images.length);
                                                              //console.log("images:",JSON.parse(JSON.stringify(this.images)));
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

                                                              //console.log("purgedImagePositions:",purgedImagePositions);
                                                              //console.log("purgedSearchPositions:",purgedSearchPositions);
                                                              purgedImagePositions.sort(this.sortNumber);
                                                              for (let i=0; i < purgedImagePositions.length; i++) {
                                                                this.images.splice(purgedImagePositions[i], 1);
                                                              }
                                                              purgedSearchPositions.sort(this.sortNumber);
                                                              for (let i=0; i < purgedSearchPositions.length; i++) {
                                                                this.search.splice(purgedSearchPositions[i], 1);
                                                              }


                                                              //this.displayedImages = this.images;
                                                              this.shownBricks = this.imagesToBricks(this.images);
                                                              this.pdfImages = [];
                                                              this.imageImages = [];
                                                              this.search = []; //testing this
                                                              for (let x=0; x < this.images.length; x++) {  //pre-calculate image masks
                                                                if (this.images[x].contentType === 'pdf') {
                                                                  this.pdfImages.push(this.images[x]);
                                                                }
                                                                if (this.imageIncludedTypes.includes(this.images[x].contentType)) {
                                                                  this.imageImages.push(this.images[x]);
                                                                }
                                                              }
                                                              //this.changeDetectionRef.detectChanges();
                                                              //this.changeDetectionRef.markForCheck();
                                                              this.imageCount = { images: this.imageImages.length, pdfs: this.pdfImages.length, total: this.images.length };
                                                              this.toolService.imageCount.next( this.imageCount );
                                                              if (c > 0) {
                                                                this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
                                                              }
                                                              this.changeDetectionRef.detectChanges();
                                                              this.changeDetectionRef.markForCheck();
                                                            });
    //setTimeout( () => {this.changeDetectionRef.detectChanges();  }, 5000);
    //this.changeDetectionRef.detectChanges();
  }

  private autoScrollRunning: boolean = false; // this tracks autoscroller state
  private autoScrollerStopped: boolean = false; //this is for when a user stops the autoscroller

  sortNumber(a: number, b: number): number {
      return b - a;
  }

  stopAutoScroller(): void {
    console.log("stopping scroller");
    $('.scrollContainer').stop(true, false);
    this.autoScrollRunning = false;
  }

  autoScroller(): void {
    if (this.autoScrollRunning) {
      $('.scrollContainer').stop(true, false);
      this.autoScrollRunning = false;
    }
    if (!this.autoScrollRunning) {
      this.autoScrollRunning = true;
      let distance = Math.abs($('.scrollContainer').scrollTop( ) - $('.scrollTarget').offset( ).top);
      //console.log("distance:", distance);
      let scroll_duration = (distance / this.pixelsPerSecond) * 1000;
      //console.log("scroll_duration:", scroll_duration);
      $('.scrollContainer').animate({ 'scrollTop':   $('.scrollTarget').offset().top }, scroll_duration, 'linear');
    }
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

  private pauseMonitoring: boolean = false;

  togglePauseMonitoring(): void {
    this.pauseMonitoring = !this.pauseMonitoring;
    if (this.pauseMonitoring) {
      this.dataService.abortGetBuildingCollection();
      this.stopAutoScroller();
    }
    else {
      this.dataService.getRollingCollection(this.collectionId);
    }
  }

  ngAfterViewInit(): void {
    window.dispatchEvent(new Event('resize'));
  }
/*
  deviceNumberUpdate(e: any): void {
    console.log("deviceNumberUpdate", e);
    //this.deviceNumber = e.deviceNumber;
    this.deviceInfo = e;
  }
*/
  openPdfViewer(e: any): void {
    //this.pdfFile = e.pdfFile;
    this.selectedSessionDetails = e;
    this.modalService.open('pdf-viewer');
  }

  private selectedSessionDetails: any;

  openSessionDetails(e: any): void {
    console.log("openSessionDetails:", e);
    this.selectedSessionDetails = e;
    this.modalService.open('sessionDetails');
  }

  maskChanged(e: any): void {
    console.log("maskChanged()", e);
    //e = { showPdf: boolean, showImage: boolean }
    //console.log("mask:", e);
    //console.log("e.showPdf", e.showPdf);
    //console.log("e.showImage", e.showImage);
    var showPdf = e.showPdf;
    var showImage = e.showImage;
    if (showPdf && showImage) {
      //this.displayedImages = this.images;
      this.shownBricks = this.imagesToBricks(this.images);
    }
    else if ( showPdf && !showImage ) {
      //console.log("got to 1");
      //this.displayedImages = this.pdfImages;
      this.shownBricks = this.imagesToBricks(this.pdfImages);
    }
    else if ( !showPdf && showImage ) {
      //console.log("got to 2");
      //this.displayedImages = this.imageImages;
      this.shownBricks = this.imagesToBricks(this.imageImages);
    }
    else if ( !showPdf && !showImage ) {
      //console.log("got to 3");
      //this.displayedImages = [];
      //this.shownBricks = this.imagesToBricks(this.images);
      this.shownBricks = [];
    }
  }

  toggleCaseSensitiveSearch(): void {
    console.log("toggleCaseSensitiveSearch()");
    this.caseSensitiveSearch = !this.caseSensitiveSearch;
    this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
  }

  getImageById(n: number): any {
    for (var x=0; x < this.images.length; x++) {
      if (this.images[x].session === n) {
        return this.images[x];
      }
    }
  }

  imagesToBricks(imgs: any): any {
    //console.log("imgs.length:", imgs.length);
    //console.log("imagesToBricks():", imgs);
    var retImgs = [];
    //console.log("imgs.length:", imgs.length);
    for (let i=0; i < imgs.length; i++) {
      //console.log("imgs[i]:",imgs[i]);
      let img = {
                  image: imgs[i].image,
                  session: imgs[i].session,
                  type: imgs[i].contentType
                };
      //console.log("img:", img);
      retImgs.push(img);
    }
    return retImgs;
  }

  searchTermsChanged(e: any): void {
    //console.log("searchTermsChanged:", e);
    var searchTerms = e.searchTerms;
    this.lastSearchTerm = searchTerms;
    console.log("searchTerms update:", searchTerms);
    var matchedSessions = [];
    var matchedSessionIds = [];
    if (searchTerms === '') {
      //console.log("got to 1");
      //console.log("matched!");
      this.showOnlyImages = [];
      //this.displayedImages = this.images;
      //console.log("images:", this.images);
      //console.log("images.length:", this.images.length);
      this.shownBricks = this.imagesToBricks(this.images);
      //console.log("searchTermsChanged(): shownBricks:", this.shownBricks)
      return;
    }
    if (this.search.length > 0) {
      for (var i=0; i < this.search.length; i++) {
        //all searches are case-insensitive for now
        if (!this.caseSensitiveSearch && this.search[i].searchString.toLowerCase().indexOf(searchTerms.toLowerCase()) >= 0) {
          //console.log("case insensitive");
          var sessionId = this.search[i].session;
          //console.log("matched session", sessionId);
          matchedSessions.push(this.search[i]);
          matchedSessionIds.push(sessionId);
        }
        else if (this.caseSensitiveSearch && this.search[i].searchString.indexOf(searchTerms) >= 0) {
          //console.log("case sensitive");
          var sessionId = this.search[i].session;
          //console.log("matched session", sessionId);
          matchedSessions.push(this.search[i]);
          matchedSessionIds.push(sessionId);
        }
      }
    }
    if ( matchedSessions.length != 0 ) {
      //console.log("matchedSessions:", matchedSessions);
      //console.log("matchedSessionIds:", matchedSessionIds);
      this.showOnlyImages = matchedSessions;
      //this.displayedImages = [];
      this.shownBricks = [];
      for (var x=0; x < matchedSessionIds.length; x++) {
        //this.displayedImages.push(this.getImageById(matchedSessionIds[x]));
        let img = this.getImageById(matchedSessionIds[x]);
        //console.log("img:", img)
        let brick = this.imagesToBricks( [img] )
        this.shownBricks.push( brick[0] );
      }
      //console.log("got to 2");
      //console.log("searchTermsChanged(): shownBricks:", this.shownBricks);
    }
    else {
      //console.log("no matches");
      this.showOnlyImages = [ 'none' ];
      //this.displayedImages = [];
      this.shownBricks = [];
      //this.showOnlyImages.push('none');
    }
  }

}
