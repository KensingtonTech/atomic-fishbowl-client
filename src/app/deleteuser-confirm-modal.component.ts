import { Component, OnInit } from '@angular/core';
import { ModalService } from './modal/modal.service';
//import { LoggerService } from './logger-service';
import { ToolWidgetCommsService } from './tool-widget.comms.service';
import { Subject } from 'rxjs/Subject';
import { User } from './user';

@Component({
  selector: 'confirm-user-delete-modal',
  template: `
<modal id="{{id}}">
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

export class DeleteUserConfirmModalComponent implements OnInit {

  constructor(private modalService: ModalService,
              private toolService: ToolWidgetCommsService ) {}
              //private loggerService: LoggerService

  //@Input('collectionName') collectionName: any;
  private id: string = 'confirm-user-delete-modal';
  private user: User;

  ngOnInit(): void {
    this.toolService.userToDelete.subscribe( (u: User) => {this.user = u;} );
  }

  confirmDelete(): void {
    this.toolService.confirmUserDelete.next(this.user.id);
    this.closeModal();
  }

  cancelDelete(id: string) : void {
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

  /*keyDownFunction(event: any): void {
    console.log(event.keyCode);
  }
  */

}
