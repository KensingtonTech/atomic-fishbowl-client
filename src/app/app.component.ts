import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { DataService } from 'services/data.service';
import { AuthenticationService } from 'services/authentication.service';
import { ModalService } from './modal/modal.service';
import { Subscription} from 'rxjs';
import { ToolService } from 'services/tool.service';
import * as log from 'loglevel';


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

      <login-form *ngIf="credentialsChecked && !loggedIn"></login-form>

      <ng-container *ngIf="loggedIn && socketUpgraded">
        <router-outlet></router-outlet>
        <img class="noselect" src="/resources/logo.png" style="position: absolute; left: 0.526315789em; bottom: 0.789473684em;">
      </ng-container>

    </div>

    <serverdown-modal></serverdown-modal>
    <logged-out-notify-modal></logged-out-notify-modal>
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

  loggedIn = false;
  serverReachable = false;
  credentialsChecked = false;
  isMobile = false;
  eulaAccepted = false;
  socketUpgraded = false;

  // Subscriptions
  private subscriptions: Subscription = new Subscription;



  ngOnInit(): void {

    if (this.isMobileDevice()) {
      this.isMobile = true;
      return;
    }

    this.subscriptions.add( this.authService.loggedInChanged.subscribe( loggedIn => this.onLoginChanged(loggedIn) ) );

    let eulaAccepted = this.toolService.getPreference('eulaAccepted');
    if (eulaAccepted !== null ) {
      this.eulaAccepted = eulaAccepted;
    }
    log.debug('AppComponent: ngOnInit(): eulaAccepted:', this.eulaAccepted);

    if (this.eulaAccepted) {
      this.subscriptions.add(this.dataService.socketConnected.subscribe( status => this.onSocketConnected(status) ));
    }
    else {
      this.subscriptions.add(this.toolService.eulaAccepted.subscribe( () => this.onEulaAccepted() ) );
    }

    this.subscriptions.add(this.dataService.loggedOutByServer.subscribe( () => this.modalService.open(this.toolService.loggedOutModalId)));

    this.subscriptions.add(this.dataService.socketUpgraded.subscribe( socketUpgraded => this.onSocketUpgraded(socketUpgraded) ) );

    this.zone.runOutsideAngular( () => setTimeout( () => {
      // display server unreachable modal if socket doesn't connect right away
      if (!this.serverReachable) {
        this.modalService.open(this.toolService.serverDownModalId);
      }
    }, 500) );


  }



  onEulaAccepted() {
    log.debug('AppComponent: onEulaAccepted()');
    this.eulaAccepted = true;
    this.subscriptions.add(this.dataService.socketConnected.subscribe( status => this.onSocketConnected(status) ));
  }



  onLoginChanged(loggedIn: boolean) {
    log.debug('AppComponent: onLoginChanged(): loggedIn:', loggedIn);
    this.loggedIn = loggedIn;
    this.changeDetectorRef.detectChanges();
    if (!loggedIn) {
      this.zone.runOutsideAngular( () => setTimeout( () => {
        // wrapped in setTimeout to allow components to be destroyed before invalidating their inputs
        // this.dataService.stop();
        this.toolService.stop();
      }, 0) );
    }
  }



  onSocketUpgraded(socketUpgraded: boolean) {
    log.debug('AppComponent: onSocketUpgraded(): socketUpgraded:', socketUpgraded);
    this.socketUpgraded = socketUpgraded;
    this.changeDetectorRef.detectChanges();
  }



  async onSocketConnected(status) {
    log.debug('AppComponent: onSocketConnected(): status:', status);
    let { connected, socketId} = status;

    if (connected !== null && connected) {
      this.serverReachable = true;
      this.modalService.close(this.toolService.serverDownModalId);
    }
    else if (connected !== null && !connected) {
      this.serverReachable = false;
      this.modalService.open(this.toolService.serverDownModalId);
      this.toolService.stop();
    }

    if (connected && socketId) {
      await this.checkLoggedInState(socketId);
    }
    this.changeDetectorRef.detectChanges();

  }



  async checkLoggedInState(socketId) {

    await this.authService.checkCredentials(socketId);
    // login state will change via loggedInChangedSubscription
    this.credentialsChecked = true;

  }



  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }



  private isMobileDevice(): boolean {
    return (typeof window.orientation !== 'undefined') || (navigator.userAgent.indexOf('IEMobile') !== -1);
  }



}
