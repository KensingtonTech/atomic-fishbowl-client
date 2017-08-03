import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { LoggerService } from './logger-service';

@Component({
  selector: 'delete-collection-confirm-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<modal id="{{id}}">
    <div class="modal">
      <div class="noselect">
          <div class="modal-body" style="width: 350px;">
            <div>
              <p>Are you sure you want to delete collection {{collectionName}}?</p>
              <p>This operation cannot be undone.</p>
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
    .noselect {
      -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
      -khtml-user-select: none; /* Konqueror HTML */
      -moz-user-select: none; /* Firefox */
      -ms-user-select: none; /* Internet Explorer/Edge */
      user-select: none; /* Non-prefixed version, currently supported by Chrome and Opera */
    }
  `]
})

export class DeleteCollectionConfirmModalComponent {

  constructor(private modalService: ModalService,
              private _changeDetectionRef: ChangeDetectorRef,
              private loggerService: LoggerService) {}

  @Input('collectionName') collectionName: any;
  @Output('confirmDelete') confirmDeleteEvent: EventEmitter<any> = new EventEmitter();
  private id: string = 'collection-confirm-delete-modal';

  confirmDelete(): void {
    this.confirmDeleteEvent.emit();
    this.closeModal();
  }

  cancelDelete(id: string) : void {
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

  keyDownFunction(event: any): void {
    console.log(event.keyCode);
  }

}
