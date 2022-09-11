import { Injectable, NgZone } from '@angular/core';
import { Subject, BehaviorSubject, firstValueFrom } from 'rxjs';
import {
  HttpHeaders,
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import { NwServer, NwServers, NwServerTest } from 'types/nwserver';
import { SaServer, SaServers } from 'types/saserver';
import { ToolService } from './tool.service';
import { Feed, Feeds, FeedState, ManualFeed, ScheduledFeed } from 'types/feed';
import { Preferences } from 'types/preferences';
import { io, Socket } from 'socket.io-client';
import * as log from 'loglevel';
import { CollectionDeletedDetails } from 'types/collection-deleted-details';
import { BlobTable } from 'types/blobtable';
import * as JSEncrypt from 'jsencrypt/lib';
import { User } from 'types/user';
import {
  ContentItem,
  Collections,
  WorkerData,
  Session,
  CollectionState,
  Sessions,
  Search,
  Collection
} from 'types/collection';
import { ClientUseCases } from 'types/use-case';

export interface SocketConnectedEvent {
  connected?: boolean;
  socketId?: string;
}

@Injectable({providedIn: 'root'})
export class DataService { // Manages NwSession objects and also Image objects in grid and the image's association with Session objects.  Adds more objects as they're added

  private serverSocket: Socket;
  private collectionsRoom: Socket;

  // Observables
  contentPublished = new Subject<ContentItem[]>();
  sessionPublished = new Subject<Session>();
  selectedCollectionChanged = new Subject<Collection>();
  collectionStateChanged = new Subject<CollectionState>();
  sessionsReplaced = new Subject<Sessions>();
  contentReplaced = new Subject<ContentItem[]>();
  searchReplaced = new Subject<Search[]>();
  searchPublished = new Subject<Search[]>();
  errorPublished = new Subject<string>();
  sessionsPurged = new Subject<number[]>(); // sessionIds
  queryResultsCountUpdated = new Subject<number>();
  collectionDeleted = new Subject<CollectionDeletedDetails>();
  noopCollection = new Subject<void>();
  workerProgress = new Subject<{workerProgress?: string; label?: string}>();
  monitoringCollectionPause = new BehaviorSubject<boolean>(false);

  collectionsChanged = new BehaviorSubject<Collections>({});
  preferencesChanged = new BehaviorSubject<Preferences | undefined>(undefined);
  nwServersChanged = new BehaviorSubject<NwServers>({});
  saServersChanged = new BehaviorSubject<SaServers>({});
  feedsChanged = new BehaviorSubject<Feeds>({});
  feedStatusChanged = new BehaviorSubject<Record<string, FeedState>>({});
  usersChanged = new BehaviorSubject<User[]>([]);
  serverVersionChanged = new BehaviorSubject<string>('');
  useCasesChanged = new BehaviorSubject<ClientUseCases>( { useCases: [], useCasesObj: {} } );
  loggedOutByServer = new Subject<void>();
  socketConnected = new BehaviorSubject<SocketConnectedEvent>({connected: undefined, socketId: undefined});
  socketUpgraded = new BehaviorSubject<boolean>(false);


  // Properties
  apiUrl = '/api';
  clientSessionId: string;
  private encryptor?: JSEncrypt.JSEncrypt;
  private pubKey?: string;
  authenticated = false;
  private blobTable: BlobTable = {};
  socketId: string;



  constructor(
    private http: HttpClient,
    private toolService: ToolService,
    private zone: NgZone
  ) {
    this.toolService.clientSessionId.subscribe(
      (clientSessionId) => {
        log.debug(`DataService: clientSessionIdSubscription(): got clientSessionId: ${clientSessionId}`);
        this.clientSessionId = clientSessionId;
      }
    );
    this.initSockets();
  }



  initSockets() {
    this.zone.runOutsideAngular( () => {
      this.serverSocket = io();

      this.serverSocket.on('connect', () => {
        log.debug('DataService: Socket.io connected to server');
        this.zone.run(
          () => this.socketConnected.next({
            connected: true,
            socketId: this.serverSocket.id
          })
        );
        this.socketId = this.serverSocket.id;
      });

      this.serverSocket.on('serverVersion',
        version => this.onServerVersionUpdate(version)
      );
      this.serverSocket.on('socketUpgrade',
        () => this.onSocketUpgrade()
      );
      this.serverSocket.on('socketDowngrade',
        () => this.onSocketDowngrade()
      );

      this.serverSocket.on('disconnect',
        reason => {
          log.debug('DataService: serverSocket was disconnected with reason:', reason);
          this.zone.run(
            () => this.socketConnected.next({
              connected: false,
              socketId: undefined
            })
          );
          this.onSocketDowngrade();
        }
      );
    });
  }




  onSocketUpgrade() {
    // Run by authentication service after successful credentials check
    log.debug('DataService: onSocketUpgrade()');

    this.encryptor = new JSEncrypt.JSEncrypt();

    // no need to run outside the Angular zone as it's already outside the zone

    if (!this.collectionsRoom) {
      this.collectionsRoom = io('/collections' );
    }
    else {
      this.collectionsRoom.open();
    }
    // Subscribe to collection socket events
    this.collectionsRoom.on('connect', () => log.debug('DataService: Socket.io collectionsRoom connected to server' ));
    this.collectionsRoom.on(
      'disconnectClients',
      reason => {
        if (reason === 'io server disconnect') {
          this.collectionsRoom.open();
        }
      }
    );
    this.collectionsRoom.on(
      'state',
      this.zone.run(
        () => (state) => this.collectionStateChanged.next(state)
      )
    );
    this.collectionsRoom.on(
      'purge',
      (collectionPurge) => this.sessionsPurged.next(collectionPurge)
    );
    this.collectionsRoom.on(
      'clear',
      () => {
        this.sessionsReplaced.next( {} );
        this.contentReplaced.next( [] );
        this.searchReplaced.next( [] );
      }
    );
    this.collectionsRoom.on(
      'update',
      (workerData: WorkerData) => {
        if (workerData.collectionUpdate) {
          const update = workerData.collectionUpdate;
          if (update.session) {
            this.sessionPublished.next(update.session);
          }
          if (update.images) {
            this.contentPublished.next(update.images);
          }
          if (update.search) {
            this.searchPublished.next(update.search);
          }
        }
        if (workerData.error !== undefined) {
          this.errorPublished.next(workerData.error);
        }
        if (workerData.queryResultsCount !== undefined) {
          this.queryResultsCountUpdated.next(workerData.queryResultsCount);
        }
        if (workerData.workerProgress !== undefined) {
          this.workerProgress.next({
            workerProgress: workerData.workerProgress,
            label: workerData.label
          });
        }
      }
    );
    this.collectionsRoom.on(
      'sessions',
      (sessions: Sessions) => this.sessionsReplaced.next(sessions)
    );
    this.collectionsRoom.on(
      'content',
      (content: ContentItem[]) => this.contentReplaced.next(content)
    );
    this.collectionsRoom.on(
      'searches',
      (searches: Search[]) => this.searchReplaced.next(searches)
    );
    this.collectionsRoom.on(
      'paused',
      (paused) => this.monitoringCollectionPause.next(paused)
    );
    this.serverSocket.on(
      'preferences',
      preferences => this.onPreferencesUpdate(preferences)
    );
    this.serverSocket.on(
      'collections',
      (collections) => this.onCollectionsUpdate(collections)
    );
    this.serverSocket.on(
      'publicKey',
      key => this.onPublicKeyChanged(key)
    );
    this.serverSocket.on(
      'nwservers',
      apiServers => this.zone.run(
        () => this.onNwServersUpdate(apiServers)
      )
    );
    this.serverSocket.on(
      'saservers',
      apiServers => this.zone.run(
        () => this.onSaServersUpdate(apiServers)
      )
    );
    this.serverSocket.on(
      'feeds',
      feeds => this.zone.run(
        () => this.onFeedsUpdate(feeds)
      )
    );
    this.serverSocket.on(
      'feedStatus',
      feedStatus => this.zone.run(
        () => this.onFeedStatusUpdate(feedStatus)
        )
      );
    this.serverSocket.on(
      'users',
      users => this.zone.run(
        () => this.onUsersUpdate(users)
      )
    );
    this.serverSocket.on(
      'useCases',
      useCases => this.zone.run(
        () => this.onUseCasesUpdate(useCases)
      )
    );
    this.serverSocket.on(
      'initialised',
      () => this.zone.run(
        () => this.onClientInitialised()
      )
    );
    this.serverSocket.on(
      'logout',
      (reason) => this.zone.run(
        () => this.onLogoutMessageReceived(reason)
      )
    ); // TODO: triggered by the socket when our validity expires
    this.serverSocket.on(
      'collectionDeleted',
      (details: CollectionDeletedDetails) => this.collectionDeleted.next(details)
    );

    // instruct server to send data
    this.serverSocket.emit('clientReady');
  }



  onSocketDowngrade() {
    log.debug('DataService: onSocketDowngrade()');

    // clear application state to prevent prying
    this.authenticated = false;
    this.encryptor = undefined;
    this.pubKey = undefined;
    this.monitoringCollectionPause.next(false);
    this.collectionsChanged.next({});
    this.preferencesChanged.next(undefined);
    this.nwServersChanged.next({});
    this.saServersChanged.next({});
    this.feedsChanged.next({});
    this.feedStatusChanged.next({});
    this.usersChanged.next([]);
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
    this.preferencesChanged.next(preferences);
  }



  onCollectionsUpdate(collections: Collections) {
    log.debug('DataService: onCollectionsUpdate(): collections:', collections);
    this.collectionsChanged.next(collections);
  }



  onServerVersionUpdate(version: string) {
    log.debug('DataService: onServerVersionUpdate(): version:', version);
    this.serverVersionChanged.next(version);
  }



  onNwServersUpdate(nwServers: NwServers) {
    log.debug('DataService: onNwServersUpdate():', {nwServers});
    this.nwServersChanged.next(nwServers);
  }



  onSaServersUpdate(saServers: SaServers) {
    log.debug('DataService: onSaServersUpdate()', {saServers});
    this.saServersChanged.next(saServers);
  }



  onFeedsUpdate(feeds: Feeds) {
    log.debug('DataService: onFeedsUpdate(): feeds:', feeds);
    this.feedsChanged.next(feeds);
  }



  onFeedStatusUpdate(feedStatus: Record<string, FeedState>) {
    log.debug('DataService: onFeedStatusUpdate(): feedStatus:', feedStatus);
    this.feedStatusChanged.next(feedStatus);
  }



  onUsersUpdate(users: User[]) {
    log.debug('DataService: onUsersUpdate(): users:', users);
    this.usersChanged.next(users);
  }



  onUseCasesUpdate(useCases: ClientUseCases) {
    log.debug('DataService: onUseCasesUpdate(): useCases:', useCases );
    this.useCasesChanged.next( useCases );
  }



  onClientInitialised() {
    log.debug('DataService: onClientInitialised()');
    this.socketUpgraded.next(true); // We know that everything is done at this point
  }



  onLogoutMessageReceived(reason: string) {
    log.debug('DataService: onLogoutMessageReceived()');
    if (reason === 'token expired') {
      this.toolService.logout.next(this.socketId);
      this.loggedOutByServer.next(); // open the modal to tell user they've been loged out due to token expiry
    }
  }


  ///////////////////// NW SERVERS /////////////////////

  testNwServer( server: NwServerTest ): Promise<any> {
    return firstValueFrom(
      this.http.post(this.apiUrl + '/nwserver/test', server )
    );
  }


  async deleteNwServer(id: string): Promise<void> {
    log.debug('DataService: deleteNwServer():', id);
    return await firstValueFrom(
      this.http.delete(this.apiUrl + '/nwserver/' + id )
    )
    .then(response => response as any)
    .catch(e => this.handleError(e));
  }


  async addNwServer(nwserver: NwServer): Promise<any> {
    log.debug('DataService: addNwServer()');
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return await firstValueFrom(
      this.http.post(this.apiUrl + '/nwserver', nwserver, { headers } )
      )
      .then(response => {
        log.debug('DataService: addNwServer(): response:', response);
      })
      .catch(e => this.handleError(e));
  }


  async editNwServer(nwserver: Optional<NwServer, 'password'>): Promise<any> {
    log.debug('DataService: editNwServer()');
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return await firstValueFrom(
      this.http.patch(this.apiUrl + '/nwserver', nwserver, { headers } )
    )
    .then(response => {
      log.debug('DataService: editNwServer(): response:', response);
    })
    .catch(e => this.handleError(e));
  }




    ///////////////////// SA SERVERS /////////////////////

    async testSaServer( server: Partial<SaServer> ): Promise<any> {
      return await firstValueFrom(
        this.http
        .post(this.apiUrl + '/saserver/test', server )
      );
    }


    async deleteSaServer(id: string): Promise<void> {
      log.debug('DataService: deleteSaServer():', id);
      return await firstValueFrom(
        this.http.delete(this.apiUrl + '/saserver/' + id )
      )
      .then(response => response as any)
      .catch(e => this.handleError(e));
    }


    async addSaServer(saserver: SaServer): Promise<any> {
      log.debug('DataService: addSaServer()');
      const headers = new HttpHeaders().set('Content-Type', 'application/json');
      return await firstValueFrom (
        this.http.post(this.apiUrl + '/saserver', saserver, { headers } )
      )
      .then(response => {
        log.debug('DataService: addSaServer(): response:', response);
      })
      .catch(e => this.handleError(e));
    }


    async editSaServer(saserver: SaServer): Promise<any> {
      log.debug('DataService: editSaServer()');
      const headers = new HttpHeaders().set('Content-Type', 'application/json');
      return await firstValueFrom(
        this.http.patch(this.apiUrl + '/saserver', saserver, { headers } )
      )
      .then(response => {
        log.debug('DataService: editSaServer(): response:', response);
      })
      .catch(e => this.handleError(e));
    }

  ///////////////////// PREFERENCES /////////////////////

  async setPreferences(prefs: Preferences): Promise<void> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return await firstValueFrom(
      this.http.post(this.apiUrl + '/preferences', prefs, { headers } )
    )
    .catch(e => this.handleError(e));
  }


  ///////////////////// COLLECTIONS /////////////////////

  async addCollection(collection: Partial<Collection>):  Promise<any> {
    log.debug('DataService: addCollection():', collection.id);
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return await firstValueFrom(
      this.http.post(this.apiUrl + '/collection', collection, { headers } )
    )
    .then(response => {
      log.debug(response);
    })
    .catch(e => this.handleError(e));
  }


  async editCollection(collection: Partial<Collection>):  Promise<any> {
    log.debug('DataService: editCollection():', collection.id);
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return await firstValueFrom(
      this.http.patch(this.apiUrl + '/collection', collection, { headers } )
    )
    .then(response => {
      log.debug(response);
    })
    .catch(e => this.handleError(e));
  }



  getRollingCollection(collectionId: string): void {
    log.debug('DataService: getRollingCollection()', {collectionId});
    // uses socket.io
    this.collectionsRoom.emit('join', { collectionId, sessionId: this.clientSessionId });
  }



  getFixedCollection(collectionId: string): void {
    log.debug('DataService: getFixedCollection()', {collectionId});
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



  async deleteCollection(id: string): Promise<void> {
    log.debug('DataService: deleteCollection():', id);
    return await firstValueFrom(
      this.http.delete(this.apiUrl + '/collection/' + id )
    )
    .then( () => {} )
    .catch(e => this.handleError(e));
  }


  ///////////////////// FEEDS /////////////////////

  async deleteFeed(id: string): Promise<any> {
    log.debug('DataService: deleteFeed():', id);
    return await firstValueFrom(
      this.http.delete(this.apiUrl + '/feed/' + id )
    )
    .catch(e => this.handleError(e));
  }



  async addFeedManual(feed: Omit<ManualFeed, 'version' | 'internalFilename' | 'creator'>, file: File): Promise<any> {
    log.debug('DataService: addFeedManual()');
    const formData = new FormData();
    formData.append('model', JSON.stringify(feed));
    formData.append('file', file);
    return await firstValueFrom(
      this.http.post(this.apiUrl + '/feed/manual', formData )
    )
    .then(response => {
      log.debug('DataService: addFeedManual(): response:', response);
      return response;
    })
    .catch(e => this.handleError(e));
  }



  async editFeedWithoutFile(feed: Omit<Feed, 'version' | 'internalFilename' | 'creator'>): Promise<any> {
    log.debug('DataService: editFeedWithoutFile()');
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return await firstValueFrom(
      this.http.patch(this.apiUrl + '/feed/withoutfile', feed, { headers } )
    )
    .then(response => {
      log.debug('DataService: editFeedWithoutFile(): response:', response);
      return response;
    })
    .catch(e => this.handleError(e));
  }



  async editFeedWithFile(feed: Omit<ManualFeed, 'version' | 'internalFilename' | 'creator'>, file: File): Promise<any> {
    log.debug('DataService: editFeedWithFile()');
    const formData = new FormData();
    formData.append('model', JSON.stringify(feed));
    formData.append('file', file);
    return await firstValueFrom(
      this.http
      .patch(this.apiUrl + '/feed/withfile', formData )
    )
    .then(response => {
      log.debug('DataService: editFeedWithFile(): response:', response);
      return response;
    })
    .catch(e => this.handleError(e));
  }



  async addFeedScheduled(feed: ScheduledFeed): Promise<any> {
    log.debug('DataService: addFeedScheduled()');
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return await firstValueFrom(
      this.http.post(this.apiUrl + '/feed/scheduled', feed, { headers } )
    )
    .then(response => {
      log.debug('DataService: addFeedScheduled(): response:', response);
      return response;
    })
    .catch(e => this.handleError(e));
  }



  async testFeedUrl( host: any ): Promise<any> {
    return await firstValueFrom(
      this.http.post(this.apiUrl + '/feed/testurl', host )
    )
    .catch(e => this.handleError(e));
  }



  async getFeedFilehead(id: string): Promise<any> {
    return await firstValueFrom(
      this.http.get(this.apiUrl + '/feed/filehead/' + id )
    )
    .catch(e => this.handleError(e));
  }





  ///////////////////// USERS /////////////////////

  async deleteUser(id: string): Promise<void> {
    log.debug('DataService: deleteUser():', id);
    return await firstValueFrom(
      this.http.delete(this.apiUrl + '/user/' + id )
    )
    .then(response => response as any)
    .catch(e => this.handleError(e));
  }



  async addUser(user: Omit<User, '_id'>): Promise<any> {
    log.debug('DataService: addUser()');
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return await firstValueFrom(
      this.http.post(this.apiUrl + '/user', user, { headers } )
    )
    .then(response => {
      log.debug(response);
    })
    .catch(e => this.handleError(e));
  }



  async updateUser(user: Partial<User>): Promise<any> {
    log.debug('DataService: updateUser()');
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return await firstValueFrom(
      this.http.patch(this.apiUrl + '/user', user, { headers } )
    )
    .then(response => {
      log.debug(response);
    })
    .catch(e => this.handleError(e));
  }

  ////////////////// IMG Load //////////////////

  async getImage(uri: string): Promise<string> {
    // returns a URL to a browser-created representation of a fetched image blob

    if ( (uri in this.blobTable) ) {
      // log.debug('DataService: getImage(): returning blob uri from table');
      return Promise.resolve(this.blobTable[uri]);
    }

    return await firstValueFrom(
      this.http.get(uri, {responseType: 'blob'})
    )
    .then( (data?: Blob) => {
      if (!data) {
        throw new Error('No data returned');
      }
      const url = window.URL.createObjectURL(data);
      this.blobTable[uri] = url;
      return url;
    })
    .catch(e => this.handleError(e));
  }



  resetBlobs() {
    log.debug('DataService: resetBlobs()');
    Object.keys(this.blobTable)
      .forEach( ([blobUri]) => window.URL.revokeObjectURL(blobUri)
    );
    this.blobTable = {};
  }



  removeBlob(origUrl: string) {
    // log.debug('DataService: removeBlob()');
    const blobUri = this.blobTable[origUrl];
    window.URL.revokeObjectURL(blobUri);
    delete this.blobTable[origUrl];
  }



  async downloadFile(url: string, filename: string): Promise<void> {
    // from https://stackoverflow.com/questions/51682514/angular-how-to-download-a-file-from-httpclient
    this.http.get(url, { responseType: 'blob' }).subscribe(
      (blob) => {
        blob = new Blob([blob], { type: 'application/octet-stream' });
        const downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(blob);
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.parentNode?.removeChild(downloadLink);
      }
    );
}




  ///////////////////// PING /////////////////////

  async ping(): Promise<any> {
    // log.debug('DataService: ping()');
    return await firstValueFrom(
      this.http.get(this.apiUrl + '/ping')
    );
  }



  handleError(error: HttpErrorResponse): any {
    if (error.status === 401) {
      this.zone.run( () => this.toolService.logout.next(this.socketId) );
    }
    else {
      log.error('ERROR loading URL: ', error);
      throw error;
    }
  }



  onPublicKeyChanged(key: string) {
    log.debug('DataService: onPublicKeyChanged()');
    if (!key) {
      return;
    }
    if (!this.encryptor) {
      throw new Error('encryptor is undefined');
    }
    // this.encryptor.log = true;
    this.pubKey = key;
    this.encryptor.setPublicKey(this.pubKey);
  }



  encrypt(value: string): string {
    if (!this.encryptor) {
      throw new Error('Encryptor is not defined');
    }
    const res = this.encryptor.encrypt(value);
    if (res === false) {
      throw new Error('Encryption error');
    }
    return res;
  }

}
