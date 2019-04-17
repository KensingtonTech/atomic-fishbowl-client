import { Component, ChangeDetectorRef, Input, ChangeDetectionStrategy, ViewChild, ElementRef, ViewChildren, QueryList, OnChanges, SimpleChanges } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'meta-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div style="height: auto; overflow: hidden;" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)">

  <div #slider [@slideInOut]="collapsedState" style="overflow: hidden;">
    <ul #itemList>
      <!-- first value - this is what is used when there is only one value, or if multiple values, it is the value shown when collapsed -->
      <li #firstListItem [class.bold]="collapsedState == 'expanded'" class="firstItems wrap" style="display: block;" [class.multipleValues]="additionalDisplayedItems.length !== 0">
        <!-- expansion caret -->
        <span *ngIf="additionalDisplayedItems.length !== 0" class="fa fa-lg-mod fa-fw noselect" [class.fa-caret-right]="collapsedState == 'collapsed'" [class.fa-caret-down]="collapsedState != 'collapsed'" style="color: white;">&nbsp;</span>
        <!-- regular meta -->
        <span *ngIf="key !== 'stop_time' && key != 'start_time'" style="overflow-wrap: break-word;" [class.multiValues]="additionalDisplayedItems.length !== 0 && collapsedState == 'collapsed'">{{firstItem}}</span>
        <!-- sa time meta -->
        <span *ngIf="key === 'stop_time' || key === 'start_time'" [class.multiValues]="additionalDisplayedItems.length !== 0 && collapsedState === 'collapsed'">{{firstItem | formatTime:'ddd YYYY/MM/DD HH:mm:ss'}}</span>
      </li>
      <!-- all other values - for when expanded -->
      <li *ngFor="let item of additionalDisplayedItems" class="bold wrap">
        <!-- indent -->
        <span *ngIf="additionalDisplayedItems.length !== 0" class="fa fa-lg-mod fa-fw">&nbsp;</span>
        <!-- value -->
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

    .fa-lg-mod {
      font-size: 1.25em;
    }

    .multipleValues {
      text-overflow: ellipsis;
    }

  `],

  animations: [
    trigger('slideInOut', [
      state('collapsed', style( { height: `1.25em` } ) ),
      state('expanded',  style( { height: '*' } ) ),
      transition('* <=> expanded', animate(150)),
      transition('expanded <=> collapsed', animate(150))
    ])
  ]
})

export class MetaAccordionComponent implements OnChanges {

  constructor ( private changeDetectionRef: ChangeDetectorRef ) {}

  @Input() public items: string[] = [];
  @Input() public key: string;
  @Input() public enabled = false;

  @ViewChild('slider') sliderRef: ElementRef;
  @ViewChild('firstListItem') firstListItem: ElementRef;
  @ViewChildren('itemList') itemList: QueryList<ElementRef>;

  public additionalDisplayedItems: string[] = [];
  public collapsedState = 'initial'; // only controls the animation.  use to track whether it was previously expanded
  public expanded = false;
  public firstItem: string;
  public mouseDownTime: number;



  ngOnChanges(values: SimpleChanges) {
    if (this.items.length === 0 || !('items' in values)) {
      this.changeDetectionRef.markForCheck();
      return;
    }
    let items = values.items.currentValue.slice(0);
    if (items.length === 1) {
      this.collapsedState = 'initial';
    }
    if (items.length > 1 && !this.expanded) {
      this.collapsedState = 'collapsed';
    }
    if (items.length > 1 && this.expanded) {
      this.collapsedState = 'expanded';
    }
    this.firstItem = items.shift();
    this.additionalDisplayedItems = items;
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
    if (this.additionalDisplayedItems.length === 0) {
      // do nothing if only a single meta item
      return;
    }
    this.collapsedState = this.collapsedState === 'collapsed' ? 'expanded' : 'collapsed';
    this.expanded = !this.expanded;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }


}




