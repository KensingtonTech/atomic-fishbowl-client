import { Component, Output, OnInit, OnChanges, AfterViewInit, OnDestroy, ElementRef, ViewChild, ViewChildren, ContentChild, Input, Renderer, ViewContainerRef, QueryList, ViewEncapsulation } from '@angular/core';
import { ToolService } from './tool.service';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { DataService } from './data.service';
import { Collection } from './collection';
import { NwServer } from './nwserver';
import { HostListener } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { AuthenticationService } from './authentication.service';
declare var log: any;
import 'rxjs/add/operator/takeWhile';
import { ContentCount } from './contentcount';
import { ContentMask } from './contentmask';

@Component( {
  selector: 'toolbar-widget',
  encapsulation: ViewEncapsulation.None,
  template: `
<div style="position: relative; top: 0; width: 100%; height: 20px; background-color: rgba(146,151,160,.85); padding: 5px; color: white; font-size: 12px;">
  <div *ngIf="showCollections">
    <div style="position: absolute; top: 7px; width: 100%">
      <span class="noselect">
        <span class="label">Collection:&nbsp;
        <select style="width: 200px;" [(ngModel)]="selectedCollection" (ngModelChange)="collectionSelected($event)">
          <option *ngFor="let collection of collections | mapValues" [ngValue]="collection.id">{{collection.name}}</option>
        </select></span>
        <span #spinnerIcon class="fa fa-refresh fa-spin fa-lg fa-fw" style="display: none;"></span>
        <span #errorIcon class="fa fa-exclamation-triangle fa-lg fa-fw" style="color: yellow; display: none;"></span>
        <span #stopIcon class="fa fa-ban fa-lg fa-fw" style="color: black; display: none;"></span>
        <span (click)="addCollectionClick()" class="fa fa-plus fa-lg fa-fw"></span>
        <span (click)="deleteCollectionClick()" class="fa fa-minus fa-lg fa-fw"></span>
        <span class="collectionTooltip" *ngIf="refreshed && selectedCollection && collections" #infoIcon [pTooltip]="buildTooltip()" tooltipPosition="bottom" tooltipStyleClass="collectionTooltip" escape="true" class="fa fa-info-circle fa-lg fa-fw"></span>
      </span>
      <span *ngIf="refreshed && collections[selectedCollection].type == 'fixed'">
        <span class="label">Fixed Collection</span>&nbsp;&nbsp;
        <span class="label">Time1:</span> <span class="value">{{collections[selectedCollection].timeBegin | formatTime}}</span>
        <span class="label">Time2:</span> <span class="value">{{collections[selectedCollection].timeEnd | formatTime}}</span>
        <span class="label">Images:</span> <span class="value">{{contentCount?.images}}</span>
        <span class="label">PDFs:</span> <span class="value">{{contentCount?.pdfs}}</span>
        <span class="label">Hash Matches:</span> <span class="value">{{contentCount?.hashes}}</span>
        <span class="label">Dodgy Archives:</span> <span class="value">{{contentCount?.dodgyArchives}}</span>
        <span class="label">Total:</span> <span class="value">{{contentCount?.total}}</span>
      </span>
      <span *ngIf="refreshed && collections[selectedCollection].type == 'rolling'">
        <span class="label">Rolling Collection</span>&nbsp;&nbsp;
        <span class="label">Last {{collections[selectedCollection].lastHours}} Hours</span>&nbsp;&nbsp;
        <span class="label">Images:</span> <span class="value">{{contentCount?.images}}</span>
        <span class="label">PDFs:</span> <span class="value">{{contentCount?.pdfs}}</span>
        <span class="label">Hash Matches:</span> <span class="value">{{contentCount?.hashes}}</span>
        <span class="label">Dodgy Archives:</span> <span class="value">{{contentCount?.dodgyArchives}}</span>
        <span class="label">Total:</span> <span class="value">{{contentCount?.total}}</span>
      </span>
      <span *ngIf="refreshed && collections[selectedCollection].type == 'monitoring'">
        <span class="label">Monitoring Collection</span>&nbsp;&nbsp;
        <span class="label">Images:</span> <span class="value">{{contentCount?.images}}</span>
        <span class="label">PDFs:</span> <span class="value">{{contentCount?.pdfs}}</span>
        <span class="label">Hash Matches:</span> <span class="value">{{contentCount?.hashes}}</span>
        <span class="label">Dodgy Archives:</span> <span class="value">{{contentCount?.dodgyArchives}}</span>
        <span class="label">Total:</span> <span class="value">{{contentCount?.total}}</span>
      </span>
    </div>
    <div class="noselect" style="position: absolute; right: 160px; top: 2px;">
      <span *ngIf="contentCount.images != 0" [class.fa-deselect]="!showImages" [class.hide]="showSearch" (click)="imageMaskClick()" class="fa fa-file-image-o fa-2x" pTooltip="Mask for image content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>
      <span *ngIf="contentCount.pdfs != 0" [class.fa-deselect]="!showPdfs" [class.hide]="showSearch" (click)="pdfMaskClick()" class="fa fa-file-pdf-o fa-2x" pTooltip="Mask for PDF content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>
      <span *ngIf="contentCount.dodgyArchives != 0" [class.fa-deselect]="!showDodgyArchives" [class.hide]="showSearch" (click)="dodgyMaskClick()" class="fa fa-file-archive-o fa-2x" pTooltip="Mask for dodgy archive content" escape="false" showdelay="750" tooltipPosition="bottom">&nbsp;</span>
      <span *ngIf="contentCount.hashes != 0" [class.fa-deselect]="!showHashes" [class.hide]="showSearch" (click)="hashMaskClick()" class="fa fa-hashtag fa-2x" pTooltip="Mask for matched hash content" escape="false" showDelay="750" tooltipPosition="bottom">&nbsp;</span>
      <span *ngIf="contentCount.pdfs != 0" class="fa fa-search fa-2x" (click)="toggleSearch()"></span>
    </div>
  </div>
  <div (click)="addCollectionClick()" style="position: absolute; top: 7px; left: 10px;" *ngIf="showCreateFirstCollection" class="noselect">
    <u>Create your first collection</u>
  </div>
  <div class="noselect" style="position: absolute; right: 10px; top: 2px;">
    <span (click)="preferencesButtonClick()" class="fa fa-cog fa-2x" pTooltip="Global preferences" escape="false" showDelay="750" tooltipPosition="bottom"></span>&nbsp;
    <span (click)="accountsButtonClick()" class="fa fa-users fa-2x" pTooltip="Manage users" escape="false" showDelay="750" tooltipPosition="bottom"></span>&nbsp;
    <span (click)="helpButtonClick()" class="fa fa-question fa-2x" pTooltip="About 221B" escape="false" showDelay="750" tooltipPosition="bottom"></span>&nbsp;
    <span (click)="logoutButtonClick()" class="fa fa-sign-out fa-2x" pTooltip="Logout" escape="false" showDelay="750" tooltipPosition="left"></span>
  </div>
</div>
<div class="noselect" (keydown.escape)="toggleSearch()" *ngIf="showSearch" style="position: absolute; right: 60px; top: 30px; padding: 5px; background-color: rgba(146,151,160,.85); width: 315px; z-index: 100;">
  <input #searchBox type="text" name="searchTerms" [(ngModel)]="searchTerms" (ngModelChange)="searchTermsUpdate()" style="width: 85%;">
  <span [class.fa-deselect]="caseSensitive" class="fa fa-text-height" (click)="toggleCaseSensitivity()" style="color: white;"></span>
  <span class="fa fa-times" (click)="toggleSearch()" style="color: white;"></span>
</div>

<splash-screen-modal></splash-screen-modal>
<add-collection-modal (executeCollection)="collectionExecuted($event)" [id]="addCollectionModalId"></add-collection-modal>
<delete-collection-confirm-modal (confirmDelete)="deleteConfirmed()" ></delete-collection-confirm-modal>
<preferences-modal></preferences-modal>
<manage-users-modal></manage-users-modal>
`,

  styles: [`
    .label {
      color: rgb(230,234,234);
      font-size: 13x;
      font-weight: bolder;
    }

    .value {
      color: white;
      font-size: 12px;
      margin-right: 10px;
    }

    .fa-deselect {
      color: black !important;
    }

    .hide {
      display: none;
    }

    .noselect {
      -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
      -khtml-user-select: none; /* Konqueror HTML */
      -moz-user-select: none; /* Firefox */
      -ms-user-select: none; /* Internet Explorer/Edge */
      user-select: none; /* Non-prefixed version, currently supported by Chrome and Opera */
    }


    /*.ui-tooltip {
      width: 375px;
      word-wrap: normal;
    }*/

    .collectionTooltip.ui-tooltip .ui-tooltip-text {
      white-space: pre-line;
      width: 375px;
    }

  `]
} )

export class ToolbarWidgetComponent implements OnInit, OnDestroy, AfterViewInit {

  constructor (private dataService: DataService,
               private modalService: ModalService,
               private renderer: Renderer,
               private toolService: ToolService,
               private authService: AuthenticationService ) {}

  @ViewChild('spinnerIcon') spinnerIconRef: ElementRef;
  @ViewChild('errorIcon') errorIconRef: ElementRef;
  @ViewChildren('searchBox') searchBoxRef: QueryList<any>;
  private collections: any;
  private selectedCollection: string;
  public addCollectionModalId = 'add-collection-modal';
  public showCreateFirstCollection = false;
  public showCollections = false;
  public showSearch = false;
  private searchTerms: string;
  private refreshed = false;
  private alive = true;
  private contentCount = new ContentCount;
  private showImages = true;
  private maskState: ContentMask = { showPdf: true, showImage: true, showHash: true, showDodgy: true };
  private showPdfs = true;
  private showHashes = true;
  private showDodgyArchives = true;
  private oldSearchTerms: string;
  private caseSensitive = false;

  ngOnInit(): void {
    // take subscriptions
    this.toolService.contentCount.takeWhile(() => this.alive).subscribe( (c: any) => this.contentCount = c );
    this.toolService.getCollectionDataAgain.takeWhile(() => this.alive).subscribe( () => this.getCollectionDataAgain() );
    this.dataService.selectedCollectionChanged.takeWhile(() => this.alive).subscribe( (e: any) => this.selectedCollection = e.id );
    this.dataService.collectionsChanged.takeWhile(() => this.alive).subscribe( (c: string) => {
                                                                    this.collections = c;
                                                                    log.debug('ToolbarWidgetComponent: collectionsChangedSubscription: collections update', this.collections);
                                                                    // log.debug('selectedCollection:', this.selectedCollection);
                                                                  });
    this.dataService.collectionStateChanged.takeWhile(() => this.alive).subscribe( (collection: any) => {
                                                                              // log.debug("collection", collection);
                                                                              this.iconDecider(collection.state);
                                                                              this.collections[collection.id].state = collection.state;
                                                                            });

    this.dataService.refreshCollections()
                    .then( () => {
                      this.refreshed = true;
                      if (Object.keys(this.collections).length !== 0 ) { // we only select a collection if there are collections
                        this.selectedCollection = this.getFirstCollection();
                        this.collectionSelected(this.selectedCollection);
                        this.toolService.deviceNumber.next( { deviceNumber: this.collections[this.selectedCollection].deviceNumber, nwserver:  this.collections[this.selectedCollection].nwserver } );
                        this.showCollections = true;
                      }
                      else {
                        this.showCreateFirstCollection = true;
                      }
                    });
  }

  public ngOnDestroy() {
    this.alive = false;
  }

  ngAfterViewInit(): void {
    setTimeout( () => this.modalService.open('splashScreenModal'), 250);
  }

  buildTooltip(): string {
    // log.debug("selectedCollection:",this.selectedCollection);
    // log.debug("collection:", this.collections[this.selectedCollection]);
    // pTooltip="Query: {{collections[selectedCollection].query}}\nService: {{collections[selectedCollection].nwserverName}}\nImage Limit: {{collections[selectedCollection].imageLimit}}\nMin Dimensions: {{collections[selectedCollection].minX}} x {{collections[selectedCollection].minY}}\nMD5 Hashing: {{collections[selectedCollection].md5Enabled}}\nDistillation Enabled: {{collections[selectedCollection].distillationEnabled}}\nDistillation Terms: {{collections[selectedCollection].distillationTerms}}"
    let tt = 'Query: ' + this.collections[this.selectedCollection].query;
    tt = tt + '\nService: ' + this.collections[this.selectedCollection].nwserverName;
    tt = tt + '\nImage Limit: ' + this.collections[this.selectedCollection].imageLimit;
    tt = tt + '\nMin Dimensions: ' + this.collections[this.selectedCollection].minX + ' x ' + this.collections[this.selectedCollection].minY;
    if (this.collections[this.selectedCollection].sha1Enabled) { tt = tt + '\nSHA1 Hashing is Enabled'; }
    if (this.collections[this.selectedCollection].sha256Enabled) { tt = tt + '\nSHA256 Hashing is Enabled'; }
    if (this.collections[this.selectedCollection].md5Enabled) { tt = tt + '\nMD5 Hashing is Enabled'; }
    if (this.collections[this.selectedCollection].distillationEnabled) { tt = tt + '\nDistillation is Enabled'; }
    if (this.collections[this.selectedCollection].distillationEnabled && this.collections[this.selectedCollection].distillationTerms) {
      tt = tt + '\nDistillation Terms:';
      for (let x = 0; x < this.collections[this.selectedCollection].distillationTerms.length; x++) {
        tt = tt + '\n  ' + this.collections[this.selectedCollection].distillationTerms[x];
      }
    }
    if (this.collections[this.selectedCollection].regexDistillationEnabled) { tt = tt + '\nRegEx Distillation is Enabled'; }
    if (this.collections[this.selectedCollection].regexDistillationEnabled && this.collections[this.selectedCollection].regexDistillationTerms) {
      tt = tt + '\nRegex Distillation Terms:';
      for (let x = 0; x < this.collections[this.selectedCollection].regexDistillationTerms.length; x++) {
        tt = tt + '\n  ' + this.collections[this.selectedCollection].regexDistillationTerms[x];
      }
    }
    // log.debug('tt:',tt);
    return tt;
  }

  imageMaskClick(): void {
    this.showImages = !this.showImages;
    this.maskState.showImage = !this.maskState.showImage;
    this.toolService.maskChanged.next(this.maskState);
  }

  pdfMaskClick(): void {
    this.showPdfs = !this.showPdfs;
    this.maskState.showPdf = !this.maskState.showPdf;
    this.toolService.maskChanged.next(this.maskState);
  }

  hashMaskClick(): void {
    this.showHashes = !this.showHashes;
    this.maskState.showHash = !this.maskState.showHash;
    this.toolService.maskChanged.next(this.maskState);
  }

  dodgyMaskClick(): void {
    this.showDodgyArchives = !this.showDodgyArchives;
    this.maskState.showDodgy = !this.maskState.showDodgy;
    this.toolService.maskChanged.next(this.maskState);
  }

  iconDecider(state: string): void {
    // log.debug("iconDecider():",state);
    if (state === 'building' || state === 'rolling' || state === 'refreshing') {
      this.showSpinnerIcon();
      this.hideErrorIcon();
    }
    else if (state === 'error') {
      this.hideSpinnerIcon();
      this.showErrorIcon();
    }
    else if (state === 'complete' || state === 'resting') {
      this.hideSpinnerIcon();
      this.hideErrorIcon();
    }
  }

  getFirstCollection(): any { // a bit of a hack since dicts aren't really ordered
    // log.debug("getFirstCollection()");
    for (let c in this.collections) {
      // log.debug(c);
      return c;
    }
  }

  addCollectionClick(): void {
    // log.debug("addCollectionClick()");
    this.modalService.open(this.addCollectionModalId);
  }

  preferencesButtonClick(): void {
    // log.debug("preferencesButtonClick()");
    this.modalService.open('preferences-modal');
  }

  accountsButtonClick(): void {
    // log.debug("preferencesButtonClick()");
    this.modalService.open('accounts-modal');
  }

  helpButtonClick(): void {
    // log.debug("helpButtonClick()");
    this.modalService.open('splashScreenModal');
  }


  closeModal(id: string): void {
    log.debug('ToolbarWidgetComponent: closeModal()');
    this.modalService.close(id);
  }



  deleteConfirmed(): void {
    log.debug('ToolbarWidgetComponent: deleteConfirmed(): Received deleteConfirmed event');
    this.dataService.abortGetBuildingCollection()
                    .then( () => this.dataService.deleteCollection(this.selectedCollection) )
                    .then( () => this.dataService.refreshCollections() )
                    .then( () => {
                                    this.refreshed = true;
                                    if (Object.keys(this.collections).length === 0 ) {
                                      this.showCreateFirstCollection = true;
                                      this.showCollections = false;
                                      this.toolService.noCollections.next();
                                    }
                                    else {
                                      this.showCollections = true;
                                      this.selectedCollection = this.getFirstCollection();
                                      // log.debug('ToolbarWidgetComponent: deleteConfirmed(): select collection 1');
                                      this.collectionSelected(this.selectedCollection);
                                      // this.dataService.getCollectionData(this.collections[this.selectedCollection])
                                      //                .then( () => this.iconDecider(this.collections[this.selectedCollection].state) );
                                    }
                                  });
  }

  deleteCollectionClick(): void {
    // log.debug('ToolbarWidgetComponent: deleteCollectionClick()');
    this.modalService.open('collection-confirm-delete-modal');
  }

  collectionSelected(id: any): void {
    log.debug('ToolbarWidgetComponent: collectionSelected():', this.collections[id]);
    // log.debug("collections:", this.collections);
    // log.debug(this.collections[id]);
    // log.debug("this.selectedCollection:", this.collections[this.selectedCollection]);

    this.dataService.abortGetBuildingCollection();
    if (this.showSearch) {
      this.toggleSearch();
    }

    if (this.collections[id].deviceNumber) {
      this.toolService.deviceNumber.next( { deviceNumber: this.collections[id].deviceNumber, nwserver: this.collections[id].nwserver } );
    }


    if (this.collections[id].type === 'rolling' || this.collections[id].type === 'monitoring') {
      // log.debug('select collection 2');
      this.dataService.getCollectionData(this.collections[id])
                      .then( () => this.dataService.getRollingCollection(id) );
    }
    else { // fixed collections
      // log.debug('select collection 3');
      // log.debug("this.collections[id].state",  this.collections[id].state);
      this.iconDecider(this.collections[id].state);
      if (this.collections[id].state === 'building') {
        // log.debug('select collection 4');
        this.dataService.getCollectionData(this.collections[id])
                        .then( () => this.dataService.getBuildingCollection(id) );
        return;
      }
      // log.debug('select collection 5');
      this.dataService.getCollectionData(this.collections[id]);
    }
  }

/*
  getCollectionPosition(id: string): number {
    //for(var i=0; i < this.collections.length; i++) {
    for(var i=0; i < this.dataService.collections.length; i++) {
      let col = this.dataService.collections[i];
      //log.debug("id: " + col.id);
      if (col.id === id) {
        return i;
      }
    }
  }
*/

  showSpinnerIcon(): void {
    // log.debug("showSpinnerIcon()");
    setTimeout( () => this.renderer.setElementStyle(this.spinnerIconRef.nativeElement, 'display', 'inline-block'), 25 );
  }

  hideSpinnerIcon(): void {
    // log.debug("hideSpinnerIcon()");
   setTimeout( () =>  this.renderer.setElementStyle(this.spinnerIconRef.nativeElement, 'display', 'none'), 25);
  }

  showErrorIcon(): void {
    // log.debug("showErrorIcon()");
    this.renderer.setElementStyle(this.errorIconRef.nativeElement, 'display', 'inline-block');
  }

  hideErrorIcon(): void {
    // log.debug("hideErrorIcon()");
    setTimeout( () => this.renderer.setElementStyle(this.errorIconRef.nativeElement, 'display', 'none'), 25 );
  }

  getRollingCollection(id: string): void {
    log.debug('ToolbarWidgetComponent: getRollingCollection(id)');
    this.dataService.getRollingCollection(id);
  }

  collectionExecuted(e: any): void {
    let id = e.id;
    log.debug('ToolbarWidgetComponent: collectionExecuted():', id, e);
    // this.collectionSelected(id);
    this.refreshed = false;
    this.dataService.abortGetBuildingCollection()
                    .then( () => this.dataService.refreshCollections() )
                    .then( () => {
                      if (this.collections[id].type === 'fixed') { this.dataService.buildCollection(id); }
                    })
                    .then( () => this.dataService.refreshCollections() )
                    .then( () => {
                                    this.refreshed = true;
                                    this.selectedCollection = id;
                                    this.showCreateFirstCollection = false;
                                    this.showCollections = true;
                                  })
                    .then( () => this.collectionSelected(id) );
  }

  // @HostListener('window:keydown',['$event']) onEscape(event: KeyboardEvent ) {
  onEscape(event: KeyboardEvent ) {
    // log.debug("keyup event:", event);
    if (event.key === 'Escape' && this.showSearch) {
      this.toggleSearch();
    }
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {  // search bar is closed
      this.oldSearchTerms = this.searchTerms;
      this.searchTerms = ''; // set the search terms back to nothing when closing the search bar
      this.searchTermsUpdate();
      this.toolService.maskChanged.next(this.maskState);
    }
    else { // search bar is open
      if (this.oldSearchTerms) {
        this.searchTerms = this.oldSearchTerms;
        this.searchTermsUpdate();
      }

      setTimeout( () => this.searchBoxRef.first.nativeElement.focus(), 50); // we use a setTimeout because of a weird timing issue caused by *ngIf.  Without it, .first is undefined
    }
  }

  searchTermsUpdate(): void {
    log.debug('ToolbarWidgetComponent: searchTermsUpdate()', this.searchTerms);
    this.toolService.searchTermsChanged.next( { searchTerms: this.searchTerms } );
  }

  toggleCaseSensitivity(): void {
    log.debug('ToolbarWidgetComponent: toggleCaseSensitivity()', this.caseSensitive);
    this.caseSensitive = !this.caseSensitive;
    this.toolService.caseSensitiveSearchChanged.next();
  }

  getCollectionDataAgain(): void {
    log.debug('ToolbarWidgetComponent: getCollectionDataAgain()');
    // log.debug('select collection 7');
    this.collectionSelected(this.selectedCollection);
    this.toolService.deviceNumber.next( {
                                          deviceNumber: this.collections[this.selectedCollection].deviceNumber,
                                          nwserver:  this.collections[this.selectedCollection].nwserver
                                        });
  }

  logoutButtonClick(): void {
    // log.debug("ToolbarWidgetComponent: logoutButtonClick()");
    this.authService.logout();
  }

}
