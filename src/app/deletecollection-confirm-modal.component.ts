import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { Subscription } from 'rxjs';
import { ToolService } from './tool.service';
import { Collection } from './collection';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'delete-collection-confirm-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<modal id="{{id}}" class="delete-collection-confirm-modal" background="true" secondLevel="true" bodyClass="centerWithinDiv noselect" bodyStyle="top: 500px;">

  <div>
    <p>Are you sure you want to delete collection <b>{{collection?.name}}</b> ?</p>
    <p>This operation cannot be undone.</p>
  </div>
  <div style="float: right;">
    <p-button type="button" (click)="deleteConfirmed()" label="Confirm"></p-button>&nbsp;<p-button type="button" (click)="cancelDelete()" label="Cancel"></p-button>
  </div>

</modal>
  `,
  styles: [` `]
})

export class DeleteCollectionConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolService ) {}

  public id = 'collection-confirm-delete-modal';
  private deleteCollectionNextSubscription: Subscription;
  public collection: Collection;

  ngOnInit(): void {
    this.deleteCollectionNextSubscription = this.toolService.deleteCollectionNext.subscribe( (collection: Collection) => this.collection = collection );
  }

  ngOnDestroy(): void {
    this.deleteCollectionNextSubscription.unsubscribe();
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
