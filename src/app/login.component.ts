import { Component, ElementRef, Renderer2, OnInit, ViewChildren, QueryList, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { AuthenticationService } from './authentication.service';
import { User } from './user';
declare var log: any;

@Component({
    selector: 'login-form',
    template: `
<div style="display: block; margin-top: 300px; margin-left: auto; margin-right: auto; width: 500px;">
  <mat-card>

    <form #addCollectionForm="ngForm">
  
      <mat-card-content>

        <div style="position:absolute; top: 7px; right: 5px;"><img src="resources/logo-blacktext.png"></div>
        <mat-card-title style="font-family: 'Gill Sans', 'Lucida Grande','Lucida Sans Unicode', Arial, Helvetica, sans-serif;">
          <b>Atomic Fishbowl Login</b>
        </mat-card-title>

        <mat-form-field class="full-width">
          <input matInput color="accent" #userName [(ngModel)]="user.username" id="user" type="text" [ngModelOptions]="{standalone: true}" placeholder="Username">
        </mat-form-field>

        <mat-form-field class="full-width">
          <input matInput [(ngModel)]="user.password" id="password" type="password" [ngModelOptions]="{standalone: true}" placeholder="Password">
        </mat-form-field>

      </mat-card-content>

      <mat-card-actions align="start">
        <button mat-raised-button color="accent" (click)="login()" class="btn waves-effect waves-light" type="submit" [disabled]="!eulaAccepted" name="action">Login</button>&nbsp;&nbsp;<span>{{errorMsg}}</span>
      </mat-card-actions>

    </form>

  </mat-card>
</div>
`,
styles: [`

  /*mat-card {
    padding: 0 !important;
  }*/

  .full-width {
    width: 100%;
  }

`]
})

export class LoginComponent implements OnInit, AfterViewInit {

  public user: User = { username: '', password: '' };
  public errorMsg = '';
  @ViewChildren('userName') userNameRef: QueryList<any>;

  constructor(private authService: AuthenticationService,
              private elRef: ElementRef,
              private renderer: Renderer2,
              private changeDetectionRef: ChangeDetectorRef ) {}

  private eulaAccepted = true; // Do something with this after we add the EULA

  ngOnInit(): void {
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'white');
  }

  ngAfterViewInit(): void {
    this.userNameRef.first.nativeElement.focus();
    this.changeDetectionRef.detectChanges();
  }

  public login(): void {
    this.errorMsg = '';
    this.authService.login(this.user)
                    .then( (res: boolean) => {
                      if (!res) { this.errorMsg = 'Login failed'; }
                      if (res) { this.errorMsg = 'Login successful'; }
                    })

  }
}
