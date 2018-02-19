import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subject } from 'rxjs/Subject';
import { SaServer } from './saserver';
import { Subscription } from 'rxjs/Subscription';
import { DataService } from './data.service';
import * as log from 'loglevel';

@Component({
  selector: 'confirm-saserver-delete-modal',
  template: `
<modal id="{{id}}" class="confirm-saserver-delete-modal" (opened)="onOpen()">
    <div class="modal">
      <div class="noselect">
          <div class="modal-body" style="top: 500px; width: 700px;">
            <div *ngIf="apiServer" style="text-align: center;">
              <p>Are you sure you want to delete NetWitness service <b>{{apiServer.friendlyName}}</b> ?</p>
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

  .confirm-saserver-delete-modal .modal {
      z-index: 1100;
    }

  .confirm-saserver-delete-modal .modal-background {
    opacity: 0.85;

    /* z-index must be below .modal and above everything else  */
    z-index: 1050 !important;
  }

  `]
})

export class DeleteSaServerConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService,
              private dataService: DataService ) {}

  public id = 'confirm-saserver-delete-modal';
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
