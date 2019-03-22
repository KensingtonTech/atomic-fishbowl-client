import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Subscription } from 'rxjs';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { NwServer } from './nwserver';
import { SaServer } from './saserver';
import { ToolService } from './tool.service';
import { Feed } from './feed';
import { Preferences } from './preferences';
import { License } from './license';
import * as io from 'socket.io-client';
import { Logger } from 'loglevel';
declare var JSEncrypt: any;
declare var log: Logger;

@Injectable()

export class DataService { // Manages NwSession objects and also Image objects in grid and the image's association with Session objects.  Adds more objects as they're added

  constructor(private http: HttpClient, private toolService: ToolService ) {
    log.debug('DataService: constructor()');
    this.toolService.clientSessionId.subscribe( (clientSessionId: number) => {
      log.debug(`DataService: clientSessionIdSubscription(): got clientSessionId: ${clientSessionId}`);
      this.clientSessionId = clientSessionId;
    });
  }



  private serverSocket: any;
  private collectionsSocket: any;

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
  public workerProgress: Subject<any> = new Subject<any>();
  public monitoringCollectionPause: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  public collectionsChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public preferencesChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public nwServersChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public saServersChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public feedsChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public feedStatusChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public usersChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public serverVersionChanged: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  public useCasesChanged: BehaviorSubject<object> = new BehaviorSubject<object>( { useCases: [], useCasesObj: {} } );
  public licensingChanged: BehaviorSubject<License> = new BehaviorSubject<License>(null);

  // Subscriptions

  // Properties
  private apiUrl = '/api';
  public clientSessionId: number;
  public encryptor: any;
  private pubKey: string;
  private running = false;




  public start() {
    log.debug('DataService: start()');

    this.encryptor = new JSEncrypt();

    this.serverSocket = io();
    this.collectionsSocket = io('/collections');

    // Subscribe to socket events
    this.serverSocket.on('disconnect', reason => {
      // log.debug('Server disconnected serverSocket with reason:', reason);
      if (reason === 'io server disconnect') {
        // the server disconnected us forcefully.  maybe due to logout or token timeout
        // start trying to reconnect
        // this will repeat until successful
        this.serverSocket.open();
      }
    } );
    this.serverSocket.on('connect', socket => log.debug('Socket.io connected to server' ));
    this.serverSocket.on('preferences', preferences => this.onPreferencesUpdate(preferences) );
    this.serverSocket.on('collections', collections => this.onCollectionsUpdate(collections) );
    this.serverSocket.on('serverVersion', version => this.onServerVersionUpdate(version) );
    this.serverSocket.on('publicKey', key => this.onPublicKeyChanged(key) );
    this.serverSocket.on('nwservers', apiServers => this.onNwServersUpdate(apiServers) );
    this.serverSocket.on('saservers', apiServers => this.onSaServersUpdate(apiServers) );
    this.serverSocket.on('feeds', feeds => this.onFeedsUpdate(feeds) );
    this.serverSocket.on('feedStatus', feedStatus => this.onFeedStatusUpdate(feedStatus) );
    this.serverSocket.on('users', users => this.onUsersUpdate(users) );
    this.serverSocket.on('useCases', useCases => this.onUseCasesUpdate(useCases) );
    this.serverSocket.on('license', license => this.onLicenseChanged(license) );
    this.serverSocket.on('logout', () => this.toolService.logout.next() ); // TODO: triggered by the socket when our validity expires


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
      // log.debug('DataService: got update:', update);
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
      if ('error' in update) {
        this.errorPublished.next(update.error);
      }
      if ('queryResultsCount' in update) {
        this.queryResultsCountUpdated.next(update.queryResultsCount);
      }
      if ('workerProgress' in update) {
        this.workerProgress.next(update);
      }
    });
    this.collectionsSocket.on('sessions', (sessions) => this.sessionsReplaced.next(sessions) );
    this.collectionsSocket.on('content', (content) => this.contentReplaced.next(content) );
    this.collectionsSocket.on('searches', (searches) => this.searchReplaced.next(searches) );
    this.collectionsSocket.on('paused', (paused) => this.monitoringCollectionPause.next(paused) );
    this.running = true;

  }



  public stop() {
    if (!this.running) {
      return;
    }
    log.debug('DataService: stop()');
    // clear application state to prevent prying
    this.running = false;
    this.encryptor = null;
    this.pubKey = null;
    this.monitoringCollectionPause.next(false);
    this.collectionsChanged.next({});
    this.preferencesChanged.next({});
    this.nwServersChanged.next({});
    this.saServersChanged.next({});
    this.feedsChanged.next({});
    this.feedStatusChanged.next({});
    this.usersChanged.next({});
    this.serverVersionChanged.next(null);
    this.useCasesChanged.next({useCases: [], useCasesObj: {} });

    // We must disconnect sockets when a user logs out
    this.serverSocket.off('disconnect');
    this.serverSocket.off('connect');
    this.serverSocket.off('preferences');
    this.serverSocket.off('collections');
    this.serverSocket.off('serverVersion');
    this.serverSocket.off('publicKey');
    this.serverSocket.off('nwservers');
    this.serverSocket.off('saservers');
    this.serverSocket.off('feeds');
    this.serverSocket.off('feedStatus');
    this.serverSocket.off('users');
    this.serverSocket.off('useCases');
    this.serverSocket.off('logout');

    // Turn off collection socket events
    this.collectionsSocket.off('connect');
    this.collectionsSocket.off('disconnect');
    this.collectionsSocket.off('state');
    this.collectionsSocket.off('purge');
    this.collectionsSocket.off('deleted');
    this.collectionsSocket.off('clear');
    this.collectionsSocket.off('update');
    this.collectionsSocket.off('sessions');
    this.collectionsSocket.off('content');
    this.collectionsSocket.off('searches');
    this.collectionsSocket.off('paused');

    this.serverSocket.close();
    this.collectionsSocket.close();

    this.serverSocket = null;
    this.collectionsSocket = null;
  }



  public init(): Promise<any> {
    // Run by authentication service at login or page load
    log.debug('DataService: init()');
    return Promise.resolve();
  }


  ///////////////////// SOCKET.IO EVENTS //////////////////

  // We could pipe the events straight to the observables but...
  // we keep this here for debugging purposes and any custom logic required

  onPreferencesUpdate(preferences: Preferences) {
    log.debug('DataService: onPreferencesUpdate(): preferences:', preferences);
    // this.preferencesChanged.next(JSON.parse(JSON.stringify(preferences)));
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



  onLicenseChanged(license) {
    log.debug('DataService: onLicenseChanged(): license:', license);
    this.licensingChanged.next(license);
  }


  ///////////////////// NW SERVERS /////////////////////

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




    ///////////////////// SA SERVERS /////////////////////

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

  ///////////////////// PREFERENCES /////////////////////

  setPreferences(prefs: any): Promise<void> {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/preferences', prefs, { headers } )
                    .toPromise()
                    .then(response => {} )
                    .catch(e => this.handleError(e));
  }


  ///////////////////// COLLECTIONS /////////////////////

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



  deleteCollection(id: string): Promise<void> {
    log.debug('DataService: deleteCollection():', id);
    return this.http.delete(this.apiUrl + '/collection/' + id )
                .toPromise()
                .then( () => {} )
                .catch(e => this.handleError(e));
  }


  ///////////////////// FEEDS /////////////////////

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





  ///////////////////// USERS /////////////////////

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




  ///////////////////// PING /////////////////////

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



  onPublicKeyChanged(key: string) {
    log.debug('DataService: onPublicKeyChanged()');
    if (!key) {
      return;
    }
    this.encryptor.log = true;
    this.pubKey = key;
    this.encryptor.setPublicKey(this.pubKey);
  }

}
