import { Injectable, NgZone } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NwServer } from 'types/nwserver';
import { SaServer } from 'types/saserver';
import { ToolService } from './tool.service';
import { Feed } from 'types/feed';
import { Preferences } from 'types/preferences';
import { License } from 'types/license';
import { NwServers } from 'types/nwserver';
import * as io from 'socket.io-client';
import * as log from 'loglevel';
import { CollectionDeletedDetails } from 'types/collection-deleted-details';
import { BlobTable } from 'types/blobtable';
import { JSEncrypt } from 'jsencrypt';

@Injectable({providedIn: 'root'})

export class DataService { // Manages NwSession objects and also Image objects in grid and the image's association with Session objects.  Adds more objects as they're added

  private serverSocket: any;
  private collectionsRoom: any;

  // Observables
  public contentPublished = new Subject<any>();
  public sessionPublished = new Subject<any>();
  public selectedCollectionChanged = new Subject<any>();
  public collectionStateChanged = new Subject<any>();
  public sessionsReplaced = new Subject<any>();
  public contentReplaced = new Subject<any>();
  public searchReplaced = new Subject<any>();
  public searchPublished = new Subject<any>();
  public errorPublished = new Subject<any>();
  public sessionsPurged = new Subject<any>();
  public queryResultsCountUpdated = new Subject<any>();
  public collectionDeleted = new Subject<CollectionDeletedDetails>();
  public noopCollection = new Subject<void>(); // this is used when the license expires
  public workerProgress = new Subject<any>();
  public monitoringCollectionPause = new BehaviorSubject<boolean>(false);

  public collectionsChanged = new BehaviorSubject<any>({});
  public preferencesChanged = new BehaviorSubject<any>({});
  public nwServersChanged = new BehaviorSubject<NwServers>({});
  public saServersChanged = new BehaviorSubject<any>({});
  public feedsChanged = new BehaviorSubject<any>({});
  public feedStatusChanged = new BehaviorSubject<any>({});
  public usersChanged = new BehaviorSubject<any>({});
  public serverVersionChanged = new BehaviorSubject<string>(null);
  public useCasesChanged = new BehaviorSubject<object>( { useCases: [], useCasesObj: {} } );
  public licensingChanged = new BehaviorSubject<License>(null);
  public loggedOutByServer = new Subject<void>();
  public socketConnected = new BehaviorSubject<any>({connected: null, socketId: null});
  public socketUpgraded = new BehaviorSubject<boolean>(false);


  // Properties
  public apiUrl = '/api';
  public clientSessionId: number;
  public encryptor: any;
  private pubKey: string;
  private authenticated = false;
  private blobTable: BlobTable = {};
  public socketId;



  constructor(
    private http: HttpClient,
    private toolService: ToolService,
    private zone: NgZone ) {
    log.debug('DataService: constructor()');
    this.toolService.clientSessionId.subscribe( (clientSessionId: number) => {
      log.debug(`DataService: clientSessionIdSubscription(): got clientSessionId: ${clientSessionId}`);
      this.clientSessionId = clientSessionId;
    });


    // new init protocol
    this.zone.runOutsideAngular( () => {
      this.serverSocket = io();

      this.serverSocket.on('connect', () => {
        log.debug('DataService: Socket.io connected to server');
        this.zone.run( () => this.socketConnected.next({ connected: true, socketId: this.serverSocket.id }));
        this.socketId = this.serverSocket.id;
        log.debug('DataService: socketId:', this.socketId);
      });

      this.serverSocket.on('serverVersion', version => this.onServerVersionUpdate(version) );
      this.serverSocket.on('socketUpgrade',  () => this.onSocketUpgrade() );
      this.serverSocket.on('socketDowngrade',  () => this.onSocketDowngrade() );

      this.serverSocket.on('disconnect', reason => {
        log.debug('DataService: serverSocket was disconnected with reason:', reason);
        /*if (reason === 'io server disconnect') {
          // the server disconnected us forcefully.  maybe due to logout or token timeout
          // start trying to reconnect
          // this will repeat until successful
          this.serverSocket.open();
        }*/
        // server should never forcefully disconnect under the new protocol
        // if (reason === 'ping timeout') {
          this.zone.run( () => this.socketConnected.next({ connected: false, socketId: null }));
          this.onSocketDowngrade();
        // }
      } );
    });

  }




  public onSocketUpgrade() {
    // Run by authentication service after successful credentials check
    log.debug('DataService: onSocketUpgrade()');

    this.encryptor = new JSEncrypt();

    // this.zone.runOutsideAngular( () => { // no need to run outside the zone as it's already outside the zone

        if (!this.collectionsRoom) {
          this.collectionsRoom = io('/collections' );
        }
        else {
          this.collectionsRoom.open();
        }
        // Subscribe to collection socket events
        this.collectionsRoom.on('connect', roomsocket => log.debug('DataService: Socket.io collectionsRoom connected to server' ));
        this.collectionsRoom.on('disconnect', reason => {
          if (reason === 'io server disconnect') {
            this.collectionsRoom.open();
          }
        } );
        this.collectionsRoom.on('state', this.zone.run( () => (state) => this.collectionStateChanged.next(state) ) );
        this.collectionsRoom.on('purge', (collectionPurge) => this.sessionsPurged.next(collectionPurge) );
        this.collectionsRoom.on('clear', () => {
          this.sessionsReplaced.next( {} );
          this.contentReplaced.next( [] );
          this.searchReplaced.next( [] );
        } );
        this.collectionsRoom.on('update', (update) => {
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
        this.collectionsRoom.on('sessions', (sessions) => this.sessionsReplaced.next(sessions) );
        this.collectionsRoom.on('content', (content) => this.contentReplaced.next(content) );
        this.collectionsRoom.on('searches', (searches) => this.searchReplaced.next(searches) );
        this.collectionsRoom.on('paused', (paused) => this.monitoringCollectionPause.next(paused) );
      // });

      this.serverSocket.on('preferences', preferences => this.onPreferencesUpdate(preferences) );
      this.serverSocket.on('collections', collections => this.onCollectionsUpdate(collections) );
      this.serverSocket.on('publicKey', key => this.onPublicKeyChanged(key) );
      this.serverSocket.on('nwservers', apiServers => this.zone.run( () => this.onNwServersUpdate(apiServers) ) );
      this.serverSocket.on('saservers', apiServers => this.zone.run( () => this.onSaServersUpdate(apiServers) ) );
      this.serverSocket.on('feeds', feeds => this.zone.run( () => this.onFeedsUpdate(feeds) ) );
      this.serverSocket.on('feedStatus', feedStatus => this.zone.run( () => this.onFeedStatusUpdate(feedStatus) ) );
      this.serverSocket.on('users', users => this.zone.run( () => this.onUsersUpdate(users) ) );
      this.serverSocket.on('useCases', useCases => this.zone.run( () => this.onUseCasesUpdate(useCases) ) );
      this.serverSocket.on('license', license => this.zone.run( () => this.onLicenseChanged(license) ) );
      this.serverSocket.on('logout', (reason => this.zone.run( () => this.onLogoutMessageReceived(reason) ) ) ); // TODO: triggered by the socket when our validity expires
      this.serverSocket.on('collectionDeleted', (details: CollectionDeletedDetails) => this.collectionDeleted.next(details) );

      // instruct server to send data
      this.serverSocket.emit('clientReady');
    // });

  }



  // public stop() {
  public onSocketDowngrade() {
    log.debug('DataService: onSocketDowngrade()');

    // clear application state to prevent prying
    this.authenticated = false;
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
    this.useCasesChanged.next({useCases: [], useCasesObj: {} });

    // We must disconnect events when a user logs out
    this.serverSocket.off('preferences');
    this.serverSocket.off('collections');
    this.serverSocket.off('publicKey');
    this.serverSocket.off('nwservers');
    this.serverSocket.off('saservers');
    this.serverSocket.off('feeds');
    this.serverSocket.off('feedStatus');
    this.serverSocket.off('users');
    this.serverSocket.off('useCases');
    this.serverSocket.off('logout');

    if (this.collectionsRoom) {
      // Turn off collection socket events
      // we should only not enter this block if we never logged in
      this.collectionsRoom.off('connect');
      this.collectionsRoom.off('disconnect');
      this.collectionsRoom.off('state');
      this.collectionsRoom.off('purge');
      this.collectionsRoom.off('deleted');
      this.collectionsRoom.off('clear');
      this.collectionsRoom.off('update');
      this.collectionsRoom.off('sessions');
      this.collectionsRoom.off('content');
      this.collectionsRoom.off('searches');
      this.collectionsRoom.off('paused');

      this.collectionsRoom.close();
    }

    this.resetBlobs();
    this.socketUpgraded.next(false);
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
    this.useCasesChanged.next( useCases );
  }



  onLicenseChanged(license) {
    log.debug('DataService: onLicenseChanged(): license:', license);
    this.licensingChanged.next(license);
    this.socketUpgraded.next(true); // we trigger this here as the license is the final thing the server emits after upgrading the socket.  We know that everything is done at this point
  }



  onLogoutMessageReceived(reason) {
    log.debug('DataService: onLogoutMessageReceived()');
    if (reason === 'token expired') {
      this.toolService.logout.next(this.socketId);
      this.loggedOutByServer.next(); // open the modal to tell user they've been loged out due to token expiry
    }
  }


  ///////////////////// NW SERVERS /////////////////////

  testNwServer( server: any ): Promise<any> {
    return this.http
                .post(this.apiUrl + '/nwserver/test', server )
                .toPromise();
                // .catch(e => this.handleError(e)); // we don't want to logout if server throws a 401, as the server will mimic whatever code NW returns with
  }


  deleteNwServer(id: string): Promise<void> {
    log.debug('DataService: deleteNwServer():', id);
    return this.http
                .delete(this.apiUrl + '/nwserver/' + id )
                .toPromise()
                .then(response => response as any)
                .catch(e => this.handleError(e));
  }


  addNwServer(nwserver: NwServer): Promise<any> {
    log.debug('DataService: addNwServer()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http
                .post(this.apiUrl + '/nwserver', nwserver, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: addNwServer(): response:', response);
                })
                .catch(e => this.handleError(e));
  }


  editNwServer(nwserver: NwServer): Promise<any> {
    log.debug('DataService: editNwServer()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http
                .post(this.apiUrl + '/nwserver/edit', nwserver, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: editNwServer(): response:', response);
                })
                .catch(e => this.handleError(e));
  }




    ///////////////////// SA SERVERS /////////////////////

    testSaServer( server: any ): Promise<any> {
      return this.http
                  .post(this.apiUrl + '/saserver/test', server )
                  .toPromise();
    }


    deleteSaServer(id: string): Promise<void> {
      log.debug('DataService: deleteSaServer():', id);
      return this.http
                  .delete(this.apiUrl + '/saserver/' + id )
                  .toPromise()
                  .then(response => response as any)
                  .catch(e => this.handleError(e));
    }


    addSaServer(saserver: SaServer): Promise<any> {
      log.debug('DataService: addSaServer()');
      let headers = new HttpHeaders().set('Content-Type', 'application/json');
      return this.http
                  .post(this.apiUrl + '/saserver', saserver, { headers } )
                  .toPromise()
                  .then(response => {
                    log.debug('DataService: addSaServer(): response:', response);
                  })
                  .catch(e => this.handleError(e));
    }


    editSaServer(saserver: SaServer): Promise<any> {
      log.debug('DataService: editSaServer()');
      let headers = new HttpHeaders().set('Content-Type', 'application/json');
      return this.http
                  .post(this.apiUrl + '/saserver/edit', saserver, { headers } )
                  .toPromise()
                  .then(response => {
                    log.debug('DataService: editSaServer(): response:', response);
                  })
                  .catch(e => this.handleError(e));
    }

  ///////////////////// PREFERENCES /////////////////////

  setPreferences(prefs: any): Promise<void> {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http
                    .post(this.apiUrl + '/preferences', prefs, { headers } )
                    .toPromise()
                    // .then(response => {} )
                    .catch(e => this.handleError(e));
  }


  ///////////////////// COLLECTIONS /////////////////////

  addCollection(collection: any):  Promise<any> {
    log.debug('DataService: addCollection():', collection.id);
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http
                .post(this.apiUrl + '/collection', collection, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }


  editCollection(collection: any):  Promise<any> {
    log.debug('DataService: editCollection():', collection.id);
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http
                .post(this.apiUrl + '/collection/edit', collection, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }



  getRollingCollection(collectionId: string): void {
    log.debug('DataService: getRollingCollection(): joining room with id:', collectionId);
    // uses socket.io
    this.collectionsRoom.emit('join', { collectionId: collectionId, sessionId: this.clientSessionId });
  }



  getFixedCollection(collectionId: string): void {
    // uses socket.io
    this.collectionsRoom.emit('joinFixed', collectionId );
  }



  leaveCollection(): void {
    // uses socket.io
    this.collectionsRoom.emit('leave');
    this.collectionsRoom.emit('leaveFixed');
  }



  pauseMonitoringCollection(): void {
    log.debug('DataService: pauseMonitoringCollection()');
    this.collectionsRoom.emit('pause');
  }



  unpauseMonitoringCollection(): void {
    log.debug('DataService: unpauseMonitoringCollection()');
    this.collectionsRoom.emit('unpause');
  }



  deleteCollection(id: string): Promise<void> {
    log.debug('DataService: deleteCollection():', id);
    return this.http
                .delete(this.apiUrl + '/collection/' + id )
                .toPromise()
                .then( () => {} )
                .catch(e => this.handleError(e));
  }


  ///////////////////// FEEDS /////////////////////

  deleteFeed(id: string): Promise<any> {
    log.debug('DataService: deleteFeed():', id);
    return this.http
                .delete(this.apiUrl + '/feed/' + id )
                .toPromise()
                .catch(e => this.handleError(e));
  }



  addFeedManual(feed: Feed, file: File): Promise<any> {
    log.debug('DataService: addFeedManual()');
    let formData = new FormData();
    formData.append('model', JSON.stringify(feed));
    formData.append('file', file);
    return this.http
                .post(this.apiUrl + '/feed/manual', formData )
                .toPromise()
                .then(response => {
                  log.debug('DataService: addFeedManual(): response:', response);
                  return response;
                })
                .catch(e => this.handleError(e));
  }



  editFeedWithoutFile(feed: Feed): Promise<any> {
    log.debug('DataService: editFeedWithoutFile()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http
                .post(this.apiUrl + '/feed/edit/withoutfile', feed, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: editFeedWithoutFile(): response:', response);
                  return response;
                })
                .catch(e => this.handleError(e));
  }



  editFeedWithFile(feed: Feed, file: File): Promise<any> {
    log.debug('DataService: editFeedWithFile()');
    let formData = new FormData();
    formData.append('model', JSON.stringify(feed));
    formData.append('file', file);
    return this.http
                .post(this.apiUrl + '/feed/edit/withfile', formData )
                .toPromise()
                .then(response => {
                  log.debug('DataService: editFeedWithFile(): response:', response);
                  return response;
                })
                .catch(e => this.handleError(e));
  }



  addFeedScheduled(feed: Feed): Promise<any> {
    log.debug('DataService: addFeedScheduled()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http
                .post(this.apiUrl + '/feed/scheduled', feed, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: addFeedScheduled(): response:', response);
                  return response;
                })
                .catch(e => this.handleError(e));
  }



  testFeedUrl( host: any ): Promise<any> {
    return this.http
                .post(this.apiUrl + '/feed/testurl', host )
                .toPromise()
                .catch(e => this.handleError(e));
  }



  getFeedFilehead(id: string): Promise<any> {
    return this.http
                .get(this.apiUrl + '/feed/filehead/' + id )
                .toPromise()
                .catch(e => this.handleError(e));
  }





  ///////////////////// USERS /////////////////////

  deleteUser(id: string): Promise<void> {
    log.debug('DataService: deleteUser():', id);
    return this.http
                .delete(this.apiUrl + '/user/' + id )
                .toPromise()
                .then(response => response as any)
                .catch(e => this.handleError(e));
  }



  addUser(user: any): Promise<any> {
    log.debug('DataService: addUser()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http
                .post(this.apiUrl + '/user', user, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }



  updateUser(user: any): Promise<any> {
    log.debug('DataService: updateUser()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http
                .post(this.apiUrl + '/user/edit', user, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }








  ////////////////// IMG Load //////////////////

  getImage(uri: string): Promise<string> {
    // returns a URL to a browser-created representation of a fetched image blob
    // log.debug('DataService: getImage(): uri:', uri);

    if ( (uri in this.blobTable) ) {
      // log.debug('DataService: getImage(): returning blob uri from table');
      return Promise.resolve(this.blobTable[uri]);
    }

    return this.http
          .get(uri, {responseType: 'blob'})
          .toPromise()
          .then( (data: Blob) => {
            let url = window.URL.createObjectURL(data);
            this.blobTable[uri] = url;
            return url;
          })
          .catch(e => this.handleError(e));
  }



  resetBlobs() {
    log.debug('DataService: resetBlobs()');
    Object.entries(this.blobTable).forEach( entry => {
      let origUrl = entry.shift();
      let blobUri = entry.shift();
      window.URL.revokeObjectURL(blobUri);
    });
    this.blobTable = {};
  }



  removeBlob(origUrl: string) {
    // log.debug('DataService: removeBlob()');
    let blobUri = this.blobTable[origUrl];
    window.URL.revokeObjectURL(blobUri);
    delete this.blobTable[origUrl];
  }




  ///////////////////// PING /////////////////////

  ping(): Promise<any> {
    // log.debug('DataService: ping()');
    return this.http
                .get(this.apiUrl + '/ping')
                .toPromise();
  }



  handleError(error: HttpErrorResponse): any {
    if (error.status === 401) {
      this.zone.run( () => this.toolService.logout.next(this.socketId) );
      // return Promise.reject(error.message || error);
    }
    else {
      log.error('ERROR loading URL: ', error);
      // return Promise.reject(error);
      throw error;
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
