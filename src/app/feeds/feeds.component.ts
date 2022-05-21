import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { Subscription } from 'rxjs';
import { Feed, Feeds, FeedState } from 'types/feed';
import { ConfirmationService } from 'primeng/api';
import * as log from 'loglevel';

@Component({
  selector: 'app-feeds',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feeds.component.html',
  styleUrls: [
    './feeds.component.scss'
  ]
})

export class FeedsComponent implements OnInit, OnDestroy {

  constructor(
    private dataService: DataService,
    private toolService: ToolService,
    private changeDetectionRef: ChangeDetectorRef,
    private confirmationService: ConfirmationService
  ) {}

  feeds: Feed[];
  displayedFeeds: Feed[];
  filterText = '';
  feedStatus: Record<string, FeedState> = {};
  confirmationKey = 'FeedsComponent';

  // Subscriptions
  private subscriptions = new Subscription();



  ngOnInit(): void {

    this.subscriptions.add(
      this.dataService.feedsChanged.subscribe(
        (feeds) => this.onFeedsChanged(feeds)
      )
    );

    this.subscriptions.add(
      this.toolService.feedsOpened.subscribe(
        () => this.onOpen()
      )
    );

    this.subscriptions.add(
      this.toolService.tabContainerClosed.subscribe(
        () => this.onClose()
      )
    );

    this.subscriptions.add(
      this.dataService.feedStatusChanged.subscribe(
        feedStatus => this.onFeedStatusChanged(feedStatus)
      )
    );
  }



  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }



  onFeedStatusChanged(feedStatus: Record<string, FeedState>): void {
    if (Object.keys(feedStatus).length === 0) {
      return;
    }
    this.feedStatus = feedStatus;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onFeedsChanged(feeds: Feeds) {
    if (Object.keys(feeds).length === 0) {
      this.feeds = [];
      this.filterChanged();
      return;
    }
    const tempFeeds: Feed[] = [];
    for (const n in feeds) {
      if (feeds.hasOwnProperty(n)) {
        tempFeeds.push(feeds[n]);
      }
    }
    this.feeds = tempFeeds;
    this.filterChanged();
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onOpen(): void {}



  onClose(): void {}



  onAddFeedClick(): void {
    log.debug('FeedsComponent: onAddFeedClick()');
    this.toolService.addFeedNext.next();
    this.toolService.displayTabContainerModal.next(false);
    this.toolService.reOpenTabsModal.next(true);
    this.toolService.displayFeedWizardModal.next(true);
  }



  onEditFeedClick(feed: Feed): void {
    log.debug('FeedsComponent: onEditFeedClick(): feed:', feed);
    this.toolService.editFeedNext.next(feed);
    this.toolService.displayTabContainerModal.next(false);
    this.toolService.reOpenTabsModal.next(true);
    this.toolService.displayFeedWizardModal.next(true);
  }



  onDeleteFeedClick(feed: Feed): void {
    log.debug('FeedsComponent: onDeleteFeedClick()');
    this.confirmationService.confirm({
      message: `Are you sure you want to delete feed ${feed.name}?  This operation cannot be undone.`,
      header: 'Please Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.onDeleteFeedConfirmed(feed.id),
      key: this.confirmationKey,
      closeOnEscape: false
    });
  }



  async onDeleteFeedConfirmed(feedId: string): Promise<void> {
    try {
      await this.dataService.deleteFeed(feedId);
    }
    catch (error: any) {
      log.error('DeleteFeedConfirmModalComponent: onConfirmDelete(): err:', error);
      throw error;
      // this.error = error?.error?.error ?? error?.error ?? error;
    }
  }



  filterChanged(): void {
    // log.debug('FeedsComponent: filterChanged(): filterText:', this.filterText);
    if (this.filterText === '') {
      this.displayedFeeds = this.feeds;
    }
    else {
      const tempFeeds = this.feeds.filter(
        (feed) => feed.name.toLocaleLowerCase().includes(this.filterText.toLocaleLowerCase())
      );
      this.displayedFeeds = tempFeeds;
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  clearFilter(): void {
    this.filterText = '';
    this.filterChanged();
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  ifStatusExists(id: string): boolean {
    // log.debug('FeedsComponent: ifStatusExists(): feedStatus:', this.feedStatus);
    if (id in this.feedStatus) {
      return true;
    }
    return false;
  }

}
