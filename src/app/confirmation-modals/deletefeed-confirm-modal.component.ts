import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { ToolService } from 'services/tool.service';
import { DataService } from 'services/data.service';
import { Subscription } from 'rxjs';
import { Feed } from 'types/feed';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'confirm-feed-delete-modal',
  template: `
<modal id="{{id}}" class="confirm-feed-delete-modal" background="true" secondLevel="true" bodyClass="noselect modal-confirm">

  <div style="text-align: left; line-height: 1.5; padding: 0.526315789em;">

    <div *ngIf="feed && !error">
      Are you sure you want to delete feed "<b>{{feed.name}}</b>" ?
    </div>

    <div *ngIf="error" style="position: relative; top: 0.263157895em; white-space: pre-line;">
      The server reported an error when deleting the feed:

      <b>{{error}}</b>
    </div>

  </div>

  <div style="float: right; margin-top: 0.789473684em;">
    <p-button type="button" (onClick)="onConfirmDelete()" label="Confirm"></p-button>&nbsp;<p-button type="button" (onClick)="cancelDelete()" label="Cancel"></p-button>
  </div>

</modal>
`
})

export class DeleteFeedConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService,
              private dataService: DataService  ) {}

  public id = this.toolService.confirmDeleteFeedModalId;
  public feed: Feed;
  public error = '';
  private subscriptions = new Subscription;

  ngOnInit(): void {
    this.subscriptions.add(this.toolService.deleteFeedNext.subscribe( (feed: Feed) => { this.feed = feed; }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
