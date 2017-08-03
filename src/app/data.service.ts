import { Injectable, ElementRef } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/toPromise';
import { Headers, RequestOptions, Http } from '@angular/http';

import { Image } from './image';
import { NwSession } from './nwsession';
import { Collection } from './collection';
import { NwServer } from './nwserver';
import { HttpJsonStreamService } from './http-json-stream.service';
import { AuthenticationService } from './authentication.service';
import { LoggerService } from './logger-service';

@Injectable()

export class DataService { //Manages NwSession objects and also Image objects in grid and the image's association with Session objects.  Adds more objects as they're added

  constructor(private http: Http,
              private httpJsonStreamService: HttpJsonStreamService,
              private authService: AuthenticationService,
              private loggerService: LoggerService) {}

  public imagePublished: Subject<any> = new Subject<any>();
  public sessionPublished: Subject<any> = new Subject<any>();
  public collectionsChanged: Subject<any> = new Subject<any>();
  public selectedCollectionChanged: Subject<any> = new Subject<any>();
  public collectionStateChanged: Subject<any> = new Subject<any>();
  public sessionsChanged: Subject<any> = new Subject<any>();
  public imagesChanged: Subject<any> = new Subject<any>();
  public searchChanged: Subject<any> = new Subject<any>();
  public searchPublished: Subject<any> = new Subject<any>();
  public preferencesChanged: Subject<any> = new Subject<any>();
  public sessionsPurged: Subject<any> = new Subject<any>();

  //private httpJsonStreamService: HttpJsonStreamService;
  //private apiUrl : string = window.location.protocol + '//' + window.location.hostname + ':3002/api';
  //private apiUrl : string = 'https://' + window.location.hostname + ':3002/api';
  private apiUrl : string = '/api';


  /*
  executeCollection(id: string) {
    this.refreshCollections()
        .then( () => this.selectCollection(id) )
        .then( () => this.buildCollection(id) );
  }
*/

/*
  getFirstCollection(): any { // a bit of a hack since dicts aren't really ordered
    console.log("getFirstCollection()");
    //this.selectedCollection=this.getFirstCollection();
    //this.selectedCollection=this.getFirstCollection();
    //for (var c in this.collections) {
    for (var c in this.collections) {
      //console.log("First collection:",c);
      return c;
    }
  }
*/

  sessionWidgetElement: ElementRef;

  setSessionWidget(el: ElementRef): void {
    this.sessionWidgetElement = el;
    //console.log("sessionWidgetElement:");
    //console.log(this.sessionWidgetElement);
  }

//  getSessionMeta(s: number) : Promise<any> {
//    return Promise.resolve(this.sessions[s].meta);
//  }

  getNwServers(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/nwservers', this.buildOptions() )
                .toPromise()
                .then(response => response.json() as any )
                .catch(e => this.handleError(e));
  }

  getUsers(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/users', this.buildOptions() )
                .toPromise()
                .then(response => response.json() as any )
                .catch(e => this.handleError(e));
  }

  public globalPreferences: any;

  getPreferences(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/preferences', this.buildOptions() )
                .toPromise()
                .then( (response: any) => { let prefs = response.json();
                                            this.globalPreferences = prefs;
                                            this.preferencesChanged.next(prefs);
                                            return prefs;
                                          })
                .catch(e => this.handleError(e));
  }

  setPreferences(prefs: any): Promise<void> {
    let token = localStorage.getItem("221b_token");
    let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' +  token });
    let options = new RequestOptions({ headers: headers });
    this.globalPreferences = prefs;
    this.preferencesChanged.next(prefs);
    return this.http.post(this.apiUrl + '/setpreferences', prefs, options)
                    .toPromise()
                    .then(response => {
                      //console.log(response);
                    })
                    .catch(e => this.handleError(e));
  }

  getCollections(): Promise<Collection[]> {
    console.log("DataService: getCollections()");
    return this.http.get(this.apiUrl + '/collections', this.buildOptions() )
                .toPromise()
                .then(response => response.json() as Collection[] )
                .catch(e => this.handleError(e));
  }

  refreshCollections(): Promise<void> {
    //console.log('DataService: refreshCollections()');
    this.loggerService.logDebug('DataService: refreshCollections()');
    return this.http.get(this.apiUrl + '/collections', this.buildOptions() )
                .toPromise()
                //.then(response => {this.collections = response.json() as Collection[]; console.log('collections:',this.collections);} )
                //.then(response => {this.collections = response.json() as any; console.log('collections:',this.collections);} )
                //.then(response => {this.collections = response.json() as any; console.log('collections:',this.collections);} )
                .then(response => {this.collectionsChanged.next(response.json() as any);} )
                .catch(e => this.handleError(e));
  }

  noCollections(): void {
    this.imagesChanged.next( [] );
    //this.sessionsChanged.next( {} );
  }


  buildCollection(id: string): Promise<void> {
    console.log("DataService: buildCollection():", id);
    return this.http.get(this.apiUrl + '/buildcollection/' + id, this.buildOptions() )
                    .toPromise()
                    //.then( () => this.getBuildingCollection(id) )
                    .catch(e => this.handleError(e));
                    //fetchStream(this.apiUrl + '/buildcollection/' + id);
    //.subscribe( (o: any) => { console.log('Observable:'); console.log(o);} );
  }

  abortGetBuildingCollection(): Promise<void> {
    console.log("DataService: abortGetBuildingCollection()");
    return new Promise<void>( resolve => {
      this.httpJsonStreamService.abort();
      resolve();
    });
  }

  selectCollection(collection: any): Promise<string> {
    let id=collection.id;
    console.log('DataService: selectCollection(' + id + '):', collection);
    return this.http.get(this.apiUrl + '/collectiondata/' + id, this.buildOptions() )
                    .toPromise()
                    .then(response => {
                      let data = response.json() as any;
                      this.selectedCollectionChanged.next(collection);
                      this.imagesChanged.next(data.images);
                      this.sessionsChanged.next(data.sessions);
                      if (data.search) {
                        this.searchChanged.next(data.search);
                      }
                      //console.log("search terms", data.search);
                      //return ;
                    })
                    .catch(e => this.handleError(e));
  }


  getBuildingCollection(id: string): void {
    console.log("DataService: getBuildingCollection():", id);
    this.httpJsonStreamService.fetchStream(this.apiUrl + '/getbuildingcollection/' + id)
                              .subscribe( (o: any) => {
                                                        //console.log("Observable", o);
                                                        if (o.collection) {
                                                          //console.log("received collection update",o.collection);
                                                          //let id = o.collection.id;
                                                          this.collectionStateChanged.next(o.collection);
                                                        }
                                                        else if (o.collectionUpdate) {
                                                          //let sessionId = o.collectionUpdate.session.id;
                                                          //this.sessions[sessionId] = o.collectionUpdate.session;
                                                          if (o.collectionUpdate.session) {
                                                            this.sessionPublished.next(o.collectionUpdate.session);
                                                          }
                                                          if (o.collectionUpdate.images) {
                                                            //this.images.push(o.collectionUpdate.image);
                                                            this.imagePublished.next(o.collectionUpdate.images);
                                                          }
                                                          if (o.collectionUpdate.search) {
                                                            this.searchPublished.next(o.collectionUpdate.search[0]);
                                                          }
                                                        }
                                                        else {
                                                          //there's data here that shouldn't be
                                                          console.error("getbuildingcollection: unhandled JSON data", o);
                                                        }
                              });
  }

  getRollingCollection(id: string): void {
    console.log("DataService: getRollingCollection():", id);
    this.httpJsonStreamService.fetchStream(this.apiUrl + '/getrollingcollection/' + id)
                              .subscribe( (o: any) => {
                                                        //console.log("Observable", o);
                                                        if ('collection' in o) {
                                                          //console.log("received collection update",o.collection);
                                                          //let id = o.collection.id;
                                                          this.collectionStateChanged.next(o.collection);
                                                        }
                                                        else if ('collectionUpdate' in o) {
                                                          //let sessionId = o.collectionUpdate.session.id;
                                                          //this.sessions[sessionId] = o.collectionUpdate.session;
                                                          if ('session' in o.collectionUpdate) {
                                                            this.sessionPublished.next(o.collectionUpdate.session);
                                                          }
                                                          if ('images' in o.collectionUpdate) {
                                                            //this.images.push(o.collectionUpdate.image);
                                                            this.imagePublished.next(o.collectionUpdate.images);
                                                          }
                                                          if ('search' in o.collectionUpdate) {
                                                            console.log("search:", o.collectionUpdate.search);
                                                            this.searchPublished.next(o.collectionUpdate.search[0]);
                                                            //this.searchPublished.next(o.collectionUpdate.search);
                                                          }
                                                        }
                                                        else if ('collectionPurge' in o) {
                                                          this.sessionsPurged.next(o.collectionPurge);
                                                        }
                                                        else if ('keepalive' in o) {
                                                          //do nothing
                                                          //console.log("got keepalive");
                                                        }
                                                        else {
                                                          //there's data here that shouldn't be
                                                          console.error("getrollingcollection: unhandled JSON data", o);
                                                        }
                              });
  }

  deleteCollection(id: string): Promise<void> {
    console.log("DataService: deleteCollection("+id+")");
    return this.http.delete(this.apiUrl + '/collection/' + id, this.buildOptions() )
                .toPromise()
                .then( () => {} )
                .catch(e => this.handleError(e));
  }

  deleteUser(id: string): Promise<void> {
    console.log("DataService: deleteUser():", id);
    return this.http.delete(this.apiUrl + '/user/' + id, this.buildOptions() )
                .toPromise()
                .then(response => {
                  let def=response.json() as any;
                })
                .catch(e => this.handleError(e));
  }

  deleteNwServer(id: string): Promise<void> {
    console.log("DataService: deleteNwServer()");
    return this.http.delete(this.apiUrl + '/nwserver/' + id, this.buildOptions() )
                .toPromise()
                .then(response => {
                  let def=response.json() as any;
                })
                .catch(e => this.handleError(e));
  }

  addUser(user: any): Promise<any> {
    console.log("DataService: addUser()")
    let token = localStorage.getItem("221b_token");
    let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' +  token });
    let options = new RequestOptions({ headers: headers });
    return this.http.post(this.apiUrl + '/adduser', user, options)
                .toPromise()
                .then(response => {
                  console.log(response);
                })
                .catch(e => this.handleError(e));
  }

  updateUser(user: any): Promise<any> {
    console.log("DataService: updateUser()");
    let token = localStorage.getItem("221b_token");
    let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' +  token });
    let options = new RequestOptions({ headers: headers });
    return this.http.post(this.apiUrl + '/updateuser', user, options)
                .toPromise()
                .then(response => {
                  console.log(response);
                })
                .catch(e => this.handleError(e));
  }

  addNwServer(nwserver: NwServer): Promise<any> {
    console.log("DataService: addNwServer()");
    let token = localStorage.getItem("221b_token");
    let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' +  token });
    let options = new RequestOptions({ headers: headers });
    return this.http.post(this.apiUrl + '/addnwserver', nwserver, options)
                .toPromise()
                .then(response => {
                  console.log(response);
                })
                .catch(e => this.handleError(e));
  }

  addCollection(collection: any):  Promise<any> {
    console.log("DataService: addCollection():", collection.id);
    let token = localStorage.getItem("221b_token");
    let headers = new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' +  token });
    let options = new RequestOptions({ headers: headers });
    return this.http.post(this.apiUrl + '/addcollection', collection, options)
                .toPromise()
                .then(response => {
                  console.log(response);
                })
                .catch(e => this.handleError(e));
  }

  ping(): Promise<any> {
    //console.log("DataService: ping()");
    return this.http.get(this.apiUrl + '/ping')
                    .toPromise()
                    .then( () => {} )
                    .catch( () => { return Promise.reject("") } );
                    //.catch(e => this.handleError(e));
  }

  public buildOptions(): any {
    let token = localStorage.getItem("221b_token");
    let headers = new Headers({ 'Authorization': 'Bearer ' +  token});
    let options = new RequestOptions({ headers: headers });
    return options;
  }

  handleError(error: any): Promise<any> {
    if (error.status === 401) {
      this.authService.logout();
      return Promise.reject(error.message || error);
    }
    else {
      console.error('ERROR: ',error);
      return Promise.reject(error.message || error);
    }
  }

}
