import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { ToolService } from 'services/tool.service';
import { Subscription } from 'rxjs';
import { SaServer } from 'types/saserver';
import { DataService } from 'services/data.service';

@Component({
  selector: 'confirm-saserver-delete-modal',
  templateUrl: './deletesaserver-confirm-modal.component.html'
})

export class DeleteSaServerConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService,
              private dataService: DataService ) {}

  id = this.toolService.confirmSaServerDeleteModalId;
  apiServer: SaServer;
  error: string = null;
  private subscriptions = new Subscription;

  ngOnInit(): void {
    this.subscriptions.add(this.toolService.saServerToDelete.subscribe( (server: SaServer) => { this.apiServer = server; }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
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
