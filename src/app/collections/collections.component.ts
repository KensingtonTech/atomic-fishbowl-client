import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { Subscription } from 'rxjs';
import { Collection, Collections, CollectionType } from 'types/collection';
import { Preferences } from 'types/preferences';
import { DragulaService } from 'ng2-dragula';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import * as log from 'loglevel';
import * as utils from '../utils';
import { NwServers } from 'types/nwserver';
import { SaServers } from 'types/saserver';
import { ConfirmationService } from 'primeng/api';


@Component({
  selector: 'app-collections',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './collections.component.html',
  styleUrls: [
    './collections.component.scss'
  ]
})

export class CollectionsComponent implements OnInit, OnDestroy {

  constructor(
    private dataService: DataService,
    private toolService: ToolService,
    private changeDetectionRef: ChangeDetectorRef,
    private dragulaService: DragulaService,
    private confirmationService: ConfirmationService
  ) {
    dragulaService.createGroup('first-bag', this.dragulaOptions);
  }

  @ViewChild(Menu) collectionMaskMenuComponent: Menu;
  @ViewChild('collectionsTable') private collectionsTableRef: ElementRef<HTMLElement>;

  private dragulaOptions: any = {
    copy: true,
    copyItem: (item: unknown) => utils.deepCopy(item),

    moves: (el?: Element, source?: Element, handle?: Element, sibling?: Element) => (handle?.classList.contains('draggable') && !handle.classList.contains('disabled')) ?? false, // only allow enabled draghandle to be dragged

    accepts: (el?: Element, target?: Element, source?: Element, sibling?: Element) => {
      // sibling is always the element immediately following the one we dropped on
      // to get the row we dropped on

      if (!target?.classList.contains('collections-table')) {
        //  if this isn't our container, do nothing
        this.droppedTargetCollectionId = undefined;
        return false;
      }

      if (!sibling) {
        // if sibling is null, we selected the last item in the list.  this is an edge case
        this.droppedTargetCollectionId = this.displayedCollections[this.displayedCollections.length - 1].id;
        return true;
      }
      if (sibling.classList.contains('header')) {
        // if a header - select the first collection
        this.droppedTargetCollectionId = this.displayedCollections[0].id;
        return true;
      }
      else if (sibling.classList.contains('actions') && sibling.previousElementSibling) {
        // if sibling has class 'actions', then we actually dropped on the last column on the previous row
        this.droppedTargetCollectionId = sibling.previousElementSibling.getAttribute('collectionId') ?? undefined;
        return true;
      }
      else {
        this.droppedTargetCollectionId = sibling.getAttribute('collectionId') ?? undefined;
        return true;
      }
    },
    mirror: (item: HTMLElement) => {
      const rect = item.getBoundingClientRect();
      const collectionId = item.getAttribute('collectionId');
      const collectionRowElements = this.collectionsTableRef.nativeElement.querySelectorAll(`[collectionId="${collectionId}"]:not(.actions)`);
      const container = document.createElement('div');
      container.className = 'collections-table-clone';
      let width = 0;
      collectionRowElements.forEach( el => {
        const w = utils.getRectWidth(el.getBoundingClientRect());
        width += w;
        const clonedEl = el.cloneNode(true) as HTMLElement;
        clonedEl.style.width = w + 'px';
        container.appendChild(clonedEl);
      });

      container.style.width = width + 'px';
      container.style.height = utils.getRectHeight(rect) + 'px';
      return container;
    }
  };

  firstRun = true;
  collections: Collection[] = [];
  origCollections: Collections = {};
  displayedCollections: Collection[];
  selectedCollection?: Collection;
  nwServers: NwServers = {};
  saServers: SaServers = {};
  utils = utils;
  filterText = '';
  preferences: Preferences;
  filterEnabled = false;
  private checkedClass = 'pi pi-check';
  private uncheckedClass = 'pi';
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
  private droppedTargetCollectionId?: string;

  confirmationKey = 'CollectionsComponent';



  // Subscriptions
  private subscriptions = new Subscription();



  ngOnInit(): void {
    this.subscriptions.add(
      this.toolService.getCollectionDataAgain.subscribe(
        () => this.onGetCollectionDataAgain()
      )
    );

    this.subscriptions.add(
      this.dataService.collectionsChanged.subscribe(
        (collections: any) => this.onCollectionsChanged(collections)
      )
    );

    this.subscriptions.add(
      this.toolService.executeAddCollection.subscribe(
        (collection: Collection) => this.onExecuteAddCollection(collection)
      )
    );

    this.subscriptions.add(
      this.toolService.executeEditCollection.subscribe(
        (collection: Collection) => this.onExecuteEditCollection(collection)
      )
    );

    this.subscriptions.add(
      this.toolService.collectionsOpened.subscribe(
        () => this.onOpen()
      )
    );

    this.subscriptions.add(
      this.dataService.preferencesChanged.subscribe(
        (prefs) => {
          if (prefs) {
            this.preferences = prefs;
            this.changeDetectionRef.detectChanges();
          }
        }
      )
    );

    this.subscriptions.add(
      this.dataService.nwServersChanged.subscribe(
        apiServers => this.onNwServersChanged(apiServers)
      )
    );

    this.subscriptions.add(
      this.dataService.saServersChanged.subscribe(
         apiServers => this.onSaServersChanged(apiServers)
      )
    );

    this.subscriptions.add(
       this.dataService.selectedCollectionChanged.subscribe(
         (collection: Collection) => this.onSelectedCollectionChanged(collection)
      )
    );

    this.subscriptions.add(
      this.dataService.noopCollection.subscribe(
        () => {
          this.selectedCollection = undefined;
          this.changeDetectionRef.markForCheck();
          this.changeDetectionRef.detectChanges();
        }
      )
    );

    // dragula
    this.subscriptions.add(
      this.dragulaService.drop('first-bag').subscribe(
        ({ name, el, target, source, sibling }) => this.onDragulaDrop(name, el, target, source, sibling)
      )
    );
    this.subscriptions.add(
      this.dragulaService.drag('first-bag').subscribe(
        () => this.isDragging = true
      )
    );
    this.subscriptions.add(
      this.dragulaService.dragend('first-bag').subscribe(
        () => this.isDragging = false
      )
    );

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



  onNwServersChanged(servers: NwServers): void {
    if (Object.keys(servers).length === 0) {
      return;
    }
    this.nwServers = servers;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onSaServersChanged(servers: SaServers): void {
    if (Object.keys(servers).length === 0) {
      return;
    }
    this.saServers = servers;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onCollectionsChanged(collections: Collections): void {
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
      const selectedCollectionId = this.selectedCollection.id;
      if (selectedCollectionId in collections &&
        ( !('modifier' in this.selectedCollection) && 'modifier' in collections[selectedCollectionId] ) || // edited for the first time
        ( 'modifier' in this.selectedCollection && this.selectedCollection.modifier && this.selectedCollection.modifier.timestamp !== collections[selectedCollectionId].modifier?.timestamp ) // edited a subsequent time, and the timstamp changed
      ) {
        // initial state - created but not modifier
        // edited state - created exists, as does modifier
        this.dataService.selectedCollectionChanged.next(collections[selectedCollectionId]);
      }
    }

    Object.keys(collections).forEach( (id) => {
      // only keep collections for which the preferences have its service enabled
      const collection = collections[id];
      if (this.preferences && this.preferences.serviceTypes[collection.serviceType] === false) {
        delete collections[id];
      }
    });

    this.origCollections = collections;
    this.collections = Object.values(collections);

    log.debug('CollectionsComponent: onCollectionsChanged(): collections update', this.collections);
    this.filterChanged();
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();

  }



  onDragulaDrop(bagName: string, el: Element, target: Element, source: Element, sibling: Element): void {
    // Save the order of collections to local storage
    if (!this.droppedTargetCollectionId) {
      return;
    }
    log.debug('CollectionsComponent: onDragulaDrop()');

    if (this.collections.length !== this.displayedCollections.length) {
      // only do this if the user isn't filtering
      return;
    }

    // get collection id of dropped item
    const collectionId = el.getAttribute('collectionId');
    if (!collectionId) {
      log.error('Did not find \'collectionId\' attribute on element');
      return;
    }

    // first we need to un-screw the view and move our other cells to where we dropped it
    // select all elements in the row

    // work out where to place the moved row
    const targetCollectionId = this.droppedTargetCollectionId;

    // move the row
    const tempDisplayedCollections: Collection[] = [];
    if (targetCollectionId === collectionId) {
      // nothing changed - just return;
      return;
    }
    this.displayedCollections.forEach( (collection, i) => {
      if (collection.id === collectionId) {
        // do nothing - we'll insert it later
      }
      else if (collection.id === targetCollectionId && i === 0) {
        tempDisplayedCollections.push(this.origCollections[collectionId]);
        tempDisplayedCollections.push(collection);
      }
      else if (collection.id === targetCollectionId && i !== 0) {
        tempDisplayedCollections.push(collection);
        tempDisplayedCollections.push(this.origCollections[collectionId]);
      }
      else {
        tempDisplayedCollections.push(collection);
      }
    });
    this.displayedCollections = tempDisplayedCollections;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    const tempCollectionOrder = this.displayedCollections.map( (collection) => collection.id);
    this.toolService.setPreference('collectionOrder', JSON.stringify(tempCollectionOrder));

  }




  myDropModelFunc($event: Event) {
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
    log.debug('CollectionsComponent: onAddNwCollectionClick()');
    this.toolService.addNwCollectionNext.next();
    this.toolService.displayTabContainerModal.next(false);
    this.toolService.displayNwCollectionModal.next(true);
    this.toolService.reOpenTabsModal.next(true);
  }



  onAddSaCollectionClick(): void {
    // log.debug("CollectionsComponent: onAddNwCollectionClick()");
    this.toolService.addSaCollectionNext.next();
    this.toolService.displayTabContainerModal.next(false);
    this.toolService.reOpenTabsModal.next(true);
  }



  onEditCollectionClick(collection: Collection): void {
    log.debug('CollectionsComponent: onEditCollectionClick(): collection:', collection);
    if (collection.serviceType === 'nw') {
      this.toolService.editNwCollectionNext.next(collection);
      this.toolService.executeCollectionOnEdit.next(false);
      this.toolService.displayTabContainerModal.next(false);
      this.toolService.reOpenTabsModal.next(true);
      this.toolService.displayNwCollectionModal.next(true);
    }
    if (collection.serviceType === 'sa') {
      this.toolService.editSaCollectionNext.next(collection);
      this.toolService.executeCollectionOnEdit.next(false);
      this.toolService.displayTabContainerModal.next(false);
      this.toolService.reOpenTabsModal.next(true);
    }
  }



  async onDeleteCollectionConfirmed(collectionId: string): Promise<void> {
    log.debug('CollectionsComponent: onDeleteCollectionConfirmed()', {collectionId});
    await this.dataService.deleteCollection(collectionId);
  }



  onDeleteCollectionClick(collection: Collection): void {
    log.debug('CollectionsComponent: onDeleteCollectionClick()');
    this.confirmationService.confirm({
      message: `Are you sure you want to delete collection '${collection.name}'?  This operation cannot be undone.`,
      header: 'Please Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.onDeleteCollectionConfirmed(collection.id),
      key: this.confirmationKey,
      closeOnEscape: false
    });
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onExecuteAddCollection(collection: Collection) {
    log.debug('CollectionsComponent: onExectuteAddCollection()');
    this.onCollectionExecuted(collection);
  }




  onExecuteEditCollection(collection: Collection) {
    log.debug('CollectionsComponent: onExectuteEditCollection()');
    this.onCollectionEdited(collection);
  }



  onCollectionExecuted(collection: Collection): void {
    // only runs when we click a collection, add a new collection
    if (this.toolService.selectedCollection && this.toolService.selectedCollection.id === collection.id) {
      // user clicked on collection that was already selected, so just close the modal
      log.debug('CollectionsComponent: onCollectionExecuted(): collection was already selected - just closing modal.  collection:', collection);
      this.toolService.displayTabContainerModal.next(false);
      return;
    }
    log.debug('CollectionsComponent: onCollectionExecuted():', collection.id, collection);
    this.toolService.selectedCollection = collection;
    this.connectToCollection(collection);
    this.toolService.displayTabContainerModal.next(false);
  }



  onCollectionEdited(collection: Collection) {
    log.debug('CollectionsComponent: onCollectionEdited():', collection.id, collection);
    if (this.toolService.selectedCollection && this.toolService.selectedCollection.id === collection.id) {
      this.toolService.selectedCollection = collection;
    }
    // do nothing if we're just editing a collection we're not presently connected to or if no collection is selected
  }



  onGetCollectionDataAgain(): void {
    // triggered by router component when we switch between views
    log.debug('CollectionsComponent: onGetCollectionDataAgain()');
    if (!this.toolService.selectedCollection || (this.toolService.selectedCollection && !( this.toolService.selectedCollection.id in this.origCollections) ) ) {
      // selectedCollection should only ever be undefined if we close the window on first load without ever selecting a collection...
      // we need the second clause in case we delete a collection and switch views.  It would otherwise try to reload the deleted collection...
      // resulting in a server crash
      log.debug('CollectionsComponent: onGetCollectionDataAgain(): returning');
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
      this.toolService.deviceNumber.next({
        deviceNumber: collection.deviceNumber,
        nwserver: collection.nwserver
      });
    }

    if (['rolling', 'monitoring'].includes(collection.type)) {
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
      const collectionOrder = this.toolService.getJSONPreference('collectionOrder');

      const temp: Collection[] = [];
      const tempFound = new Set<string>();

      if (!collectionOrder) {
        // no pre-establish collection order exists, so just set displayedCollections to the list of collections
        this.displayedCollections = this.collections;
      }

      else {
        // build the collection list from the pre-established collection order
        const parsedCollectionOrder = collectionOrder as string[];
        // first, get the collections which are defined in the order
        parsedCollectionOrder.forEach( (id) => {
          if (id in this.origCollections) {
            temp.push(this.origCollections[id]);
            tempFound.add(id);
          }
        });

        // now add in any collections which aren't already defined in the order
        this.collections.forEach( (collection) => {
          if (!tempFound.has(collection.id)) {
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
      const tempCollections = this.collections.filter(
        (collection) => collection.name.toLocaleLowerCase().includes(this.filterText.toLocaleLowerCase())
      );
      this.displayedCollections = tempCollections;
      this.filterEnabled = true;
    }

    if (!this.showFixed || !this.showRolling || !this.showMonitoring) {
      // apply collection type mask
      this.filterEnabled = true;
      const displayedCollections = utils.deepCopy(this.displayedCollections);
      const tempCollections: Collection[] = [];
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



  toggleTypeFilter(type: CollectionType) {
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
    this.filterMenuItems[index].icon = this.filterMenuItems[index].icon === this.uncheckedClass ? this.checkedClass : this.uncheckedClass;
    this.showMenu = false;
    this.filterChanged();
  }



  toggleCollectionMaskMenu(event: MouseEvent) {
    log.debug('CollectionsComponent: toggleCollectionMaskMenu()');
    // we don't simply use the menu's toggle function as it's buggy.  Though if we manage ourselves, it works well
    this.lastEvent = event;
    if (this.showMenu) {
      this.collectionMaskMenuComponent.hide();
    }
    else {
      this.collectionMaskMenuComponent.show(event);
    }
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
