import { Component, ChangeDetectorRef, Input, ChangeDetectionStrategy, ViewChild, ElementRef, ViewChildren, QueryList, OnChanges, Renderer2, SimpleChanges, AfterViewInit } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Logger } from 'loglevel';
import { ToolService } from './tool.service';
declare var log: Logger;

@Component({
  selector: 'meta-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div style="height: auto; overflow: hidden;" (mousedown)="onMouseDown($event)" (mouseup)="onMouseUp($event)">

  <div #slider [@slideInOut]="{value: collapsedState, params: {collapsedHeight: collapsedHeight} }" style="overflow: hidden;">
    <ul #itemList>
      <li #firstListItem [class.bold]="!collapsed" class="firstItems" style="display: block;">
        <!-- expansion caret -->
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
      state('initial', style({height: '0px'})),
      state('collapsed', style({ height: `{{collapsedHeight}}px` }), { params: { collapsedHeight: 0 }  } ),
      state('expanded',  style({ height: '*' })),
      transition('initial => collapsed', [] ),
      transition('collapsed <=> expanded', animate(150))
    ])
  ]
})

export class MetaAccordionComponent implements AfterViewInit, OnChanges {

  constructor ( private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService ) {}

  @Input() public items: string[] = [];
  @Input() public key: string;
  @Input() public enabled = false;

  @ViewChild('slider') sliderRef: ElementRef;
  @ViewChild('firstListItem') firstListItem: ElementRef;
  @ViewChildren('itemList') itemList: QueryList<ElementRef>;

  public displayedItems: string[] = [];
  public collapsedState = 'initial';
  public collapsedHeight = 0;
  public firstItem: string;
  public mouseDownTime: number;



  ngAfterViewInit() {
    if (this.toolService.accordionCollapsedHeight !== 0) {
      this.collapsedHeight = this.toolService.accordionCollapsedHeight;
      this.collapsedState = 'collapsed';
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    }
  }




  ngOnChanges(value: SimpleChanges) {
    if (this.items.length === 0) {
      return;
    }
    this.displayedItems = this.items.slice(0);
    this.firstItem = this.displayedItems.shift();
    if (this.toolService.accordionCollapsedHeight === 0 && this.enabled) {
      setTimeout( () => {
        if (this.toolService.accordionCollapsedHeight === 0) {
          // this if is repeated because by the time we get here, it may already have been set by another accordion during the setTimeout
          this.toolService.accordionCollapsedHeight = this.firstListItem.nativeElement.clientHeight;
        }
        this.collapsedHeight = this.toolService.accordionCollapsedHeight;
        this.collapsedState = 'collapsed';
        this.changeDetectionRef.markForCheck();
      }, 20);
    }
    else if (this.collapsedHeight === 0 && this.enabled) {
      // this case occurs when transitioning from an initial undisplaed state to a displayed state
      this.collapsedHeight = this.toolService.accordionCollapsedHeight;
      this.collapsedState = 'collapsed';
      this.changeDetectionRef.markForCheck();
    }
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
    this.collapsedState = this.collapsedState === 'collapsed' ? 'expanded' : 'collapsed';

    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }


}




