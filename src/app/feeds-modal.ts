import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
import { ModalService } from './modal/modal.service';
import { Subscription } from 'rxjs/Subscription';
import { Feed } from './feed';
import * as utils from './utils';
import * as log from 'loglevel';

interface FeedStatus {
  good: boolean;
  time: number; // from new Date().getTime(), in UTC
}

@Component({
  selector: 'feeds-modal',
  templateUrl: './feeds-modal.html',
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
    /*.ui-inputgroup {
      display: inline-block;
    }*/
  `]
})

export class FeedsModalComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private toolService: ToolService,
              private modalService: ModalService ) {}

  @Input() public id: string;
  public feeds: Feed[];
  public displayedFeeds: Feed[];
  private utils = utils;
  public feedWizardModalId = 'feed-wizard-modal';
  public filterText = '';
  private reOpenCollectionsModal = false;
  public deleteFeedModalId = 'deleteFeedConfirmModalId';
  public feedStatus = {};
  private feedStatusInterval: number;

  // Subscriptions
  private feedsChangedSubscription: Subscription;
  private reOpenCollectionsModalSubscription: Subscription;
  private refreshFeedsSubscription: Subscription;

  ngOnInit(): void {
    /*
    this.getCollectionDataAgainSubscription = this.toolService.getCollectionDataAgain.subscribe( () => this.getCollectionDataAgain() );

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
      log.debug('FeedsModalComponent: collectionsChangedSubscription: collections update', this.collections);
    });

    this.deleteCollectionConfirmedSubscription = this.toolService.deleteCollectionConfirmed.subscribe( (collectionId: string) => this.deleteConfirmed(collectionId) );

    this.executeAddCollectionSubscription = this.toolService.executeAddCollection.subscribe( (collection: Collection) => {
      this.collectionExecuted(collection);
    });

    this.executeEditCollectionSubscription = this.toolService.executeEditCollection.subscribe( (collection: Collection) => {
      this.collectionExecuted(collection);
    });
    */

    this.feedsChangedSubscription = this.dataService.feedsChanged.subscribe( (feeds) => {
      let tempFeeds: Feed[] = [];
      for (let n in feeds) {
        if (feeds.hasOwnProperty(n)) {
          tempFeeds.push(feeds[n]);
        }
      }
      this.feeds = tempFeeds;
      this.filterChanged();
    } );

    this.reOpenCollectionsModalSubscription = this.toolService.reOpenCollectionsModal.subscribe( (TorF) => this.reOpenCollectionsModal = TorF );

    this.refreshFeedsSubscription = this.toolService.refreshFeeds.subscribe( () => this.getFeeds() );

    this.getFeeds();
    this.getFeedStatus();
  }

  ngOnDestroy(): void {
    this.feedsChangedSubscription.unsubscribe();
    this.reOpenCollectionsModalSubscription.unsubscribe();
    this.refreshFeedsSubscription.unsubscribe();
  }

  private getFeeds(): void {
    log.debug('FeedsModalComponent: getNwServers()');
    this.dataService.getFeeds();
  }

  public onOpen(): void {
    this.getFeedStatus();
    this.feedStatusInterval = window.setInterval( () => this.getFeedStatus(), 10 * 1000 );
    this.getFeeds();
        // .then( () => this.filterChanged() );
  }

  public cancelledEventReceived(): void {
    if (this.reOpenCollectionsModal) {
      this.modalService.open('collections-modal');
    }
  }

  public closeModal(): void {
    window.clearInterval(this.feedStatusInterval);
    this.modalService.close(this.id);
    if (this.reOpenCollectionsModal) {
      this.modalService.open('collections-modal');
    }
  }

  onAddFeedClick(): void {
    log.debug('FeedsModalComponent: onAddFeedClick()');
    this.toolService.addFeedNext.next();
    this.modalService.close(this.id);
    this.toolService.reOpenFeedsModal.next(true);
    this.modalService.open(this.feedWizardModalId);
    this.toolService.reOpenCollectionsModal.next(true);
  }

  onEditFeedClick(feed: Feed): void {
    log.debug('FeedsModalComponent: onEditFeedClick(): feed:', feed);
    this.toolService.editFeedNext.next(feed);
    this.modalService.close(this.id);
    this.toolService.reOpenFeedsModal.next(true);
    this.modalService.open(this.feedWizardModalId);
  }


  deleteConfirmed(collectionId: string): void {
    log.debug('FeedsModalComponent: deleteConfirmed(): Received deleteConfirmed event');
    // there are two paths - deleting the currently selected collection, or deleting the collection which isn't selected

    /*
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
    */
  }

  onDeleteFeedClick(feed: Feed): void {
    log.debug('FeedsModalComponent: onDeleteFeedClick()');
    this.toolService.deleteFeedNext.next(feed);
    this.modalService.open(this.deleteFeedModalId);
  }

  /*
  collectionExecuted(collection: Collection): void {
    // only runs when we add a new collection or edit an existing collection
    log.debug('FeedsModalComponent: collectionExecuted():', collection.id, collection);
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
                      this.modalService.close(this.id);
                    });
  }
  */

  public filterChanged(): void {
    // log.debug('FeedsModalComponent: filterChanged(): filterText:', this.filterText);
    if (this.filterText === '') {
      this.displayedFeeds = this.feeds;
    }
    else {
      let tempFeeds: Feed[] = [];
      for (let i = 0; i < this.feeds.length; i++) {
        let feed = this.feeds[i];
        if (feed.name.toLocaleLowerCase().includes(this.filterText.toLocaleLowerCase())) {
          tempFeeds.push(feed);
        }
      }
      this.displayedFeeds = tempFeeds;
    }
  }

  public clearFilter(): void {
    this.filterText = '';
    this.filterChanged();
  }

  private getFeedStatus(): void {
    this.dataService.getFeedStatus()
        .then( res => {
          // log.debug('FeedsModalComponent: getFeedStatus(): res:', res);
          this.feedStatus = res;
        })
        .catch( err => log.error('Caught error getting feed status:', err) );
  }

  public ifStatusExists(id: string): boolean {
    // log.debug('FeedsModalComponent: ifStatusExists(): feedStatus:', this.feedStatus);
    if (id in this.feedStatus) {
      return true;
    }
    return false;
  }

}
