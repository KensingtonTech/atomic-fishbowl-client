import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from 'services/tool.service';
import { DataService } from 'services/data.service';
import { Subscription } from 'rxjs';
import { Feed } from 'types/feed';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'confirm-feed-delete-modal',
  template: `
<modal id="{{id}}" class="confirm-feed-delete-modal" background="true" secondLevel="true" bodyClass="centerWithinDiv noselect" bodyStyle="top: 500px;">

  <div>

    <div *ngIf="feed" style="position: relative;">
      Are you sure you want to delete feed <b>{{feed.name}}</b> ?
    </div>

    <div *ngIf="error" style="position: relative; top: 5px;">
      The server reported an error when deleting the feed: {{error}}
    </div>

    <div style="float: right; margin-top: 15px;">
      <p-button type="button" (onClick)="onConfirmDelete()" label="Confirm"></p-button>&nbsp;<p-button type="button" (onClick)="cancelDelete()" label="Cancel"></p-button>
    </div>

  </div>

</modal>
  `,
  styles: [` `]
})

export class DeleteFeedConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService,
              private dataService: DataService  ) {}

  @Input() public id: string;
  public feed: Feed;
  private deleteFeedNextSubscription: Subscription;
  public error = '';

  ngOnInit(): void {
    this.deleteFeedNextSubscription = this.toolService.deleteFeedNext.subscribe( (feed: Feed) => { this.feed = feed; });
  }

  ngOnDestroy(): void {
    this.deleteFeedNextSubscription.unsubscribe();
  }

  onOpen(): void {
    this.error = '';
  }

  onConfirmDelete(): void {
    this.dataService.deleteFeed(this.feed.id)
        .then( () => {
          this.closeModal();
        })
        .catch( (err) => {
          log.error('DeleteFeedConfirmModalComponent: onConfirmDelete(): err:', err);
          this.error = err.error.error;
        });
  }

  cancelDelete(): void {
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

}
