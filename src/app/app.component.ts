import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { DataService } from 'services/data.service';
import { AuthenticationService } from 'services/authentication.service';
import { ModalService } from './modal/modal.service';
import { Subscription} from 'rxjs';
import { ToolService } from 'services/tool.service';
import { Logger } from 'loglevel';
declare var log: Logger;


@Component({
  selector: 'atomic-fishbowl-app',
  template: `
<div *ngIf="isMobile">
  So sorry, but mobile devices aren't supported by Atomic Fishbowl.
</div>

<ng-container *ngIf="!isMobile">

  <eula *ngIf="!eulaAccepted"></eula>

  <ng-container *ngIf="eulaAccepted">

    <div *ngIf="serverReachable" style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; overflow: hidden;">

      <login-form *ngIf="!loggedIn && credentialsChecked"></login-form>

      <ng-container *ngIf="loggedIn">
        <router-outlet></router-outlet>
        <img class="noselect" src="/resources/logo.png" style="position: absolute; left: 0.526315789em; bottom: 0.789473684em;">
      </ng-container>

    </div>

    <serverdown-modal></serverdown-modal>
  </ng-container>

</ng-container>
`
})

export class AppComponent implements OnInit, OnDestroy {

  constructor(private authService: AuthenticationService,
              private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService,
              private zone: NgZone,
              private changeDetectorRef: ChangeDetectorRef ) { }

  public loggedIn = false;
  public serverReachable = false;
  public credentialsChecked = false;
  public isMobile = false;
  public eulaAccepted = false;
  private pingInterval: any;

  // Subscriptions
  private loggedInChangedSubscription: Subscription;
  private eulaAcceptedSubscription: Subscription;



  ngOnInit(): void {

    if (this.isMobileDevice()) {
      this.isMobile = true;
      return;
    }

    this.loggedInChangedSubscription = this.authService.loggedInChanged.subscribe( loggedIn => this.onLoginChanged(loggedIn) );

    if (this.toolService.getPreference('eulaAccepted') !== null ) {
      this.eulaAccepted = this.toolService.getPreference('eulaAccepted');
    }
    if (this.eulaAccepted) {
      this.startPing();
    }

    this.eulaAcceptedSubscription = this.toolService.eulaAccepted.subscribe( () => {
      this.eulaAccepted = true;
      this.startPing();
    } );

  }



  onLoginChanged(loggedIn: boolean) {
    log.debug('AppComponent: onLoginChanged(): loggedIn:', loggedIn);
    this.loggedIn = loggedIn;
    this.changeDetectorRef.detectChanges();
    if (!loggedIn) {
      this.zone.runOutsideAngular( () => setTimeout( () => {
        // wrapped in setTimeout to allow components to be destroyed before invalidating their inputs
        this.dataService.stop();
        this.toolService.stop();
      }, 0) );
    }
  }



  startPing() {
    log.debug('AppComponent: startPing()');
    // run initial ping to see if server is reachable
    this.dataService.ping()
    .then( () => {
      this.serverReachable = true;
    })
    .then( () => this.authService.checkCredentials() )
    .then( () => {
      this.credentialsChecked = true;
    } )
    .catch( () => {
      this.serverReachable = false;
      this.modalService.open(this.toolService.serverDownModalId);
    });

    // schedule a ping every 10 seconds and display error modal if it becomes unreachable
    this.pingInterval = this.zone.runOutsideAngular( () =>
      setInterval( () => {
        this.dataService.ping()
        .then( () => {
          this.modalService.close(this.toolService.serverDownModalId);
          this.serverReachable = true;
          if (!this.credentialsChecked) {
            this.authService.checkCredentials();
          }
        })
        .catch( () => {
          this.serverReachable = false;
          this.modalService.open(this.toolService.serverDownModalId);
        });
      }, 10000)
    );
  }



  public ngOnDestroy(): void {
    this.loggedInChangedSubscription.unsubscribe();
    this.eulaAcceptedSubscription.unsubscribe();
  }



  private isMobileDevice(): boolean {
    return (typeof window.orientation !== 'undefined') || (navigator.userAgent.indexOf('IEMobile') !== -1);
  }



}
