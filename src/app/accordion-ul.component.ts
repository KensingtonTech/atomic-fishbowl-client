import { Component, ChangeDetectorRef, AfterViewInit, ViewChild, ElementRef, Input, ViewEncapsulation } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
declare var log: any;

@Component({
  selector: 'ul-accordion',
  encapsulation: ViewEncapsulation.None,
  template: `
<div *ngIf="oneValue">
  <a>{{headerText}}</a>
</div>
<div style="height: auto; overflow: hidden;" *ngIf="multiValues" (click)="toggleList()">
  <div [class.hide]="hideHeader">
    <ul>
      <li><span class="multiValues">{{headerText}}</span></li>
    </ul>
  </div>
  <div [@slideInOut]="collapsed" style="display: none;">
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

  constructor ( private changeDetectionRef: ChangeDetectorRef ) {}

  @ViewChild('itemList') itemList: ElementRef;

  private headerText =  '';
  public oneValue = false;
  public multiValues = true;
  private hideHeader = false;
  private collapsed = 'true';

  ngAfterViewInit(): void {
    // log.debug("itemList:", this.itemList);
    if ( this.itemList.nativeElement.children.length > 1 ) {
      this.multiValues = true;
      this.headerText = this.itemList.nativeElement.children[0].firstChild.textContent;
      // log.debug(this.headerText);
    }
    if ( this.itemList.nativeElement.children.length === 1 ) {
      this.oneValue = true;
      this.multiValues = false;
      this.headerText = this.itemList.nativeElement.children[0].firstChild.textContent;
      // log.debug(this.headerText);
    }
    this.changeDetectionRef.detectChanges(); // hack needed to not throw an exception

  }

  toggleList(): void {
    // log.debug("toggleList()");
    let sel = getSelection().toString();
    if (!sel) {
        // this.hideHeader = (this.hideHeader === false ? true : false);
        this.hideHeader = !this.hideHeader;
        // this.collapsed = !this.collapsed;
        this.collapsed = (this.collapsed === 'true' ? 'false' : 'true');
    }
    this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
  }

}




