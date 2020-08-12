import { Component, ChangeDetectorRef, Input, ChangeDetectionStrategy, ViewChild, ElementRef, ViewChildren, QueryList, OnChanges, SimpleChanges } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'meta-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meta-accordion.component.html',
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

  @Input() items: string[] = [];
  @Input() key: string;
  @Input() enabled = false;
  @Input() expandAll = false;

  @ViewChild('slider', { static: true }) sliderRef: ElementRef;
  @ViewChild('firstListItem', { static: true }) firstListItem: ElementRef;
  @ViewChildren('itemList') itemList: QueryList<ElementRef>;

  additionalDisplayedItems: string[] = [];
  collapsedState = 'initial'; // only controls the animation.  use to track whether it was previously expanded
  expanded = false;
  firstItem: string;
  mouseDownTime: number;
  private overrideExpandAll = false;



  ngOnChanges(values: SimpleChanges) {
    // log.debug('MetaAccordionComponent: ngOnChanges(): values:', values);
    if (this.items.length === 0 || ( !('items' in values) && !('expandAll' in values) ) ) {
      this.changeDetectionRef.markForCheck();
      return;
    }

    let items;
    if ('items' in values) {
      items = values.items.currentValue.slice(0);
    }
    else {
      items = [ this.firstItem ].concat(this.additionalDisplayedItems);
    }

    if ('expandAll' in values) {
      // reset expanded and overrideExpandAll
      // we need this to occur regardless of items length
      if (this.expandAll) {
        this.expanded = true;
        this.overrideExpandAll = false;
      }
      else if (!this.expandAll) {
        this.expanded = false;
        this.overrideExpandAll = false;
      }
    }

    // now set the collapsed State
    if (items.length === 1) {
      // one item
      this.collapsedState = 'initial';
    }
    else if ('expandAll' in values) {
      // more than one item and user just toggled expand / collapse
      if (this.expandAll) {
        this.collapsedState = 'expanded';
      }
      else if (!this.expandAll) {
        this.collapsedState = 'collapsed';
      }
    }
    else if (!('expandAll' in values)) {
      // more than one item and user didn't just toggle expand / collapse, but it still might already be expanded
      // we may have changed sessions and just got new meta
      if ('items' in values) {
        // we just got new meta
        if (this.expandAll) {
          // we are in an expandAll state
          if (!this.overrideExpandAll) {
            this.collapsedState = 'expanded';
          }
          else {
            this.collapsedState = 'collapsed';
          }
        }
        else if (!this.expandAll) {
          // we're not in an expandAll state, i.e. we're collapsed
          if (this.expanded) {
            this.collapsedState = 'expanded';
          }
          else if (!this.expanded) {
            this.collapsedState = 'collapsed';
          }
        }
      }
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
    if (this.expandAll && !this.expanded) {
      this.overrideExpandAll = true;
    }
    else {
      this.overrideExpandAll = false;
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }


}




