import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subject, Subscription } from 'rxjs';
import { User } from './user';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'confirm-user-delete-modal',
  template: `
<modal id="{{id}}" class="confirm-user-delete-modal" secondLevel="true" bodyClass="noselect" background="true" bodyStyle="width: 350px;">
  <div *ngIf="user">
    <p>Are you sure you want to delete user {{user.username}}?</p>
  </div>
  <div style="float: right;">
    <button (click)="confirmDelete()">Confirm</button>
    <button (click)="cancelDelete()">Cancel</button>
  </div>
</modal>
  `,
  styles: [` `]
})

export class DeleteUserConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  public id = 'confirm-user-delete-modal';
  public user: User;
  private userToDeleteSubscription: Subscription;

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
