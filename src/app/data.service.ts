import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { toPromise } from 'rxjs/operator/toPromise';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Collection } from './collection';
import { NwServer } from './nwserver';
import { SaServer } from './saserver';
import { HttpJsonStream } from './http-json-stream';
import { AuthenticationService } from './authentication.service';
import { ToolService } from './tool.service';
import { UseCase } from './usecase';
import { Feed } from './feed';
import { Preferences } from './preferences';
import * as log from 'loglevel';
import * as io from 'socket.io-client';

@Injectable()

export class DataService { // Manages NwSession objects and also Image objects in grid and the image's association with Session objects.  Adds more objects as they're added

  constructor(private http: HttpClient, private toolService: ToolService ) {

    // log.debug('DataService: constructor()');

    this.toolService.clientSessionId.subscribe( (clientSessionId: number) => {
      log.debug(`DataService: clientSessionIdSubscription(): got clientSessionId: ${clientSessionId}`);
      this.clientSessionId = clientSessionId;
    });

    this.toolService.HttpJsonStreamConnected.subscribe( (connected: boolean) => this.httpJsonStreamServiceConnected = connected );


    // Subscribe to socket events
    this.socket.on('disconnect', reason => {
      // log.debug('Server disconnected socket with reason:', reason);
      if (reason === 'io server disconnect') {
        // the server disconnected us forcefully.  maybe due to logout or token timeout
        // start trying to reconnect
        // this will repeat until successful
        this.socket.open();
      }
    } );
    this.socket.on('connect', socket => log.debug('Socket.io connected to server' ));
    this.socket.on('preferences', preferences => this.onPreferencesUpdate(preferences) );
    this.socket.on('collections', collections => this.onCollectionsUpdate(collections) );
    this.socket.on('serverVersion', version => this.onServerVersionUpdate(version) );
    this.socket.on('publicKey', key => this.onPublicKeyUpdate(key) );
    this.socket.on('nwservers', apiServers => this.onNwServersUpdate(apiServers) );
    this.socket.on('saservers', apiServers => this.onSaServersUpdate(apiServers) );
    this.socket.on('feeds', feeds => this.onFeedsUpdate(feeds) );
    this.socket.on('feedStatus', feedStatus => this.onFeedStatusUpdate(feedStatus) );
    this.socket.on('users', users => this.onUsersUpdate(users) );
    this.socket.on('useCases', useCases => this.onUseCasesUpdate(useCases) );
    this.socket.on('logout', () => this.toolService.logout.next() ); // TODO: triggered by the socket when our validity expires


    // Subscribe to collection socket events
    this.collectionsSocket.on('connect', socket => log.debug('Socket.io collectionsSocket connected to server' ));
    this.collectionsSocket.on('disconnect', reason => {
      if (reason === 'io server disconnect') {
        this.collectionsSocket.open();
      }
    } );
    this.collectionsSocket.on('state', (state) => this.collectionStateChanged.next(state) );
    this.collectionsSocket.on('purge', (collectionPurge) => this.sessionsPurged.next(collectionPurge) );
    this.collectionsSocket.on('deleted', (user) => {
      this.noCollections.next();
      this.collectionDeleted.next(user);
    } );
    this.collectionsSocket.on('clear', () => {
      this.sessionsReplaced.next( {} );
      this.searchReplaced.next( [] );
      this.contentReplaced.next( [] );
    } );
    this.collectionsSocket.on('update', (update) => {
      log.debug('DataService: got update:', update);
      if ('collectionUpdate' in update) {
        update = update.collectionUpdate;
        if ('session' in update) {
          this.sessionPublished.next(update.session);
        }
        if ('images' in update) {
          this.contentPublished.next(update.images);
        }
        if ('search' in update) {
          this.searchPublished.next(update.search);
        }
      }
      if ('queryResultsCount' in update) {
        this.queryResultsCountUpdated.next(update.queryResultsCount);
      }
    });
    this.collectionsSocket.on('sessions', (sessions) => this.sessionsReplaced.next(sessions) );
    this.collectionsSocket.on('content', (content) => this.contentReplaced.next(content) );
    this.collectionsSocket.on('searches', (searches) => this.searchReplaced.next(searches) );

  }



  private socket = io();
  private collectionsSocket = io('/collections');
  private httpJsonStreamService: HttpJsonStream = new HttpJsonStream(this.toolService);

  // Observables
  public contentPublished: Subject<any> = new Subject<any>();
  public sessionPublished: Subject<any> = new Subject<any>();
  public selectedCollectionChanged: Subject<any> = new Subject<any>();
  public collectionStateChanged: Subject<any> = new Subject<any>();
  public sessionsReplaced: Subject<any> = new Subject<any>();
  public contentReplaced: Subject<any> = new Subject<any>();
  public searchReplaced: Subject<any> = new Subject<any>();
  public searchPublished: Subject<any> = new Subject<any>();
  public errorPublished: Subject<any> = new Subject<any>();
  public sessionsPurged: Subject<any> = new Subject<any>();
  public queryResultsCountUpdated: Subject<any> = new Subject<any>();
  public collectionDeleted: Subject<string> = new Subject<string>();
  public noCollections: Subject<void> = new Subject<void>();

  public collectionsChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public preferencesChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public nwServersChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public saServersChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public feedsChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public feedStatusChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public usersChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public serverVersionChanged: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  public publicKeyChanged: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  public useCasesChanged: BehaviorSubject<object> = new BehaviorSubject<object>( { useCases: [], useCasesObj: {} } );


  // Properties
  private apiUrl = '/api';
  private clientSessionId: number;
  public httpJsonStreamServiceConnected = false;

  public init(): Promise<any> {
    // Run by authentication service at login or page load
    log.debug('DataService: init()');
    return Promise.resolve();
  }


  /////////////////////SOCKET.IO EVENTS//////////////////

  // We could pipe the events straight to the observables but...
  // we keep this here for debugging purposes and any custom logic required

  onPreferencesUpdate(preferences: Preferences) {
    log.debug('DataService: onPreferencesUpdate(): preferences:', preferences);
    this.preferencesChanged.next(preferences);
  }



  onCollectionsUpdate(collections: any) {
    log.debug('DataService: onCollectionsUpdate(): collections:', collections);
    this.collectionsChanged.next(collections);
  }



  onServerVersionUpdate(version: string) {
    log.debug('DataService: onServerVersionUpdate(): version:', version);
    this.serverVersionChanged.next(version);
  }



  onPublicKeyUpdate(key: string) {
    log.debug('DataService: onPublicKeyUpdate(): key:', key);
    this.publicKeyChanged.next(key);
  }



  onNwServersUpdate(apiServers) {
    log.debug('DataService: onNwServersUpdate(): key:', apiServers);
    this.nwServersChanged.next(apiServers);
  }



  onSaServersUpdate(apiServers) {
    log.debug('DataService: onSaServersUpdate(): key:', apiServers);
    this.saServersChanged.next(apiServers);
  }



  onFeedsUpdate(feeds) {
    log.debug('DataService: onFeedsUpdate(): feeds:', feeds);
    this.feedsChanged.next(feeds);
  }



  onFeedStatusUpdate(feedStatus) {
    log.debug('DataService: onFeedStatusUpdate(): feedStatus:', feedStatus);
    this.feedStatusChanged.next(feedStatus);
  }



  onUsersUpdate(users) {
    log.debug('DataService: onUsersUpdate(): users:', users);
    this.usersChanged.next(users);
  }



  onUseCasesUpdate(useCases) {
    log.debug('DataService: onUseCasesUpdate(): useCases:', useCases );
    let useCasesObj = {};
    for (let i = 0; i < useCases.length; i++) {
      let thisUseCase = useCases[i];
      useCasesObj[thisUseCase.name] = thisUseCase;
    }
    this.useCasesChanged.next( { useCases: useCases, useCasesObj: useCasesObj } );
  }


  /////////////////////NW SERVERS/////////////////////

  testNwServer( server: any ): Promise<any> {
    return this.http
                .post(this.apiUrl + '/nwserver/test', server )
                .toPromise();
  }


  deleteNwServer(id: string): Promise<void> {
    log.debug('DataService: deleteNwServer():', id);
    return this.http.delete(this.apiUrl + '/nwserver/' + id )
                .toPromise()
                .then(response => response as any)
                .catch(e => this.handleError(e));
  }


  addNwServer(nwserver: NwServer): Promise<any> {
    log.debug('DataService: addNwServer()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/nwserver', nwserver, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: addNwServer(): response:', response);
                });
  }


  editNwServer(nwserver: NwServer): Promise<any> {
    log.debug('DataService: editNwServer()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/nwserver/edit', nwserver, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: editNwServer(): response:', response);
                });
  }



    /////////////////////SA SERVERS/////////////////////

    testSaServer( server: any ): Promise<any> {
      return this.http
                  .post(this.apiUrl + '/saserver/test', server )
                  .toPromise();
    }


    deleteSaServer(id: string): Promise<void> {
      log.debug('DataService: deleteSaServer():', id);
      return this.http.delete(this.apiUrl + '/saserver/' + id )
                  .toPromise()
                  .then(response => response as any)
                  .catch(e => this.handleError(e));
    }


    addSaServer(saserver: SaServer): Promise<any> {
      log.debug('DataService: addSaServer()');
      let headers = new HttpHeaders().set('Content-Type', 'application/json');
      return this.http.post(this.apiUrl + '/saserver', saserver, { headers } )
                  .toPromise()
                  .then(response => {
                    log.debug('DataService: addSaServer(): response:', response);
                  });
    }


    editSaServer(saserver: SaServer): Promise<any> {
      log.debug('DataService: editSaServer()');
      let headers = new HttpHeaders().set('Content-Type', 'application/json');
      return this.http.post(this.apiUrl + '/saserver/edit', saserver, { headers } )
                  .toPromise()
                  .then(response => {
                    log.debug('DataService: editSaServer(): response:', response);
                  });
    }

  /////////////////////PREFERENCES/////////////////////

  setPreferences(prefs: any): Promise<void> {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    this.preferencesChanged.next(prefs);
    return this.http.post(this.apiUrl + '/preferences', prefs, { headers } )
                    .toPromise()
                    .then(response => {} )
                    .catch(e => this.handleError(e));
  }


  /////////////////////COLLECTIONS/////////////////////

  addCollection(collection: any):  Promise<any> {
    log.debug('DataService: addCollection():', collection.id);
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/collection', collection, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }


  editCollection(collection: any):  Promise<any> {
    log.debug('DataService: editCollection():', collection.id);
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/collection/edit', collection, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }



  getRollingCollection(collectionId: string): void {
    // uses socket.io
    this.collectionsSocket.emit('join', { collectionId: collectionId, sessionId: this.clientSessionId });
  }



  getFixedCollection(collectionId: string): void {
    // uses socket.io
    this.collectionsSocket.emit('joinFixed', collectionId );
  }



  leaveCollection(): void {
    // uses socket.io
    this.collectionsSocket.emit('leave');
    this.collectionsSocket.emit('leaveFixed');
  }



  pauseMonitoringCollection(): void {
    log.debug('DataService: pauseMonitoringCollection()');
    this.collectionsSocket.emit('pause');
  }



  unpauseMonitoringCollection(): void {
    log.debug('DataService: unpauseMonitoringCollection()');
    this.collectionsSocket.emit('unpause');
  }



  /*getRollingCollectionOld(id: string): void {
    // uses http
    log.debug('DataService: getRollingCollection():', id);
    this.httpJsonStreamService.fetchStream(this.apiUrl + '/collection/rolling/' + id, { afbsessionid: this.clientSessionId } )
                              .subscribe( (o: any) => {
                                                        if ('collection' in o) {
                                                          // log.debug("received collection update",o.collection);
                                                          this.collectionStateChanged.next(o.collection);
                                                        }
                                                        else if ('wholeCollection' in o) {
                                                          this.sessionsReplaced.next( o['wholeCollection']['sessions'] );
                                                          this.contentReplaced.next( o['wholeCollection']['images'] );
                                                          this.searchReplaced.next( o['wholeCollection']['search'] );
                                                        }
                                                        else if ('collectionDeleted' in o) {
                                                          let user = o['user'];
                                                          this.collectionDeleted.next(user);
                                                        }
                                                        else if ('heartbeat' in o) { log.debug('heartbeat'); }
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
                                                        else if ('collectionEdited' in o) { } // do something to reload the collection
                                                        else {
                                                          // there's data here that shouldn't be
                                                          log.error('DataService: getRollingCollection(): unhandled JSON data', o);
                                                        }
                              });
  }*/



  /*getFixedCollection(id: string, collection: Collection): void {
    log.debug('DataService: getFixedCollection():', id);
    this.httpJsonStreamService.fetchStream(this.apiUrl + '/collection/fixed/' + id)
                              .subscribe( (o: any) => {
                                                        // log.debug('DataService: getFixedCollection(): o:', o);
                                                        let good = false;
                                                        if ('collection' in o) {
                                                          // log.debug("received collection update",o.collection);
                                                          this.collectionStateChanged.next(o.collection);
                                                          good = true;
                                                        }
                                                        if ('wholeCollection' in o) {
                                                          this.sessionsReplaced.next( o['wholeCollection']['sessions'] );
                                                          this.contentReplaced.next( o['wholeCollection']['images'] );
                                                          this.searchReplaced.next( o['wholeCollection']['search'] );
                                                          good = true;
                                                        }
                                                        if ('collectionDeleted' in o) {
                                                          let user = o['user'];
                                                          this.collectionDeleted.next(user);
                                                          good = true;
                                                        }
                                                        if ('heartbeat' in o) {
                                                          good = true;
                                                        }
                                                        if ('error' in o) {
                                                          this.errorPublished.next(o.error);
                                                          good = true;
                                                        }
                                                        if ('queryResultsCount' in o) {
                                                          this.queryResultsCountUpdated.next(o.queryResultsCount);
                                                          good = true;
                                                        }
                                                        if ('collectionUpdate' in o) {
                                                          good = true;
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
                                                        if ('close' in o) { return; }
                                                        if (!good) {
                                                          // there's data here that shouldn't be
                                                          log.error('DataService: getFixedCollection(): unhandled JSON data', o);
                                                        }
                              });
  }*/


  /*abortHttpStream(): Promise<void> {
    log.debug('DataService: abortHttpStream()');
    this.httpJsonStreamService.abort();
    return Promise.resolve();
  }*/


  /*pauseMonitoringCollectionOld(id: string): Promise<void> {
    log.debug('DataService: pauseMonitoringCollectionOld()');
    let headers = new HttpHeaders().set('afbsessionid', this.clientSessionId.toString() );
    return this.http.get(this.apiUrl + '/collection/monitoring/pause/' + id, { headers } )
                    .toPromise()
                    .catch(e => this.handleError(e));
  }*/


  /*
  unpauseMonitoringCollectionOld(id: string): Promise<void> {
    log.debug('DataService: unpauseMonitoringCollectionOld()');
    let headers = new HttpHeaders().set('afbsessionid', this.clientSessionId.toString() );
    return this.http.get(this.apiUrl + '/collection/monitoring/unpause/' + id, { headers } )
                    .toPromise()
                    .catch(e => this.handleError(e));
  }*/



  deleteCollection(id: string): Promise<void> {
    log.debug('DataService: deleteCollection():', id);
    return this.http.delete(this.apiUrl + '/collection/' + id )
                .toPromise()
                .then( () => {} )
                .catch(e => this.handleError(e));
  }


  /////////////////////FEEDS/////////////////////

  deleteFeed(id: string): Promise<any> {
    log.debug('DataService: deleteFeed():', id);
    return this.http.delete(this.apiUrl + '/feed/' + id )
               .toPromise();
  }



  addFeedManual(feed: Feed, file: File): Promise<any> {
    log.debug('DataService: addFeedManual()');
    let formData = new FormData();
    formData.append('model', JSON.stringify(feed));
    formData.append('file', file);
    return this.http.post(this.apiUrl + '/feed/manual', formData )
                .toPromise()
                .then(response => {
                  log.debug('DataService: addFeedManual(): response:', response);
                  return response;
                });
  }



  editFeedWithoutFile(feed: Feed): Promise<any> {
    log.debug('DataService: editFeedWithoutFile()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/feed/edit/withoutfile', feed, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: editFeedWithoutFile(): response:', response);
                  return response;
                });
  }



  editFeedWithFile(feed: Feed, file: File): Promise<any> {
    log.debug('DataService: editFeedWithFile()');
    let formData = new FormData();
    formData.append('model', JSON.stringify(feed));
    formData.append('file', file);
    return this.http.post(this.apiUrl + '/feed/edit/withfile', formData )
                .toPromise()
                .then(response => {
                  log.debug('DataService: editFeedWithFile(): response:', response);
                  return response;
                });
  }



  addFeedScheduled(feed: Feed): Promise<any> {
    log.debug('DataService: addFeedScheduled()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/feed/scheduled', feed, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: addFeedScheduled(): response:', response);
                  return response;
                });
  }



  testFeedUrl( host: any ): Promise<any> {
    return this.http
                .post(this.apiUrl + '/feed/testurl', host )
                .toPromise();
  }



  getFeedFilehead(id: string): Promise<any> {
    return this.http.get(this.apiUrl + '/feed/filehead/' + id )
               .toPromise();
  }





  /////////////////////USERS/////////////////////

  deleteUser(id: string): Promise<void> {
    log.debug('DataService: deleteUser():', id);
    return this.http.delete(this.apiUrl + '/user/' + id )
                .toPromise()
                .then(response => response as any)
                .catch(e => this.handleError(e));
  }



  addUser(user: any): Promise<any> {
    log.debug('DataService: addUser()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/user', user, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }



  updateUser(user: any): Promise<any> {
    log.debug('DataService: updateUser()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/user/edit', user, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }




  /////////////////////PING/////////////////////

  ping(): Promise<any> {
    // log.debug('DataService: ping()');
    return this.http.get(this.apiUrl + '/ping')
                    .toPromise();
  }



  handleError(error: any): Promise<any> {
    // log.debug('got to 1');
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
