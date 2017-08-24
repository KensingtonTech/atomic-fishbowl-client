import { Injectable, ElementRef } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
declare var log: any;

@Injectable()

export class ToolService {
  public caseSensitiveSearchChanged: Subject<any> = new Subject<any>();
  public searchTermsChanged: Subject<any> = new Subject<any>();
  public searchBarOpen: Subject<any> = new Subject<any>();
  public maskChanged: Subject<any> = new Subject<any>();
  public deviceNumber: BehaviorSubject<any> = new BehaviorSubject<any>(0);
  public contentCount: Subject<any> = new Subject<any>();
  public getCollectionDataAgain: Subject<any> = new Subject<any>();
  public changingCollections: Subject<any> = new Subject<any>();
  public scrollToBottom: Subject<any> = new Subject<any>();
  public layoutComplete: Subject<any> = new Subject<any>();
  public stopScrollToBottom: Subject<any> = new Subject<any>(); // commands the view to stop scrolling
  public scrollToBottomRunning: Subject<any> = new Subject<any>(); // this notifies that scrolling has been started by the view
  public scrollToBottomStopped: Subject<any> = new Subject<any>(); // this notifies that scrolling has finished in the view
  public newSession: Subject<any> = new Subject<any>();
  public newImage: Subject<any> = new Subject<any>();
  public confirmUserDelete: Subject<any> = new Subject<any>();
  public userToDelete: Subject<any> = new Subject<any>();
  public noCollections: Subject<any> = new Subject<any>();
  public logout: Subject<any> = new Subject<any>();
  public fileToDownload: Subject<any> = new Subject<any>();
  public confirmDownloadFile: Subject<any> = new Subject<any>();
  public sessionId: Subject<any> = new Subject<any>();
  public HttpJsonStreamServiceConnected: Subject<any> = new Subject<any>();
  public openPDFViewer: Subject<any> = new Subject<any>();
  public openSessionViewer: Subject<any> = new Subject<any>();
}
