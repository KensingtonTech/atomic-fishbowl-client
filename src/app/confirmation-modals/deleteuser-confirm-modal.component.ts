import { Component, Input } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { ToolService } from 'services/tool.service';
import { User } from 'types/user';

@Component({
  selector: 'confirm-user-delete-modal',
  templateUrl: './deleteuser-confirm-modal.component.html'
})

export class DeleteUserConfirmModalComponent {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  @Input() user: User;
  id = this.toolService.confirmUserDeleteModalId;

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
