import {
  Component,
  ElementRef,
  Renderer2,
  OnInit,
  ViewChildren,
  QueryList,
  AfterViewInit,
  ChangeDetectorRef,
  OnDestroy
} from '@angular/core';
import { AuthenticationService } from 'services/authentication.service';
import { User } from 'types/user';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: [
    './login-form.component.scss'
  ]
})

export class LoginFormComponent implements OnInit, AfterViewInit, OnDestroy {

  username = '';
  password = '';
  errorMsg = '';
  @ViewChildren('userName') userNameRef: QueryList<any>;

  constructor(
    private authService: AuthenticationService,
    private dataService: DataService,
    private elRef: ElementRef,
    private renderer: Renderer2,
    private changeDetectionRef: ChangeDetectorRef
  ) {}

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

  async login(): Promise<void> {
    this.loginSubmitted = true;
    this.errorMsg = '';
    const user: Pick<User, 'username' | 'password'> = {
      username: this.username,
      password: this.password
    };
    const res = await this.authService.login(user, this.dataService.socketId);
    this.loginSubmitted = false;
    this.errorMsg = res
      ? 'Login successful'
      : 'Login failed';
  }
}
