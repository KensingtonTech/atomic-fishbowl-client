import { Component, Input } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { ToolService } from 'services/tool.service';
import { NwServer } from 'types/nwserver';
import { DataService } from 'services/data.service';
import * as log from 'loglevel';

@Component({
  selector: 'confirm-nwserver-delete-modal',
  templateUrl: './deletenwserver-confirm-modal.component.html'
})

export class DeleteNwServerConfirmModalComponent {

  constructor(private modalService: ModalService,
              private toolService: ToolService,
              private dataService: DataService ) {}

  @Input() serverToDelete: NwServer;
  id = this.toolService.confirmNwServerDeleteModalId;
  error = '';


  confirmDelete(): void {
    this.dataService.deleteNwServer(this.serverToDelete.id)
                    .then( () => this.closeModal() )
                    .catch( (res) => {
                      log.error('There was an error when deleting the collection:', res);
                      this.error = res.error;
                    });
  }

  cancelDelete(): void {
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

  onOpen() {
    this.error = '';
  }

}
