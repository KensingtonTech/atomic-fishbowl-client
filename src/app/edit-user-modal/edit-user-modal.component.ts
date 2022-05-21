import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ViewChild,
  ChangeDetectorRef,
  NgZone,
  Input,
  ElementRef,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from '@angular/forms';
import { DataService } from 'services/data.service';
import { AuthenticationService } from 'services/authentication.service';
import { User } from 'types/user';
import * as validators from '../validators';
import * as log from 'loglevel';
import * as utils from '../utils';

@Component({
  selector: 'app-edit-user-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-user-modal.component.html',
  styleUrls: [
    './edit-user-modal.component.scss'
  ]
})

export class EditUserModalComponent implements OnInit, OnChanges {

  constructor(
    private dataService: DataService,
    private authService: AuthenticationService,
    private changeDetectionRef: ChangeDetectorRef,
    public fb: FormBuilder,
    private zone: NgZone
  ) {}

  @Input() mode: 'new' | 'edit' = 'new';
  @Input() selectedUser: User; // the user we are editing (if we're editing)
  @Input() users: User[];
  @Input() displayAddUserModal: boolean;
  @Output() displayAddUserModalChange = new EventEmitter<boolean>();

  @ViewChild('userInAdd') userInAddRef: ElementRef; // used to focus input on element
  @ViewChild('userInEdit') userInEditRef: ElementRef; // used to focus input on element

  addUserForm: FormGroup;
  editUserForm: FormGroup;

  editUserPasswordMatcher = new validators.EditUserPasswordMatcher();
  addUserPasswordMatcher = new validators.AddUserPasswordMatcher();

  minPasswordLength = 8;
  minUsernameLength = 3;

  ngOnInit() {
    log.debug('EditUserModalComponent: ngOnInit');

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
      userEnabled: [true, (control: AbstractControl) => validators.isNotLoggedInUser(control, this.authService, this.selectedUser) ]
    });
  }



  ngOnChanges(changes: SimpleChanges) {
    if (utils.firstOrChangedSimpleChange('displayAddUserModal', changes) && this.displayAddUserModal) {
      this.onOpened();
    }
  }



  get addUserFormControls() {
    // log.debug('addUserFormControls:', this.addUserForm.controls);
    return this.addUserForm.controls as { [key: string]: FormGroup };
  }



  get editUserFormControls() {
    // log.debug('editUserFormControls:', this.editUserForm.controls);
    return this.editUserForm.controls as { [key: string]: FormGroup };
  }



  getControl(formGroup: FormGroup, controlName: string) {
    // log.debug('getControl:', formGroup.controls[controlName]);
    return formGroup.controls[controlName] as FormControl;
  }



  onOpened() {
    if (this.mode === 'new') {
      this.onAddingUserAfterOpen();
    }
    else {
      this.onEditingUserAfterOpen();
    }
  }



  onCloseClicked() {
    this.displayAddUserModalChange.next(false);
  }



  /////////////////////////////////////////////////////////////////
                        // Add User //
  /////////////////////////////////////////////////////////////////



  onAddingUserAfterOpen(): void {
    log.debug('EditUserModalComponent: onAddingUserAfterOpen(): this.addUserForm:', this.addUserForm);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.zone.runOutsideAngular( () => setTimeout( () => { this.userInAddRef.nativeElement.focus(); }, 10) );
  }



  async addUserSubmit() {
    log.debug('EditUserModalComponent: addUserSubmit: this.addUserForm:', this.addUserForm);
    const encPassword = this.dataService.encrypt(this.addUserForm.value.passwords.password.trim());
    const newUser: Omit<User, '_id'> = {
      username: this.addUserForm.value.username.trim(),
      fullname: this.addUserForm.value.fullname.trim(),
      password: encPassword,
      email: this.addUserForm.value.email.trim(),
      enabled: this.addUserForm.value.userEnabled.trim()
    };
    log.debug('EditUserModalComponent: addUserSubmit(): newUser:', newUser);
    await this.dataService.addUser(newUser);
    this.displayAddUserModalChange.next(false);
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
    const user: User = this.selectedUser;
    log.debug('EditUserModalComponent: onEditingUserAfterOpen(): user:', user);

    this.editUserForm.patchValue({
      id: user._id,
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



  async editUserSubmit(form: FormGroup) {
    log.debug('EditUserModalComponent: editUserSubmit(): form:', form);
    const updatedUser: Partial<User> = {};
    updatedUser._id = this.selectedUser._id;
    updatedUser.enabled = form.value.userEnabled;
    if ( this.selectedUser.fullname !== form.value.fullname ) {
      updatedUser.fullname = form.value.fullname.trim();
    }
    if ( this.selectedUser.email !== form.value.email ) {
      updatedUser.email = form.value.email.trim();
    }
    if ( form.controls.passwords.dirty && form.value.passwords.password.length !== 0 ) {
      updatedUser.password = this.dataService.encrypt(form.value.passwords.password.trim());
    }
    log.debug('EditUserModalComponent: editUserSubmit(): updatedUser:', updatedUser);
    await this.dataService.updateUser(updatedUser);
    this.displayAddUserModalChange.next(false);
  }



  disableEditUserSubmitButton(): boolean {
    if (this.editUserForm.pristine) { return true; }
    if (this.editUserForm.invalid && this.editUserForm.dirty) { return true; }
    return false;
  }


  onUserEnabledChanged() {
    // log.debug('EditUserModalComponent: onUserEnabledChanged(): value:', value);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }

}
