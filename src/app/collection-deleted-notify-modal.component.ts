import { Component, Input } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'collection-deleted-notify-modal',
  template: `
<modal id="{{id}}" class="confirm-feed-delete-modal" background="true" secondLevel="true" bodyClass="centerWithinDiv noselect" bodyStyle="top: 500px;">
  <div *ngIf="user">

    <div style="position: relative;">
      Ever so sorry, but your chosen collection has been deleted by user <b>{{user}}</b>
    </div>

    <div style="float: right; margin-top: 15px;">
      <p-button type="button" (onClick)="closeModal()" label="OK"></p-button>
    </div>

  </div>
</modal>
  `,
  styles: [` `]
})

export class CollectionDeletedNotifyModalComponent {

  constructor(private modalService: ModalService) {}

  @Input() id;
  @Input() user: string = null;

  onOpen(): void {}


  closeModal(): void {
    this.modalService.close(this.id);
  }

}
