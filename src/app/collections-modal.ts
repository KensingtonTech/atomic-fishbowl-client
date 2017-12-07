import { Component, OnInit, OnDestroy, ElementRef, Input, Output, EventEmitter, ViewChild, ViewChildren, QueryList, ViewEncapsulation } from '@angular/core';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
import { ModalService } from './modal/modal.service';
import { Subscription } from 'rxjs/Subscription';
import { NwServer } from './nwserver';
import { Collection } from './collection';
import * as utils from './utils';
import * as log from 'loglevel';

@Component({
  selector: 'collections-modal',
  templateUrl: './collections-modal.html',
  styles: [`
  `]
})

export class CollectionsModalComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private toolService: ToolService,
              private modalService: ModalService) {}

  @Input() public id: string;
  @Output() public showCreateFirstCollection: EventEmitter<boolean> = new EventEmitter<boolean>();
  public collections: Collection[];
  public selectedCollectionId: string = null;
  private getCollectionDataAgainSubscription: Subscription;
  private selectedCollectionChangedSubscription: Subscription;
  private collectionsChangedSubscription: Subscription;
  public nwServers: any = {};

  ngOnInit(): void {
    // this.getCollectionDataAgainSubscription = this.toolService.getCollectionDataAgain.subscribe( () => this.getCollectionDataAgain() );
    this.selectedCollectionChangedSubscription = this.dataService.selectedCollectionChanged.subscribe( (e: any) => this.selectedCollectionId = e.id );

    this.collectionsChangedSubscription = this.dataService.collectionsChanged.subscribe( (collections: any) => {
      // this.collections = collections;
      let tempCollections = [];

      for (let c in collections) {
        if (collections.hasOwnProperty(c)) {
          let collection = collections[c];
          // let option: SelectItem = { label: collection.name, value: collection.id };
          tempCollections.push(collection);
        }
      }
      this.collections = tempCollections;
      log.debug('CollectionsModalComponent: collectionsChangedSubscription: collections update', this.collections);
    });

    /*
    this.dataService.refreshCollections()
    .then( () => {
      // this.refreshed = true;
      if (Object.keys(this.collections).length !== 0 ) { // we only select a collection if there are collections
        // this.selectedCollectionId = this.getFirstCollection();
        this.onCollectionSelected({ value: this.selectedCollectionId });
        this.toolService.deviceNumber.next( { deviceNumber: this.collections[this.selectedCollectionId].deviceNumber, nwserver:  this.collections[this.selectedCollectionId].nwserver } );
        this.showCollections = true;
      }
      else {
        // this.showCreateFirstCollection = true;
        this.showCreateFirstCollection.emit(true);
      }
    });
    */

    this.getNwServers();
  }

  private getNwServers(): Promise<any> {
    // log.debug("CollectionsModalComponent: getNwServers()");
    return this.dataService.getNwServers()
      .then( n => {
        // setTimeout( () => {
          log.debug('CollectionsModalComponent: getNwServers(): nwServers:', n);
          this.nwServers = n;
          // log.debug("AddCollectionModalComponent: getNwServers(): this.nwServers:", this.nwServers);
      });
  }

  ngOnDestroy(): void {
    this.getCollectionDataAgainSubscription.unsubscribe();
    this.selectedCollectionChangedSubscription.unsubscribe();
    this.collectionsChangedSubscription.unsubscribe();
    // this.collectionStateChangedSubscription.unsubscribe();
    // this.errorPublishedSubscription.unsubscribe();
    // this.queryResultsCountUpdatedSubscription.unsubscribe();
    // this.useCasesChangedSubscription.unsubscribe();
    // this.executeAddCollectionSubscription.unsubscribe();
    // this.executeEditCollectionSubscription.unsubscribe();
  }

  public onOpen(): void {
    this.getNwServers();
  }

  public cancelledEventReceived(): void {

  }

  public closeModal(): void {
    this.modalService.close(this.id);
  }

  public collectionDoubleClicked(collection): void {
    log.debug('CollectionsModalComponent: collectionDoubleClicked: collection:', collection);

  }

  public onSelectionChanged($event): void {
    let selectedCollections = $event.value;
    log.debug('CollectionsModalComponent: onSelectionChanged: selectedCollections:', selectedCollections);
  }

  public checkNwServerExists(id: string) {
    if (id in this.nwServers) {
      return true;
    }
    return false;
  }

}
