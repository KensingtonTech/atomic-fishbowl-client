import { Injectable } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Subject, BehaviorSubject } from 'rxjs';
import { Collection, NwCollection, SaCollection } from 'types/collection';
import { Feed } from 'types/feed';
import { Subscription} from 'rxjs';
import * as log from 'loglevel';

export interface DeviceNumberEvent {
  deviceNumber: number;
  nwserver: string;
}


@Injectable({providedIn: 'root'})
export class ToolService {

  // properties
  firstLoad = true;
  loadCollectionOnRouteChange = false; // this may be set before switching routes to instruct the new view to load a particular collection
  queryParams?: Params;
  urlParametersLoaded = false;
  lastRoute?: string;

  ////////////  OBSERVABLES ////////////

  // Device Number
  deviceNumber = new BehaviorSubject<DeviceNumberEvent | undefined>(undefined);

  // Scrolling
  scrollToBottom = new Subject<void>();
  stopScrollToBottom = new Subject<void>(); // commands the view to stop scrolling
  scrollToBottomRunning = new Subject<void>(); // this notifies that scrolling has been started by the view
  scrollToBottomStopped = new Subject<void>(); // this notifies that scrolling has finished in the view

  // Masonry
  showMasonryTextArea = new BehaviorSubject<boolean>(true);
  masonryColumnWidthChanged = new Subject<number>();
  masonryAutoscrollSpeedChanged = new Subject<number>();

  // Authentication
  logout = new Subject<string>(); // value is socketId

  // Misc
  fileToDownload = new Subject<string>();
  confirmDownloadFile = new Subject<string>();
  clientSessionId = new Subject<string>();
  splashScreenClosed = new Subject<void>();
  eulaAccepted = new Subject<void>();

  // NW and SA Servers
  confirmNwServerDelete = new Subject<string>();
  confirmSaServerDelete = new Subject<string>();


  // collections //
  selectedCollection?: Collection;
  getCollectionDataAgain = new Subject<void>();
  executeCollectionOnEdit = new Subject<boolean>();
  executeAddCollection = new Subject<Collection>();
  executeEditCollection = new Subject<Collection>();

  // communicates to collection dialogs that when they open, they should be in 'adhoc' mode
  addNwAdhocCollectionNext = new BehaviorSubject<Params>({});
  addSaAdhocCollectionNext = new BehaviorSubject<Params>({});

  // communicates to collection dialogs that when they open, they should be in 'add' mode
  addNwCollectionNext = new Subject<void>();
  addSaCollectionNext = new Subject<void>();

  // communicates to collection dialogs that when they open, they should be in 'edit' mode
  editNwCollectionNext = new Subject<NwCollection>();
  editSaCollectionNext = new Subject<SaCollection>();

  // feeds
  addFeedNext = new Subject<void>();
  editFeedNext = new Subject<Feed>();

  // Dialog Control
  displayTabContainerModal = new Subject<boolean>();
  displayManageUsersModal = new Subject<boolean>();
  displayFeedWizardModal = new Subject<boolean>();
  displayNwCollectionModal = new Subject<boolean>();
  displayContentDetailsModal = new Subject<boolean>();

  // Tab Container
  collectionsOpened = new Subject<void>();
  feedsOpened = new Subject<void>();
  tabContainerClosed = new Subject<void>();
  reOpenTabsModal = new Subject<boolean>();

  private subscriptions = new Subscription();
  private fakeLocalStorage: Record<string, unknown> = {};




  constructor(private route: ActivatedRoute) {
    this.lastRoute = this.getStringPreference('lastRoute');
    this.subscriptions.add(
      this.route.queryParams.subscribe(
        (params: Params ) => this.onRouteParameters(params)
      )
    );
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

      if ( !['nw', 'sa'].includes(params.service) ) {
        return;
      }

      if ('ip' in params && !['src', 'dst'].includes(params.side)) {
        return;
      }

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
    this.selectedCollection = undefined;
    this.deviceNumber.next(undefined);
    this.addNwAdhocCollectionNext.next({});
    this.addSaAdhocCollectionNext.next({});
  }



  setPreference(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, value as any);
    }
    catch (error) {
      // if we're in an iFrame, there's a good change we won't be able to access localStorage
      this.fakeLocalStorage[key] = value;
    }
  }



  getBooleanPreference(key: string): boolean | undefined;
  getBooleanPreference(key: string, defaultValue: boolean): boolean;
  getBooleanPreference(key: string, defaultValue?: boolean): boolean | undefined {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return item.toLowerCase() === 'true';
  }


  getNumberPreference(key: string): number | undefined;
  getNumberPreference(key: string, defaultValue: number): number;
  getNumberPreference(key: string, defaultValue?: number): number | undefined {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    const numberRegex = /^[\d\.]+$/;

    if ( numberRegex.test(item) ) {
      return Number(item);
    }
    return defaultValue;
  }



  getStringPreference(key: string): string | undefined;
  getStringPreference(key: string, defaultValue: string): string;
  getStringPreference(key: string, defaultValue?: string): string | undefined {
    const item = localStorage.getItem(key);
    return item ?? defaultValue;
  }



  getJSONPreference<T extends Record<any, unknown> | Array<unknown>>(key: string): T | undefined;
  getJSONPreference<T extends Record<any, unknown> | Array<unknown>>(key: string, defaultValue: T): T;
  getJSONPreference<T extends Record<any, unknown> | Array<unknown>>(key: string, defaultValue?: T): T | undefined {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  }

}
