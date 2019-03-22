import { Component, Input } from '@angular/core';
import { ModalService } from './modal/modal.service';

@Component({
    selector: 'license-expired-modal, licenseexpiredmodal',
    template: `

<modal id="{{id}}" class="license-expired-modal" background="true" bodyClass="verfical-center" bodyStyle="width: 500px; background-color: rgba(255, 255, 255, 0.7);">

  <p style="font-weight: bold;">The Atomic Fishbowl license has expired. Only previously-built fixed collections will be accessible until a full license has been purchased.</p>

  <div style="float: right;">
    <p-button type="button" (onClick)="onCloseClicked()" label="Close"></p-button>
  </div>

</modal>
    `,
    styles: [`

    `]
})

export class LicenseExpiredModalComponent {

  constructor(private modalService: ModalService ) {}

  @Input() id: string;



  onCloseClicked() {
    this.modalService.close(this.id);
  }


}
