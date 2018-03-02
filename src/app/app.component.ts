import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from './data.service';
import { AuthenticationService } from './authentication.service';
import { ModalService } from './modal/modal.service';
import { Subscription} from 'rxjs/Subscription';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolService } from './tool.service';
declare var log;


@Component({
  selector: 'atomic-fishbowl-app',
  template: `
<div *ngIf="isMobile">
  So sorry, but mobile devices aren't currently supported by Atomic Fishbowl.
</div>

<div *ngIf="serverReachable && !isMobile" style="position: relative; width: 100vw; height: 100vh;">

  <login-form *ngIf="!loggedIn && credentialsChecked"></login-form>

  <toolbar-widget *ngIf="loggedIn"></toolbar-widget>
  <router-outlet *ngIf="loggedIn"></router-outlet>
  <img *ngIf="loggedIn" class="noselect" src="/resources/logo.png" style="position: absolute; left:10px; bottom: 15px;">

</div>

<serverdown-modal id="serverDownModal"></serverdown-modal>
`
})

export class AppComponent implements OnInit, OnDestroy {

  constructor(private authService: AuthenticationService,
              private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService,
              private route: ActivatedRoute,
              private router: Router ) {}

  public loggedIn = false;
  public serverReachable = false;
  private credentialsChecked = false;
  private loggedInChangedSubscription: Subscription;
  public isMobile = false;


  ngOnInit(): void {

    if (this.isMobileDevice()) {
      this.isMobile = true;
      return;
    }

    this.loggedInChangedSubscription = this.authService.loggedInChanged.subscribe( (loggedIn: boolean) => {
      this.loggedIn = loggedIn;
    });

    // run initial ping to see if server is reachable
    this.dataService.ping()
                      .then( () => {
                        this.serverReachable = true;
                      })
                      .then( () => this.authService.checkCredentials() )
                      .then ( () => {
                        this.credentialsChecked = true;
                      } )
                      .catch( () => {
                        this.serverReachable = false;
                        this.modalService.open('serverDownModal');
                      });

    // schedule a ping every 10 seconds and display error modal if it becomes unreachable
    setInterval( () => {
      this.dataService.ping()
                      .then( () => {
                        this.modalService.close('serverDownModal');
                        this.serverReachable = true;
                        if (!this.credentialsChecked) {
                          this.authService.checkCredentials();
                        }
                      })
                      .catch( () => {
                        this.serverReachable = false;
                        this.modalService.open('serverDownModal');
                      });
    }, 10000);

  }



  private isMobileDevice(): boolean {
    return (typeof window.orientation !== 'undefined') || (navigator.userAgent.indexOf('IEMobile') !== -1);
  }

  public ngOnDestroy(): void {
    this.loggedInChangedSubscription.unsubscribe();
  }

}
