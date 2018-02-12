import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
import { ModalService } from './modal/modal.service';
import { Subscription } from 'rxjs/Subscription';
import { NwServer } from './nwserver';
import { SaServer } from './saserver';
import { Collection } from './collection';
import { Preferences } from './preferences';
import { DragulaService } from 'ng2-dragula';
import * as utils from './utils';
import * as log from 'loglevel';

@Component({
  selector: 'collections',
  templateUrl: './collections.component.html',
  styles: [`
    .table {
      display: table;
      border-collapse: separate;
      border-spacing: 2px;
    }
    .header {
      display: table-header-group;
    }
    .row {
      display: table-row;
    }
    .cell {
      display: table-cell;
      padding: 2px;
      border-bottom: 1px solid black;
    }
    .header-cell {
      display: table-cell;
      font-weight: bold;
      font-size: 14pt;
    }
    .row-group {
      display: table-row-group;
      border: 1px solid black;
    }
    .row-group > .row:nth-child(even) {background: #CCC;}
    .row-group > .row:nth-child(odd) {background: #FFF;}

    .grabbable {
      cursor: move; /* fallback if grab cursor is unsupported */
      cursor: grab;
      cursor: -moz-grab;
      cursor: -webkit-grab;
    }
    /* (Optional) Apply a "closed-hand" cursor during drag operation. */
    .grabbable:active {
      cursor: grabbing;
      cursor: -moz-grabbing;
      cursor: -webkit-grabbing;
    }
    .center {
      text-align: center;
    }
    .link {
      cursor: pointer;
    }
    .link:hover {
      font-weight: bold;
    }
    .no-nw-server:hover {
      color: red;
    }
    .modal-body {
      background-color: rgba(255,255,255,1);
    }
    .ui-inputgroup {
      display: inline-block;
    }
    .collectionsToolbar {
      position: absolute;
      top: -30px;
      right: 50px;
      width: auto;
    }
  `]
})

export class CollectionsComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private toolService: ToolService,
              private modalService: ModalService,
              private dragulaService: DragulaService ) {
                dragulaService.setOptions('first-bag', { moves: (el, source, handle, sibling) => !el.classList.contains('nodrag') });
              }

  public collections: Collection[];
  public origCollections = {};
  public displayedCollections: Collection[];
  private selectedCollection: Collection;
  public nwServers: any = {};
  public saServers: any = {};
  private utils = utils;
  public nwCollectionModalId = 'nw-collection-modal';
  public saCollectionModalId = 'sa-collection-modal';
  private tabContainerModalId = 'tab-container-modal';
  public filterText = '';
  public preferences: Preferences = null;
  public filterEnabled = false;

  // Subscriptions
  private getCollectionDataAgainSubscription: Subscription;
  private collectionsChangedSubscription: Subscription;
  private deleteCollectionConfirmedSubscription: Subscription;
  private executeAddCollectionSubscription: Subscription;
  private executeEditCollectionSubscription: Subscription;
  private collectionsOpenedSubscription: Subscription;
  private preferencesChangedSubscription: Subscription;
  private dragulaDroppedSubscription: Subscription;

  ngOnInit(): void {
    this.getCollectionDataAgainSubscription = this.toolService.getCollectionDataAgain.subscribe( () => this.onGetCollectionDataAgain() );

    this.collectionsChangedSubscription = this.dataService.collectionsChanged.subscribe( (collections: any) => {
      // triggered by dataService.refreshCollections()
      this.origCollections = collections;
      let tempCollections = [];

      for (let c in collections) {
        if (collections.hasOwnProperty(c)) {
          let collection = collections[c];
          // let option: SelectItem = { label: collection.name, value: collection.id };
          tempCollections.push(collection);
        }
      }
      this.collections = tempCollections;
      log.debug('CollectionsComponent: collectionsChangedSubscription: collections update', this.collections);
      this.filterChanged();
    });

    this.deleteCollectionConfirmedSubscription = this.toolService.deleteCollectionConfirmed.subscribe( (collectionId: string) => this.deleteConfirmed(collectionId) );

    this.executeAddCollectionSubscription = this.toolService.executeAddCollection.subscribe( (collection: Collection) => {
      this.collectionExecuted(collection);
    });

    this.executeEditCollectionSubscription = this.toolService.executeEditCollection.subscribe( (collection: Collection) => {
      this.collectionExecuted(collection);
    });

    this.dataService.refreshCollections();

    this.collectionsOpenedSubscription = this.toolService.collectionsOpened.subscribe( () => this.onOpen() );

    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => {
      log.debug('CollectionsComponent: ngOnInit: prefs observable:', prefs);
      if (Object.keys(prefs).length !== 0) {
        this.preferences = prefs;
      }
     } );

     this.dragulaDroppedSubscription = this.dragulaService.dropModel.subscribe( (bagName, el, target, source) => this.onDragulaDrop(bagName, el, target, source) );

    this.getNwServers();
    this.getSaServers();
  }



  ngOnDestroy(): void {
    this.getCollectionDataAgainSubscription.unsubscribe();
    this.collectionsChangedSubscription.unsubscribe();
    this.deleteCollectionConfirmedSubscription.unsubscribe();
    this.executeAddCollectionSubscription.unsubscribe();
    this.executeEditCollectionSubscription.unsubscribe();
    this.collectionsOpenedSubscription.unsubscribe();
    this.preferencesChangedSubscription.unsubscribe();
    this.dragulaDroppedSubscription.unsubscribe();
  }



  onDragulaDrop(bagName, el, target, source): void {
    // Save the order of collections to local storage
    log.debug('CollectionsComponent: onDragulaDrop()');
    if (this.collections.length === this.displayedCollections.length) {
      // only do this if the user isn't filtering
      let temp = [];
      for (let i = 0; i < this.displayedCollections.length; i++) {
        let collection = this.displayedCollections[i];
        temp.push(collection.id);
      }
      // log.debug('CollectionsComponent: onDragulaDrop(): temp:', temp);
      this.toolService.setPreference('collectionOrder', JSON.stringify(temp));
    }
  }



  private getNwServers(): Promise<any> {
    // log.debug("CollectionsComponent: getNwServers()");
    return this.dataService.getNwServers()
      .then( n => {
        // setTimeout( () => {
          log.debug('CollectionsComponent: getNwServers(): nwServers:', n);
          this.nwServers = n;
          // log.debug("AddCollectionModalComponent: getNwServers(): this.nwServers:", this.nwServers);
      });
  }

  private getSaServers(): Promise<any> {
    // log.debug("CollectionsComponent: getSaServers()");
    return this.dataService.getSaServers()
      .then( n => {
        // setTimeout( () => {
          log.debug('CollectionsComponent: getSaServers(): SaServers:', n);
          this.saServers = n;
          // log.debug("AddCollectionModalComponent: getSaServers(): this.saServers:", this.saServers);
      });
  }


  public onOpen(): void {
    this.dataService.refreshCollections()
                    .then( () => this.filterChanged() );
    this.getNwServers();
    this.getSaServers();
  }

  public getNwServerString(id: string): string {
    if (id in this.nwServers) {
      return this.nwServers[id].host + ':' + this.nwServers[id].port;
    }
    else {
      return '-';
    }
  }

  public getSaServerString(id: string): string {
    if (id in this.saServers) {
      return this.saServers[id].host + ':' + this.saServers[id].port;
    }
    else {
      return '-';
    }
  }

  public nwServerExists(id: string): boolean {
    if (id in this.nwServers) {
      return true;
    }
    else {
      return false;
    }
  }

  public saServerExists(id: string): boolean {
    if (id in this.saServers) {
      return true;
    }
    else {
      return false;
    }
  }

  onAddNwCollectionClick(): void {
    // log.debug("CollectionsComponent: onAddNwCollectionClick()");
    this.toolService.addNwCollectionNext.next();
    this.modalService.close(this.tabContainerModalId);
    this.modalService.open(this.nwCollectionModalId);
    this.toolService.reOpenTabsModal.next(true);
  }

  onAddSaCollectionClick(): void {
    // log.debug("CollectionsComponent: onAddNwCollectionClick()");
    this.toolService.addSaCollectionNext.next();
    this.modalService.close(this.tabContainerModalId);
    this.modalService.open(this.saCollectionModalId);
    this.toolService.reOpenTabsModal.next(true);
  }

  onEditCollectionClick(collection: Collection): void {
    log.debug('CollectionsComponent: onEditCollectionClick(): collection:', collection);
    if (collection.serviceType === 'nw') {
      this.toolService.editNwCollectionNext.next(collection);
      this.toolService.executeCollectionOnEdit.next(false);
      this.modalService.close(this.tabContainerModalId);
      this.toolService.reOpenTabsModal.next(true);
      this.modalService.open(this.nwCollectionModalId);
    }
    if (collection.serviceType === 'sa') {
      this.toolService.editSaCollectionNext.next(collection);
      this.toolService.executeCollectionOnEdit.next(false);
      this.modalService.close(this.tabContainerModalId);
      this.toolService.reOpenTabsModal.next(true);
      this.modalService.open(this.saCollectionModalId);
    }
  }

  deleteConfirmed(collectionId: string): void {
    log.debug('CollectionsComponent: deleteConfirmed(): Received deleteConfirmed event');
    // there are two paths - deleting the currently selected collection, or deleting the collection which isn't selected

    if (this.selectedCollection && collectionId === this.selectedCollection.id) {
      // we've deleted the currently selected collection
      this.dataService.abortGetBuildingCollection()
                      .then( () => this.toolService.noCollections.next() )
                      .then( () => this.dataService.deleteCollection(collectionId) )
                      .then( () => this.dataService.refreshCollections() );
    }
    else {
      // we've deleted a collection that isn't selected
      this.dataService.deleteCollection(collectionId)
                      .then( () => this.dataService.refreshCollections() );

    }
  }

  onRefresh(): void {
    this.dataService.refreshCollections()
        .then( () => this.filterChanged() );
  }

  onDeleteCollectionClick(collection: Collection): void {
    // log.debug('CollectionsComponent: onDeleteCollectionClick()');
    this.toolService.deleteCollectionNext.next(collection);
    this.modalService.open('collection-confirm-delete-modal');
  }

  onCollectionClicked(collection: Collection): void {
    log.debug('CollectionsComponent: onCollectionClicked():', collection.id, collection);
    this.selectedCollection = collection;
    this.dataService.abortGetBuildingCollection();
    this.toolService.collectionSelected.next(collection); // let the toolbar widget know we switched collections
    if ('deviceNumber' in collection && 'nwserver' in collection) {
      this.toolService.deviceNumber.next( { deviceNumber: collection.deviceNumber, nwserver: collection.nwserver } );
    }
    this.connectToCollection(collection);
    this.modalService.close(this.tabContainerModalId);
  }

  collectionExecuted(collection: Collection): void {
    // only runs when we add a new collection or edit an existing collection
    log.debug('CollectionsComponent: collectionExecuted():', collection.id, collection);
    this.selectedCollection = collection;
    let id = collection.id;
    this.dataService.abortGetBuildingCollection()
                    .then( () => this.dataService.refreshCollections() )
/*
                    .then( () => {
                      if (collection.type === 'fixed') {
                        return this.dataService.buildFixedCollection(collection.id)
                                   .then( () => this.dataService.refreshCollections() )
                                   .then( () => {
                                     collection = this.origCollections[id];
                                     this.selectedCollection = collection;
                                    });
                      }
                    })
*/
                    .then( () => {
                      this.toolService.collectionSelected.next(collection); // let the toolbar widget know we switched collections

                      if ('deviceNumber' in collection && 'nwserver' in collection) {
                        // broadcast the deviceNumber to all components who need to know about it
                        this.toolService.deviceNumber.next( { deviceNumber: collection.deviceNumber, nwserver: collection.nwserver } );
                      }

                      this.connectToCollection(collection);
                      this.modalService.close(this.tabContainerModalId);
                    });
  }

  connectToCollection(collection: Collection) {
    // makes data connection back to server after we've executed or clicked a collection
    log.debug('CollectionsComponent: connectToCollection(): collection:', collection);
    if (collection.type === 'rolling' || collection.type === 'monitoring') {
      this.dataService.getCollectionData(collection)
                      .then( () => this.dataService.getRollingCollection(collection.id) );
    }
    else if (collection.type === 'fixed') {
      this.dataService.getFixedCollection(collection.id, collection);
      return;
    }
  }

  onGetCollectionDataAgain(): void {
    // triggered by router component when we switch between views
    log.debug('CollectionsComponent: onGetCollectionDataAgain()');
    if (!this.selectedCollection) {
      // selectedCollection should only ever be undefined if we close the window on first load without ever selecting a collection
      return;
    }
    this.dataService.abortGetBuildingCollection()
        .then( () => {
          this.toolService.collectionSelected.next(this.selectedCollection); // let the toolbar widget know we switched collections
          this.toolService.deviceNumber.next( {
                                                deviceNumber: this.selectedCollection.deviceNumber,
                                                nwserver:  this.selectedCollection.nwserver
                                              });
          this.connectToCollection(this.selectedCollection);
        });
  }

  public filterChanged(): void {
    // log.debug('CollectionsComponent: filterChanged(): filterText:', this.filterText);
    if (this.filterText === '') {
      // this.displayedCollections = this.collections;
      // log.debug('origCollections:', this.origCollections);

      let collectionOrder = JSON.parse(this.toolService.getPreference('collectionOrder'));
      let temp = [];
      let tempFound = {};
      if (collectionOrder) {
        for (let i = 0; i < collectionOrder.length; i++) {
          let id = collectionOrder[i];
          if (id in this.origCollections) {
            temp.push(this.origCollections[id]);
            tempFound[id] = null;
          }
        }
        for (let i = 0; i < this.collections.length; i++) {
          let collection = this.collections[i];
          if (!(collection.id in tempFound)) {
            temp.push(collection);
          }
        }
        this.displayedCollections = temp;
      }
      else {
        this.displayedCollections = this.collections;
      }
      this.filterEnabled = false;
    }
    else {
      let tempCollections: Collection[] = [];
      for (let i = 0; i < this.collections.length; i++) {
        let collection = this.collections[i];
        if (collection.name.toLocaleLowerCase().includes(this.filterText.toLocaleLowerCase())) {
          tempCollections.push(collection);
        }
      }
      this.displayedCollections = tempCollections;
      this.filterEnabled = true;
    }
  }

  public clearFilter(): void {
    this.filterText = '';
    this.filterChanged();
  }

}
