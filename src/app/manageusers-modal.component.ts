import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, NgZone, ViewChild, ElementRef } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { AuthenticationService } from 'services/authentication.service';
import { ModalService } from './modal/modal.service';
import { User } from 'types/user';
import { Subscription } from 'rxjs';
import * as utils from './utils';
import { Logger } from 'loglevel';
declare var log: Logger;



@Component({
  selector: 'manage-users-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './manageusers-modal.component.html',
  styles: [`

    /*tr.table-body:nth-child(odd) {background: #CCC;}
    tr.table-body:nth-child(even) {background: #FFF;}*/

    .cell {
      padding-left: .3em;
    }

    .evenRow {
      background-color: #FFF;
    }

    .oddRow {
      background-color: #CCC;
    }

    .header {
      font-weight: bold;
      background-color: #CCC;
    }

    .center {
      width: 100%;
      text-align: center;
    }

    .fa-check {
      color: green;
    }

    .fa-ban {
      color: red;
    }

  `]
})



export class ManageUsersModalComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService,
              private authService: AuthenticationService,
              private changeDetectionRef: ChangeDetectorRef,
              private zone: NgZone ) {}

  public id = this.toolService.manageeUsersModalId;
  public editingUser: User;
  public addingUser = true; // controls the mode of the add/edit modal (i.e. either adding or editing mode).  if true, we're adding a user.  If false, we're editing a user
  public users: User[];
  public errorDefined = false;
  public errorMessage: string;
  public userToDelete: User;
  public utils = utils;

  @ViewChild('userTable') private userTableRef: ElementRef;
  @ViewChild('emptyRow') private emptyRowTemplateRef;

  // Subscriptions
  private subscriptions = new Subscription;



  ngOnInit(): void {
    log.debug('ManageUsersModalComponent: ngOnInit');

    this.subscriptions.add(this.toolService.confirmUserDelete.subscribe( (id: string) => { this.onDeleteUserConfirmed(id); } ));

    this.subscriptions.add(this.dataService.usersChanged.subscribe( users => this.onUsersChanged(users) ));

    this.changeDetectionRef.markForCheck();
  }



  public ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }



  close(): void {
    this.modalService.close(this.id);
  }



  onClosed(): void {
    // log.debug('ManageUsersModalComponent: onClosed()');
  }



  onUsersChanged(users: User[]): void {
    if (Object.keys(users).length === 0) {
      return;
    }
    this.users = users;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onAddUserClicked(): void {
    log.debug('ManageUsersModalComponent: onAddUserClicked()');
    this.addingUser = true;
    this.changeDetectionRef.detectChanges();
    this.modalService.open(this.toolService.newEditUserModalId);
  }



  onEditUserClicked(user: User): void {
    log.debug('ManageUsersModalComponent: onEditUserClicked():', user);
    this.editingUser = user;
    this.addingUser = false;
    this.changeDetectionRef.detectChanges();
    this.modalService.open(this.toolService.newEditUserModalId);
  }



  findUser(id: string): User {
    for (let x = 0; x < this.users.length; x++) {
      let user = this.users[x];
      if (user.id === id) {
        return user;
      }
    }
  }



  onDeleteUserClicked(user: User): void {
    log.debug('ManageUsersModalComponent: deleteUser(): user:', user);
    if (this.authService.loggedInUser.id !== user.id) {
      this.errorDefined = false;
      this.userToDelete = user;
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
      this.modalService.open(this.toolService.confirmUserDeleteModalId);
    }
    else {
      // log.debug("deleteUser(" + id + "): cannot delete logged in user!");
      this.errorMessage = 'Cannot delete logged in user!';
      this.errorDefined = true;
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    }
  }



  onDeleteUserConfirmed(id: string): void {
    log.debug('ManageUsersModalComponent: deleteUserConfirmed(id)', id);
    this.dataService.deleteUser(id);
  }



  onOpen(): void {
    log.debug('ManageUsersModalComponent: onOpen()');
  }

}
