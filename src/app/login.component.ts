import { Component, ElementRef, Renderer, OnInit, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { AuthenticationService } from './authentication.service'
import { User } from './user';
import { LoggerService } from './logger-service';

@Component({
    selector: 'login-form',
    template: `
<form #addCollectionForm="ngForm">
<div class="container" style="background-color: white;">
  <div class="title">
    221B Login
  </div>
  <div class="panel-body">
    <div class="row">
      <div class="input-field col s12">
        <input #userName [(ngModel)]="user.username" id="user" type="text" class="validate" [ngModelOptions]="{standalone: true}">
        <label for="user">User</label>
      </div>
    </div>

    <div class="row">
      <div class="input-field col s12">
        <input [(ngModel)]="user.password" id="password" type="password" class="validate" [ngModelOptions]="{standalone: true}">
        <label for="password">Password</label>
      </div>
    </div>

    <span>{{errorMsg}}</span>
    <button (click)="login()" class="btn waves-effect waves-light" type="submit" name="action">Login</button>
  </div>
</div>
</form>
`
})

export class LoginComponent implements OnInit, AfterViewInit {

  public user: User = { username: '', password: '' };
  public errorMsg: string = '';
  @ViewChildren('userName') userNameRef: QueryList<any>;

  constructor(private authService: AuthenticationService,
              private elRef: ElementRef,
              private renderer: Renderer,
              private loggerService: LoggerService) {}

  ngOnInit(): void {
    this.renderer.setElementStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'white');
  }

  ngAfterViewInit(): void {
    this.userNameRef.first.nativeElement.focus();
  }

  private login(): void {
    this.errorMsg = '';
    this.authService.login(this.user)
                    .then( (res: boolean) => {
                      if (!res) this.errorMsg = 'Failed to login';
                    });

  }
}
