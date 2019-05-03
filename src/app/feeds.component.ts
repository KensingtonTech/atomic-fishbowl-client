import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { ModalService } from './modal/modal.service';
import { Subscription } from 'rxjs';
import { Feed } from 'types/feed';
import * as utils from './utils';
import { Logger } from 'loglevel';
declare var log: Logger;

interface FeedStatus {
  good: boolean;
  time: number; // from new Date().getTime(), in UTC
}

@Component({
  selector: 'feeds',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feeds.component.html',
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

export class FeedsComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private toolService: ToolService,
              private modalService: ModalService,
              private changeDetectionRef: ChangeDetectorRef ) {}

  public feeds: Feed[];
  public displayedFeeds: Feed[];
  private utils = utils;
  public filterText = '';
  private reOpenTabsModal = false;
  public feedStatus = {};
  private feedStatusInterval: number;

  // Subscriptions
  private subscriptions = new Subscription;



  ngOnInit(): void {

    this.subscriptions.add(this.dataService.feedsChanged.subscribe( (feeds) => this.onFeedsChanged(feeds) ));

    this.subscriptions.add(this.toolService.feedsOpened.subscribe( () => this.onOpen() ));

    this.subscriptions.add(this.toolService.tabContainerClosed.subscribe( () => this.onClose() ));

    this.subscriptions.add(this.dataService.feedStatusChanged.subscribe( feedStatus => this.onFeedStatusChanged(feedStatus) ));
  }



  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }



  onFeedStatusChanged(feedStatus): void {
    if (Object.keys(feedStatus).length === 0) {
      return;
    }
    this.feedStatus = feedStatus;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
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
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  public onOpen(): void {}



  public onClose(): void {}



  onAddFeedClick(): void {
    log.debug('FeedsComponent: onAddFeedClick()');
    this.toolService.addFeedNext.next();
    this.modalService.close(this.toolService.tabContainerModalId);
    this.toolService.reOpenTabsModal.next(true);
    this.modalService.open(this.toolService.feedWizardModalId);
  }



  onEditFeedClick(feed: Feed): void {
    log.debug('FeedsComponent: onEditFeedClick(): feed:', feed);
    this.toolService.editFeedNext.next(feed);
    this.modalService.close(this.toolService.tabContainerModalId);
    this.toolService.reOpenTabsModal.next(true);
    this.modalService.open(this.toolService.feedWizardModalId);
  }



  onDeleteFeedClick(feed: Feed): void {
    log.debug('FeedsComponent: onDeleteFeedClick()');
    this.toolService.deleteFeedNext.next(feed);
    this.modalService.open(this.toolService.confirmDeleteFeedModalId);
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
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  public clearFilter(): void {
    this.filterText = '';
    this.filterChanged();
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  public ifStatusExists(id: string): boolean {
    // log.debug('FeedsComponent: ifStatusExists(): feedStatus:', this.feedStatus);
    if (id in this.feedStatus) {
      return true;
    }
    return false;
  }

}
