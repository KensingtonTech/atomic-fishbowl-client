import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, ElementRef, Input, Output, EventEmitter, Renderer, ViewChild, ViewChildren, QueryList, ViewEncapsulation } from '@angular/core';
import { DataService } from './data.service';
import { AuthenticationService } from './authentication.service';
import { ModalService } from './modal/modal.service';
import { NgForm } from '@angular/forms';
import { UUID } from 'angular2-uuid';
import { User } from './user';
import { LoggerService } from './logger-service';
import { ToolWidgetCommsService } from './tool-widget.comms.service';
declare var moment: any;
import "rxjs/add/operator/takeWhile";

@Component({
  selector: 'manage-users-modal',
  //changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,

  templateUrl: './manageusers-modal.component.html',
  styles: [`
    .column1 {
      white-space: nowrap;
      width: 1px;
    }

    .noselect {
      -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
      -khtml-user-select: none; /* Konqueror HTML */
      -moz-user-select: none; /* Firefox */
      -ms-user-select: none; /* Internet Explorer/Edge */
      user-select: none; /* Non-prefixed version, currently supported by Chrome and Opera */
    }

    .ourFont {
      font-family: system-ui !important;
      font-size: 11px !important;
    }

    .ui-radiobutton-label {
      font-size: 14px;
    }

    .ui-radiobutton-box.ui-state-active {
      background-color: rgb(59, 153, 252);
    }

    .ui-tooltip {
      width: 275px;
      word-wrap: normal;
    }

    tr.table-body:nth-child(odd) {background: #CCC;}
    tr.table-body:nth-child(even) {background: #FFF;}

  `]
})

export class ManageUsersModalComponent implements OnInit, OnDestroy {

  constructor(private dataService : DataService,
              private modalService: ModalService,
              private renderer: Renderer,
              private changeDetectionRef: ChangeDetectorRef,
              private loggerService: LoggerService,
              private toolService: ToolWidgetCommsService,
              private authService: AuthenticationService ) {}

  public id: string = 'accounts-modal';
  @ViewChild('addUserBox') addUserBoxRef: ElementRef;
  @ViewChild('editUserBox') editUserBoxRef: ElementRef;
  @ViewChildren('userInAdd') userInAddRef: QueryList<any>;
  @ViewChildren('userInEdit') userInEditRef: QueryList<any>;
  private enabledTrigger: string;
  public formDisabled: boolean = false;
  public errorDefined: boolean = false;
  private errorMessage: string;
  private alive: boolean = true;

  public users: any = [];

  public addUserFormModel = {
    user: '',
    fullname: '',
    password: '',
    passwordConfirm: '',
    email: '',
    enabled: true
  }

  public editUserFormModel = {
    user: '',
    fullname: '',
    password: '',
    passwordConfirm: '',
    email: '',
    enabled: true,
    id: ''
  }

  private displayCustomTimeframeSelector: boolean = false;


  ngOnInit(): void {
    this.getUsers();
    this.toolService.confirmUserDelete.takeWhile(() => this.alive).subscribe( (id: string) => {this.deleteUserConfirmed(id);} );
  }

  public ngOnDestroy() {
    this.alive = false;
  }

  displayUserAddBox(): void {
    this.errorDefined = false;
    this.renderer.setElementStyle(this.addUserBoxRef.nativeElement, 'display', 'block');
    this.formDisabled = true;
    //setTimeout( () => this.hostNameRef.first.nativeElement.focus(), .2 );
    this.userInAddRef.first.nativeElement.focus();
  }

  private editingUser: User;

  displayUserEditBox(user: any): void {
    console.log("ManageUsersModalComponent: displayUserEditBox():", user);
    this.errorDefined = false;
    this.editingUser = user;
    this.renderer.setElementStyle(this.editUserBoxRef.nativeElement, 'display', 'block');
    this.formDisabled = true;
    //setTimeout( () => this.hostNameRef.first.nativeElement.focus(), .2 );
    this.editUserFormModel.user = user.username;
    this.editUserFormModel.fullname = user.fullname;
    this.editUserFormModel.email = user.email;
    this.editUserFormModel.enabled = user.enabled;
    this.editUserFormModel.id = user.id;
    this.userInEditRef.first.nativeElement.focus();
  }

  hideUserAddBox(): void {
    this.renderer.setElementStyle(this.addUserBoxRef.nativeElement, 'display', 'none');
    this.addUserFormModel.user = '';
    this.addUserFormModel.password = ''
    this.addUserFormModel.email = '';
    this.formDisabled = false;
  }

  hideUserEditBox(): void {
    this.renderer.setElementStyle(this.editUserBoxRef.nativeElement, 'display', 'none');
    this.editUserFormModel.user = '';
    this.editUserFormModel.fullname = '';
    this.editUserFormModel.password = '';
    this.editUserFormModel.passwordConfirm = '';
    this.editUserFormModel.email = '';
    this.formDisabled = false;
  }

  cancel() : void {
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

  cancelledEventReceived(): void {
    console.log("ManageUsersModalComponent: cancelledEventReceived()");
  }

  getUsers(): void {
    this.dataService.getUsers().then(n => {
                                            //console.log("ManageUsersModalComponent: getUsers():", n);
                                            this.users = n;
                                            this.changeDetectionRef.markForCheck();
                                          });
  }

  addUser(form: NgForm): void {
    this.hideUserAddBox();
    let newUser = {
      username: form.value.user,
      fullname: form.value.fullname,
      password: form.value.password,
      email: form.value.email,
      enabled: form.value.enabled
    }
    console.log("ManageUsersModalComponent: newUser:", newUser);
    this.dataService.addUser(newUser)
                    .then( () => this.getUsers() );
  }

  editUser(form: NgForm): void {
    console.log('ManageUsersModalComponent: editUser()', form);
    //this.errorDefined = false;
    this.hideUserEditBox();
    let updatedUser: User = new User;
    updatedUser.id = this.editingUser.id;
    if (this.editingUser.fullname != form.value.fullname) updatedUser.fullname = form.value.fullname;
    if (this.editingUser.email != form.value.email) updatedUser.email = form.value.email;
    if (this.editingUser.enabled != form.value.enabled) updatedUser.enabled = form.value.enabled;
    if ('passwordConfirm' in form.value && form.value.passwordConfirm !== '') updatedUser.password = form.value.password;
    console.log("updatedUser:", updatedUser);
    this.dataService.updateUser(updatedUser)
                    .then( () => this.getUsers() );
  }

  findUser(id: string): User {
    for (let x=0; x < this.users.length; x++) {
      let u = this.users[x];
      if (u.id === id) return u;
    }
  }

  deleteUser(id: string): void {
    console.log("ManageUsersModalComponent: deleteUser():", id);
    if (this.authService.loggedInUser.id !== id) {
      this.errorDefined = false;
      this.toolService.userToDelete.next( this.findUser(id) );
      this.modalService.open('confirm-user-delete-modal');
    }
    else {
      //console.log("deleteUser(" + id + "): cannot delete logged in user!");
      this.errorMessage = "Cannot delete logged in user!"
      this.errorDefined = true;
    }
  }

  deleteUserConfirmed(id: string): void {
    console.log("ManageUsersModalComponent: deleteUserConfirmed(id)", id);
    this.dataService.deleteUser(id)
                    .then ( () => this.getUsers() );
  }

  onOpen(): void {
    console.log("ManageUsersModalComponent: onOpen()");
    this.errorDefined = false;
    this.getUsers();
  }


}
