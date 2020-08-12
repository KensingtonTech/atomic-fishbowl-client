import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { ToolService } from 'services/tool.service';
import { DataService } from 'services/data.service';
import { Subscription } from 'rxjs';
import { Feed } from 'types/feed';
import * as log from 'loglevel';

@Component({
  selector: 'confirm-feed-delete-modal',
  templateUrl: './deletefeed-confirm-modal.component.html'
})

export class DeleteFeedConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService,
              private dataService: DataService  ) {}

  id = this.toolService.confirmDeleteFeedModalId;
  feed: Feed;
  error = '';
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
