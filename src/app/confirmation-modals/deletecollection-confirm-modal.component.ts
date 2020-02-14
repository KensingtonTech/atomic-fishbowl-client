import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { Subscription } from 'rxjs';
import { ToolService } from 'services/tool.service';
import { Collection } from 'types/collection';
import * as log from 'loglevel';

@Component({
  selector: 'delete-collection-confirm-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<modal id="{{id}}" class="delete-collection-confirm-modal" background="true" secondLevel="true" bodyClass="noselect modal-confirm">

  <div>
    <p>Are you sure you want to delete collection <b>{{collection?.name}}</b> ?</p>
    <p>This operation cannot be undone.</p>
  </div>
  <div style="float: right;">
    <p-button type="button" (onClick)="deleteConfirmed()" label="Confirm"></p-button>&nbsp;<p-button type="button" (onClick)="cancelDelete()" label="Cancel"></p-button>
  </div>

</modal>
`
})

export class DeleteCollectionConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolService ) {}

  public id = this.toolService.confirmCollectionDeleteModalId;
  public collection: Collection;
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
