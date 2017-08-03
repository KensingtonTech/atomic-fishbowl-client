import { Component, ChangeDetectionStrategy, Input, ViewEncapsulation } from '@angular/core';
import { LoggerService } from './logger-service';

@Component({
  selector: 'accordion-li',
  //changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: '<li class="metavalue"><ng-content></ng-content></li>',

/*
  styles: [`
    .metavalue {
      color: rgb(230,234,234);
      font-size: 10px;
    }
          `]
*/
})

export class AccordionLIComponent {

  //@Input('updated') updated: number;

  constructor(private loggerService: LoggerService) {}

}
