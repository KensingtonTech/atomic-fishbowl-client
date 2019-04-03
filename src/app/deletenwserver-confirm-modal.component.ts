import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from 'services/tool.service';
import { Subject, Subscription } from 'rxjs';
import { NwServer } from 'types/nwserver';
import { DataService } from 'services/data.service';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'confirm-nwserver-delete-modal',
  template: `
<modal id="{{id}}" class="confirm-nwserver-delete-modal" (opened)="onOpen()" background="true" secondLevel="true" bodyClass="noselect" bodyStyle="top: 500px; width: 700px;">
  <div *ngIf="nwServer" style="text-align: center;">
    <p>Are you sure you want to delete NetWitness service <b>{{nwServer.friendlyName}}</b> ?</p>
  </div>
  <div *ngIf="error">
    There was an error when deleting the collection: {{error}}
  </div>
  <div style="float: right;">
    <button (click)="confirmDelete()">Confirm</button>
    <button (click)="cancelDelete()">Cancel</button>
  </div>
</modal>
  `,
  styles: [` `]
})

export class DeleteNwServerConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService,
              private dataService: DataService ) {}

  public id = 'confirm-nwserver-delete-modal';
  public nwServer: NwServer;
  private nwServerToDeleteSubscription: Subscription;
  public error: string = null;

  ngOnInit(): void {
    this.nwServerToDeleteSubscription = this.toolService.nwServerToDelete.subscribe( (server: NwServer) => { this.nwServer = server; });
  }

  public ngOnDestroy() {
    this.nwServerToDeleteSubscription.unsubscribe();
  }

  confirmDelete(): void {
    // this.toolService.confirmNwServerDelete.next(this.nwServer.id);
    this.dataService.deleteNwServer(this.nwServer.id)
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
