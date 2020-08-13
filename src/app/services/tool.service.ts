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
  splashLoaded = false;
  firstLoad = true;
  loadCollectionOnRouteChange = false; // this may be set before switching routes to instruct the new view to load a particular collcetion
  queryParams: Params = null;
  urlParametersLoaded = false;
  lastRoute: string = null;

  ////////////  OBSERVABLES ////////////

  // Device Number
  deviceNumber = new BehaviorSubject<any>(0);

  // Scrolling
  scrollToBottom = new Subject<any>();
  stopScrollToBottom = new Subject<any>(); // commands the view to stop scrolling
  scrollToBottomRunning = new Subject<any>(); // this notifies that scrolling has been started by the view
  scrollToBottomStopped = new Subject<any>(); // this notifies that scrolling has finished in the view

  // Masonry
  showMasonryTextArea = new BehaviorSubject<boolean>(true);
  masonryColumnWidthChanged = new Subject<number>();
  masonryAutoscrollSpeedChanged = new Subject<number>();

  // Users
  confirmUserDelete = new Subject<any>();

  // Authentication
  logout = new Subject<any>();

  // Misc
  fileToDownload = new Subject<any>();
  confirmDownloadFile = new Subject<any>();
  clientSessionId = new Subject<any>();
  onSplashScreenAtStartupClosed = new Subject<void>();
  eulaAccepted = new Subject<void>();

  // NW and SA Servers
  saServerToDelete = new Subject<any>();
  confirmNwServerDelete = new Subject<string>();
  confirmSaServerDelete = new Subject<string>();


  // collections //
  selectedCollection: Collection;
  getCollectionDataAgain = new Subject<any>();
  deleteCollectionNext = new Subject<Collection>();
  deleteCollectionConfirmed = new Subject<string>();
  executeCollectionOnEdit = new Subject<boolean>();
  executeAddCollection = new Subject<any>();
  executeEditCollection = new Subject<any>();

  // communicates to collection dialogs that when they open, they should be in 'adhoc' mode
  addNwAdhocCollectionNext = new BehaviorSubject<Params>({});
  addSaAdhocCollectionNext = new BehaviorSubject<Params>({});

  // communicates to collection dialogs that when they open, they should be in 'add' mode
  addNwCollectionNext = new Subject<void>();
  addSaCollectionNext = new Subject<void>();

  // communicates to collection dialogs that when they open, they should be in 'edit' mode
  editNwCollectionNext = new Subject<Collection>();
  editSaCollectionNext = new Subject<Collection>();



  // feeds
  addFeedNext = new Subject<void>();
  editFeedNext = new Subject<Feed>();
  deleteFeedNext = new Subject<Feed>();



  // Tab Container
  collectionsOpened = new Subject<void>();
  feedsOpened = new Subject<void>();
  tabContainerClosed = new Subject<void>();
  reOpenTabsModal = new Subject<boolean>();



  // Modal ID's
  collectionDeletedModalId = 'collection-deleted-notify-modal';
  contentDetailsModalId = 'content-details-modal';
  confirmDeleteFeedModalId = 'confirm-delete-feed-modal';
  feedWizardModalId = 'feed-wizard-modal';
  nwCollectionModalId = 'nw-collection-modal';
  saCollectionModalId = 'sa-collection-modal';
  tabContainerModalId = 'tab-container-modal';
  splashScreenModalId = 'splash-screen-modal';
  serverDownModalId = 'server-down-modal';
  confirmCollectionDeleteModalId = 'confirm-collection-delete-modal';
  confirmUserDeleteModalId = 'confirm-user-delete-modal';
  confirmNwServerDeleteModalId = 'confirm-nwserver-delete-modal';
  confirmSaServerDeleteModalId = 'confirm-saserver-delete-modal';
  confirmDownloadFileModalId = 'confirm-downloadfile-modal';
  preferencesModalId = 'preferences-modal';
  manageeUsersModalId = 'manage-users-modal';
  newEditUserModalId = 'new-edit-user-modal';
  newEditNwServiceModalId = 'new-edit-nw-server-modal';
  loggedOutModalId = 'logged-out-notify-modal';

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

    const numberRegex = /^[\d\.]+$/;

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
