import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/toPromise';
import { Headers, RequestOptions, Http } from '@angular/http';
import { User } from './user';
import { LoggerService } from './logger-service';
import { ToolWidgetCommsService } from './tool-widget.comms.service';
import { DataService } from './data.service';

@Injectable()

export class AuthenticationService {

  constructor(  private loggerService: LoggerService,
                private dataService: DataService,
                private router: Router,
                private http: Http,
                private toolService: ToolWidgetCommsService ) {
                  this.toolService.logout.subscribe( () => this.logout() );
                }
                //private dataService: DataService ) {}

  public loggedInChanged: Subject<boolean> = new Subject<boolean>();
  private apiUrl : string = '/api';
  public loggedInUser: User;

  public logout(): void {
    console.log("AuthenticationService: logout(): logging out");
    this.dataService.abortGetBuildingCollection();
    this.http.get(this.apiUrl + '/logout' )
                    .toPromise()
                    .then( () => {} )
                    .catch( (err) => {console.error("AuthenticationService: logout(): ERROR during logout"); });

    this.loggedInUser = null;
    this.loggedInChanged.next(false);
    this.router.navigate(['login']);
  }

  getUsers(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/users' )
                .toPromise()
                .then(response => response.json() as any )
                .catch(e => this.handleError(e));
  }

  getUser(userName: string): Promise<User> {
    return this.http.get(this.apiUrl + '/user/' + userName )
                    .toPromise()
                    .then( response => {
                      let user = response.json();
                      return user;
                    });
  }

  isLoggedIn(): Promise<boolean> {
    return this.http.get(this.apiUrl + '/isloggedin' )
                    .toPromise()
                    .then( (res: any) => {
                      this.loggedInUser = res.json();
                      return true;
                    })
                    .catch( () => {return false} );
  }

  public login(u: User): Promise<boolean> {
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });
    let user: User = { username: u.username, password: u.password};
    return this.http.post(this.apiUrl + '/login', user, options)
                    .toPromise()
                    .then(response => {
                      let res = response.json();
                      console.log("AuthenticationService: login(): Got login response:", res);
                      this.loggedInUser = res.user;
                      this.loggedInChanged.next(true);
                      this.router.navigate(['/']);
                      return true;
                    })
                    .catch( (e: any) => {
                      if (e.status === 401) {
                        this.loggedInChanged.next(false);
                        return false;
                      }
                    });
  }

  checkCredentials(): void {
    this.isLoggedIn()
        .then( (res) => {
          if (res === false) {
            this.loggedInChanged.next(false);
            this.router.navigate(['login']);
          }
          else {
            this.loggedInChanged.next(true);
          }
        });
  }

/*
  checkCredentialsOld(): void {
    let token = localStorage.getItem("221b_token");
    if ( token === null ){
      this.loggedInChanged.next(false);
      this.router.navigate(['login']);
    }
    else {
      //this.loggedInUser = JSON.parse(localStorage.getItem("221b_user"));
      let parsedToken = this.parseJwt(token);
      this.loggedInUser = parsedToken._doc;
      //console.log("loggedInUser:", this.loggedInUser);
      this.loggedInChanged.next(true);

    }
  }
*/

  parseJwt(token: any): any {
      let base64Url = token.split('.')[1];
      let base64 = base64Url.replace('-', '+').replace('_', '/');
      let parsed = JSON.parse(window.atob(base64));
      //console.log("AuthenticationService: parseJwt(): parsed:", parsed);
      return parsed;
  };

  handleError(error: any): Promise<any> {
    console.error('ERROR: ',error);
    return Promise.reject(error.message || error);
  }

}
