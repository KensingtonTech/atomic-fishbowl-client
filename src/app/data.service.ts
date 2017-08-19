import { Injectable, ElementRef } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/toPromise';
import { Headers, RequestOptions, Http } from '@angular/http';

import { Content } from './content';
import { NwSession } from './nwsession';
import { Collection } from './collection';
import { NwServer } from './nwserver';
import { HttpJsonStreamService } from './http-json-stream.service';
import { AuthenticationService } from './authentication.service';
import { ToolService } from './tool.service';
declare var log: any;

@Injectable()

export class DataService { // Manages NwSession objects and also Image objects in grid and the image's association with Session objects.  Adds more objects as they're added

  constructor(private http: Http,
              private httpJsonStreamService: HttpJsonStreamService,
              private toolService: ToolService ) {
    this.toolService.sessionId.subscribe( (sessionId: number) => {
      log.debug(`DataService: sessionIdSubscription(): got sessionId: ${sessionId}`);
      this.sessionId = sessionId;
    });
  }

  public contentPublished: Subject<any> = new Subject<any>();
  public sessionPublished: Subject<any> = new Subject<any>();
  public collectionsChanged: Subject<any> = new Subject<any>();
  public selectedCollectionChanged: Subject<any> = new Subject<any>();
  public collectionStateChanged: Subject<any> = new Subject<any>();
  public sessionsChanged: Subject<any> = new Subject<any>();
  public contentChanged: Subject<any> = new Subject<any>();
  public searchChanged: Subject<any> = new Subject<any>();
  public searchPublished: Subject<any> = new Subject<any>();
  public errorPublished: Subject<any> = new Subject<any>();
  public preferencesChanged: Subject<any> = new Subject<any>();
  public sessionsPurged: Subject<any> = new Subject<any>();
  private apiUrl = '/api';
  sessionWidgetElement: ElementRef;
  public globalPreferences: any;
  private sessionId: number;

  setSessionWidget(el: ElementRef): void {
    this.sessionWidgetElement = el;
  }

  getServerVersion(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/version' )
                .toPromise()
                .then(response => {
                                    let res = response.json();
                                    return res.version;
                                  })
                .catch(e => this.handleError(e));
  }

  getNwServers(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/nwservers' )
                .toPromise()
                .then(response => response.json() as any )
                .catch(e => this.handleError(e));
  }

  getUsers(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/users' )
                .toPromise()
                .then(response => response.json() as any )
                .catch(e => this.handleError(e));
  }

  getPreferences(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/preferences' )
                .toPromise()
                .then( (response: any) => { let prefs = response.json();
                                            this.globalPreferences = prefs;
                                            this.preferencesChanged.next(prefs);
                                            return prefs;
                                          })
                .catch(e => this.handleError(e));
  }

  setPreferences(prefs: any): Promise<void> {
    let headers = new Headers({ 'Content-Type': 'application/json'});
    let options = new RequestOptions({ headers: headers });
    this.globalPreferences = prefs;
    this.preferencesChanged.next(prefs);
    return this.http.post(this.apiUrl + '/setpreferences', prefs, options)
                    .toPromise()
                    .then(response => {
                    })
                    .catch(e => this.handleError(e));
  }

  getCollections(): Promise<Collection[]> {
    log.debug('DataService: getCollections()');
    return this.http.get(this.apiUrl + '/collections' )
                .toPromise()
                .then(response => response.json() as Collection[] )
                .catch(e => this.handleError(e));
  }

  refreshCollections(): Promise<void> {
    // log.debug('DataService: refreshCollections()');
    log.debug('DataService: refreshCollections()');
    return this.http.get(this.apiUrl + '/collections' )
                .toPromise()
                .then(response => {this.collectionsChanged.next(response.json() as any); } )
                .catch(e => this.handleError(e));
  }

  buildFixedCollection(id: string): Promise<void> {
    log.debug('DataService: buildFixedCollection():', id);
    return this.http.get(this.apiUrl + '/buildfixedcollection/' + id )
                    .toPromise()
                    .catch(e => this.handleError(e));
  }

  abortGetBuildingCollection(): Promise<void> {
    log.debug('DataService: abortGetBuildingCollection()');
    return new Promise<void>( resolve => {
      this.httpJsonStreamService.abort();
      resolve();
    });
  }

  getCollectionData(collection: any): Promise<string> {
    let id = collection.id;
    log.debug('DataService: getCollectionData(' + id + '):', collection);
    return this.http.get(this.apiUrl + '/collectiondata/' + id )
                    .toPromise()
                    .then(response => {
                      let data = response.json() as any;
                      this.selectedCollectionChanged.next(collection);
                      this.contentChanged.next(data.images);
                      this.sessionsChanged.next(data.sessions);
                      if (data.search) {
                        this.searchChanged.next(data.search);
                      }
                    })
                    .catch(e => this.handleError(e));
  }


  getBuildingFixedCollection(id: string): void {
    log.debug('DataService: getBuildingFixedCollection():', id);
    this.httpJsonStreamService.fetchStream(this.apiUrl + '/getbuildingfixedcollection/' + id)
                              .subscribe( (o: any) => {
                                                        if (o.collection) {
                                                          // log.debug("received collection update",o.collection);
                                                          this.collectionStateChanged.next(o.collection);
                                                        }
                                                        else if (o.collectionUpdate) {
                                                          if ('session' in o.collectionUpdate) {
                                                            this.sessionPublished.next(o.collectionUpdate.session);
                                                          }
                                                          if ('images' in o.collectionUpdate) {
                                                            this.contentPublished.next(o.collectionUpdate.images);
                                                          }
                                                          if ('search' in o.collectionUpdate) {
                                                            this.searchPublished.next(o.collectionUpdate.search);
                                                          }
                                                          if ('error' in o.collectionUpdate) {
                                                            this.errorPublished.next(o.collectionUpdate.error);
                                                          }
                                                        }
                                                        else {
                                                          // there's data here that shouldn't be
                                                          log.error('DataService: getBuildingFixedCollection(): unhandled JSON data', o);
                                                        }
                              });
  }

  getRollingCollection(id: string): void {
    log.debug('DataService: getRollingCollection():', id);
    this.httpJsonStreamService.fetchStream(this.apiUrl + '/getrollingcollection/' + id, {'twosessionid': this.sessionId} )
                              .subscribe( (o: any) => {
                                                        if ('collection' in o) {
                                                          // log.debug("received collection update",o.collection);
                                                          this.collectionStateChanged.next(o.collection);
                                                        }
                                                        else if ('collectionUpdate' in o) {
                                                          if ('session' in o.collectionUpdate) {
                                                            this.sessionPublished.next(o.collectionUpdate.session);
                                                          }
                                                          if ('images' in o.collectionUpdate) {
                                                            this.contentPublished.next(o.collectionUpdate.images);
                                                          }
                                                          if ('search' in o.collectionUpdate) {
                                                            this.searchPublished.next(o.collectionUpdate.search);
                                                          }
                                                          if ('error' in o.collectionUpdate) {
                                                            this.errorPublished.next(o.collectionUpdate.error);
                                                          }
                                                        }
                                                        else if ('collectionPurge' in o) {
                                                          this.sessionsPurged.next(o.collectionPurge);
                                                        }
                                                        else {
                                                          // there's data here that shouldn't be
                                                          log.error('DataService: getRollingCollection(): unhandled JSON data', o);
                                                        }
                              });
  }

  deleteCollection(id: string): Promise<void> {
    log.debug('DataService: deleteCollection():', id);
    return this.http.delete(this.apiUrl + '/collection/' + id )
                .toPromise()
                .then( () => {} )
                .catch(e => this.handleError(e));
  }

  deleteUser(id: string): Promise<void> {
    log.debug('DataService: deleteUser():', id);
    return this.http.delete(this.apiUrl + '/user/' + id )
                .toPromise()
                .then(response => {
                  let def = response.json() as any;
                })
                .catch(e => this.handleError(e));
  }

  deleteNwServer(id: string): Promise<void> {
    log.debug('DataService: deleteNwServer():', id);
    return this.http.delete(this.apiUrl + '/nwserver/' + id )
                .toPromise()
                .then(response => {
                  let def = response.json() as any;
                })
                .catch(e => this.handleError(e));
  }

  addUser(user: any): Promise<any> {
    log.debug('DataService: addUser()');
    let headers = new Headers({ 'Content-Type': 'application/json'});
    let options = new RequestOptions({ headers: headers });
    return this.http.post(this.apiUrl + '/adduser', user, options)
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }

  updateUser(user: any): Promise<any> {
    log.debug('DataService: updateUser()');
    let headers = new Headers({ 'Content-Type': 'application/json'});
    let options = new RequestOptions({ headers: headers });
    return this.http.post(this.apiUrl + '/updateuser', user, options)
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }

  addNwServer(nwserver: NwServer): Promise<any> {
    log.debug('DataService: addNwServer()');
    let headers = new Headers({ 'Content-Type': 'application/json'});
    let options = new RequestOptions({ headers: headers });
    return this.http.post(this.apiUrl + '/addnwserver', nwserver, options)
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }

  addCollection(collection: any):  Promise<any> {
    log.debug('DataService: addCollection():', collection.id);
    let headers = new Headers({ 'Content-Type': 'application/json'});
    let options = new RequestOptions({ headers: headers });
    return this.http.post(this.apiUrl + '/addcollection', collection, options)
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }

  ping(): Promise<any> {
    // log.debug('DataService: ping()');
    return this.http.get(this.apiUrl + '/ping')
                    .toPromise()
                    .then( () => {} )
                    .catch( () => Promise.reject('') );
  }

  handleError(error: any): Promise<any> {
    if (error.status === 401) {
      this.toolService.logout.next();
      return Promise.reject(error.message || error);
    }
    else {
      log.error('ERROR: ', error);
      return Promise.reject(error.message || error);
    }
  }

}
