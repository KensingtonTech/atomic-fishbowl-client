import { Component, ChangeDetectorRef, ElementRef, Input, Output, OnInit, OnDestroy, EventEmitter, ViewChild, SimpleChanges, Renderer2 } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { HostListener } from '@angular/core';
import { ModalService } from './modal.service';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'modal',

  template:  `
<!-- (@faderAnimation.done)="onAnimationDone($event)" -->
<div #modalRoot [@faderAnimation]="enabledTrigger" (@faderAnimation.done)="onAnimationDone($event)">

  <!-- background -->
  <div *ngIf="background" class="modal-background" [style]="bypassStyleSanitizer(backgroundStyle)" [ngClass]="backgroundClass"></div>

  <!-- modal container - takes the entire page -->
  <div class="modal" [ngClass]="modalClass">

    <!-- modal body -->
    <div class="modal-body" [ngClass]="bodyClass" [style]="bypassStyleSanitizer(bodyStyle)">
      <ng-content></ng-content>
    </div>

  </div>

</div>`,

  animations: [
    trigger('faderAnimation', [
      state('enabled',  style({ opacity: 1, display: 'block' })),
      state('disabled', style({ opacity: 0, display: 'none' })),
      transition('enabled => disabled', [animate('.25s')]),
      transition('disabled => enabled', [style({display: 'block'}), animate('.25s')])
    ])
  ],
})

export class ModalComponent implements OnInit, OnDestroy {

  constructor(  private modalService: ModalService,
    private el: ElementRef,
    private changeDetectionRef: ChangeDetectorRef,
    private renderer: Renderer2,
    private sanitizer: DomSanitizer) { }

  @ViewChild('modalRoot') modalRoot: ElementRef;

  @Input() id: string;
  @Input() closeOnClickOutside = false;
  @Input() escapeEnabled = true; // pass escapeEnabled="false" to <modal> to disable escape
  @Input() modalClass = '';
  @Input() bodyClass = '';
  @Input() bodyStyle = '';
  @Input() background = false;
  @Input() backgroundClass = '';
  @Input() backgroundStyle = '';
  @Input() secondLevel = false;

  @Output() opened: EventEmitter<void> = new EventEmitter<void>();
  @Output() closed: EventEmitter<void> = new EventEmitter<void>();

  public enabledTrigger = 'disabled';
  // public enabledTrigger = 'initial';


  @HostListener('window:keydown', ['$event']) onEscape(event: KeyboardEvent ) {
    // log.debug("keyup event:", event);
    event.stopPropagation();
    if (event.key === 'Escape' && this.enabledTrigger === 'enabled' && this.escapeEnabled === true) {
      this.close();
    }
  }



  ngOnInit(): void {
    // ensure id attribute exists
    if (!this.id) {
        log.error('ModalComponent: ngOnInit(): Modal must have an id');
        return;
    }

    if (this.secondLevel) {
      this.renderer.addClass(this.el.nativeElement, 'secondLevel'); // css will set the appropriate z-index of elements
    }

    // move element to bottom of page (just before </body>) so it can be displayed above everything else
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
    log.debug('ModalComponent: onAnimationDone(): event:', event);
    if (event.toState === 'disabled') {
      this.el.nativeElement.style['display'] = 'none'; // this must stay on the host element or it will block the ui
    }
  }



  bypassStyleSanitizer(value): SafeStyle {
    return this.sanitizer.bypassSecurityTrustStyle(value);
  }

}
