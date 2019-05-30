import { Component, OnInit, ChangeDetectionStrategy, ViewChild, ChangeDetectorRef, NgZone, Input, ElementRef } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { AuthenticationService } from 'services/authentication.service';
import { ModalService } from './modal/modal.service';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from 'types/user';
import { ErrorStateMatcher } from '@angular/material/core';
import * as validators from './validators';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'new-edit-user-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<modal id="{{id}}" background="true" secondLevel="true" modalClass="new-edit-user-modal" bodyClass="noselect new-edit-user-modal-body" (opened)="onOpened()">

  <!-- Add User Form -->
  <div *ngIf="addingUser" style="padding: 0.263157895em;">
    <mat-card>
      <mat-card-content>

        <mat-card-title>
          Add a User
        </mat-card-title>

        <form [formGroup]="addUserForm" (ngSubmit)="addUserSubmit()" novalidate>

          <mat-form-field class="full-width">
            <input #userInAdd matInput type="text" formControlName="username" placeholder="Username" autocomplete="off">
            <mat-error *ngIf="addUserForm.controls['username'].hasError('spaceexists')">Spaces are not permitted in usernames</mat-error>
            <mat-error *ngIf="addUserForm.controls['username'].hasError('userexists') && !addUserForm.controls['username'].hasError('spaceexists')">User already exists</mat-error>
            <mat-error *ngIf="addUserForm.controls['username'].hasError('minlength') && !addUserForm.controls['username'].hasError('userexists') && !addUserForm.controls['username'].hasError('spaceexists')">Minimum username length is {{minUsernameLength}} characters</mat-error>
          </mat-form-field>

          <mat-form-field class="full-width">
            <input matInput type="text" formControlName="fullname" placeholder="Full Name" autocomplete="off">
          </mat-form-field>

          <mat-form-field class="full-width">
            <input matInput type="email" formControlName="email" placeholder="Email">
            <mat-error>Not a valid email address format</mat-error>
          </mat-form-field>

          <table class="full-width" formGroupName="passwords">
            <tr>
              <td>
                <mat-form-field class="full-width">
                  <input matInput type="password" formControlName="password" placeholder="Password" [errorStateMatcher]="addUserPasswordMatcher" autocomplete="off">
                  <mat-error *ngIf="addUserForm.controls['passwords'].hasError('nomatch')">
                    Passwords do not match
                  </mat-error>
                  <mat-error *ngIf="addUserForm.controls['passwords'].controls['password'].hasError('minlength') && !addUserForm.controls['passwords'].hasError('nomatch')">
                    Minimum password length is {{minPasswordLength}}
                  </mat-error>
                </mat-form-field>
              </td>
              <td>
                <mat-form-field class="full-width">
                  <input matInput type="password" formControlName="passwordConfirm" placeholder="Confirm Password" autocomplete="off">
                </mat-form-field>
              </td>
            </tr>
          </table>

          <mat-checkbox formControlName="userEnabled" [indeterminate]="false" (change)="onUserEnabledChanged($event)">Enabled</mat-checkbox>

          <mat-card-actions align="end">
            <button mat-button type="submit" [disabled]="!addUserForm.valid">SAVE</button> <button mat-button type="button" (click)="onCloseClicked()">CANCEL</button>
          </mat-card-actions>
        </form>
      </mat-card-content>
    </mat-card>
  </div>


  <!-- Edit User Form -->
  <div *ngIf="!addingUser" style="padding: 0.263157895em;">
    <mat-card>
      <mat-card-content>

          <mat-card-title>
            Edit User
          </mat-card-title>

        <form [formGroup]="editUserForm" (ngSubmit)="editUserSubmit(editUserForm)" novalidate>

          <mat-form-field class="full-width">
            <input matInput type="text" formControlName="username" placeholder="Username" readonly>
          </mat-form-field>

          <mat-form-field class="full-width">
            <input #userInEdit matInput type="text" formControlName="fullname" placeholder="Full Name" autocomplete="off">
          </mat-form-field>

          <mat-form-field class="full-width">
            <input matInput type="email" formControlName="email" placeholder="Email" autocomplete="off">
            <mat-error>Not a valid email address format</mat-error>
          </mat-form-field>

          <table class="full-width" formGroupName="passwords">
            <tr>
              <td>
                <mat-form-field class="full-width">
                  <input matInput type="password" formControlName="password" placeholder="Password" [errorStateMatcher]="editUserPasswordMatcher" autocomplete="off">
                  <mat-error *ngIf="editUserForm.controls['passwords'].hasError('nomatch')">
                    Passwords do not match
                  </mat-error>
                  <mat-error *ngIf="editUserForm.controls['passwords'].controls['password'].hasError('minlength') && !editUserForm.controls['passwords'].hasError('nomatch')">
                    Minimum password length is {{minPasswordLength}}
                  </mat-error>
                </mat-form-field>
              </td>
              <td>
                <mat-form-field class="full-width">
                  <input matInput type="password" formControlName="passwordConfirm" placeholder="Confirm Password" autocomplete="off">
                </mat-form-field>
              </td>
            </tr>
          </table>

          <mat-checkbox formControlName="userEnabled" [indeterminate]="false" (change)="onUserEnabledChanged($event)">Enabled</mat-checkbox>
          <div class="mat-input-error" *ngIf="editUserForm.controls.userEnabled.hasError('isloggedinuser')">
            Cannot disable logged-in user
          </div>

          <mat-card-actions align="end">
            <button mat-button type="submit" [disabled]="disableEditUserSubmitButton()">UPDATE</button> <button mat-button type="button" (click)="onCloseClicked()">CANCEL</button>
          </mat-card-actions>

        </form>
      </mat-card-content>
    </mat-card>
  </div>

</modal>
`,
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

  @ViewChild('userInAdd', { static: false }) userInAddRef: ElementRef; // used to focus input on element
  @ViewChild('userInEdit', { static: false }) userInEditRef: ElementRef; // used to focus input on element

  public id = this.toolService.newEditUserModalId;

  public addUserForm: FormGroup;
  public editUserForm: FormGroup;

  public editUserPasswordMatcher = new validators.EditUserPasswordMatcher();
  public addUserPasswordMatcher = new validators.AddUserPasswordMatcher();

  public minPasswordLength = 8;
  public minUsernameLength = 3;

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
    let encPassword = this.dataService.encryptor.encrypt(this.addUserForm.value.passwords.password);
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
    let user: User = this.editingUser;
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
    let updatedUser: User = new User;
    updatedUser.id = this.editingUser.id;
    updatedUser.enabled = form.value.userEnabled;
    if ( this.editingUser.fullname !== form.value.fullname ) {
      updatedUser.fullname = form.value.fullname;
    }
    if ( this.editingUser.email !== form.value.email ) {
      updatedUser.email = form.value.email;
    }
    if ( form.controls.passwords.dirty && form.value.passwords.password.length !== 0 ) {
      let encPassword = this.dataService.encryptor.encrypt(form.value.passwords.password);
      updatedUser.password = encPassword;
    }
    log.debug('NewEditUserModalComponent: editUserSubmit(): updatedUser:', updatedUser);
    await this.dataService.updateUser(updatedUser);
    this.modalService.close(this.id);
  }



  public disableEditUserSubmitButton(): boolean {
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
