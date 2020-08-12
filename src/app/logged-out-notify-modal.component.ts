import { Component } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from 'services/tool.service';

@Component({
  selector: 'logged-out-notify-modal',
  templateUrl: './logged-out-notify-modal.component.html'
})

export class LoggedOutNotifyModalComponent {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  id = this.toolService.loggedOutModalId;

  onOpen(): void {}


  closeModal(): void {
    this.modalService.close(this.id);
  }

}
