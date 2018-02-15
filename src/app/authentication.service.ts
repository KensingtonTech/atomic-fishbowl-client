import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { toPromise } from 'rxjs/operator/toPromise';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { User } from './user';
import { ToolService } from './tool.service';
import { DataService } from './data.service';
import * as log from 'loglevel';

@Injectable()

export class AuthenticationService {

  constructor(  private dataService: DataService,
                private router: Router,
                private http: HttpClient,
                private toolService: ToolService ) {
                  this.toolService.logout.subscribe( () => this.logout() );
                }

  public loggedInChanged: Subject<boolean> = new Subject<boolean>();
  private apiUrl = '/api';
  public loggedInUser: User;
  public sessionId: number;

  public logout(): void {
    log.debug('AuthenticationService: logout(): logging out');
    this.dataService.abortGetBuildingCollection();
    this.http.get(this.apiUrl + '/logout' )
                    .toPromise()
                    .then( () => {
                      this.loggedInUser = null;
                      this.loggedInChanged.next(false);
                    } )
                    .catch( (err) => { log.error('AuthenticationService: logout(): ERROR during logout'); });
  }



  /*getUsers(): Promise<User> {
    return this.http
                .get(this.apiUrl + '/users' )
                .toPromise()
                // .then(response => response.json() as User[] )
                .then(response => response as User[] )
                .catch(e => this.handleError(e));
  }*/



  /*getUser(userName: string): Promise<User> {
    return this.http.get(this.apiUrl + '/user/' + userName )
                    .toPromise()
                    .then ( response => response as User );
  }*/



  public login(u: User): Promise<boolean> {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    let user: User = { username: u.username, password: u.password};
    return this.http.post(this.apiUrl + '/login', user, { headers } )
    .toPromise()
    .then( (response: any) => {
      let res = response;
      log.debug('AuthenticationService: login(): Got login response:', res);
                      this.loggedInUser = res.user;
                      this.sessionId = res.sessionId;
                      this.toolService.sessionId.next(this.sessionId);
                      return this.dataService.init();
                    })
                    .then( () => {
                      this.loggedInChanged.next(true);
                      // this.router.navigate(['/']);
                      return true;
                    })
                    .catch( (e: any) => {
                      if (e.status === 401) {
                        this.loggedInChanged.next(false);
                        return false;
                      }
                    });
  }



  isLoggedIn(): Promise<boolean> {
    log.debug('AuthenticationService: isLoggedIn()');
    return this.http.get(this.apiUrl + '/isloggedin' )
                    .toPromise()
                    .then( (res: any) => {
                      this.loggedInUser = res.user;
                      this.sessionId = res.sessionId;
                      this.toolService.sessionId.next(this.sessionId);
                      return true;
                    })
                    .catch( () => {
                      return Promise.reject(false);
                    });
  }



  checkCredentials(): Promise<any> {
    // log.debug('AuthenticationService: checkCredentials()');
    return this.isLoggedIn()
              .then( () => {
                return this.dataService.init();
               } )
              .then( () => {
                this.loggedInChanged.next(true);
                return true;
              })
              .catch( () => {
                this.loggedInChanged.next(false);
                return false;
              } );
  }



  handleError(error: any): Promise<any> {
    log.error('ERROR: ', error);
    return Promise.reject(error.message || error);
  }

}
