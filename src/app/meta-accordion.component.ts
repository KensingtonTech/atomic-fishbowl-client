import { Component, ChangeDetectorRef, Input, ChangeDetectionStrategy, ViewChild, ElementRef, ViewChildren, QueryList, OnChanges } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'meta-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div style="height: auto; overflow: hidden;" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)">

  <div #slider [@slideInOut]="collapsedState" style="overflow: hidden; height: 12px;">
    <ul #itemList display="inline-block">
      <li #firstListItem [class.bold]="collapsedState == 'expanded'" >
        <span *ngIf="displayedItems.length != 0" class="fa fa-lg fa-fw noselect" [class.fa-caret-right]="collapsedState == 'collapsed'" [class.fa-caret-down]="collapsedState != 'collapsed'" style="color: white;">&nbsp;</span>
        <!-- regular meta -->
        <span *ngIf="key != 'stop_time' && key != 'start_time'" [class.multiValues]="displayedItems.length != 0 && collapsedState == 'collapsed'">{{firstItem}}</span>
        <!-- sa time meta -->
        <span *ngIf="key == 'stop_time' || key == 'start_time'" [class.multiValues]="displayedItems.length != 0 && collapsedState == 'collapsed'">{{firstItem | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</span>
      </li>
      <li *ngFor="let item of displayedItems" class="bold">
        <span *ngIf="displayedItems.length != 0" class="fa fa-lg fa-fw">&nbsp;</span>
        <span class="expanded">{{item}}</span>
      </li>
    </ul>
  </div>

</div>
  `,

  styles: [`
    ul {
      margin: 0;
      padding-left: 0;
      list-style-type: none;
      word-wrap: break-word;
    }

    bold {
      font-weight: bold;
    }
  `],

  animations: [
    trigger('slideInOut', [
      state('collapsed', style({ height: `12px` }) ),
      state('expanded',  style({ height: '*' })),
      transition(':enter', [] ),
      transition('* => *', animate('.15s'))
    ])
  ]
})

export class MetaAccordionComponent implements OnChanges {

  constructor ( private changeDetectionRef: ChangeDetectorRef ) {}

  @Input() public items: string[] = [];
  @Input() public key: string;

  @ViewChild('slider') sliderRef: ElementRef;
  @ViewChild('firstListItem') firstListItem: ElementRef;
  @ViewChildren('itemList') itemList: QueryList<ElementRef>;

  public displayedItems: string[] = [];
  public collapsedState = 'collapsed';
  public collapsedHeight;
  public firstItem: string;
  public mouseDownTime: number;



  ngOnChanges() {
    this.displayedItems = this.items.slice(0);
    this.firstItem = this.displayedItems.shift();
    this.changeDetectionRef.markForCheck();
  }



  onMouseDown(event: MouseEvent) {
    this.mouseDownTime = event.timeStamp;
  }



  onMouseUp(event: MouseEvent) {
    if (event.timeStamp - this.mouseDownTime > 250) {
      return;
    }
    this.toggleList();
  }



  toggleList(): void {
    if (this.displayedItems.length === 0) {
      // do nothing if only a single meta item
      return;
    }
    this.collapsedState = (this.collapsedState === 'collapsed' ? 'expanded' : 'collapsed');
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }

}




