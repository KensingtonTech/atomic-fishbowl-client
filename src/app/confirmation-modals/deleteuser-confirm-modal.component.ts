import { Component, Input } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { ToolService } from 'services/tool.service';
import { User } from 'types/user';

@Component({
  selector: 'confirm-user-delete-modal',
  template: `
<modal id="{{id}}" background="true" secondLevel="true" modalClass="confirm-user-delete-modal" bodyClass="confirm-user-delete-modal-body noselect modal-confirm">
  <div *ngIf="user">
    Are you sure you want to delete user <b>{{user.username}}?</b>
  </div>
  <div style="float: right; padding-top: 0.526315789em;">
    <p-button (onClick)="confirmDelete()" label="Confirm"></p-button>&nbsp;
    <p-button (onClick)="cancelDelete()" label="Cancel"></p-button>
  </div>
</modal>
`
})

export class DeleteUserConfirmModalComponent {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  @Input() user: User;
  public id = this.toolService.confirmUserDeleteModalId;

  confirmDelete(): void {
    this.toolService.confirmUserDelete.next(this.user.id);
    this.closeModal();
  }

  cancelDelete(): void {
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

}
