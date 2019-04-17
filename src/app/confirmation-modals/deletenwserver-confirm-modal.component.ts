import { Component, Input } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { ToolService } from 'services/tool.service';
import { Subscription } from 'rxjs';
import { NwServer } from 'types/nwserver';
import { DataService } from 'services/data.service';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'confirm-nwserver-delete-modal',
  template: `
<modal id="{{id}}" class="confirm-nwserver-delete-modal" (opened)="onOpen()" background="true" secondLevel="true" bodyClass="noselect modal-confirm">


  <div *ngIf="serverToDelete" style="text-align: left; line-height: 1.5; padding: 0.526315789em;">

    <div *ngIf="!error" ngPreserveWhitespaces style="display: inline-block;">Are you sure you want to delete NetWitness service "<b class="selectable">{{serverToDelete.friendlyName}}</b>" ?</div>

    <div *ngIf="error" style="white-space: pre-line;" ngPreserveWhitespaces>The server reported an error when deleting the collection:

      <b>{{error}}</b>
    </div>

  </div>

  <div style="float: right; padding-top: 0.526315789em;">
    <p-button type="button" (onClick)="confirmDelete()" label="Confirm"></p-button>&nbsp;
    <p-button type="button" (onClick)="cancelDelete()" label="Cancel"></p-button>
  </div>

</modal>
`
})

export class DeleteNwServerConfirmModalComponent {

  constructor(private modalService: ModalService,
              private toolService: ToolService,
              private dataService: DataService ) {}

  @Input() serverToDelete: NwServer;
  public id = this.toolService.confirmNwServerDeleteModalId;
  public error = '';


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
