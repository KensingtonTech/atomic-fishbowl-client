import { ErrorStateMatcher } from '@angular/material/core';
import { AbstractControl, NgForm, FormControl, FormGroupDirective } from '@angular/forms';
import { AuthenticationService } from 'services/authentication.service';
import { User } from 'types/user';



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



export function passwordMatcher(control: AbstractControl) {
  return control.get('password').value === control.get('passwordConfirm').value ? null : {'nomatch': true};
}



export function userExists(control: AbstractControl, users: User[]) {
  // log.debug('userExists:', control);
  if (users) {
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      if ( control.value === user.username ) {
        return { 'userexists': true };
      }
    }
  }
  return null;
}



export function spaceValidator(control: AbstractControl) {
  const value = control.value;
  if ( value.match(/\s/g) ) {
    return { 'spaceexists': true };
  }
  return null;
}



export function emailValidator(control: AbstractControl) {
  const EMAIL_REGEXP = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (!control.value.match(EMAIL_REGEXP) && control.value.length !== 0) {
      return { 'notemail': true };
  }
  return null;
}



export function isNotLoggedInUser(control: AbstractControl, authService: AuthenticationService, editingUser: User) {
  // if ( this.authService && this.editingUser && this.authService.loggedInUser.username === this.editingUser.username && control.value === false ) {
  if ( authService && editingUser && authService.loggedInUser.username === editingUser.username && control.value === false ) {
    return { 'isloggedinuser': true };
  }
  return null;
}
