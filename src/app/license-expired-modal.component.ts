import { Component } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from 'services/tool.service';

@Component({
    selector: 'license-expired-modal, licenseexpiredmodal',
    templateUrl: './license-expired-modal.component.html'
})

export class LicenseExpiredModalComponent {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  id = this.toolService.licenseExpiredModalId;



  onCloseClicked() {
    this.modalService.close(this.id);
  }


}
