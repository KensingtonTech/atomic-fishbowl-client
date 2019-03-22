import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { DataService } from './data.service';
import { Subscription } from 'rxjs';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'collection-deleted-notify-modal',
  template: `
<modal id="{{id}}" class="confirm-feed-delete-modal" background="true" secondLevel="true" bodyClass="centerWithinDiv noselect" bodyStyle="top: 500px;">
  <div>

    <div style="position: relative;">
      Ever so sorry, but your chosen collection has been deleted by user <b>{{user}}</b>
    </div>

    <div style="float: right; margin-top: 15px;">
      <p-button type="button" (click)="closeModal()" label="OK"></p-button>
    </div>

  </div>
</modal>
  `,
  styles: [` `]
})

export class CollectionDeletedNotifyModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private dataService: DataService  ) {}

  public id = 'collection-deleted-notify-modal';
  private collectionDeletedSubscription: Subscription;
  public user: string = null;

  ngOnInit(): void {
    this.collectionDeletedSubscription = this.dataService.collectionDeleted.subscribe( (user) => {
      this.user = user;
      this.modalService.open(this.id);
    } );
  }

  ngOnDestroy(): void {
    this.collectionDeletedSubscription.unsubscribe();
  }

  onOpen(): void {}


  closeModal(): void {
    this.modalService.close(this.id);
  }

}
