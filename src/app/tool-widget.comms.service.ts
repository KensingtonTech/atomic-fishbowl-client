import { Injectable, ElementRef } from '@angular/core';
import { Subject } from 'rxjs/Subject';
//import { LoggerService } from './logger-service';

@Injectable()

export class ToolWidgetCommsService {
  //<tool-widget [imageCount]="imageCount" (caseSensitiveSearchChanged)="toggleCaseSensitiveSearch()" (searchTermsChanged)="searchTermsChanged($event)" (maskChanged)="maskChanged($event)" (deviceNumber)="deviceNumberUpdate($event)"></tool-widget>

  public caseSensitiveSearchChanged: Subject<any> = new Subject<any>();
  public searchTermsChanged: Subject<any> = new Subject<any>();
  public maskChanged: Subject<any> = new Subject<any>();
  public deviceNumber: Subject<any> = new Subject<any>();
  public imageCount: Subject<any> = new Subject<any>();
  public getCollectionDataAgain: Subject<any> = new Subject<any>();
  //public selectedCollection: Subject<any> = new Subject<any>();
  public changingCollections: Subject<any> = new Subject<any>();
  public scrollToBottom: Subject<any> = new Subject<any>();
  public layoutComplete: Subject<any> = new Subject<any>();
  public stopScrollToBottom: Subject<any> = new Subject<any>(); //commands the view to stop scrolling
  public scrollToBottomRunning: Subject<any> = new Subject<any>(); //this notifies that scrolling has been started by the view
  public scrollToBottomStopped: Subject<any> = new Subject<any>(); //this notifies that scrolling has finished in the view
  public newSession: Subject<any> = new Subject<any>();
  public newImage: Subject<any> = new Subject<any>();
  public confirmUserDelete: Subject<any> = new Subject<any>();
  public userToDelete: Subject<any> = new Subject<any>();
  public noCollections: Subject<any> = new Subject<any>();
  public logout: Subject<any> = new Subject<any>();
}
