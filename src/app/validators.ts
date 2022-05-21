import { ErrorStateMatcher } from '@angular/material/core';
import {
  AbstractControl,
  NgForm,
  FormControl,
  FormGroupDirective
} from '@angular/forms';
import { AuthenticationService } from 'services/authentication.service';
import { User } from 'types/user';



export class AddUserPasswordMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    if (form?.form.controls.passwords.hasError('nomatch') && form?.control?.controls?.passwords?.get('password')?.dirty && form?.control?.controls?.passwords?.get('passwordConfirm')?.dirty ) {
      return true;
    }
    if (form?.form?.controls?.passwords?.get('password')?.hasError('minlength') && form?.control?.controls?.passwords?.get('password')?.dirty && form?.control?.controls?.passwords?.get('passwordConfirm')?.dirty ) {
      return true;
    }
    return false;
  }
}



export class EditUserPasswordMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    if (form?.form?.controls?.passwords?.hasError('nomatch') && form?.control?.controls?.passwords?.get('password')?.dirty && form?.control?.controls?.passwords?.get('passwordConfirm')?.dirty ) {
      return true;
    }
    if (form?.form?.controls?.passwords?.get('password')?.hasError('minlength') && form?.control?.controls?.passwords?.get('password')?.dirty && form?.control?.controls?.passwords?.get('passwordConfirm')?.dirty ) {
      return true;
    }
    return false;
  }
}



export const passwordMatcher = (control: AbstractControl) => control.get('password')?.value === control.get('passwordConfirm')?.value
  ? null
  : { nomatch: true };



export const userExists = (control: AbstractControl, users: User[]) => {
  if (users) {
    for (const user of users) {
      if ( control.value === user.username ) {
        return { userexists: true };
      }
    }
  }
  return null;
};



export const spaceValidator = (control: AbstractControl) => control.value.match(/\s/g)
  ? { spaceexists: true }
  : null;



export const emailValidator = (control: AbstractControl) => {
  const EMAIL_REGEXP = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  return !control.value.match(EMAIL_REGEXP) && control.value.length
    ? { notemail: true }
    : null;
};



export const isNotLoggedInUser = (control: AbstractControl, authService: AuthenticationService, editingUser: User) => authService && editingUser && authService.loggedInUser?.username === editingUser.username && control.value === false
    ? { isloggedinuser: true }
    : null;
