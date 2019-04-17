import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { ToolService } from 'services/tool.service';
import { Subscription } from 'rxjs';
import { SaServer } from 'types/saserver';
import { DataService } from 'services/data.service';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'confirm-saserver-delete-modal',
  template: `
<modal id="{{id}}" class="confirm-saserver-delete-modal" (opened)="onOpen()" background="true" secondLevel="true" bodyClass="noselect modal-confirm">
  <div *ngIf="apiServer" style="text-align: center;">
    <p>Are you sure you want to delete SA service <b>{{apiServer.friendlyName}}</b> ?</p>
  </div>
  <div *ngIf="error">
    There was an error when deleting the collection: {{error}}
  </div>
  <div style="float: right;">
    <p-button (onClick)="confirmDelete()" label="Confirm"></p-button>
    <p-button (onClick)="cancelDelete()" label="Cancel"></p-button>
  </div>
</modal>
  `
})

export class DeleteSaServerConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService,
              private dataService: DataService ) {}

  public id = this.toolService.confirmSaServerDeleteModalId;
  public apiServer: SaServer;
  private saServerToDeleteSubscription: Subscription;
  public error: string = null;

  ngOnInit(): void {
    this.saServerToDeleteSubscription = this.toolService.saServerToDelete.subscribe( (server: SaServer) => { this.apiServer = server; });
  }

  public ngOnDestroy() {
    this.saServerToDeleteSubscription.unsubscribe();
  }

  confirmDelete(): void {
    // this.toolService.confirmSaServerDelete.next(this.apiServer.id);
    this.dataService.deleteSaServer(this.apiServer.id)
                    .then( () => this.closeModal() )
                    .catch( (res) => {
                      // log.error('There was an error when deleting the collection')
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
    this.error = null;
  }

}
