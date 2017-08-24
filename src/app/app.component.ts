import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from './data.service';
import { AuthenticationService } from './authentication.service';
import { ModalService } from './modal/modal.service';
declare var log: any;

@Component({
  selector: 'twoTwoOneB-app',
  template: `
<div *ngIf="serverReachable" style="position: relative; width: 100vw; height: 100vh;">
  <toolbar-widget *ngIf="loggedIn"></toolbar-widget>
  <router-outlet></router-outlet>
  <img class="noselect" src="/resources/logo.png" style="position: absolute; left:10px; bottom: 15px;">
</div>
<serverdown-modal id="serverDownModal"></serverdown-modal>
  `
})

export class AppComponent implements OnInit, OnDestroy {

  constructor(private authService: AuthenticationService,
              private dataService: DataService,
              private modalService: ModalService ) {}

  public loggedIn = false;
  public serverReachable = false;
  private credentialsChecked = false;
  private loggedInChangedSubscription: any;

  ngOnInit(): void {

    this.loggedInChangedSubscription = this.authService.loggedInChanged.subscribe( (loggedIn: boolean) => {
      // log.debug("loggedIn:", loggedIn);
      this.loggedIn = loggedIn;
    });

    // run initial ping to see if server is reachable
    this.dataService.ping()
                      .then( () => {
                        this.serverReachable = true;
                        this.authService.checkCredentials();
                        this.credentialsChecked = true;
                      })
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

  public ngOnDestroy() {
    this.loggedInChangedSubscription.unsubscribe();
  }

}
