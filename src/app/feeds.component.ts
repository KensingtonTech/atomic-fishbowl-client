import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { DataService } from './data.service';
import { ToolService } from './tool.service';
import { ModalService } from './modal/modal.service';
import { Subscription } from 'rxjs';
import { Feed } from './feed';
import * as utils from './utils';
declare var log;

interface FeedStatus {
  good: boolean;
  time: number; // from new Date().getTime(), in UTC
}

@Component({
  selector: 'feeds',
  templateUrl: './feeds.component.html',
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

    .feedToolbar {
      position: absolute;
      top: -30px;
      right: 50px;
      width: auto;
    }
  `]
})

export class FeedsComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private toolService: ToolService,
              private modalService: ModalService ) {}

  public feeds: Feed[];
  public displayedFeeds: Feed[];
  private utils = utils;
  public feedWizardModalId = 'feed-wizard-modal';
  public filterText = '';
  private reOpenTabsModal = false;
  public deleteFeedModalId = 'deleteFeedConfirmModalId';
  public feedStatus = {};
  private feedStatusInterval: number;
  private tabContainerModalId = 'tab-container-modal';

  // Subscriptions
  private feedsChangedSubscription: Subscription;
  private feedsOpenedSubscription: Subscription;
  private tabContainerClosedSubscription: Subscription;
  private feedStatusChangedSubscription: Subscription;



  ngOnInit(): void {

    this.feedsChangedSubscription = this.dataService.feedsChanged.subscribe( (feeds) => this.onFeedsChanged(feeds) );

    this.feedsOpenedSubscription = this.toolService.feedsOpened.subscribe( () => this.onOpen() );

    this.tabContainerClosedSubscription = this.toolService.tabContainerClosed.subscribe( () => this.onClose() );

    this.feedStatusChangedSubscription = this.dataService.feedStatusChanged.subscribe( feedStatus => this.onFeedStatusChanged(feedStatus) );
  }



  ngOnDestroy(): void {
    this.feedsChangedSubscription.unsubscribe();
    this.feedsOpenedSubscription.unsubscribe();
    this.tabContainerClosedSubscription.unsubscribe();
    this.feedStatusChangedSubscription.unsubscribe();
  }



  onFeedStatusChanged(feedStatus): void {
    if (Object.keys(feedStatus).length === 0) {
      return;
    }
    this.feedStatus = feedStatus;
  }



  onFeedsChanged(feeds) {
    if (Object.keys(feeds).length === 0) {
      this.feeds = [];
      this.filterChanged();
      return;
    }
    let tempFeeds: Feed[] = [];
    for (let n in feeds) {
      if (feeds.hasOwnProperty(n)) {
        tempFeeds.push(feeds[n]);
      }
    }
    this.feeds = tempFeeds;
    this.filterChanged();
  }



  public onOpen(): void {}



  public onClose(): void {}



  onAddFeedClick(): void {
    log.debug('FeedsComponent: onAddFeedClick()');
    this.toolService.addFeedNext.next();
    this.modalService.close(this.tabContainerModalId);
    this.toolService.reOpenTabsModal.next(true);
    this.modalService.open(this.feedWizardModalId);
  }



  onEditFeedClick(feed: Feed): void {
    log.debug('FeedsComponent: onEditFeedClick(): feed:', feed);
    this.toolService.editFeedNext.next(feed);
    this.modalService.close(this.tabContainerModalId);
    this.toolService.reOpenTabsModal.next(true);
    this.modalService.open(this.feedWizardModalId);
  }



  onDeleteFeedClick(feed: Feed): void {
    log.debug('FeedsComponent: onDeleteFeedClick()');
    this.toolService.deleteFeedNext.next(feed);
    this.modalService.open(this.deleteFeedModalId);
  }



  public filterChanged(): void {
    // log.debug('FeedsComponent: filterChanged(): filterText:', this.filterText);
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



  public ifStatusExists(id: string): boolean {
    // log.debug('FeedsComponent: ifStatusExists(): feedStatus:', this.feedStatus);
    if (id in this.feedStatus) {
      return true;
    }
    return false;
  }

}
