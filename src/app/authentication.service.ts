import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/toPromise';
import { Headers, RequestOptions, Http } from '@angular/http';
import { User } from './user';
import { LoggerService } from './logger-service';

@Injectable()

export class AuthenticationService {

  constructor(  private router: Router,
                private http: Http,
                private loggerService: LoggerService ) {}

  public loggedInChanged: Subject<boolean> = new Subject<boolean>();
  private apiUrl : string = '/api';
  public loggedInUser: User;

  public logout(): void {
    console.log("logging out");
    this.http.get(this.apiUrl + '/logout', this.buildOptions() )
                    .toPromise()
                    .then( () => {} )
                    .catch( (err) => {console.error("ERROR during logout"); });

    //localStorage.removeItem("221b_user");
    localStorage.removeItem("221b_token");
    this.loggedInUser = null;
    this.loggedInChanged.next(false);
    this.router.navigate(['login']);
  }

  getUsers(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/users', this.buildOptions() )
                .toPromise()
                .then(response => response.json() as any )
                .catch(e => this.handleError(e));
  }

  getUser(userName: string): Promise<User> {
    return this.http.get(this.apiUrl + '/user/' + userName, this.buildOptions() )
                    .toPromise()
                    .then( response => {
                              let user = response.json();
                              return user;
                    });
  }

  public login(u: User): Promise<boolean> {
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });
    let user: User = { username: u.username, password: u.password};
    return this.http.post(this.apiUrl + '/login', user, options)
                    .toPromise()
                    .then(response => {
                      let res = response.json();
                      localStorage.setItem("221b_token", res.token);
                      //localStorage.setItem("221b_user", JSON.stringify(res.user));
                      let parsedToken = this.parseJwt(res.token);
                      this.loggedInUser = parsedToken._doc;
                      this.loggedInChanged.next(true);
                      this.router.navigate(['/']);
                      //this.getUser(u.username)
                      //    .then( (u: User) => this.loggedInUser = u );

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
    let token = localStorage.getItem("221b_token");
    if ( token === null){
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

  parseJwt(token: any): any {
      var base64Url = token.split('.')[1];
      var base64 = base64Url.replace('-', '+').replace('_', '/');
      return JSON.parse(window.atob(base64));
  };

  buildOptions(): any {
    let token = localStorage.getItem("221b_token");
    let headers = new Headers({ 'Authorization': 'Bearer ' +  token});
    let options = new RequestOptions({ headers: headers });
    return options;
  }

  handleError(error: any): Promise<any> {
    console.error('ERROR: ',error);
    return Promise.reject(error.message || error);
  }

}
