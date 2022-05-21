import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { AuthenticationService } from 'services/authentication.service';
import { User } from 'types/user';
import { Subscription } from 'rxjs';
import * as utils from '../utils';
import * as log from 'loglevel';
import { ConfirmationService } from 'primeng/api';



@Component({
  selector: 'app-manage-users-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './manage-users-modal.component.html',
  styleUrls: [
    './manage-users-modal.component.scss'
  ]
})



export class ManageUsersModalComponent implements OnInit, OnDestroy {

  constructor(
    private dataService: DataService,
    private toolService: ToolService,
    private authService: AuthenticationService,
    private changeDetectionRef: ChangeDetectorRef,
    private confirmationService: ConfirmationService
  ) {}

  selectedUser: User;
  mode: 'new' | 'edit' = 'new';
  users: User[];
  errorDefined = false;
  errorMessage: string;
  userToDelete: User;
  utils = utils;
  confirmationKey = 'ManageUsersModal';

  // Dialog Control
  displayAddUserModal = false;

  // Subscriptions
  private subscriptions = new Subscription();



  ngOnInit(): void {
    log.debug('ManageUsersModalComponent: ngOnInit');

    this.subscriptions.add(
      this.dataService.usersChanged.subscribe(
        users => this.onUsersChanged(users)
      )
    );

    this.changeDetectionRef.markForCheck();
  }



  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }



  close(): void {
    this.toolService.displayManageUsersModal.next(false);
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
    this.mode = 'new';
    this.displayAddUserModal = true;
    this.changeDetectionRef.detectChanges();
  }



  onEditUserClicked(user: User): void {
    log.debug('ManageUsersModalComponent: onEditUserClicked():', user);
    this.selectedUser = user;
    this.mode = 'edit';
    this.displayAddUserModal = true;
    this.changeDetectionRef.detectChanges();
  }



  onDeleteUserClicked(event: Event, user: User): void {
    log.debug('ManageUsersModalComponent: deleteUser(): user:', user);
    if (this.authService.loggedInUser?._id !== user._id) {
      this.errorDefined = false;
      this.userToDelete = user;
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
      this.confirmationService.confirm({
        target: event.target as HTMLElement,
        message: `Are you sure you want to delete user '${user.username}'?`,
        accept: () => this.onDeleteUserConfirmed(user._id),
        key: this.confirmationKey
      });
    }
    else {
      this.errorMessage = 'Cannot delete the logged-in user';
      this.errorDefined = true;
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    }
  }



  async onDeleteUserConfirmed(userId: string): Promise<void> {
    log.debug('ManageUsersModalComponent: deleteUserConfirmed()', {userId});
    try {
      await this.dataService.deleteUser(userId);
    }
    catch (error: any) {
      log.error(error);
      throw error;
    }
  }

}
