import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { Subscription } from 'rxjs';
import { ToolService } from 'services/tool.service';
import { Collection } from 'types/collection';
import * as log from 'loglevel';

@Component({
  selector: 'delete-collection-confirm-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './deletecollection-confirm-modal.component.html'
})

export class DeleteCollectionConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolService ) {}

  id = this.toolService.confirmCollectionDeleteModalId;
  collection: Collection;
  private subscriptions = new Subscription;

  ngOnInit(): void {
    this.subscriptions.add(this.toolService.deleteCollectionNext.subscribe( (collection: Collection) => this.collection = collection ));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  deleteConfirmed(): void {
    log.debug('DeleteCollectionConfirmModalComponent: deleteConfirmed(): collection:', this.collection);
    this.toolService.deleteCollectionConfirmed.next(this.collection['id']);
    this.closeModal();
  }

  cancelDelete(): void {
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

  /*keyDownFunction(event: any): void {
    log.debug(event.keyCode);
  }*/

}
