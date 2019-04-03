import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { ModalService } from './modal/modal.service';
import { Subscription } from 'rxjs';
import { Collection } from 'types/collection';
import { Preferences } from 'types/preferences';
import { DragulaService } from 'ng2-dragula';
import { Logger } from 'loglevel';
import { License } from 'types/license';
import { MenuItem } from 'primeng/api';
import * as utils from './utils';
import { Menu } from 'primeng/menu';
declare var log: Logger;

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
      padding-bottom: 10px;
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
      height: 35px;
    }

    .row-group {
      display: table-row-group;
      border: 1px solid black;
      overflow: auto;
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

    .iconDisabled {
      color: grey;
    }

  `]
})

export class CollectionsComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private toolService: ToolService,
              private modalService: ModalService,
              private changeDetectionRef: ChangeDetectorRef,
              private dragulaService: DragulaService ) {
                let bag: any = dragulaService.find('first-bag');
                if (bag !== undefined) {
                  this.dragulaService.destroy('first-bag');
                }
                dragulaService.setOptions('first-bag', { moves: (el, source, handle, sibling) => !el.classList.contains('nodrag') });
              }

  @ViewChild(Menu) collectionMaskMenuComponent;

  public collections: Collection[] = [];
  public origCollections = {};
  public displayedCollections: Collection[];
  public nwServers: any = {};
  public saServers: any = {};
  private utils = utils;
  public nwCollectionModalId = 'nw-collection-modal';
  public saCollectionModalId = 'sa-collection-modal';
  private tabContainerModalId = 'tab-container-modal';
  public filterText = '';
  public preferences: Preferences = null;
  public filterEnabled = false;
  private editing = false;
  public license: License;
  private uncheckedClass = 'fa fa-square-o';
  private checkedClass = 'fa fa-check-square-o';
  public filterMenuItems: MenuItem[] = [
    {
      label: 'Fixed',
      icon: this.checkedClass,
      command: () => this.toggleTypeFilter('fixed')
    },
    {
      label: 'Rolling',
      icon: this.checkedClass,
      command: () => this.toggleTypeFilter('rolling')
    },
    {
      label: 'Monitoring',
      icon: this.checkedClass,
      command: () => this.toggleTypeFilter('monitoring')
    }
  ];
  public showFixed = true;
  public showRolling = true;
  public showMonitoring = true;
  public showMenu = false;
  private lastEvent: MouseEvent; // this holds the last mouse event which we can use to hide the menu later on, as the component requires an event



  // Subscriptions
  private getCollectionDataAgainSubscription: Subscription;
  private collectionsChangedSubscription: Subscription;
  private deleteCollectionConfirmedSubscription: Subscription;
  private executeAddCollectionSubscription: Subscription;
  private executeEditCollectionSubscription: Subscription;
  private collectionsOpenedSubscription: Subscription;
  private preferencesChangedSubscription: Subscription;
  private dragulaDroppedSubscription: Subscription;
  private nwServersChangedSubscription: Subscription;
  private saServersChangedSubscription: Subscription;
  private licensingChangedSubscription: Subscription;

  ngOnInit(): void {
    this.getCollectionDataAgainSubscription = this.toolService.getCollectionDataAgain.subscribe( () => this.onGetCollectionDataAgain() );

    this.collectionsChangedSubscription = this.dataService.collectionsChanged.subscribe( (collections: any) => this.onCollectionsChanged(collections) );

    this.deleteCollectionConfirmedSubscription = this.toolService.deleteCollectionConfirmed.subscribe( (collectionId: string) => this.onDeleteConfirmed(collectionId) );

    this.executeAddCollectionSubscription = this.toolService.executeAddCollection.subscribe( (collection: Collection) => {
      this.editing = false;
      this.onCollectionExecuted(collection);
    });

    this.executeEditCollectionSubscription = this.toolService.executeEditCollection.subscribe( (collection: Collection) => {
      this.editing = true;
      this.onCollectionExecuted(collection);
    });

    this.collectionsOpenedSubscription = this.toolService.collectionsOpened.subscribe( () => this.onOpen() );

    this.preferencesChangedSubscription = this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => {
      log.debug('CollectionsComponent: ngOnInit: prefs observable:', prefs);
      if (Object.keys(prefs).length !== 0) {
        this.preferences = prefs;
      }
     } );

     this.dragulaDroppedSubscription = this.dragulaService.dropModel.subscribe( (bagName, el, target, source) => this.onDragulaDrop(bagName, el, target, source) );

    this.nwServersChangedSubscription = this.dataService.nwServersChanged.subscribe( apiServers => this.onNwServersChanged(apiServers) );
    this.saServersChangedSubscription = this.dataService.saServersChanged.subscribe( apiServers => this.onSaServersChanged(apiServers) );

    this.licensingChangedSubscription = this.dataService.licensingChanged.subscribe( license =>  this.onLicenseChanged(license) );

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
    this.nwServersChangedSubscription.unsubscribe();
    this.saServersChangedSubscription.unsubscribe();
    this.licensingChangedSubscription.unsubscribe();
  }



  onLicenseChanged(license: License) {
    // log.debug('CollectionsComponent: onLicenseChanged(): license:', license);
    if (!license) {
      return;
    }
    this.license = license;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onNwServersChanged(apiServers): void {
    if (Object.keys(apiServers).length === 0) {
      return;
    }
    this.nwServers = apiServers;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onSaServersChanged(apiServers): void {
    if (Object.keys(apiServers).length === 0) {
      return;
    }
    this.saServers = apiServers;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onCollectionsChanged(collections): void {
    // triggered by update of collections

    if (Object.keys(collections).length === 0) {
      // return;
      this.collections = [];
      this.origCollections = {};
      this.filterChanged();
      return;
    }

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
    log.debug('CollectionsComponent: onCollectionsChanged(): collections update', this.collections);
    this.filterChanged();
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
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



  public onOpen(): void {}



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
    if (!this.license.valid) {
      return;
    }
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



  onDeleteConfirmed(collectionId: string): void {
    log.debug('CollectionsComponent: onDeleteConfirmed(): Received onDeleteConfirmed event');
    // there are two paths - deleting the currently selected collection, or deleting the collection which isn't selected

    if (this.toolService.selectedCollection && collectionId === this.toolService.selectedCollection.id) {
      // we've deleted the currently selected collection
      // this.dataService.leaveCollection();
      // this.dataService.noCollections.next(); // this will be handled when we receive an update from the server
      this.dataService.deleteCollection(collectionId);
    }
    else {
      // we've deleted a collection that isn't selected
      this.dataService.deleteCollection(collectionId);

    }
  }



  onDeleteCollectionClick(collection: Collection): void {
    // log.debug('CollectionsComponent: onDeleteCollectionClick()');
    this.toolService.deleteCollectionNext.next(collection);
    this.modalService.open('collection-confirm-delete-modal');
  }



  onCollectionExecuted(collection: Collection): void {
    // only runs when we click a collection, add a new collection, or edit an existing collection
    if (!this.editing && this.toolService.selectedCollection && this.toolService.selectedCollection.id === collection.id) {
      this.modalService.close(this.tabContainerModalId);
      return;
    }
    log.debug('CollectionsComponent: onCollectionExecuted():', collection.id, collection);
    this.editing = false; // just resets this value for the next run
    this.toolService.selectedCollection = collection;
    this.connectToCollection(collection);
    this.modalService.close(this.tabContainerModalId);

  }



  onGetCollectionDataAgain(): void {
    // triggered by router component when we switch between views
    log.debug('CollectionsComponent: onGetCollectionDataAgain()');
    if (!this.toolService.selectedCollection || (this.toolService.selectedCollection && !( this.toolService.selectedCollection.id in this.origCollections) ) ) {
      // selectedCollection should only ever be undefined if we close the window on first load without ever selecting a collection...
      // we need the second clause in case we delete a collection and switch views.  It will try to reload the deleted collection...
      // resulting in a server crash
      return;
    }
    this.connectToCollection(this.toolService.selectedCollection);
  }



  connectToCollection(collection: Collection) {
    // makes data connection back to server after we've executed or clicked a collection
    log.debug('CollectionsComponent: connectToCollection(): collection:', collection);

    this.dataService.selectedCollectionChanged.next(collection);

    this.dataService.leaveCollection();

    if ('deviceNumber' in collection && 'nwserver' in collection) {
      this.toolService.deviceNumber.next( { deviceNumber: collection.deviceNumber, nwserver: collection.nwserver } );
    }

    if (collection.type === 'rolling' || collection.type === 'monitoring') {
      this.dataService.getRollingCollection(collection.id);
    }

    else if (collection.type === 'fixed') {
      this.dataService.getFixedCollection(collection.id);
      return;
    }
  }



  public filterChanged(): void {
    log.debug('CollectionsComponent: filterChanged(): filterText:', this.filterText);
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
    if (!this.showFixed || !this.showRolling || !this.showMonitoring) {
      // apply collection type mask
      this.filterEnabled = true;
      let displayedCollections = utils.deepCopy(this.displayedCollections);
      let tempCollections: Collection[] = [];
      displayedCollections.forEach( (collection: Collection) => {
        switch (collection.type) {
          case 'fixed':
            if (this.showFixed) {
              tempCollections.push(collection);
            }
            break;
          case 'rolling':
            if (this.showRolling) {
              tempCollections.push(collection);
            }
            break;
          case 'monitoring':
            if (this.showMonitoring) {
              tempCollections.push(collection);
            }
            break;
        }
      });
      this.displayedCollections = tempCollections;
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  clearFilter(): void {
    this.filterText = '';
    this.filterChanged();
  }



  toggleTypeFilter(type) {
    let index: number;
    switch (type) {
      case 'fixed':
        index = 0;
        this.showFixed = !this.showFixed;
        break;
      case 'rolling':
        index = 1;
        this.showRolling = !this.showRolling;
        break;
      case 'monitoring':
        index = 2;
        this.showMonitoring = !this.showMonitoring;
        break;
    }
    this.filterMenuItems[index]['icon'] = this.filterMenuItems[index].icon === this.uncheckedClass ? this.checkedClass : this.uncheckedClass;
    this.showMenu = false;
    this.filterChanged();
  }



  toggleCollectionMaskMenu(event) {
    log.debug('CollectionsComponent: toggleCollectionMaskMenu()');
    // we don't simply use the menu's toggle function as it's buggy.  Though if we manage ourselves, it works well
    this.lastEvent = event;
    this.showMenu ? this.collectionMaskMenuComponent.hide(event) : this.collectionMaskMenuComponent.show(event);
    this.showMenu = !this.showMenu;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onClose() {
    if (this.showMenu) {
     this.toggleCollectionMaskMenu(this.lastEvent);
    }
  }


}
