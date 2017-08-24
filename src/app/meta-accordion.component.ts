import { Component, ChangeDetectorRef, Input, ViewEncapsulation } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
declare var log: any;

@Component({
  selector: 'meta-accordion',
  encapsulation: ViewEncapsulation.None,
  template: `

<div *ngIf="items.length == 1">
  {{items[0]}}
</div>

<div *ngIf="items.length > 1" style="height: auto; overflow: hidden;" (click)="toggleList()">

  <div [class.hide]="hideHeader">
    <ul>
      <li><span class="multiValues">{{items[0]}}</span></li>
    </ul>
  </div>

  <div [@slideInOut]="collapsed" style="display: none;">
    <ul #itemList>
      <li *ngFor="let item of items">
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

export class MetaAccordionComponent {

  constructor ( private changeDetectionRef: ChangeDetectorRef ) {}

  @Input() public items: string[] = [];

  private hideHeader = false;
  private collapsed = 'true';

  toggleList(): void {
    // log.debug("toggleList()");
    let sel = getSelection().toString();
    if (!sel) {
        // this.hideHeader = (this.hideHeader === false ? true : false);
        this.hideHeader = !this.hideHeader;
        // this.collapsed = !this.collapsed;
        this.collapsed = (this.collapsed === 'true' ? 'false' : 'true');
    }
    // this.changeDetectionRef.detectChanges();
    this.changeDetectionRef.markForCheck();
  }

  /*ngOnChanges(c: any): void {
    if ('items' in c) {
      log.debug('MetaAccordionComponent: ngOnChanges: items:', c.items.currentValue);
    }
  }*/

}




