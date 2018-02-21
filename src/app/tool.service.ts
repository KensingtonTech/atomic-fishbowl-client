import { Injectable, ElementRef } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Collection } from './collection';
import { Feed } from './feed';
import * as log from 'loglevel';

@Injectable()

export class ToolService {

  // properties
  public splashLoaded = false;
  public loadCollectionOnRouteChange = false; // this may be set before switching routes to instruct the new view to load a particular collcetion
  public queryParams: any = null;
  public urlParametersLoaded = false;
  public lastRoute: string = null;

  ////////////  SUBSCRIPTIONS ////////////

  // Search
  public caseSensitiveSearchChanged: Subject<any> = new Subject<any>();
  public searchTermsChanged: Subject<any> = new Subject<any>();
  public searchBarOpen: Subject<any> = new Subject<any>();
  public maskChanged: Subject<any> = new Subject<any>();

  // Statistiocs
  public contentCount: Subject<any> = new Subject<any>();

  // Device Number
  public deviceNumber: BehaviorSubject<any> = new BehaviorSubject<any>(0);


  // Scrolling
  public scrollToBottom: Subject<any> = new Subject<any>();
  public stopScrollToBottom: Subject<any> = new Subject<any>(); // commands the view to stop scrolling
  public scrollToBottomRunning: Subject<any> = new Subject<any>(); // this notifies that scrolling has been started by the view
  public scrollToBottomStopped: Subject<any> = new Subject<any>(); // this notifies that scrolling has finished in the view

  // Masonry
  public layoutComplete: Subject<any> = new Subject<any>();
  public showMasonryTextArea: Subject<boolean> = new Subject<boolean>();
  public showMasonryTextAreaState = true;
  public refreshMasonryLayout: Subject<void> = new Subject<void>();
  public masonryColumnWidthChanged: Subject<number> = new Subject<number>();

  // Users
  public confirmUserDelete: Subject<any> = new Subject<any>();
  public userToDelete: Subject<any> = new Subject<any>();

  // Authentication
  public logout: Subject<any> = new Subject<any>();

  // Misc
  public newSession: Subject<any> = new Subject<any>();
  public newImage: Subject<any> = new Subject<any>();
  public fileToDownload: Subject<any> = new Subject<any>();
  public confirmDownloadFile: Subject<any> = new Subject<any>();
  public clientSessionId: Subject<any> = new Subject<any>();
  public onSplashScreenAtStartupClosed: Subject<void> = new Subject<void>();
  public showHighResSessions: Subject<any> = new Subject<any>();

  // Open viewwers
  public openPDFViewer: Subject<any> = new Subject<any>();
  public openSessionViewer: Subject<any> = new Subject<any>();

  // NW and SA Servers
  public nwServerToDelete: Subject<any> = new Subject<any>();
  public saServerToDelete: Subject<any> = new Subject<any>();
  public confirmNwServerDelete: Subject<string> = new Subject<string>();
  public confirmSaServerDelete: Subject<string> = new Subject<string>();


  // collections //
  public getCollectionDataAgain: Subject<any> = new Subject<any>();
  public deleteCollectionNext: Subject<Collection> = new Subject<Collection>();
  public deleteCollectionConfirmed: Subject<string> = new Subject<string>();
  public executeCollectionOnEdit: Subject<boolean> = new Subject<boolean>();
  public executeAddCollection: Subject<any> = new Subject<any>();
  public executeEditCollection: Subject<any> = new Subject<any>();

  // communicates to collection dialogs that when they open, they should be in 'adhoc' mode
  public addNwAdhocCollectionNext: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public addSaAdhocCollectionNext: BehaviorSubject<any> = new BehaviorSubject<any>({});

  // communicates to collection dialogs that when they open, they should be in 'add' mode
  public addNwCollectionNext: Subject<void> = new Subject<void>();
  public addSaCollectionNext: Subject<void> = new Subject<void>();

  // communicates to collection dialogs that when they open, they should be in 'edit' mode
  public editNwCollectionNext: Subject<Collection> = new Subject<Collection>();
  public editSaCollectionNext: Subject<Collection> = new Subject<Collection>();



  // feeds
  public addFeedNext: Subject<void> = new Subject<void>();
  public editFeedNext: Subject<Feed> = new Subject<Feed>();
  public deleteFeedNext: Subject<Feed> = new Subject<Feed>();



  // Tab Container
  public collectionsOpened: Subject<void> = new Subject<void>();
  public feedsOpened: Subject<void> = new Subject<void>();
  public tabContainerClosed: Subject<void> = new Subject<void>();
  public reOpenTabsModal: Subject<boolean> = new Subject<boolean>();



  constructor() {
    this.showMasonryTextArea.subscribe( (show) => this.showMasonryTextAreaState = show );
  }

  setPreference(key, value): void {
    localStorage.setItem(key, value);
  }

  getPreference(key): any {
    return localStorage.getItem(key);
  }

}
