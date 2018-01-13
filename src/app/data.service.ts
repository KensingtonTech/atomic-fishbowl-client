import { Injectable } from '@angular/core';
// import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/toPromise';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { Collection } from './collection';
import { NwServer } from './nwserver';
import { HttpJsonStream } from './http-json-stream';
import { AuthenticationService } from './authentication.service';
import { ToolService } from './tool.service';
import { UseCase } from './usecase';
import * as log from 'loglevel';

@Injectable()

export class DataService { // Manages NwSession objects and also Image objects in grid and the image's association with Session objects.  Adds more objects as they're added

  constructor(private http: HttpClient, private toolService: ToolService ) {
    this.toolService.sessionId.subscribe( (sessionId: number) => {
      log.debug(`DataService: sessionIdSubscription(): got sessionId: ${sessionId}`);
      this.sessionId = sessionId;
    });
    this.toolService.HttpJsonStreamConnected.subscribe( (connected: boolean) => this.httpJsonStreamServiceConnected = connected );
  }

  private httpJsonStreamService: HttpJsonStream = new HttpJsonStream(this.toolService);
  public contentPublished: Subject<any> = new Subject<any>();
  public sessionPublished: Subject<any> = new Subject<any>();
  public collectionsChanged: Subject<any> = new Subject<any>();
  public selectedCollectionChanged: Subject<any> = new Subject<any>();
  public collectionStateChanged: Subject<any> = new Subject<any>();
  public sessionsReplaced: Subject<any> = new Subject<any>();
  public contentReplaced: Subject<any> = new Subject<any>();
  public searchChanged: Subject<any> = new Subject<any>();
  public searchPublished: Subject<any> = new Subject<any>();
  public errorPublished: Subject<any> = new Subject<any>();
  public preferencesChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public sessionsPurged: Subject<any> = new Subject<any>();
  private apiUrl = '/api';
  private sessionId: number;
  public httpJsonStreamServiceConnected = false;
  public queryResultsCountUpdated: Subject<any> = new Subject<any>();
  public useCasesChanged: BehaviorSubject<object> = new BehaviorSubject<object>( { useCases: [], useCasesObj: {} } );

  public init(): void {
    // Run by authentication service at login or page load
    log.debug('DataService: init()');
    this.getPreferences();
    this.getUseCases();
  }

  getServerVersion(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/version' )
                .toPromise()
                .then( (response: any) => {
                                    return response.version;
                                  })
                .catch(e => this.handleError(e));
  }

  getPublicKey(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/publickey' )
                .toPromise()
                .then( (response: any) => response.pubKey as string )
                .catch(e => this.handleError(e));
  }

  getNwServers(): Promise<any> {
    log.debug('DataService: getNwServers()');
    return this.http
                .get(this.apiUrl + '/nwservers' )
                .toPromise()
                .then( (response: any) => response as any )
                .catch(e => this.handleError(e));
  }

  testNwServer( server: any ): Promise<any> {
    return this.http
                .post(this.apiUrl + '/testnwserver', server )
                .toPromise();
  }

  getUsers(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/users' )
                .toPromise()
                .then( (response: any) => response as any )
                .catch(e => this.handleError(e));
  }

  getUseCases(): void {
    log.debug('DataService: getUseCases()');
    this.http
        .get(this.apiUrl + '/usecases')
        .toPromise()
        .then( (response: any) => {
          log.debug('DataService: getUseCases: got response:', response );
          let useCases = response.useCases;
          let useCasesObj = {};
          for (let i = 0; i < useCases.length; i++) {
            let thisUseCase = useCases[i];
            useCasesObj[thisUseCase.name] = thisUseCase;
          }
          this.useCasesChanged.next( { useCases: useCases, useCasesObj: useCasesObj } );
        })
        .catch(e => this.handleError(e));
  }

  getPreferences(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/preferences' )
                .toPromise()
                .then( (response: any) => {
                    let prefs = response;
                    this.preferencesChanged.next(prefs);
                    return prefs;
                  })
                .catch(e => this.handleError(e));
  }

  setPreferences(prefs: any): Promise<void> {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    this.preferencesChanged.next(prefs);
    return this.http.post(this.apiUrl + '/setpreferences', prefs, { headers } )
                    .toPromise()
                    .then(response => {} )
                    .catch(e => this.handleError(e));
  }

  getCollections(): Promise<Collection[]> {
    log.debug('DataService: getCollections()');
    return this.http.get(this.apiUrl + '/collections' )
                .toPromise()
                .then( (response: any) => response as Collection[] )
                .catch(e => this.handleError(e));
  }

  refreshCollections(): Promise<void> {
    // log.debug('DataService: refreshCollections()');
    log.debug('DataService: refreshCollections()');
    return this.http.get(this.apiUrl + '/collections' )
                .toPromise()
                .then( (response: any) => this.collectionsChanged.next(response) )
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

  pauseMonitoringCollection(id: string): Promise<void> {
    log.debug('DataService: pauseMonitoringCollection()');
    let headers = new HttpHeaders().set('afbsessionid', this.sessionId.toString() );
    return this.http.get(this.apiUrl + '/pausemonitoringcollection/' + id, { headers } )
                    .toPromise()
                    // .then( response => {} )
                    .catch(e => this.handleError(e));
  }

  unpauseMonitoringCollection(id: string): Promise<void> {
    log.debug('DataService: unpauseMonitoringCollection()');
    let headers = new HttpHeaders().set('afbsessionid', this.sessionId.toString() );
    return this.http.get(this.apiUrl + '/unpausemonitoringcollection/' + id, { headers } )
                    .toPromise()
                    // .then( response => {} )
                    .catch(e => this.handleError(e));
  }

  getCollectionData(collection: any): Promise<string> {
    let id = collection.id;
    log.debug('DataService: getCollectionData(' + id + '):', collection);
    return this.http.get(this.apiUrl + '/collectiondata/' + id )
                    .toPromise()
                    .then( (response: any) => {
                      let data = response;
                      this.selectedCollectionChanged.next(collection);
                      this.contentReplaced.next(data.images);
                      this.sessionsReplaced.next(data.sessions);
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
                                                        if ('collection' in o) {
                                                          // log.debug("received collection update",o.collection);
                                                          this.collectionStateChanged.next(o.collection);
                                                        }
                                                        else if ('error' in o) {
                                                          this.errorPublished.next(o.error);
                                                        }
                                                        else if ('queryResultsCount' in o) {
                                                          this.queryResultsCountUpdated.next(o.queryResultsCount);
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
                                                        }
                                                        else if ('close' in o) { return; }
                                                        else {
                                                          // there's data here that shouldn't be
                                                          log.error('DataService: getBuildingFixedCollection(): unhandled JSON data', o);
                                                        }
                              });
  }

  getRollingCollection(id: string): void {
    log.debug('DataService: getRollingCollection():', id);
    this.httpJsonStreamService.fetchStream(this.apiUrl + '/getrollingcollection/' + id, {'afbsessionid': this.sessionId} )
                              .subscribe( (o: any) => {
                                                        if ('collection' in o) {
                                                          // log.debug("received collection update",o.collection);
                                                          this.collectionStateChanged.next(o.collection);
                                                        }
                                                        else if ('error' in o) {
                                                          this.errorPublished.next(o.error);
                                                        }
                                                        else if ('queryResultsCount' in o) {
                                                          this.queryResultsCountUpdated.next(o.queryResultsCount);
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
                                                        }
                                                        else if ('close' in o) { return; }
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
                .then(response => response as any)
                .catch(e => this.handleError(e));
  }

  deleteNwServer(id: string): Promise<void> {
    log.debug('DataService: deleteNwServer():', id);
    return this.http.delete(this.apiUrl + '/nwserver/' + id )
                .toPromise()
                .then(response => response as any)
                .catch(e => this.handleError(e));
  }

  addUser(user: any): Promise<any> {
    log.debug('DataService: addUser()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/adduser', user, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }

  updateUser(user: any): Promise<any> {
    log.debug('DataService: updateUser()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/updateuser', user, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }

  addNwServer(nwserver: NwServer): Promise<any> {
    log.debug('DataService: addNwServer()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/addnwserver', nwserver, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: addNwServer(): response:', response);
                });
  }

  editNwServer(nwserver: NwServer): Promise<any> {
    log.debug('DataService: addNwServer()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/editnwserver', nwserver, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: editNwServer(): response:', response);
                });
  }

  addCollection(collection: any):  Promise<any> {
    log.debug('DataService: addCollection():', collection.id);
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/addcollection', collection, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }

  editCollection(collection: any):  Promise<any> {
    log.debug('DataService: editCollection():', collection.id);
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/editcollection', collection, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }

  ping(): Promise<any> {
    // log.debug('DataService: ping()');
    return this.http.get(this.apiUrl + '/ping')
                    .toPromise();
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
