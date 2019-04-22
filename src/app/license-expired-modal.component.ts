import { Component, Input } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from 'services/tool.service';

@Component({
    selector: 'license-expired-modal, licenseexpiredmodal',
    template: `

<modal id="{{id}}" class="license-expired-modal" background="true" bodyClass="license-expired-modal-body modal-confirm">

  <p style="font-weight: bold;">The Atomic Fishbowl license has expired. Only previously-built fixed collections will be accessible until a full license has been purchased.</p>

  <div style="float: right;">
    <p-button type="button" (onClick)="onCloseClicked()" label="Close"></p-button>
  </div>

</modal>
    `
})

export class LicenseExpiredModalComponent {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  public id = this.toolService.licenseExpiredModalId;



  onCloseClicked() {
    this.modalService.close(this.id);
  }


}
