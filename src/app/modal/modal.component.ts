import { Component, ChangeDetectorRef, ElementRef, Input, Output, OnInit, OnDestroy, EventEmitter } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { HostListener } from '@angular/core';
import { ModalService } from './modal.service';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'modal',

  template:  `<div [@faderAnimation]="enabledTrigger" (@faderAnimation.done)="onAnimationDone($event)">
                <ng-content></ng-content>
              </div>`,

  animations: [
    trigger('faderAnimation', [
      state('disabled', style({ opacity: 0 })),
      state('enabled',  style({ opacity: 1 })),
      transition('* => *', animate('.25s'))
    ])
  ],
})

export class ModalComponent implements OnInit, OnDestroy {

  constructor(  private modalService: ModalService,
    private el: ElementRef,
    private changeDetectionRef: ChangeDetectorRef) { }

  @Input() id: string;
  @Input() closeOnClickOutside = false;
  @Input() escapeEnabled = true; // pass escapeEnabled="false" to <modal> to disable escape
  @Output() cancelled: EventEmitter<void> = new EventEmitter<void>();
  @Output() opened: EventEmitter<void> = new EventEmitter<void>();
  @Output() closed: EventEmitter<void> = new EventEmitter<void>();

  public enabledTrigger = 'disabled';


  @HostListener('window:keydown', ['$event']) onEscape(event: KeyboardEvent ) {
    // log.debug("keyup event:", event);
    event.stopPropagation();
    if (event.key === 'Escape' && this.enabledTrigger === 'enabled' && this.escapeEnabled === true) {
      this.cancelled.emit();
      this.close();
    }
  }



  ngOnInit(): void {
    // ensure id attribute exists
    if (!this.id) {
        log.error('ModalComponent: ngOnInit(): Modal must have an id');
        return;
    }

    // move element to bottom of page (just before </body>) so it can be displayed above everything else
    this.el.nativeElement.classList.add('modal');
    document.body.appendChild(this.el.nativeElement);

    // add self (this modal instance) to the modal service so it's accessible from controllers
    this.modalService.add(this);

  }



  ngOnDestroy(): void {
    // remove self from modal service when directive is destroyed
    this.modalService.remove(this.id);
    if (this.closeOnClickOutside) {
      this.el.nativeElement.removeEventListener('click', this.onClickOutside);
    }
    document.body.removeChild(this.el.nativeElement);
  }



  onClickOutside = (event) => {
    let target = $(event.target);
    if (!target.closest('.modal-body').length) {
        this.close();
    }
  }



  open(): void {
    // open modal
    this.opened.emit();
    this.el.nativeElement.style['display'] = 'block';
    document.body.classList.add('modal-open');
    if (this.closeOnClickOutside) {
      // close modal on background click
      this.el.nativeElement.addEventListener('click', this.onClickOutside);
    }
    this.enabledTrigger = 'enabled';
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  close(): void {
    // close modal
    this.closed.emit();
    document.body.classList.remove('modal-open');
    this.enabledTrigger = 'disabled';
    if (this.closeOnClickOutside) {
      this.el.nativeElement.removeEventListener('click', this.onClickOutside);
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onAnimationDone(event) {
    // log.debug('ModalComponent: onAnimationDone(): event:', event);
    if (event.toState === 'disabled') {
      this.el.nativeElement.style['display'] = 'none';
    }
  }

}
