import { Component, ChangeDetectorRef, ElementRef, Input, Output, OnInit, OnDestroy, EventEmitter } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { HostListener } from '@angular/core';
import { ModalService } from './modal.service';
declare var log: any;

@Component({
  moduleId: module.id.toString(),
  selector: 'modal',
  template:  `<div [@faderAnimation]="enabledTrigger">
                <ng-content></ng-content>
              </div>`,
  animations: [
    trigger('faderAnimation', [
      state('disabled', style({ opacity: 0 })),
      state('enabled',  style({ opacity: 1 })),
      transition('* => *', animate('.25s')),
    ])
  ],
})

export class ModalComponent implements OnInit, OnDestroy {
    @Input() id: string;
    @Input() private escapeEnabled = true; // pass escapeEnabled="false" to <modal> to disable escape
    private element: JQuery;
    public enabledTrigger = 'disabled';
    @Output() cancelled: EventEmitter<void> = new EventEmitter<void>();
    @Output() opened: EventEmitter<void> = new EventEmitter<void>();

    constructor(  private modalService: ModalService,
                  private el: ElementRef,
                  private changeDetectionRef: ChangeDetectorRef) {
                                                                    this.element = $(el.nativeElement);
                                                                  }

    @HostListener('window:keydown', ['$event']) onEscape(event: KeyboardEvent ) {
      // log.debug("keyup event:", event);
      event.stopPropagation();
      if (event.key === 'Escape' && this.enabledTrigger === 'enabled' && this.escapeEnabled === true) {
        this.cancelled.emit();
        this.close();
      }
    }

    ngOnInit(): void {
        let modal = this;

        // ensure id attribute exists
        if (!this.id) {
            log.error('ModalComponent: ngOnInit(): Modal must have an id');
            return;
        }

        // move element to bottom of page (just before </body>) so it can be displayed above everything else
        this.element.appendTo('body');

/*        //I hate this
        // close modal on background click
        this.element.on('click', function (e: any) {
            var target = $(e.target);
            if (!target.closest('.modal-body').length) {
                modal.close();
            }
        });
*/

        // add self (this modal instance) to the modal service so it's accessible from controllers
        this.modalService.add(this);

    }

    // remove self from modal service when directive is destroyed
    ngOnDestroy(): void {
      this.modalService.remove(this.id);
      this.element.remove();
    }

    // open modal
    open(): void {
        this.element.show();
        $('body').addClass('modal-open');
        this.enabledTrigger = 'enabled';
        this.changeDetectionRef.markForCheck();
        this.changeDetectionRef.detectChanges();
        this.opened.emit();
    }

    // close modal
    close(): void {
        this.enabledTrigger = 'disabled';
        this.changeDetectionRef.markForCheck();
        setTimeout( () => {this.element.hide(); $('body').removeClass('modal-open'); }, 250);

    }
}
