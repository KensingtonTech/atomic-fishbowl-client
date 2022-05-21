import {
  Component,
  OnInit,
  OnDestroy,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';
import { DataService, SocketConnectedEvent } from 'services/data.service';
import { AuthenticationService } from 'services/authentication.service';
import { Subscription} from 'rxjs';
import { ToolService } from 'services/tool.service';
import * as log from 'loglevel';
import { ConfirmationService } from 'primeng/api';


@Component({
  selector: 'app-atomic-fishbowl-app',
  templateUrl: './app.component.html'
})

export class AppComponent implements OnInit, OnDestroy {

  constructor(
    private authService: AuthenticationService,
    private dataService: DataService,
    private toolService: ToolService,
    private zone: NgZone,
    private changeDetectorRef: ChangeDetectorRef,
    private confirmationService: ConfirmationService
  ) {}

  loggedIn = false;
  serverReachable = false;
  credentialsChecked = false;
  isMobile = false;
  eulaAccepted = false;
  socketUpgraded = false;
  confirmationKey = 'AppComponent';

  // Subscriptions
  private subscriptions: Subscription = new Subscription();

  displayServerDownDialog = false;



  ngOnInit(): void {
    if (this.isMobileDevice()) {
      this.isMobile = true;
      return;
    }

    this.subscriptions.add(
      this.authService.loggedInChanged.subscribe(
        loggedIn => this.onLoginChanged(loggedIn)
      )
    );

    this.eulaAccepted = this.toolService.getBooleanPreference('eulaAccepted', false);

    if (this.eulaAccepted) {
      this.subscriptions.add(
        this.dataService.socketConnected.subscribe(
          status => this.onSocketConnected(status)
        )
      );
      this.startServerReachableTimeout();
    }
    else {
      this.subscriptions.add(
        this.toolService.eulaAccepted.subscribe(
          () => this.onEulaAccepted()
        )
      );
    }

    this.subscriptions.add(
      this.dataService.loggedOutByServer.subscribe(
        () => this.confirmationService.confirm({
          message: `Your login session has expired`,
          header: 'Notification',
          icon: 'pi pi-exclamation-triangle',
          key: this.confirmationKey,
          rejectVisible: false,
          acceptLabel: 'OK'
        })
      )
    );

    this.subscriptions.add(
      this.dataService.socketUpgraded.subscribe(
        socketUpgraded => this.onSocketUpgraded(socketUpgraded)
      )
    );
  }



  startServerReachableTimeout() {
    setTimeout(
      () => {
        // display server unreachable modal if socket doesn't connect right away
        if (!this.serverReachable) {
          this.displayServerDownDialog = true;
        }
      },
      500
    );
  }



  onEulaAccepted() {
    log.debug('AppComponent: onEulaAccepted()');
    this.eulaAccepted = true;
    this.subscriptions.add(
      this.dataService.socketConnected.subscribe(
        status => this.onSocketConnected(status)
      )
    );
    this.startServerReachableTimeout();
  }



  onLoginChanged(loggedIn: boolean) {
    log.debug('AppComponent: onLoginChanged(): loggedIn:', loggedIn);
    this.loggedIn = loggedIn;
    this.changeDetectorRef.detectChanges();
    if (!loggedIn) {
      this.zone.runOutsideAngular(
        () => setTimeout(
          () => this.toolService.stop()
          // wrapped in setTimeout to allow components to be destroyed before invalidating their inputs
          , 0)
        );
    }
  }



  onSocketUpgraded(socketUpgraded: boolean) {
    log.debug('AppComponent: onSocketUpgraded(): socketUpgraded:', socketUpgraded);
    this.socketUpgraded = socketUpgraded;
    this.changeDetectorRef.detectChanges();
  }



  async onSocketConnected(status: SocketConnectedEvent) {
    log.debug('AppComponent: onSocketConnected(): status:', status);
    const { connected, socketId } = status;

    if (connected !== undefined) {
      if (connected) {
        this.serverReachable = true;
        this.displayServerDownDialog = false;
      }
      else if (!connected) {
        this.serverReachable = false;
        this.displayServerDownDialog = true;
        this.toolService.stop();
      }
    }

    if (connected && socketId) {
      await this.checkLoggedInState(socketId);
    }
    this.changeDetectorRef.detectChanges();
  }



  async checkLoggedInState(socketId: string) {
    await this.authService.checkCredentials(socketId);
    // login state will change via loggedInChangedSubscription
    this.credentialsChecked = true;
  }



  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }



  private isMobileDevice(): boolean {
    return (typeof window.orientation !== 'undefined') ?? (navigator.userAgent.indexOf('IEMobile') !== -1);
  }
}
