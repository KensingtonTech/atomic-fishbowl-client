import { Component, ElementRef, Renderer2, OnInit, ViewChildren, QueryList, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { AuthenticationService } from 'services/authentication.service';
import { User } from 'types/user';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
    selector: 'login-form',
    template: `
<div>

    <mat-card>

      <form #addCollectionForm="ngForm">

        <mat-card-content class="spacer">

          <!--<div class="spacer" style="position:absolute; top: 0.368421053em; right: 0.263157895em;"><img style="width: 4em;" src="resources/logo-blacktext.png"></div>-->

          <div class="bigspacer">
            <mat-card-title style="font-family: 'Gill Sans', 'Lucida Grande','Lucida Sans Unicode', Arial, Helvetica, sans-serif;">
              <span><b>Atomic Fishbowl Login</b></span><img style="width: 4em; float: right;" src="resources/logo-blacktext.png">
            </mat-card-title>
          </div>

          <div class="spacer">
            <mat-form-field class="full-width">
              <input matInput size="80" color="accent" #userName [(ngModel)]="user.username" id="user" type="text" [ngModelOptions]="{standalone: true}" placeholder="Username" autocomplete="username">
            </mat-form-field>
          </div>

          <div>
            <mat-form-field class="full-width">
              <input matInput size="80" [(ngModel)]="user.password" id="password" type="password" [ngModelOptions]="{standalone: true}" placeholder="Password" autocomplete="current-password">
            </mat-form-field>
          </div>

        </mat-card-content>

        <div>
          <mat-card-actions align="start">
            <button mat-raised-button color="accent" (click)="login()" class="btn waves-effect waves-light" type="submit" [disabled]="user.username.length === 0 || user.password.length === 0 || loginSubmitted" name="action">Login</button>&nbsp;&nbsp;<span>{{errorMsg}}</span>
          </mat-card-actions>
        </div>

      </form>

    </mat-card>

</div>
`,
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

  public user: User = { username: '', password: '' };
  public errorMsg = '';
  @ViewChildren('userName') userNameRef: QueryList<any>;

  constructor(private authService: AuthenticationService,
              private elRef: ElementRef,
              private renderer: Renderer2,
              private changeDetectionRef: ChangeDetectorRef ) {}

  public loginSubmitted = false;

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

  public login(): void {
    this.loginSubmitted = true;
    this.errorMsg = '';
    this.authService.login(this.user)
                    .then( (res: boolean) => {
                      this.loginSubmitted = false;
                      if (!res) { this.errorMsg = 'Login failed'; }
                      if (res) { this.errorMsg = 'Login successful'; }
                    });
  }
}
