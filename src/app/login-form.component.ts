import { Component, ElementRef, Renderer2, OnInit, ViewChildren, QueryList, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { AuthenticationService } from 'services/authentication.service';
import { User } from 'types/user';
import { DataService } from './services/data.service';

@Component({
    selector: 'login-form',
    templateUrl: './login-form.component.html',
styles: [`

  .full-width {
    width: 100%;
  }

  .spacer {
    margin-bottom: 1em;
  }

  .bigspacer {
    margin-bottom: 2em;
  }

`]
})

export class LoginFormComponent implements OnInit, AfterViewInit, OnDestroy {

  username = '';
  password = '';
  errorMsg = '';
  @ViewChildren('userName') userNameRef: QueryList<any>;

  constructor(private authService: AuthenticationService,
              private dataService: DataService,
              private elRef: ElementRef,
              private renderer: Renderer2,
              private changeDetectionRef: ChangeDetectorRef ) {}

  loginSubmitted = false;

  ngOnInit(): void {
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'white');
  }

  ngOnDestroy() {
    this.renderer.removeStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color');
  }

  ngAfterViewInit(): void {
    this.userNameRef.first.nativeElement.focus();
    this.changeDetectionRef.detectChanges();
  }

  login(): void {
    this.loginSubmitted = true;
    this.errorMsg = '';
    const user: User = { username: this.username, password: this.password};
    this.authService.login(user, this.dataService.socketId)
                    .then( (res: boolean) => {
                      this.loginSubmitted = false;
                      if (!res) { this.errorMsg = 'Login failed'; }
                      if (res) { this.errorMsg = 'Login successful'; }
                    });
  }
}
