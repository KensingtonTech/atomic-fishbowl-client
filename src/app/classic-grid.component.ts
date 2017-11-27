import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ToolService } from './tool.service';
import { PanZoomConfig } from './panzoom/panzoom-config';
import { PanZoomModel } from './panzoom/panzoom-model';
import { PanZoomAPI } from './panzoom/panzoom-api';
import { DataService } from './data.service';
import { Content } from './content';
import { ModalService } from './modal/modal.service';
import { ContentCount } from './contentcount';
import { ContentMask } from './contentmask';
import { Search } from './search';
import { Subscription } from 'rxjs/Subscription';
import * as utils from './utils';
import { Element } from '@angular/compiler';
import * as log from 'loglevel';

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'classic-grid-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div (window:resize)="onWindowResize()" style="position:absolute; left: 0; right: 0; bottom: 0; top: 30px;">
  <panzoom id="abc" addStyle="width: 100%; height: 100%; background-color: black;" [config]="panzoomConfig">
    <div class="bg noselect items" style="position: relative;" [style.width.px]="canvasWidth" *ngIf="content && sessionsDefined && displayedContent && !destroyView">
      <classic-tile *ngFor="let item of displayedContent" [highResSessions]="highResSessions" (openPDFViewer)="openPdfViewer()" [content]="item" [apiServerUrl]="apiServerUrl" [session]="sessions[item.session]" [sessionId]="item.session" [attr.sessionid]="item.session"></classic-tile>
    </div>
  </panzoom>
  <classic-control-bar *ngIf="panzoomConfig" [panzoomConfig]="panzoomConfig" [initialZoomWidth]="initialZoomWidth" [initialZoomHeight]="initialZoomHeight" ></classic-control-bar>
  <div *ngIf="selectedCollectionType == 'monitoring'" style="position: absolute; left: 210px; top: 10px; color: white; z-index: 100;">
    <i *ngIf="!pauseMonitoring" class="fa fa-pause-circle-o fa-4x" (click)="suspendMonitoring()"></i>
    <i *ngIf="pauseMonitoring" class="fa fa-play-circle-o fa-4x" (click)="resumeMonitoring()"></i>
  </div>
  <pdf-viewer-modal [apiServerUrl]="apiServerUrl" id="pdf-viewer"></pdf-viewer-modal>
  <classic-session-popup [enabled]="sessionWidgetEnabled" [sessionId]="hoveredContentSession" #sessionWidget></classic-session-popup>
</div>
`,
  styles: [`

  classic-tile {
    display: inline-block;
  }

  `]
})

export class ClassicGridComponent implements OnInit, OnDestroy {

  constructor(  private dataService: DataService,
                private renderer: Renderer2,
                private elRef: ElementRef,
                private modalService: ModalService,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService ) {} // (<any>$).expr.cacheLength = 1;

  public panzoomConfig = new PanZoomConfig;
  public content: Content[] = [];
  private contentCount = new ContentCount;
  public sessionWidgetEnabled = false;
  public hoveredContentSession: number;
  public highResSessions: number[] = [];
  public apiServerUrl: string = '//' + window.location.hostname;
  private deviceNumber: number;
  private panzoomModel: PanZoomModel;
  private panZoomAPI: PanZoomAPI;
  private search: Search[] = [];
  public canvasWidth = 2400;
  // public canvasWidth = window.innerWidth;
  public initialZoomHeight = 1080;
  // public initialZoomHeight = window.innerHeight;
  public initialZoomWidth = this.canvasWidth;
  public displayedContent: Content[] = [];

  public sessions: any;
  private pdfFile: string;
  private imagesHidden = false;
  private pdfsHidden = false;
  private officeHidden = false;
  private caseSensitiveSearch = false;
  private showOnlyImages: any = [];
  private lastSearchTerm = '';
  public selectedCollectionType: string;
  private collectionId: string;
  public sessionsDefined = false;
  public destroyView = true;
  private dodgyArchivesIncludedTypes: any = [ 'encryptedRarEntry', 'encryptedZipEntry', 'unsupportedZipEntry', 'encryptedRarTable' ];
  private lastMask = new ContentMask;
  private searchBarOpen = false;
  private pauseMonitoring = false;
  private transitionZoomLevel = 3.9;

  // Subscription holders
  private searchBarOpenSubscription: Subscription;
  private caseSensitiveSearchChangedSubscription: Subscription;
  private searchTermsChangedSubscription: Subscription;
  private maskChangedSubscription: Subscription;
  private noCollectionsSubscription: Subscription;
  private selectedCollectionChangedSubscription: Subscription;
  private collectionStateChangedSubscription: Subscription;
  private sessionsReplacedSubscription: Subscription;
  private sessionPublishedSubscription: Subscription;
  private contentReplacedSubscription: Subscription;
  private contentPublishedSubscription: Subscription;
  private searchChangedSubscription: Subscription;
  private searchPublishedSubscription: Subscription;
  private sessionsPurgedSubscription: Subscription;
  private modelChangedSubscription: Subscription;
  private newApiSubscription: Subscription;
  private previousFocusedElement: Node;


  ngOnDestroy(): void {
    log.debug('ClassicGridComponent: ngOnDestroy()');
    this.searchBarOpenSubscription.unsubscribe();
    this.caseSensitiveSearchChangedSubscription.unsubscribe();
    this.searchTermsChangedSubscription.unsubscribe();
    this.maskChangedSubscription.unsubscribe();
    this.noCollectionsSubscription.unsubscribe();
    this.selectedCollectionChangedSubscription.unsubscribe();
    this.collectionStateChangedSubscription.unsubscribe();
    this.sessionsReplacedSubscription.unsubscribe();
    this.sessionPublishedSubscription.unsubscribe();
    this.contentReplacedSubscription.unsubscribe();
    this.contentPublishedSubscription.unsubscribe();
    this.searchChangedSubscription.unsubscribe();
    this.searchPublishedSubscription.unsubscribe();
    this.sessionsPurgedSubscription.unsubscribe();
    this.modelChangedSubscription.unsubscribe();
    this.newApiSubscription.unsubscribe();
  }


  ngOnInit(): void {
    log.debug('ClassicGridComponent: ngOnInit()');

    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'black');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'overflow', 'hidden');
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'margin', '0');


    this.panzoomConfig.invertMouseWheel = true;
    this.panzoomConfig.useHardwareAcceleration = true;
    this.panzoomConfig.chromeUseTransform = true;
    this.panzoomConfig.zoomLevels = 10;
    this.panzoomConfig.scalePerZoomLevel = 2.0;
    this.panzoomConfig.zoomStepDuration = 0.2;
    this.panzoomConfig.initialZoomToFit = { x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight };
    this.panzoomConfig.freeMouseWheel = true;
    this.panzoomConfig.freeMouseWheelFactor = 0.01;

    this.modelChangedSubscription = this.panzoomConfig.modelChanged.subscribe( (model: PanZoomModel) => {
      this.panzoomModel = model;
      this.sessionWidgetDecider();
    });
    this.newApiSubscription = this.panzoomConfig.newApi.subscribe( (api: PanZoomAPI) => {
      log.debug('ClassicGridComponent: newApiSubscription: Got new API');
      this.panZoomAPI = api;
    });


    // Take subscriptions

    this.searchBarOpenSubscription = this.toolService.searchBarOpen.subscribe( (state: boolean) => {
      this.searchBarOpen = state;
    });

    this.caseSensitiveSearchChangedSubscription = this.toolService.caseSensitiveSearchChanged.subscribe( () => this.toggleCaseSensitiveSearch() );

    this.searchTermsChangedSubscription = this.toolService.searchTermsChanged.subscribe( (event: any) => this.searchTermsChanged(event) );

    this.maskChangedSubscription = this.toolService.maskChanged.subscribe( (event: any) => this.maskChanged(event) );

    this.noCollectionsSubscription = this.toolService.noCollections.subscribe( () => {
      log.debug('ClassicGridComponent: noCollectionsSubscription');
      this.destroyView = true;
      this.sessionsDefined = false;
      this.resetContent();
      this.resetContentCount();
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (collection: any) => { // this triggers whenever we choose a new collection
      log.debug('ClassicGridComponent: selectedCollectionChangedSubscription: selectedCollectionChanged:', collection);
      this.destroyView = true;
      this.sessionsDefined = false;
      this.resetContent();
      this.resetContentCount();
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
      this.selectedCollectionType = collection.type;
      this.collectionId = collection.id;
      /*if (this.selectedCollectionType === 'monitoring' || this.selectedCollectionType === 'rolling') { // not needed in classic view
        this.loadAllBeforeLayout = false;
      }
      else {
        this.loadAllBeforeLayout = true;
      }*/
    });

    this.collectionStateChangedSubscription = this.dataService.collectionStateChanged.subscribe( (collection: any) => { // this triggers when a monitoring collection refreshes
      log.debug('ClassicGridComponent: collectionStateChangedSubscription: collectionStateChanged:', collection.state);
      if (collection.state === 'monitoring')  {
        this.destroyView = true;
        this.changeDetectionRef.detectChanges();
        this.changeDetectionRef.markForCheck();
        this.resetContent();
        this.sessionsDefined = false;
        this.resetContentCount();
        this.toolService.changingCollections.next(false);
        this.destroyView = false;
        this.changeDetectionRef.detectChanges();
        this.changeDetectionRef.markForCheck();
      }
    });

    this.sessionsReplacedSubscription = this.dataService.sessionsReplaced.subscribe( (s: any) => {
      log.debug('ClassicGridComponent: sessionsReplacedSubscription: sessionsReplaced:', s); // when an a whole new collection is selected
      this.sessionsDefined = true;
      this.sessions = s;
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.sessionPublishedSubscription = this.dataService.sessionPublished.subscribe( (s: any) => {
      log.debug('ClassicGridComponent: sessionPublishedSubscription: sessionPublished', s); // when an individual session is pushed from a building collection (or monitoring or rolling)
      let sessionId = s.id;
      this.sessionsDefined = true;
      this.sessions[sessionId] = s;
    });

    this.contentReplacedSubscription = this.dataService.contentReplaced.subscribe( (i: any) => {
      log.debug('ClassicGridComponent: contentReplacedSubscription: contentReplaced:', i); // when a new collection is selected
      this.destroyView = true;
      this.content = i;
      this.displayedContent = i.sort(this.sortContent);
      this.search = [];
      this.countContent();
      this.destroyView = false;
// !!! not sure if we need this first set of detectors here - test it later !!!
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
      this.sessionWidgetDecider();
      this.panZoomAPI.zoomToFit( {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight });
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });


    this.contentPublishedSubscription = this.dataService.contentPublished.subscribe( (newContent: any) =>  { // when content is pushed from a still-building rolling, or monitoring collection
      log.debug('ClassicGridComponent: contentPublishedSubscription: contentPublished:', newContent);

      // update content counts here to save cycles not calculating image masks
      for (let i = 0; i < newContent.length; i++) {
        this.content.push(newContent[i]);
        if (newContent[i].contentType === 'image' ) {
          this.contentCount.images++;
        }
        else if (newContent[i].contentType === 'pdf' ) {
          this.contentCount.pdfs++;
        }
        else if (newContent[i].contentType === 'office' ) {
          this.contentCount.officeDocs++;
        }
        else if (newContent[i].contentType === 'hash' ) {
          this.contentCount.hashes++;
        }
        else if ( this.dodgyArchivesIncludedTypes.includes(newContent[i].contentType) ) {
            this.contentCount.dodgyArchives++;
        }
      }
      this.contentCount.total = this.content.length;
      this.toolService.contentCount.next( this.contentCount );

      // if (this.searchBarOpen) { this.searchTermsChanged( { searchTerms: this.lastSearchTerm } ); }
      this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
      this.sessionWidgetDecider();
    });

    this.searchChangedSubscription = this.dataService.searchChanged.subscribe( (s: Search[]) =>  { // this receives complete search term data from complete collection
      this.search = s;
      log.debug('ClassicGridComponent: searchChangedSubscription: searchChanged:', this.search);
      // this.changeDetectionRef.detectChanges();
      // this.changeDetectionRef.markForCheck();
    });


    this.searchPublishedSubscription = this.dataService.searchPublished.subscribe( (s: Search[]) => { // this receives a partial search term data from a building collection
      log.debug('ClassicGridComponent: searchPublishedSubscription: searchPublished:', s);
      for (let i = 0; i < s.length; i++) {
        this.search.push(s[i]);
      }
      // log.debug("ClassicGridComponent: searchPublishedSubscription: this.search:", this.search);
      // this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
    });

    this.sessionsPurgedSubscription = this.dataService.sessionsPurged.subscribe( (sessionsToPurge: number[]) =>  {
      log.debug('ClassicGridComponent: sessionsPurgedSubscription: sessionsPurged:', sessionsToPurge);

      let searchRemoved = this.purgeSessions(sessionsToPurge);

// !!! this displayedContent line should be revisited so that it takes in to account last mask and search!!!
      // this.displayedContent = this.content.sort(this.sortContent);
// !!!

      this.maskChanged(this.lastMask);
      this.countContent();
      if (searchRemoved > 0 && this.searchBarOpen) {
        this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
      }
      // this.changeDetectionRef.detectChanges();
      // this.changeDetectionRef.markForCheck();
    });

  }


  public onWindowResize(): void {
    log.debug('ClassicGridComponent: onWindowResize()');
    // this.initialZoomWidth = window.innerWidth;
    // this.initialZoomHeight = window.innerHeight;
  }


  private sortNumber(a: number, b: number): number {
      return b - a;
  }


  private sortContent(a: any, b: any): number {
   if (a.session < b.session) {
    return -1;
   }
   if (a.session > b.session) {
    return 1;
   }
   return 0;
  }


  private openPdfViewer(e: any): void {
    log.debug('ClassicGridComponent: openPdfViewer()');
    /*
    if (this.selectedCollectionType === 'monitoring' && this.pauseMonitoring === false) {
      // pause monitoring
      this.suspendMonitoring();
    }
    */
    this.modalService.open('pdf-viewer');
  }


  private maskChanged(e: ContentMask): void {
    this.lastMask = e;
    log.debug('MasonryGridComponent: maskChanged():', e);

    if (e.showImage && e.showPdf && e.showOffice && e.showHash && e.showDodgy) {
      // this.displayedContent = this.content.sort(this.sortContent);
      this.displayedContent = this.content;
      return;
    }

    let tempDisplayedContent: Content[] = [];

    if (e.showImage) {
      // tempFilter.push('[contentType="image"]');
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('image'));
    }
    if (e.showPdf) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('pdf'));
    }
    if (e.showOffice) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('office'));
    }
    if (e.showHash) {
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('hash'));
    }
    if (e.showDodgy) {
      // tempFilter.push('[contentType="unsupportedZipEntry"],[contentType="encryptedZipEntry"],[contentType="encryptedRarEntry"],[contentType="encryptedRarTable"]');
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('unsupportedZipEntry'));
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('encryptedZipEntry'));
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('encryptedRarEntry'));
      tempDisplayedContent = tempDisplayedContent.concat(this.getContentByType('encryptedRarTable'));
    }
    if (tempDisplayedContent.length > 0) {
      // this.displayedContent = tempDisplayedContent.sort(this.sortContent);
      this.displayedContent = tempDisplayedContent;
    }
    else {
      this.displayedContent = [];
    }
  }


  private sessionWidgetDecider(): void {
    // log.debug('ClassicGridComponent: sessionWidgetDecider():', this.panzoomModel.zoomLevel);
    if (!(this.panzoomModel)) {
      return;
    }

    // log.debug(this.panzoomModel.zoomLevel);

    if (this.panzoomModel.zoomLevel < this.transitionZoomLevel) {
      this.hideSessionWidget();
      return;
    }

    let center: Point = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };

    let focusedElement = document.elementFromPoint(center.x, center.y);

    if (!focusedElement.classList.contains('thumbnail')) {
      this.hideSessionWidget();
      return;
    }

    if ( !this.previousFocusedElement ||
      ( this.previousFocusedElement.isSameNode(focusedElement) && !this.sessionWidgetEnabled && focusedElement.nodeName === 'IMG' ) ||
      ( this.previousFocusedElement && !this.previousFocusedElement.isSameNode(focusedElement) && focusedElement.nodeName === 'IMG' && focusedElement.hasAttribute('contentfile') ) ) {

        let focusedTile = focusedElement.parentNode.parentNode.parentElement;

        if ( focusedTile.nodeName === 'CLASSIC-TILE' ) {

          let sessionsForHighRes = [];
          sessionsForHighRes.push(Number(focusedTile.getAttribute('sessionid')));

          let previousElementSibling = focusedTile.previousElementSibling;
          if (previousElementSibling && previousElementSibling.nodeName === 'CLASSIC-TILE' ) {
            sessionsForHighRes.push(Number(previousElementSibling.getAttribute('sessionid')));
          }

          let nextElementSibling = focusedTile.nextElementSibling;
          if (nextElementSibling && nextElementSibling.nodeName === 'CLASSIC-TILE' ) {
            sessionsForHighRes.push(Number(nextElementSibling.getAttribute('sessionid')));
          }

          this.showSessionWidget( sessionsForHighRes[0], sessionsForHighRes );
        }
        /*else {
          log.debug('Didn\'t match!');
          log.debug(`contains('thumbnail'): ${focusedElement.classList.contains('thumbnail')}`);
          log.debug(`focusedElement:`, focusedElement);
          log.debug(`transitionZoomLevel: ${this.transitionZoomLevel}   zoomLevel: ${this.panzoomModel.zoomLevel}`);
        }*/
      }
    /*else if (this.previousFocusedElement.isSameNode(focusedElement)) {
      log.debug('sessionWidgetDecider(): Is Same Node!');
      log.debug('sessionWidgetDecider(): Is Same Node: focusedElement:', focusedElement);
      log.debug('sessionWidgetDecider(): Is Same Node: previousFocusedElement:', this.previousFocusedElement);
    }
    else {
      log.debug('sessionWidgetDecider(): Not matched!: focusedElement:', focusedElement);
      log.debug('sessionWidgetDecider(): Not matched!: previousFocusedElement:', this.previousFocusedElement);
    }*/
    this.previousFocusedElement = focusedElement;

  }


  private showSessionWidget(i: number, sessionsForHighRes: number[] ): void {
    // log.debug("ClassicGridComponent: showSessionWidget()", i);
    // if (!this.sessionWidgetEnabled) {
      this.hoveredContentSession = i;
      this.highResSessions = sessionsForHighRes;
      this.sessionWidgetEnabled = true;
      this.changeDetectionRef.detectChanges();
    // }
  }


  private hideSessionWidget(): void {
    // log.debug("ClassicGridComponent: hideSessionWidget()");
    // this.sessionWidgetEnabled = false;
    if (this.sessionWidgetEnabled) {
      this.sessionWidgetEnabled = false;
      this.changeDetectionRef.detectChanges();
    }
  }


  private toggleCaseSensitiveSearch(): void {
    log.debug('ClassicGridComponent: toggleCaseSensitiveSearch()');
    this.caseSensitiveSearch = !this.caseSensitiveSearch;
    this.searchTermsChanged( { searchTerms: this.lastSearchTerm } );
  }


  private getContentBySessionAndContentFile(o: any): any {
    for (let x = 0; x < this.content.length; x++) {
      if (this.content[x].session === o.session && utils.pathToFilename(this.content[x].contentFile) === o.contentFile) {
        return this.content[x];
      }
    }
  }


  private searchTermsChanged(e: any): void {
    let searchTerms = e.searchTerms;
    this.lastSearchTerm = searchTerms;
    let matchedIds = [];


    if (searchTerms === '') {
      this.maskChanged(this.lastMask);
      this.changeDetectionRef.detectChanges();
      this.changeDetectionRef.markForCheck();
      return;
    }

    if (this.search.length > 0) {
      for (let i = 0; i < this.search.length; i++) {
        if (!this.caseSensitiveSearch && this.search[i].searchString.toLowerCase().indexOf(searchTerms.toLowerCase()) >= 0) { // case-insensitive search
          // we found a match!
          let matchedId = this.search[i].id;
          matchedIds.push(matchedId);
        }
        else if (this.caseSensitiveSearch && this.search[i].searchString.indexOf(searchTerms) >= 0) { // case-sensitive search
          // we found a match!
          let matchedId = this.search[i].id;
          matchedIds.push(matchedId);
        }
      }
    }

    let tempDisplayedContent: Content[] = [];

    if (matchedIds.length === 0) {
      this.displayedContent = [];
    }
    else {
      // this.filter = matchedIds.join(',');
      for (let i = 0; i < this.content.length; i++) {
        let item = this.content[i];
        if (matchedIds.includes(item.id) ) {
          tempDisplayedContent.push(item);
        }
      }
      // this.displayedContent = tempDisplayedContent.sort(this.sortContent);
      this.displayedContent = tempDisplayedContent;
    }

    this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
  }



  private resetContentCount(): void {
    this.contentCount = new ContentCount;
    this.toolService.contentCount.next( this.contentCount );
  }


  private countContent(): void {
    this.contentCount = new ContentCount;

    for (let i = 0; i < this.content.length; i++) {
      if (this.content[i].contentType === 'image') {
        this.contentCount.images++;
      }
      if (this.content[i].contentType === 'hash') {
        this.contentCount.hashes++;
      }
      if (this.content[i].contentType === 'pdf') {
        this.contentCount.pdfs++;
      }
      if (this.content[i].contentType === 'office') {
        this.contentCount.officeDocs++;
      }
      if (this.dodgyArchivesIncludedTypes.includes(this.content[i].contentType)) {
        this.contentCount.dodgyArchives++;
      }
    }
    this.contentCount.total = this.content.length;
    this.toolService.contentCount.next( this.contentCount );
  }


  private resetContent(): void {
    this.displayedContent = [];
    this.search = [];
    this.sessions = {};
    this.content = [];
  }


  private getContentByType(type: string): Content[] {
    let temp: Content[] = [];
    for (let i = 0; i < this.content.length; i++) {
      let item = this.content[i];
      if (item.contentType === type) {
        temp.push(item);
      }
    }
    return temp;
  }


  private purgeSessions(sessionsToPurge: number[]): number {
    let searchRemoved = 0;
    while (sessionsToPurge.length !== 0) {
      let sessionToPurge = sessionsToPurge.shift();

      let contentsToPurge = [];
      for (let i = 0; i < this.content.length; i++) {
        // Purge content
        let content = this.content[i];
        if (content.session === sessionToPurge) {
          contentsToPurge.push(content);
        }
      }
      while (contentsToPurge.length !== 0) {
        let contentToPurge = contentsToPurge.shift();
        for (let i = 0; i < this.content.length; i++) {
          let content = this.content[i];
          if (contentToPurge.session === content.session && contentToPurge.contentFile === content.contentFile && contentToPurge.contentType === content.contentType) {
            // Purge content
            log.debug('MasonryGridComponent: purgeSessions(): purging content', content.session);
            this.content.splice(i, 1);
            break;
          }
        }
      }

      let searchesToPurge: Search[] = [];
      for (let i = 0; i < this.search.length; i++) {
        let search = this.search[i];
        if (search.session === sessionToPurge) {
          searchesToPurge.push(search);
        }
      }
      while (searchesToPurge.length !== 0) {
        let searchToPurge = searchesToPurge.shift();
        for (let i = 0; i < this.search.length; i++) {
          let search = this.search[i];
          if (searchToPurge.session === search.session && searchToPurge.contentFile === search.contentFile) {
            // Purge search
            log.debug('MasonryGridComponent: purgeSessions(): purging search', search.session);
            this.search.splice(i, 1);
            break;
          }
        }
      }

    }
    return searchRemoved;
  }


  private suspendMonitoring(): void {
    this.pauseMonitoring = true;
    // this.dataService.abortGetBuildingCollection();
    this.dataService.pauseMonitoringCollection(this.collectionId);
  }


  private resumeMonitoring(): void {
    this.pauseMonitoring = false;

    // We must now check whether our collection has disconnected, and if not - call unpauseMonitoringCollection.  If so, call getRollingCollection
    if (this.dataService.httpJsonStreamServiceConnected) {
      // We're still connected
      this.dataService.unpauseMonitoringCollection(this.collectionId);
      log.debug('ClassicGridComponent: resumeMonitoring(): this.collectionId:', this.collectionId);
    }
    else {
      // We're disconnected
      this.dataService.getRollingCollection(this.collectionId);
    }
  }

}
