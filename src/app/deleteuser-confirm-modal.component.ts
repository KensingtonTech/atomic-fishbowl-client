import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subject } from 'rxjs/Subject';
import { User } from './user';
declare var log: any;

@Component({
  selector: 'confirm-user-delete-modal',
  template: `
<modal id="{{id}}" class="confirm-user-delete-modal">
    <div class="modal">
      <div class="noselect">
          <div class="modal-body" style="width: 350px;">
            <div *ngIf="user">
              <p>Are you sure you want to delete user {{user.username}}?</p>
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

  .confirm-user-delete-modal .modal {
      z-index: 1100;
    }

  .confirm-user-delete-modal .modal-background {
    opacity: 0.85;

    /* z-index must be below .modal and above everything else  */
    z-index: 1050 !important;
  }

  `]
})

export class DeleteUserConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  public id = 'confirm-user-delete-modal';
  public user: User;
  private userToDeleteSubscription: any;

  ngOnInit(): void {
    this.userToDeleteSubscription = this.toolService.userToDelete.subscribe( (u: User) => { this.user = u; });
  }

  public ngOnDestroy() {
    this.userToDeleteSubscription.unsubscribe();
  }

  confirmDelete(): void {
    this.toolService.confirmUserDelete.next(this.user.id);
    this.closeModal();
  }

  cancelDelete(): void {
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

}
