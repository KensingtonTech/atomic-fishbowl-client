import { Injectable } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Subject, BehaviorSubject } from 'rxjs';
import { Collection } from 'types/collection';
import { Feed } from 'types/feed';
import { Subscription} from 'rxjs';
import * as log from 'loglevel';

@Injectable({providedIn: 'root'})

export class ToolService {

  // properties
  public splashLoaded = false;
  public firstLoad = true;
  public loadCollectionOnRouteChange = false; // this may be set before switching routes to instruct the new view to load a particular collcetion
  public queryParams: Params = null;
  public urlParametersLoaded = false;
  public lastRoute: string = null;

  ////////////  OBSERVABLES ////////////

  // Device Number
  public deviceNumber = new BehaviorSubject<any>(0);

  // Scrolling
  public scrollToBottom = new Subject<any>();
  public stopScrollToBottom = new Subject<any>(); // commands the view to stop scrolling
  public scrollToBottomRunning = new Subject<any>(); // this notifies that scrolling has been started by the view
  public scrollToBottomStopped = new Subject<any>(); // this notifies that scrolling has finished in the view

  // Masonry
  public showMasonryTextArea = new BehaviorSubject<boolean>(true);
  public masonryColumnWidthChanged = new Subject<number>();
  public masonryAutoscrollSpeedChanged = new Subject<number>();

  // Users
  public confirmUserDelete = new Subject<any>();

  // Authentication
  public logout = new Subject<any>();

  // Misc
  public fileToDownload = new Subject<any>();
  public confirmDownloadFile = new Subject<any>();
  public clientSessionId = new Subject<any>();
  public onSplashScreenAtStartupClosed = new Subject<void>();
  public eulaAccepted = new Subject<void>();

  // NW and SA Servers
  public saServerToDelete = new Subject<any>();
  public confirmNwServerDelete = new Subject<string>();
  public confirmSaServerDelete = new Subject<string>();


  // collections //
  public selectedCollection: Collection;
  public getCollectionDataAgain = new Subject<any>();
  public deleteCollectionNext = new Subject<Collection>();
  public deleteCollectionConfirmed = new Subject<string>();
  public executeCollectionOnEdit = new Subject<boolean>();
  public executeAddCollection = new Subject<any>();
  public executeEditCollection = new Subject<any>();

  // communicates to collection dialogs that when they open, they should be in 'adhoc' mode
  public addNwAdhocCollectionNext = new BehaviorSubject<Params>({});
  public addSaAdhocCollectionNext = new BehaviorSubject<Params>({});

  // communicates to collection dialogs that when they open, they should be in 'add' mode
  public addNwCollectionNext = new Subject<void>();
  public addSaCollectionNext = new Subject<void>();

  // communicates to collection dialogs that when they open, they should be in 'edit' mode
  public editNwCollectionNext = new Subject<Collection>();
  public editSaCollectionNext = new Subject<Collection>();



  // feeds
  public addFeedNext = new Subject<void>();
  public editFeedNext = new Subject<Feed>();
  public deleteFeedNext = new Subject<Feed>();



  // Tab Container
  public collectionsOpened = new Subject<void>();
  public feedsOpened = new Subject<void>();
  public tabContainerClosed = new Subject<void>();
  public reOpenTabsModal = new Subject<boolean>();



  // Modal ID's
  public collectionDeletedModalId = 'collection-deleted-notify-modal';
  public contentDetailsModalId = 'content-details-modal';
  public confirmDeleteFeedModalId = 'confirm-delete-feed-modal';
  public feedWizardModalId = 'feed-wizard-modal';
  public licenseExpiredModalId = 'license-expired-modal';
  public nwCollectionModalId = 'nw-collection-modal';
  public saCollectionModalId = 'sa-collection-modal';
  public tabContainerModalId = 'tab-container-modal';
  public splashScreenModalId = 'splash-screen-modal';
  public serverDownModalId = 'server-down-modal';
  public confirmCollectionDeleteModalId = 'confirm-collection-delete-modal';
  public confirmUserDeleteModalId = 'confirm-user-delete-modal';
  public confirmNwServerDeleteModalId = 'confirm-nwserver-delete-modal';
  public confirmSaServerDeleteModalId = 'confirm-saserver-delete-modal';
  public confirmDownloadFileModalId = 'confirm-downloadfile-modal';
  public preferencesModalId = 'preferences-modal';
  public manageeUsersModalId = 'manage-users-modal';
  public newEditUserModalId = 'new-edit-user-modal';
  public newEditNwServiceModalId = 'new-edit-nw-server-modal';
  public loggedOutModalId = 'logged-out-notify-modal';

  private subscriptions = new Subscription;




  constructor(private route: ActivatedRoute,
              private router: Router) {
    log.debug('ToolService: constructor()');

    this.lastRoute = this.getPreference('lastRoute');
    this.subscriptions.add(this.route.queryParams.subscribe( (params: Params ) => this.onRouteParameters(params) ));
  }



  private onRouteParameters(params: Params): void {
    log.debug('ToolService: onRouteParameters(): params:', params);
    if (Object.keys(params).length !== 0) {
      this.parseUriParams(params);
    }
  }



  parseUriParams(params: Params): void {
    if ( 'op' in params && 'service' in params && ( 'host' in params || ( 'ip' in params && 'side' in params) || ( 'adUser' in params && 'side' in params) ) ) {

      if (params.op !== 'adhoc') {
        return;
      }

      // if (params['service'] !== 'nw' && params['service'] !== 'sa') {
      if ( !['nw', 'sa'].includes(params.service) ) {
        return;
      }

      // if ('ip' in params && params['side'] !== 'src' && params['side'] !== 'dst') {
      if ('ip' in params && !['src', 'dst'].includes(params.side)) {
        return;
      }

      // if ('adUser' in params && params['side'] !== 'src' && params['side'] !== 'dst') {
      if ('adUser' in params && !['src', 'dst'].includes(params.side)) {
        return;
      }

      if ('host' in params && 'ip' in params) {
        // you can't have both ip and host
        return;
      }

      this.urlParametersLoaded = true;
      this.queryParams = params;

    }
  }



  stop() {
    log.debug('ToolService: stop()');
    this.selectedCollection = null;
    this.deviceNumber.next(0);
    this.addNwAdhocCollectionNext.next({});
    this.addSaAdhocCollectionNext.next({});
  }



  setPreference(key, value): void {
    localStorage.setItem(key, value);
  }



  getPreference(key): any {
    let item: any = localStorage.getItem(key);

    if (item == null) {
      return null;
    }

    let numberRegex = /^[\d\.]+$/;

    if ( numberRegex.test(item) ) {
      item = Number(item);
    }

    if (item === 'true') {
      item = true;
    }
    if (item === 'false') {
      item = false;
    }

    return item;
  }

}
