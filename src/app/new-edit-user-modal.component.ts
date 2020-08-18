import { Component, OnInit, ChangeDetectionStrategy, ViewChild, ChangeDetectorRef, NgZone, Input, ElementRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators, FormControl, FormArray,  } from '@angular/forms';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { AuthenticationService } from 'services/authentication.service';
import { ModalService } from './modal/modal.service';
import { User } from 'types/user';
import * as validators from './validators';
import * as log from 'loglevel';

@Component({
  selector: 'new-edit-user-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-edit-user-modal.component.html',
styles: [`

  .full-width {
    width: 100%;
  }

  .ui-radiobutton-label {
    font-size: .7em;  // 14px
  }

  .ui-radiobutton-box.ui-state-active {
    background-color: rgb(59, 153, 252);
  }

  .ui-tooltip {
    width: 13.75em; // 275px
    word-wrap: normal;
  }

  `]
})

export class NewEditUserModalComponent implements OnInit {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService,
              private authService: AuthenticationService,
              private changeDetectionRef: ChangeDetectorRef,
              public fb: FormBuilder,
              private zone: NgZone ) {}

  @Input() addingUser = true; // if true, we're adding a user.  If false, we're editing a user
  @Input() editingUser: User; // the user we are editing (if we're editing)
  @Input() users: User[];

  @ViewChild('userInAdd') userInAddRef: ElementRef; // used to focus input on element
  @ViewChild('userInEdit') userInEditRef: ElementRef; // used to focus input on element

  id = this.toolService.newEditUserModalId;

  addUserForm: FormGroup;
  editUserForm: FormGroup;

  editUserPasswordMatcher = new validators.EditUserPasswordMatcher();
  addUserPasswordMatcher = new validators.AddUserPasswordMatcher();

  minPasswordLength = 8;
  minUsernameLength = 3;

  ngOnInit() {
    log.debug('NewEditUserModalComponent: ngOnInit');

    this.addUserForm = this.fb.group({
      username: ['', Validators.compose( [ Validators.required, validators.spaceValidator, Validators.minLength(this.minUsernameLength), (control: AbstractControl) => validators.userExists(control, this.users) ]) ],
      fullname: '',
      email: ['', validators.emailValidator],
      passwords: this.fb.group({
        password: ['', Validators.compose( [ Validators.required, Validators.minLength(this.minPasswordLength) ]) ],
        passwordConfirm: ['', Validators.required]
      }, { validator: validators.passwordMatcher }),
      userEnabled: true
    });

    this.editUserForm = this.fb.group({
      id: '',
      username: '',
      fullname: '',
      email: ['', validators.emailValidator],
      passwords: this.fb.group({
        password: ['', Validators.minLength(this.minPasswordLength)],
        passwordConfirm: ''
      }, { validator: validators.passwordMatcher }),
      userEnabled: [true, (control: AbstractControl) => validators.isNotLoggedInUser(control, this.authService, this.editingUser) ]
    });
  }



  get addUserFormControls() {
    // log.debug('addUserFormControls:', this.addUserForm.controls);
    return this.addUserForm.controls as { [key: string]: FormGroup };
  }



  get editUserFormControls() {
    // log.debug('editUserFormControls:', this.editUserForm.controls);
    return this.editUserForm.controls as { [key: string]: FormGroup };
  }



  getControl(formGroup: FormGroup, controlName) {
    // log.debug('getControl:', formGroup.controls[controlName]);
    return formGroup.controls[controlName] as FormControl;
  }



  onOpened() {
    if (this.addingUser) {
      this.onAddingUserAfterOpen();
    }
    else {
      this.onEditingUserAfterOpen();
    }
  }



  onCloseClicked() {
    this.modalService.close(this.id);
  }



  /////////////////////////////////////////////////////////////////
                        // Add User //
  /////////////////////////////////////////////////////////////////



  onAddingUserAfterOpen(): void {
    log.debug('NewEditUserModalComponent: onAddingUserAfterOpen(): this.addUserForm:', this.addUserForm);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.zone.runOutsideAngular( () => setTimeout( () => { this.userInAddRef.nativeElement.focus(); }, 10) );
  }



  async addUserSubmit() {
    log.debug('NewEditUserModalComponent: addUserSubmit: this.addUserForm:', this.addUserForm);
    const encPassword = this.dataService.encryptor.encrypt(this.addUserForm.value.passwords.password);
    const newUser: User = {
      username: this.addUserForm.value.username,
      fullname: this.addUserForm.value.fullname,
      password: encPassword,
      email: this.addUserForm.value.email,
      enabled: this.addUserForm.value.userEnabled
    };
    log.debug('NewEditUserModalComponent: addUserSubmit(): newUser:', newUser);
    await this.dataService.addUser(newUser);
    this.modalService.close(this.id);
    this.zone.runOutsideAngular( () => setTimeout( () => this.addUserForm.patchValue({
      // wait for modal to fade out before resetting the values
      username: '',
      email: '',
      fullname: '',
      passwords: {
        password: '',
        passwordConfirm: ''
      },
      userEnabled: true
    }), 260) );
  }



  /////////////////////////////////////////////////////////////////
                        // Edit User //
  /////////////////////////////////////////////////////////////////

  onEditingUserAfterOpen(): void {
    const user: User = this.editingUser;
    log.debug('NewEditUserModalComponent: onEditingUserAfterOpen(): user:', user);

    this.editUserForm.patchValue({
      id: user.id,
      username: user.username,
      email: user.email,
      fullname: user.fullname,
      passwords: {
        password: '',
        passwordConfirm: ''
      },
      userEnabled: user.enabled
    });

    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.zone.runOutsideAngular( () => setTimeout( () => { this.userInEditRef.nativeElement.focus(); }, 10) );
  }



  async editUserSubmit(form: any) {
    log.debug('NewEditUserModalComponent: editUserSubmit(): form:', form);
    const updatedUser: User = new User;
    updatedUser.id = this.editingUser.id;
    updatedUser.enabled = form.value.userEnabled;
    if ( this.editingUser.fullname !== form.value.fullname ) {
      updatedUser.fullname = form.value.fullname;
    }
    if ( this.editingUser.email !== form.value.email ) {
      updatedUser.email = form.value.email;
    }
    if ( form.controls.passwords.dirty && form.value.passwords.password.length !== 0 ) {
      const encPassword = this.dataService.encryptor.encrypt(form.value.passwords.password);
      updatedUser.password = encPassword;
    }
    log.debug('NewEditUserModalComponent: editUserSubmit(): updatedUser:', updatedUser);
    await this.dataService.updateUser(updatedUser);
    this.modalService.close(this.id);
  }



  disableEditUserSubmitButton(): boolean {
    if (this.editUserForm.pristine) { return true; }
    if (this.editUserForm.invalid && this.editUserForm.dirty) { return true; }
    return false;
  }


  onUserEnabledChanged(value) {
    // log.debug('NewEditUserModalComponent: onUserEnabledChanged(): value:', value);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }

}
