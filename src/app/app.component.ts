import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from './data.service';
import { AuthenticationService } from './authentication.service';
import { LoggerService } from './logger-service';
import { ModalService } from './modal/modal.service';
import "rxjs/add/operator/takeWhile";

@Component({
  selector: 'my-app',
  template: `
<div *ngIf="serverReachable" style="position: relative; width: 100vw; height: 100vh;">
  <tool-widget *ngIf="loggedIn"></tool-widget>
  <router-outlet></router-outlet>
  <img class="noselect" src="/resources/logo.png" style="position: absolute; left:10px; bottom: 15px;">
</div>
<serverdown-modal id="serverDownModal"></serverdown-modal>
  `
})

export class AppComponent implements OnInit, OnDestroy {

  constructor(private authService:AuthenticationService,
              private loggerService: LoggerService,
              private dataService: DataService,
              private modalService: ModalService ) {}

  public loggedIn: boolean = false;
  public serverReachable: boolean = false;
  private credentialsChecked: boolean = false;
  private alive: boolean = true;

  ngOnInit(): void {

    this.authService.loggedInChanged.takeWhile(() => this.alive).subscribe( (loggedIn: boolean) => {
                                                                          //console.log("loggedIn:", loggedIn);
                                                                          this.loggedIn = loggedIn;
                                                                        });

    //run initial ping to see if server is reachable
    this.dataService.ping()
                      .then( () => {
                                      this.serverReachable = true;
                                      this.authService.checkCredentials();
                                      this.credentialsChecked = true;
                                    })
                      .catch( () => {this.modalService.open("serverDownModal");} );

    //schedule a ping every 10 seconds and display error modal if it becomes unreachable
    setInterval( () => {
      this.dataService.ping()
                      .then( () => {
                                      this.modalService.close("serverDownModal");
                                      this.serverReachable = true;
                                      if (!this.credentialsChecked) this.authService.checkCredentials();
                      })
                      .catch( () => {this.modalService.open("serverDownModal");} );

    }, 10000);

  }

  public ngOnDestroy() {
    this.alive = false;
  }

}
