import { Directive, OnInit, ElementRef, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { AuthenticationService } from 'services/authentication.service';
import * as log from 'loglevel';

// A directive that catches errors on image load

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[imgerror] imgerror [imgerr] imgerr'
})



export class ImageErrorDirective implements OnInit, OnDestroy {

  constructor(
    private el: ElementRef,
  ) {}



  ngOnInit() {
    if (this.el.nativeElement.tagName !== 'IMG') {
      log.warn('ImageErrorDirective attached to a non-img element.  Doing nothing.');
      return;
    }

    this.el.nativeElement.addEventListener('error', this.onError);
  }



  ngOnDestroy() {
    this.el.nativeElement.removeEventListener('error', this.onError);
  }



  onError = () => {

  };


}
