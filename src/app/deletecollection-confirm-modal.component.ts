import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { ModalService } from './modal/modal.service';
import * as log from 'loglevel';
import { Subscription } from 'rxjs/Subscription';
import { ToolService } from './tool.service';
import { Collection } from './collection';

@Component({
  selector: 'delete-collection-confirm-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<modal id="{{id}}" class="delete-collection-confirm-modal">>
    <div class="modal">
      <div class="noselect">
          <!--<div class="modal-body" style="top: 30px; left: 120px; margin: 0; width: 350px;">-->
          <div class="modal-body" style="top: 500px; width: 600px;">
            <div>
              <p>Are you sure you want to delete collection <b>{{collection?.name}}</b>?</p>
              <p>This operation cannot be undone.</p>
            </div>
            <div style="float: right;">
              <button (click)="deleteConfirmed()">Confirm</button>
              <button (click)="cancelDelete()">Cancel</button>
            </div>
          </div>
        </div>
    </div>
    <div class="modal-background"></div>
</modal>
  `,
  styles: [`
    .delete-collection-confirm-modal .modal {
        z-index: 1100;
      }

    .delete-collection-confirm-modal .modal-background {
      opacity: 0.85;

      /* z-index must be below .modal and above everything else  */
      z-index: 1050 !important;
    }
  `]
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
