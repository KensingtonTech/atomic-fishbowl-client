import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { DataService } from './data.service';
import { Subject, Subscription } from 'rxjs';
import { Feed } from './feed';
declare var log;

@Component({
  selector: 'confirm-feed-delete-modal',
  template: `
<modal id="{{id}}" class="confirm-feed-delete-modal">
  <div class="modal">
    <div class="modal-body noselect" style="top: 500px;">

      <div>

        <div *ngIf="feed" style="position: relative;">
          Are you sure you want to delete feed <b>{{feed.name}}</b> ?
        </div>

        <div *ngIf="error" style="position: relative; top: 5px;">
          The server reported an error when deleting the feed: {{error}}
        </div>

        <div style="float: right; margin-top: 15px;">
          <button pButton type="button" (click)="onConfirmDelete()" label="Confirm"></button>
          <button pButton type="button" (click)="cancelDelete()" label="Cancel"></button>
        </div>

      </div>

    </div>
  </div>
  <div class="modal-background"></div>
</modal>
  `,
  styles: [`

  .confirm-feed-delete-modal .modal {
      z-index: 1100;
    }

  .confirm-feed-delete-modal .modal-background {
    opacity: 0.85;

    /* z-index must be below .modal and above everything else  */
    z-index: 1050 !important;
  }

  .modal-body {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  `]
})

export class DeleteFeedConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService,
              private dataService: DataService  ) {}

  @Input('id') public id: string;
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
