import { Component, OnInit, OnChanges, ElementRef, Input } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component( {
  selector: 'classic-session-popup',
  template: `
<div [@faderAnimation]="enabledTrigger" (@faderAnimation.done)="onAnimationDone($event)" (@faderAnimation.start)="onAnimationStart($event)">

  <ng-content></ng-content>

</div>
`,

  animations: [
    trigger('faderAnimation', [
      state('disabled', style({ opacity: 0 })),
      state('enabled',  style({ opacity: 1 })),
      transition('* => *', animate('.25s'))
    ])
  ]

} )

export class ClassicSessionPopupComponent implements OnInit, OnChanges {

  constructor( private el: ElementRef ) {}

  @Input() enabled: boolean;

  enabledTrigger = 'disabled';



  ngOnInit(): void {
    this.enabledTrigger = 'disabled';
  }



  ngOnChanges(values: any): void {
    // log.debug('ClassicSessionPopupComponent ngOnChanges(): values', values);
    this.enabledTrigger = this.enabled ? 'enabled' : 'disabled';
  }



  onAnimationStart(event) {
    if (event.toState === 'enabled') {
      this.el.nativeElement.style['display'] = 'block';
    }
  }



  onAnimationDone(event) {
    // log.debug('ModalComponent: onAnimationDone(): event:', event);
    if (event.toState === 'disabled') {
      this.el.nativeElement.style['display'] = 'none';
    }
  }

}
