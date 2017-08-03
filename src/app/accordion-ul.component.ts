import { Component, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, ViewChild, ElementRef, Input, ViewEncapsulation } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { LoggerService } from './logger-service';

@Component({
  selector: 'ul-accordion',
  //changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
<div *ngIf="oneValue" class="metavalue">
  <a>{{headerText}}</a>
</div>
<div style="height: auto; overflow: hidden;" *ngIf="multiValues" (click)="toggleList()">
  <div [class.hide]="hideHeader">
    <ul>
      <li class="metavalue"><span class="multiValues">{{headerText}}</span></li>
    </ul>
  </div>
  <div [@slideInOut]="collapsed">
    <ul #itemList>
      <ng-content></ng-content>
    </ul>
  </div>
</div>`,

  styles: [`
    ul {
      margin: 0;
      padding-left: 0;
      list-style-type: none;
      word-wrap: break-word;
    }

    .hide {
      display: none !important;
    }
  `],

  animations: [
    trigger('slideInOut', [
      state('true', style({ height: '0px', display: 'none' })),
      state('false',  style({ height: '*', display: 'block' })),
      transition('* => *', animate('.15s')),
    ])
  ]
})

export class AccordionULComponent implements AfterViewInit {

  @ViewChild('itemList') itemList : ElementRef;
  //@Input('updated') updated: number;

  private headerText: string =  '';
  private oneValue: boolean = false;
  private multiValues: boolean = true;
  private hideHeader: boolean = false;
  private collapsed: string = 'true';

  constructor (private _changeDetectionRef : ChangeDetectorRef, private loggerService: LoggerService) { }

  ngAfterViewInit(): void {
    //console.log("itemList:", this.itemList);
    if ( this.itemList.nativeElement.children.length > 1 ) {
      this.multiValues = true;
      this.headerText = this.itemList.nativeElement.children[0].firstChild.textContent;
      //console.log(this.headerText);
    }
    if ( this.itemList.nativeElement.children.length === 1 ) {
      this.oneValue = true;
      this.multiValues = false;
      this.headerText = this.itemList.nativeElement.children[0].firstChild.textContent;
      //console.log(this.headerText);
    }
    this._changeDetectionRef.detectChanges(); //hack needed to not throw an exception

  }

  toggleList(): void {
    //console.log("toggleList()");
    var sel = getSelection().toString();
    if (!sel) {
        //this.hideHeader = (this.hideHeader === false ? true : false);
        this.hideHeader = !this.hideHeader;
        //this.collapsed = !this.collapsed;
        this.collapsed = (this.collapsed === 'true' ? 'false' : 'true');
    }
    this._changeDetectionRef.detectChanges();
    this._changeDetectionRef.markForCheck();
  }

}




