import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subject } from 'rxjs/Subject';
import { NwServer } from './nwserver';
import { Subscription } from 'rxjs/Subscription';
import { DataService } from './data.service';
import * as log from 'loglevel';

@Component({
  selector: 'confirm-nwserver-delete-modal',
  template: `
<modal id="{{id}}" class="confirm-nwserver-delete-modal" (opened)="onOpen()">
    <div class="modal">
      <div class="noselect">
          <div class="modal-body" style="top: 500px; width: 700px;">
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
          </div>
        </div>
    </div>
    <div class="modal-background"></div>
</modal>
  `,
  styles: [`

  .confirm-nwserver-delete-modal .modal {
      z-index: 1100;
    }

  .confirm-nwserver-delete-modal .modal-background {
    opacity: 0.85;

    /* z-index must be below .modal and above everything else  */
    z-index: 1050 !important;
  }

  `]
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
