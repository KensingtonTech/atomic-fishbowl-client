import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {
  HttpHeaders,
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import { User } from 'types/user';
import { ToolService } from './tool.service';
import { DataService } from './data.service';
import * as log from 'loglevel';
import * as Responses from 'types/responses';
import { firstValueFrom } from 'rxjs';

@Injectable({providedIn: 'root'})

export class AuthenticationService {

  loggedInChanged: Subject<boolean> = new Subject<boolean>();
  loggedInUser?: User;
  clientSessionId: string;
  private loggedIn = false;



  constructor(
    private dataService: DataService,
    private http: HttpClient,
    private toolService: ToolService
  ) {
    this.toolService.logout.subscribe(
      (socketId) => this.logout(socketId)
    );
  }



  async logout(socketId: string): Promise<void> {
    log.debug('AuthenticationService: logout(): logging out');
    if (!this.loggedIn) {
      log.debug('AuthenticationService: logout(): User already logged out; not trying again');
      return;
    }
    this.dataService.leaveCollection();
    try {
      await firstValueFrom(
        this.http
          .get(`${this.dataService.apiUrl}/logout?socketId=${socketId}`)
      );
    }
    catch (error: any) {
      if (error.status === 401) {
        // do nothing
        log.debug('AuthenticationService: logout(): Discovered user was already logged out');
      }
      else {
        throw error;
      }
    }
    finally {
      this.loggedIn = false;
      this.loggedInUser = undefined;
      this.loggedInChanged.next(false);
    }
  }



  async login(user:  Pick<User, 'username' | 'password'>, socketId: string): Promise<boolean> {
    // called by login-form
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    try {
      const res = await firstValueFrom(
        this.http.post<Responses.LoginResponse>(this.dataService.apiUrl + '/login?socketId=' + socketId, user, { headers } )
      );
      log.debug('AuthenticationService: login(): Got login response:', res);
      this.loggedIn = true;
      this.loggedInUser = res.user;
      this.clientSessionId = res.sessionId;
      this.toolService.clientSessionId.next(this.clientSessionId);
      this.loggedInChanged.next(true);
      return true;
    }
    catch (error: any) {
      this.loggedIn = false;
      if (error.status === 401) {
        this.loggedInChanged.next(false);
        return false;
      }
      else {
        throw error;
      }
    }
  }



  private async isLoggedIn(socketId: string): Promise<boolean> {
    // only called by this.checkCredentials()
    log.debug('AuthenticationService: isLoggedIn()');
    try {
      const res = await firstValueFrom(
        this.http.get<Responses.LoginResponse>(`${this.dataService.apiUrl}/isloggedin?socketId=${socketId}`)
      );
      this.loggedIn = true;
      this.loggedInUser = res.user;
      this.clientSessionId = res.sessionId;
      this.toolService.clientSessionId.next(this.clientSessionId);
      return true;
    }
    catch (error: any) {
      this.loggedIn = false;
        if (error.status === 401) {
          return false;
        }
        else {
          throw error;
        }
    }
  }



  async checkCredentials(socketId: string): Promise<boolean> {
    // called by app-component when first loading the app, after ping is successful
    log.debug('AuthenticationService: checkCredentials()');
    const result = await this.isLoggedIn(socketId);
    this.loggedInChanged.next(result); // handled in AppComponent
    return result;
  }

}
