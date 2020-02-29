import { Component } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from 'services/tool.service';

@Component({
  selector: 'logged-out-notify-modal',
  template: `
<modal id="{{id}}" class="logged-out-delete-modal" background="true" bodyClass="logged-out-modal-body noselect modal-confirm">
  <ng-container>

    <br><b>You have been logged out of Atomic Fishbowl due to logon token expiry</b><br><br>

    <div style="float: right; margin-top: 0.789473684em;">
      <p-button type="button" (onClick)="closeModal()" label="OK"></p-button>
    </div>

  </ng-container>
</modal>
  `
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
