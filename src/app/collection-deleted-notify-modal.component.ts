import { Component, Input } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from 'services/tool.service';

@Component({
  selector: 'collection-deleted-notify-modal',
  template: `
<modal id="{{id}}" class="confirm-feed-delete-modal" background="true" secondLevel="true" bodyClass="noselect modal-confirm">
  <ng-container *ngIf="user">

    Ever so sorry, but your chosen collection has been deleted by user <b>{{user}}</b><br>

    <div style="float: right; margin-top: 0.789473684em;">
      <p-button type="button" (onClick)="closeModal()" label="OK"></p-button>
    </div>

  </ng-container>
</modal>
  `,
  styles: [` `]
})

export class CollectionDeletedNotifyModalComponent {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  @Input() user: string = null;
  id = this.toolService.collectionDeletedModalId;

  onOpen(): void {}


  closeModal(): void {
    this.modalService.close(this.id);
  }

}
