import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { ModalService } from './modal/modal.service';
import { Subscription } from 'rxjs';
import { Collection } from 'types/collection';
import { Preferences } from 'types/preferences';
import { DragulaService } from 'ng2-dragula';
import { License } from 'types/license';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import * as log from 'loglevel';
import * as utils from './utils';


@Component({
  selector: 'collections',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './collections.component.html',
  styles: [`

  .cell {
    padding-left: .3em;
  }

  .evenRow {
    background-color: #FFF;
  }

  .oddRow {
    background-color: #CCC;
  }

  .header {
    font-weight: bold;
    font-size: 1.3em;
    background-color: #CCC;
  }

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

  .disabled {
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
                dragulaService.createGroup('first-bag', this.dragulaOptions);
              }

  @ViewChild(Menu) collectionMaskMenuComponent;
  @ViewChild('collectionsTable') private collectionsTableRef: ElementRef;

  private dragulaOptions: any = {
    copy: true,
    // copyItem: (item) => utils.deepCopy(item),
    copyItem: (item) => {
      console.log('item:', item);
      return utils.deepCopy(item);
    },
    moves: (el, source, handle, sibling) => handle.classList.contains('draggable') && !handle.classList.contains('disabled'), // only allow enabled draghandle to be dragged
    accepts: (el, target, source, sibling) => {
      // console.log('accepts: el:', el);
      // console.log('accepts: target:', target);
      // console.log('accepts: source:', source);
      // console.log('accepts: sibling:', sibling);

      // sibling is always the element immediately following the one we dropped on
      // to get the row we dropped on

      if (!target.classList.contains('collections-table')) {
        //  if this isn't our container, do nothing
        this.droppedTargetCollectionId = null;
        return false;
      }

      if (!sibling) {
        // if sibling is null, we selected the last item in the list.  this is an edge case
        // console.log('accepts: got to 1');
        this.droppedTargetCollectionId = this.displayedCollections[this.displayedCollections.length - 1].id;
        return true;
      }
      if (sibling.classList.contains('header')) {
        // if a header - select the first collection
        // console.log('accepts: got to 2');
        this.droppedTargetCollectionId = this.displayedCollections[0].id;
        return true;
      }
      else if (sibling.classList.contains('actions') && sibling.previousElementSibling) {
        // if sibling has class 'actions', then we actually dropped on the last column on the previous row
        // console.log('accepts: got to 3');
        this.droppedTargetCollectionId = sibling.previousElementSibling.getAttribute('collectionId');
        return true;
      }
      else {
        // console.log('accepts: got to 4');
        this.droppedTargetCollectionId = sibling.getAttribute('collectionId');
        return true;
      }

      return true;
    },
    mirror: (item) => {
      let rect = item.getBoundingClientRect();
      let collectionId = item.getAttribute('collectionId');
      let collectionRowElements = this.collectionsTableRef.nativeElement.querySelectorAll(`[collectionId="${collectionId}"]:not(.actions)`);
      let container = document.createElement('div');
      container.className = 'collections-table-clone';
      let width = 0;
      collectionRowElements.forEach( el => {
        let w = utils.getRectWidth(el.getBoundingClientRect());
        width += w;
        let clonedEl = el.cloneNode(true);
        clonedEl.style['width'] = w + 'px';
        container.appendChild(clonedEl);
      });

      container.style.width = width + 'px';
      container.style.height = utils.getRectHeight(rect) + 'px';
      return container;
    }
  };

  firstRun = true;
  collections: Collection[] = [];
  origCollections = {};
  displayedCollections: Collection[];
  selectedCollection: Collection;
  nwServers: any = {};
  saServers: any = {};
  utils = utils;
  filterText = '';
  preferences: Preferences = null;
  filterEnabled = false;
  private editing = false;
  license: License;
  private uncheckedClass = 'fa fa-square-o';
  private checkedClass = 'fa fa-check-square-o';
  filterMenuItems: MenuItem[] = [
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
  showFixed = true;
  showRolling = true;
  showMonitoring = true;
  showMenu = false;
  private lastEvent: MouseEvent; // this holds the last mouse event which we can use to hide the menu later on, as the component requires an event
  isDragging = false;
  private dragulaInstance: any;
  private droppedTargetCollectionId: string;



  // Subscriptions
  private subscriptions = new Subscription;



  ngOnInit(): void {
    this.subscriptions.add(this.toolService.getCollectionDataAgain.subscribe( () => this.onGetCollectionDataAgain() ));

    this.subscriptions.add(this.dataService.collectionsChanged.subscribe( (collections: any) => this.onCollectionsChanged(collections) ));

    this.subscriptions.add(this.toolService.deleteCollectionConfirmed.subscribe( (collectionId: string) => this.onDeleteConfirmed(collectionId) ));

    this.subscriptions.add(this.toolService.executeAddCollection.subscribe( (collection: Collection) => this.onExecuteAddCollection(collection) ));

    this.subscriptions.add(this.toolService.executeEditCollection.subscribe( (collection: Collection) => this.onExecuteEditCollection(collection) ));

    this.subscriptions.add(this.toolService.collectionsOpened.subscribe( () => this.onOpen() ));

    this.subscriptions.add(this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => {
      log.debug('CollectionsComponent: ngOnInit: prefs observable:', prefs);
      if (Object.keys(prefs).length !== 0) {
        this.preferences = prefs;
      }
     } ));

     this.subscriptions.add(this.dataService.nwServersChanged.subscribe( apiServers => this.onNwServersChanged(apiServers) ));
     this.subscriptions.add(this.dataService.saServersChanged.subscribe( apiServers => this.onSaServersChanged(apiServers) ));

     this.subscriptions.add(this.dataService.licensingChanged.subscribe( license =>  this.onLicenseChanged(license) ));

     this.subscriptions.add(this.dataService.selectedCollectionChanged.subscribe( (collection: Collection) => this.onSelectedCollectionChanged(collection) ));

     this.subscriptions.add(this.dataService.noopCollection.subscribe( () => {
      this.selectedCollection = null;
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
     } ));

    // dragula
    // this.dragulaDroppedSubscription = this.dragulaService.dropModel('first-bag').subscribe( ({name, el, target, source, sibling, sourceModel, targetModel, item}) => this.onDragulaDrop(name, el, target, source, sibling, sourceModel, targetModel, item) );
    this.subscriptions.add(this.dragulaService.drop('first-bag').subscribe( ({ name, el, target, source, sibling }) => this.onDragulaDrop(name, el, target, source, sibling) ));
    this.subscriptions.add(this.dragulaService.drag('first-bag').subscribe( () => this.isDragging = true ));
    this.subscriptions.add(this.dragulaService.dragend('first-bag').subscribe( () => this.isDragging = false ));

  }



  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.dragulaService.destroy('first-bag');
  }



  onSelectedCollectionChanged(collection: Collection) {
    if (!collection) {
      return;
    }
    this.selectedCollection = utils.deepCopy(collection);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
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
      // if there are no collections, enter this block;
      this.collections = [];
      this.origCollections = {};
      this.filterChanged();
      return;
    }

    // we have collections - yay

    if (this.selectedCollection) {
      let selectedCollectionId = this.selectedCollection.id;
      if (selectedCollectionId in collections &&
        ( !('modifier' in this.selectedCollection) && 'modifier' in collections[selectedCollectionId] ) || // edited for the first time
        ( 'modifier' in this.selectedCollection && this.selectedCollection.modifier && this.selectedCollection.modifier.timestamp !== collections[selectedCollectionId].modifier.timestamp ) // edited a subsequent time, and the timstamp changed
      ) {
        // initial state - created but not modifier
        // edited state - created exists, as does modifier
        this.dataService.selectedCollectionChanged.next(collections[selectedCollectionId]);
      }
    }

    Object.keys(collections).forEach( (id) => {
      // only keep collections for which the preferences have its service enabled
      let collection = collections[id];
      if (this.preferences && this.preferences.serviceTypes[collection.serviceType] === false) {
        delete collections[id];
      }
    });

    this.origCollections = collections;

    let tempCollections = [];

    Object.keys(collections).forEach( (c) => {
      let collection = collections[c];
      tempCollections.push(collection);
    });
    this.collections = tempCollections;
    log.debug('CollectionsComponent: onCollectionsChanged(): collections update', this.collections);
    this.filterChanged();
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();

  }



  onDragulaDrop(bagName, el, target, source, sibling): void {
    // Save the order of collections to local storage

    /*if (container === source) {
      drake.cancel(true);
    }*/

    if (!this.droppedTargetCollectionId) {
      return;
    }

    log.debug('CollectionsComponent: onDragulaDrop()');

    /*
    console.log('el:', el);
    console.log('source:', source);
    console.log('target:', target);
    console.log('sibling:', sibling);
    */

    if (this.collections.length !== this.displayedCollections.length) {
      // only do this if the user isn't filtering
      return;
    }

    // get collection id of dropped item
    let collectionId = el.getAttribute('collectionId');
    // log.debug('CollectionsComponent: onDragulaDrop(): collectionId:', collectionId);

    // first we need to un-screw the view and move our other cells to where we dropped it
    // select all elements in the row
    // let collectionRowElements = this.collectionsTableRef.nativeElement.querySelectorAll(`[collectionId="${collectionId}"]`); // :not(.collectionName)
    // console.log('collectionElements:', collectionRowElements);

    // work out where to place the moved row
    // log.debug('CollectionsComponent: onDragulaDrop(): droppedTargetCollectionId:', this.droppedTargetCollectionId);
    let targetCollectionId = this.droppedTargetCollectionId;

    // move the row
    let tempDisplayedCollections: Collection[] = [];
    if (targetCollectionId === collectionId) {
      // nothing changed - just return;
      return;
    }
    this.displayedCollections.forEach( (collection, i) => {
      if (collection.id === collectionId) {
        // do nothing - we'll insert it later
        // console.log('got to 1');
      }
      else if (collection.id === targetCollectionId && i === 0) {
        // console.log('got to 2');
        tempDisplayedCollections.push(this.origCollections[collectionId]);
        tempDisplayedCollections.push(collection);
      }
      else if (collection.id === targetCollectionId && i !== 0) {
        // console.log('got to 3');
        tempDisplayedCollections.push(collection);
        tempDisplayedCollections.push(this.origCollections[collectionId]);
      }
      else {
        // console.log('got to 4');
        tempDisplayedCollections.push(collection);
      }
    });
    // log.debug('CollectionsComponent: onDragulaDrop(): tempDisplayedCollections:', tempDisplayedCollections);
    this.displayedCollections = tempDisplayedCollections;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    let tempCollectionOrder = [];
    this.displayedCollections.forEach( collection => tempCollectionOrder.push(collection.id));
    // log.debug('CollectionsComponent: onDragulaDrop(): tempCollectionOrder:', tempCollectionOrder);
    this.toolService.setPreference('collectionOrder', JSON.stringify(tempCollectionOrder));

  }




  myDropModelFunc($event) {
    log.debug('CollectionsComponent: myDropModelFunc()');
  }



  onOpen(): void {}



  getNwServerString(id: string): string {
    if (id in this.nwServers) {
      return this.nwServers[id].host + ':' + this.nwServers[id].port;
    }
    else {
      return '-';
    }
  }



  getSaServerString(id: string): string {
    if (id in this.saServers) {
      return this.saServers[id].host + ':' + this.saServers[id].port;
    }
    else {
      return '-';
    }
  }



  nwServerExists(id: string): boolean {
    if (id in this.nwServers) {
      return true;
    }
    else {
      return false;
    }
  }



  saServerExists(id: string): boolean {
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
    this.modalService.close(this.toolService.tabContainerModalId);
    this.modalService.open(this.toolService.nwCollectionModalId);
    this.toolService.reOpenTabsModal.next(true);
  }



  onAddSaCollectionClick(): void {
    // log.debug("CollectionsComponent: onAddNwCollectionClick()");
    this.toolService.addSaCollectionNext.next();
    this.modalService.close(this.toolService.tabContainerModalId);
    this.modalService.open(this.toolService.saCollectionModalId);
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
      this.modalService.close(this.toolService.tabContainerModalId);
      this.toolService.reOpenTabsModal.next(true);
      this.modalService.open(this.toolService.nwCollectionModalId);
    }
    if (collection.serviceType === 'sa') {
      this.toolService.editSaCollectionNext.next(collection);
      this.toolService.executeCollectionOnEdit.next(false);
      this.modalService.close(this.toolService.tabContainerModalId);
      this.toolService.reOpenTabsModal.next(true);
      this.modalService.open(this.toolService.saCollectionModalId);
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
    this.modalService.open(this.toolService.confirmCollectionDeleteModalId);
  }



  onExecuteAddCollection(collection) {
    log.debug('CollectionsComponent: onExectuteAddCollection()');
    this.editing = false;
    this.onCollectionExecuted(collection);
  }




  onExecuteEditCollection(collection) {
    log.debug('CollectionsComponent: onExectuteEditCollection()');
    this.editing = true;
    this.onCollectionEdited(collection);
  }



  onCollectionExecuted(collection: Collection): void {
    // only runs when we click a collection, add a new collection
    if (this.toolService.selectedCollection && this.toolService.selectedCollection.id === collection.id) {
      // user clicked on collection that was already selected, so just close the modal
      log.debug('CollectionsComponent: onCollectionExecuted(): collection was already selected - just closing modal.  collection:', collection);
      this.modalService.close(this.toolService.tabContainerModalId);
      return;
    }
    log.debug('CollectionsComponent: onCollectionExecuted():', collection.id, collection);
    this.editing = false; // just resets this value for the next run
    this.toolService.selectedCollection = collection;
    this.connectToCollection(collection);
    this.modalService.close(this.toolService.tabContainerModalId);
  }



  onCollectionEdited(collection: Collection) {
    log.debug('CollectionsComponent: onCollectionEdited():', collection.id, collection);
    if (this.toolService.selectedCollection && this.toolService.selectedCollection.id === collection.id) {
      this.toolService.selectedCollection = collection;
    }
      // do nothing if we're just editing a collection we're not presently connected to or if no collection is selected
    this.editing = false; // just resets this value for the next run
  }



  onGetCollectionDataAgain(): void {
    // triggered by router component when we switch between views
    log.debug('CollectionsComponent: onGetCollectionDataAgain()');
    if (!this.toolService.selectedCollection || (this.toolService.selectedCollection && !( this.toolService.selectedCollection.id in this.origCollections) ) ) {
      // selectedCollection should only ever be undefined if we close the window on first load without ever selecting a collection...
      // we need the second clause in case we delete a collection and switch views.  It would otherwise try to reload the deleted collection...
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



  filterChanged(): void {
    log.debug('CollectionsComponent: filterChanged(): filterText:', this.filterText);

    if (this.filterText === '') {
      // enter this block if no filterText is defined

      // this.displayedCollections = this.collections;
      // log.debug('origCollections:', this.origCollections);

      let collectionOrder = JSON.parse(this.toolService.getPreference('collectionOrder'));
      let temp = [];
      let tempFound = {};

      if (!collectionOrder) {
        // no pre-establish collection order exists, so just set displayedCollections to the list of collections
        this.displayedCollections = this.collections;
      }

      else {
        // build the collection list from the pre-established collection order

        // first, get the collections which are defined in the order
        collectionOrder.forEach( (id) => {
          if (id in this.origCollections) {
            temp.push(this.origCollections[id]);
            tempFound[id] = null;
          }
        });

        // now add in any collections which aren't already defined in the order
        this.collections.forEach( (collection) => {
          if (!(collection.id in tempFound)) {
            temp.push(collection);
          }
        });

        // finish by setting this.displayedCollections to our temp list
        this.displayedCollections = temp;
      }

      this.filterEnabled = false;
    }

    else {
      // enter this block if the user has entered filter text
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
