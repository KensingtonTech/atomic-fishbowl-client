import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { User } from 'types/user';
import { ToolService } from './tool.service';
import { DataService } from './data.service';
import { Logger } from 'loglevel';
declare var log: Logger;

@Injectable()

export class AuthenticationService {

  public loggedInChanged: Subject<boolean> = new Subject<boolean>();
  public loggedInUser: User;
  public clientSessionId: number;
  private loggedIn = false;



  constructor(  private dataService: DataService,
                private http: HttpClient,
                private toolService: ToolService ) {
                  log.debug('AuthenticationService: constructor()');
                  this.toolService.logout.subscribe( (socketId) => this.logout(socketId) );
                }



  logout(socketId): void {
    log.debug('AuthenticationService: logout(): logging out');
    if (!this.loggedIn) {
      log.debug('AuthenticationService: logout(): User already logged out; not trying again');
      return;
    }
    this.dataService.leaveCollection();
    this.http
        .get(this.dataService.apiUrl + '/logout?socketId=' + socketId )
        .toPromise()
        .catch( (error: HttpErrorResponse) => {
          if (error.status === 401) {
            // do nothing
            log.debug('AuthenticationService: logout(): Discovered user was already logged out');
          }
          else {
            throw error;
          }
        })
        .then( () => {
          this.loggedIn = false;
          this.loggedInUser = null;
          this.loggedInChanged.next(false);
        });
  }



  login(user: User, socketId): Promise<boolean> {
    // called by login-form
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http
                .post(this.dataService.apiUrl + '/login?socketId=' + socketId, user, { headers } )
                .toPromise()
                .then( (response: any) => {
                  log.debug('AuthenticationService: login(): Got login response:', response);
                  this.loggedIn = true;
                  this.loggedInUser = response.user;
                  this.clientSessionId = response.sessionId;
                  this.toolService.clientSessionId.next(this.clientSessionId);
                  this.loggedInChanged.next(true);
                  return true;
                })
                .catch( (error: HttpErrorResponse) => {
                  this.loggedIn = false;
                  if (error.status === 401) {
                    this.loggedInChanged.next(false);
                    return false;
                  }
                  else {
                    throw error;
                  }
                });
  }



  private checkWhetherLoggedIn(socketId): Promise<boolean> {
    // only called by this.checkCredentials()
    log.debug('AuthenticationService: checkWhetherLoggedIn()');
    return this.http
                .get(this.dataService.apiUrl + '/isloggedin?socketId=' + socketId )
                .toPromise()
                .then( (res: any) => {
                  this.loggedIn = true;
                  this.loggedInUser = res.user;
                  this.clientSessionId = res.sessionId;
                  this.toolService.clientSessionId.next(this.clientSessionId);
                  return true;
                })
                .catch( (error: HttpErrorResponse) => {
                  this.loggedIn = false;
                  if (error.status === 401) {
                    return false;
                  }
                  else {
                    throw error;
                  }
                });
  }



  checkCredentials(socketId): Promise<boolean> {
    // called by app-component when first loading the app, after ping is successful
    log.debug('AuthenticationService: checkCredentials()');
    return this.checkWhetherLoggedIn(socketId)
                .then( (result) => {
                  if (result === true) {
                    this.loggedInChanged.next(true); // handled in AppComponent
                    return true;
                  }
                  else {
                    this.loggedInChanged.next(false); // handled in AppComponent
                    return false;
                  }
                });
  }

}
