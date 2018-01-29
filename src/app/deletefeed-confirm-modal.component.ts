import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { DataService } from './data.service';
import { Subject } from 'rxjs/Subject';
import { Feed } from './feed';
import { Subscription } from 'rxjs/Subscription';
import * as log from 'loglevel';

@Component({
  selector: 'confirm-feed-delete-modal',
  template: `
<modal id="{{id}}" class="confirm-feed-delete-modal">
    <div class="modal">
      <div class="noselect">
          <div class="modal-body outer" style="top: 500px;">


              <div class="inner">

                <div *ngIf="feed" style="position: relative;">
                  Are you sure you want to delete feed <b>{{feed.name}}</b> ?
                </div>

                <div *ngIf="error" style="position: relative; top: 5px;">
                  The server reported an error when deleting the feed: {{error}}
                </div>

                <div style="position: relative;">
                  <button (click)="onConfirmDelete()">Confirm</button>
                  <button (click)="cancelDelete()">Cancel</button>
                </div>

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

  /*.inner {
    float:left;
    left:50%;
    background-color: yellow;
    position: relative;
  }*/

  .outer {
    width: 500px;
  }

  .inner {
    width: auto;
    display: flex;
    flex-direction: column;
    margin: 0 auto;
  }

  .centerthisdiv {
    position:relative;
    left: -50%;
    background-color: green;
    float:right;
    width:auto;
  }

  .modal-body {
    margin: initial;
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
          this.toolService.refreshFeeds.next();
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
