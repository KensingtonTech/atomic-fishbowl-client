import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
import { ModalService } from './modal/modal.service';
import { Subscription } from 'rxjs/Subscription';
import { NwServer } from './nwserver';
import { Collection } from './collection';
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
      top: 16px;
      right: 50px;
      width:480px;
    }
  `]
})

export class CollectionsComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private toolService: ToolService,
              private modalService: ModalService ) {}

  public collections: Collection[];
  public displayedCollections: Collection[];
  private selectedCollection: Collection;
  public nwServers: any = {};
  private utils = utils;
  public addCollectionModalId = 'add-collection-modal';
  private tabContainerModalId = 'tab-container-modal';
  public filterText = '';

  // Subscriptions
  private getCollectionDataAgainSubscription: Subscription;
  private collectionsChangedSubscription: Subscription;
  private deleteCollectionConfirmedSubscription: Subscription;
  private executeAddCollectionSubscription: Subscription;
  private executeEditCollectionSubscription: Subscription;
  // private selectedCollectionChangedSubscription: Subscription;
  private collectionsOpenedSubscription: Subscription;

  ngOnInit(): void {
    this.getCollectionDataAgainSubscription = this.toolService.getCollectionDataAgain.subscribe( () => this.getCollectionDataAgain() );
    // this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (e: any) => this.selectedCollectionId = e.id );

    this.collectionsChangedSubscription = this.dataService.collectionsChanged.subscribe( (collections: any) => {
      // triggered by dataService.refreshCollections()
      let tempCollections = [];

      for (let c in collections) {
        if (collections.hasOwnProperty(c)) {
          let collection = collections[c];
          // let option: SelectItem = { label: collection.name, value: collection.id };
          tempCollections.push(collection);
        }
      }
      this.collections = tempCollections;
      this.displayedCollections = tempCollections;
      log.debug('CollectionsComponent: collectionsChangedSubscription: collections update', this.collections);
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

    this.getNwServers();
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

  ngOnDestroy(): void {
    this.getCollectionDataAgainSubscription.unsubscribe();
    // this.selectedCollectionChangedSubscription.unsubscribe();
    this.collectionsChangedSubscription.unsubscribe();
    this.deleteCollectionConfirmedSubscription.unsubscribe();
    // this.useCasesChangedSubscription.unsubscribe();
    this.executeAddCollectionSubscription.unsubscribe();
    this.executeEditCollectionSubscription.unsubscribe();
    this.collectionsOpenedSubscription.unsubscribe();
  }

  public onOpen(): void {
    this.dataService.refreshCollections()
                    .then( () => this.filterChanged() );
    this.getNwServers();
  }


  public checkNwServerExists(id: string) {
    if (id in this.nwServers) {
      return true;
    }
    return false;
  }

  public getNwServerString(id: string): string {
    if (id in this.nwServers) {
      return this.nwServers[id].host + ':' + this.nwServers[id].port;
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

  onAddCollectionClick(): void {
    // log.debug("CollectionsComponent: onAddCollectionClick()");
    this.toolService.addCollectionNext.next();
    this.modalService.close(this.tabContainerModalId);
    this.modalService.open(this.addCollectionModalId);
    this.toolService.reOpenTabsModal.next(true);
  }

  onEditCollectionClick(collection: Collection): void {
    log.debug('CollectionsComponent: onEditCollectionClick(): collection:', collection);
    this.toolService.editCollectionNext.next(collection);
    this.toolService.executeCollectionOnEdit.next(false);
    this.modalService.close(this.tabContainerModalId);
    this.toolService.reOpenTabsModal.next(true);
    this.modalService.open(this.addCollectionModalId);
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
                      .then( () => this.dataService.refreshCollections() )
                      .then( () => this.filterChanged() );
    }
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
    this.dataService.abortGetBuildingCollection()
                    .then( () => {
                      if (collection.type === 'fixed') { this.dataService.buildFixedCollection(collection.id); }
                    })
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
    if (collection.type === 'rolling' || collection.type === 'monitoring') {
      this.dataService.getCollectionData(collection)
                      .then( () => this.dataService.getRollingCollection(collection.id) );
    }
    else { // fixed collections
      if (collection.state === 'building') {
        // fixed collection is still building
        this.dataService.getCollectionData(collection)
                        .then( () => this.dataService.getBuildingFixedCollection(collection.id) );
        return;
      }
      else {
        // fixed collection is complete
       this.dataService.getCollectionData(collection);
      }
    }
  }

  getCollectionDataAgain(): void {
    // triggered by router component when we switch between views
    log.debug('CollectionsComponent: getCollectionDataAgain()');
    this.toolService.collectionSelected.next(this.selectedCollection); // let the toolbar widget know we switched collections
    this.toolService.deviceNumber.next( {
                                          deviceNumber: this.selectedCollection.deviceNumber,
                                          nwserver:  this.selectedCollection.nwserver
                                        });
    this.connectToCollection(this.selectedCollection);
  }

  public filterChanged(): void {
    // log.debug('CollectionsComponent: filterChanged(): filterText:', this.filterText);
    if (this.filterText === '') {
      this.displayedCollections = this.collections;
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
    }
  }

  public clearFilter(): void {
    this.filterText = '';
    this.filterChanged();
  }

}
