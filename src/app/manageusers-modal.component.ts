import { Component, OnInit, OnDestroy, ElementRef, Input, Output, EventEmitter, ViewChild, ViewChildren, QueryList, ViewEncapsulation } from '@angular/core';
import { DataService } from './data.service';
import { AuthenticationService } from './authentication.service';
import { ModalService } from './modal/modal.service';
import { AbstractControl, NgForm, FormBuilder, FormControl, FormGroup, Validators, FormGroupDirective } from '@angular/forms';
import { UUID } from 'angular2-uuid';
import { User } from './user';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs/Subscription';
import { ErrorStateMatcher } from '@angular/material/core';
import * as log from 'loglevel';
declare var JSEncrypt: any;

function passwordMatcher(c: AbstractControl) {
  return c.get('password').value === c.get('passwordConfirm').value ? null : {'nomatch': true};
}

function userExists(c: AbstractControl) {
  // log.debug('userExists:', c);
  if (this.users) {
    for (let i = 0; i < this.users.length; i++) {
      const user = this.users[i];
      if ( c.value === user.username ) {
        return { 'userexists': true };
      }
    }
  }
  return null;
}

function spaceValidator(c: AbstractControl) {
  const v = c.value;
  if ( v.match(/\s/g) ) {
    return { 'spaceexists': true };
  }
  return null;
}

function emailValidator(c: AbstractControl) {
  const EMAIL_REGEXP = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  // if (!EMAIL_REGEXP.test(email)) {
  if (!c.value.match(EMAIL_REGEXP) && c.value.length !== 0) {
      return { 'notemail': true };
  }
  return null;
}

function isNotLoggedInUser(c: AbstractControl) {
  // log.debug('isNotLoggedInUser', c);
  // if ( this.authService && c.get('username') && this.authService.loggedInUser.id !== c.get('username').value ) {
  if ( this.authService && this.editingUser &&  this.authService.loggedInUser.username === this.editingUser.username && c.value === false ) {
    // log.debug('returning isloggedinuser');
    return { 'isloggedinuser': true };
  }
  // log.debug('returning null');
  return null;
}

export class AddUserPasswordMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    if (form.form.controls.passwords.hasError('nomatch') && form.control.controls.passwords.get('password').dirty && form.control.controls.passwords.get('passwordConfirm').dirty ) {
      return true;
    }
    if (form.form.controls.passwords.get('password').hasError('minlength') && form.control.controls.passwords.get('password').dirty && form.control.controls.passwords.get('passwordConfirm').dirty ) {
      return true;
    }
    return false;
  }
}

export class EditUserPasswordMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    if (form.form.controls.passwords.hasError('nomatch') && form.control.controls.passwords.get('password').dirty && form.control.controls.passwords.get('passwordConfirm').dirty ) {
      return true;
    }
    if (form.form.controls.passwords.get('password').hasError('minlength') && form.control.controls.passwords.get('password').dirty && form.control.controls.passwords.get('passwordConfirm').dirty ) {
      return true;
    }
    return false;
  }
}

@Component({
  selector: 'manage-users-modal',
    // encapsulation: ViewEncapsulation.None,
  templateUrl: './manageusers-modal.component.html',
  styles: [`

    .myForm {
      width: 500px;
    }

    .full-width {
      width: 100%;
    }

    .column1 {
      white-space: nowrap;
      width: 1px;
    }

    .ourFont {
      font-family: system-ui, -apple-system, BlinkMacSystemFont !important;
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

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService,
              private authService: AuthenticationService,
              public fb: FormBuilder ) {}

  public id = 'accounts-modal';
  @ViewChildren('userInAdd') userInAddRef: QueryList<any>; // used to focus input on element
  @ViewChildren('userInEdit') userInEditRef: QueryList<any>; // used to focus input on element
  private enabledTrigger: string;
  public usersFormDisabled = false;
  public errorDefined = false;
  private errorMessage: string;
  private editingUser: User;
  public users: User[];
  public minPasswordLength = 8;
  public minUsernameLength = 3;
  public displayUserAddForm = false;
  public displayUserEditForm = false;
  public addUserForm: FormGroup;
  public editUserForm: FormGroup;
  private pubKey: string;
  private encryptor: any = new JSEncrypt();
  public editUserPasswordMatcher = new EditUserPasswordMatcher();
  public addUserPasswordMatcher = new AddUserPasswordMatcher();

  // Subscriptions
  private confirmUserDeleteSubscription: Subscription;
  private publicKeyChangedSubscription: Subscription;
  private usersUpdatedSubscription: Subscription;

  ngOnInit(): void {
    log.debug('ManageUsersModalComponent: ngOnInit');

    this.publicKeyChangedSubscription = this.dataService.publicKeyChanged.subscribe( key => this.onPublicKeyChanged(key) );

    this.addUserForm = this.fb.group({
      username: ['', Validators.compose( [ Validators.required, spaceValidator, Validators.minLength(this.minUsernameLength), userExists.bind(this)]) ],
      fullname: '',
      email: ['', emailValidator],
      passwords: this.fb.group({
        password: ['', Validators.compose( [ Validators.required, Validators.minLength(this.minPasswordLength) ]) ],
        passwordConfirm: ['', Validators.required]
      }, { validator: passwordMatcher }),
      enabled: true
    });

    this.editUserForm = this.fb.group({
      id: '',
      username: '',
      fullname: '',
      email: ['', emailValidator],
      passwords: this.fb.group({
        password: ['', Validators.minLength(this.minPasswordLength)],
        passwordConfirm: ''
      }, { validator: passwordMatcher }),
      enabled: [true, isNotLoggedInUser.bind(this)]
    });

    this.confirmUserDeleteSubscription = this.toolService.confirmUserDelete.subscribe( (id: string) => { this.deleteUserConfirmed(id); } );

    this.usersUpdatedSubscription = this.dataService.usersChanged.subscribe( users => this.onUsersUpdated(users) );
  }

  public ngOnDestroy() {
    this.confirmUserDeleteSubscription.unsubscribe();
    this.publicKeyChangedSubscription.unsubscribe();
    this.usersUpdatedSubscription.unsubscribe();
  }



  onPublicKeyChanged(key: string) {
    if (!key) {
      return;
    }
    this.encryptor.log = true;
    this.pubKey = key;
    this.encryptor.setPublicKey(this.pubKey);
  }


/////////////////////////////////////////////////////////////////
                      // Add User //
/////////////////////////////////////////////////////////////////

  displayUserAddBox(): void {
    log.debug('ManageUsersModalComponent: displayUserAddBox(): this.addUserForm:', this.addUserForm);
    this.errorDefined = false;
    this.displayUserAddForm = true;
    this.usersFormDisabled = true;
    setTimeout( () => { this.userInAddRef.first.nativeElement.focus(); }, 10);
  }

  addUserSubmit(): void {
    log.debug('ManageUsersModalComponent: addUserSubmit: this.addUserForm:', this.addUserForm);
    this.hideUserAddBox();
    let encPassword = this.encryptor.encrypt(this.addUserForm.value.passwords.password);
    const newUser = {
      username: this.addUserForm.value.username,
      fullname: this.addUserForm.value.fullname,
      // password: this.addUserForm.value.passwords.password,
      password: encPassword,
      email: this.addUserForm.value.email,
      enabled: this.addUserForm.value.enabled
    };
    log.debug('ManageUsersModalComponent: addUserSubmit(): newUser:', newUser);
    this.addUserForm.patchValue({
      username: '',
      email: '',
      fullname: '',
      passwords: {
        password: '',
        passwordConfirm: ''
      },
      enabled: true
    });
    this.dataService.addUser(newUser);
  }

  hideUserAddBox(): void {
    this.displayUserAddForm = false;
    this.usersFormDisabled = false;
  }



/////////////////////////////////////////////////////////////////
                      // Edit User //
/////////////////////////////////////////////////////////////////
  displayUserEditBox(user: any): void {
    log.debug('ManageUsersModalComponent: displayUserEditBox():', user);

    if (!this.displayUserAddForm) {
      this.errorDefined = false;
      this.editingUser = user;

      this.editUserForm.patchValue({
        id: user.id,
        username: user.username,
        email: user.email,
        fullname: user.fullname,
        passwords: {
          password: '',
          passwordConfirm: ''
        },
        enabled: user.enabled
      });

      this.displayUserEditForm = true;
      this.usersFormDisabled = true;

      setTimeout( () => { this.userInEditRef.first.nativeElement.focus(); }, 10);
    }
  }

  editUserSubmit(form: any): void {
    log.debug('ManageUsersModalComponent: editUserSubmit()', form);
    // log.debug('editUserForm:', this.editUserForm);
    let updatedUser: User = new User;
    updatedUser.id = this.editingUser.id;
    if ( this.editingUser.fullname !== form.value.fullname ) {updatedUser.fullname = form.value.fullname; }
    if ( this.editingUser.email !== form.value.email ) { updatedUser.email = form.value.email; }
    if ( this.editingUser.enabled !== form.value.enabled ) { updatedUser.enabled = form.value.enabled; }
    // if ('passwordConfirm' in form.value && form.value.passwordConfirm !== '') { updatedUser.password = form.value.password; }
    if ( form.controls.passwords.dirty && form.value.passwords.password.length !== 0 ) {
      // updatedUser.password = form.value.passwords.password;
      let encPassword = this.encryptor.encrypt(form.value.passwords.password);
      updatedUser.password = encPassword;
    }
    // log.debug('updatedUser:', updatedUser);
    this.dataService.updateUser(updatedUser);
    this.hideUserEditBox();
  }

  hideUserEditBox(): void {
    this.displayUserEditForm = false;
    this.editUserForm.patchValue({
      email: '',
      fullname: '',
      passwords: {
        password: '',
        passwordConfirm: ''
      },
      enabled: true
    });
    this.usersFormDisabled = false;
  }

  public disableEditUserSubmitButton(): boolean {
    if (this.editUserForm.pristine) { return true; }
    if (this.editUserForm.invalid && this.editUserForm.dirty) { return true; }
    return false;
  }







  cancel(): void {
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

  cancelledEventReceived(): void {
    log.debug('ManageUsersModalComponent: cancelledEventReceived()');
  }

  onUsersUpdated(users): void {
    if (Object.keys(users).length === 0) {
      return;
    }
    this.users = users;
  }

  findUser(id: string): User {
    for (let x = 0; x < this.users.length; x++) {
      const u = this.users[x];
      if (u.id === id) { return u; }
    }
  }

  deleteUser(id: string): void {
    log.debug('ManageUsersModalComponent: deleteUser():', id);
    if (!this.displayUserAddForm && !this.displayUserEditForm) {
      if (this.authService.loggedInUser.id !== id) {
        this.errorDefined = false;
        this.toolService.userToDelete.next( this.findUser(id) );
        this.modalService.open('confirm-user-delete-modal');
      }
      else {
        // log.debug("deleteUser(" + id + "): cannot delete logged in user!");
        this.errorMessage = 'Cannot delete logged in user!';
        this.errorDefined = true;
      }
    }
  }

  deleteUserConfirmed(id: string): void {
    log.debug('ManageUsersModalComponent: deleteUserConfirmed(id)', id);
    this.dataService.deleteUser(id);
  }

  onOpen(): void {
    log.debug('ManageUsersModalComponent: onOpen()');
    this.errorDefined = false;
  }


}
