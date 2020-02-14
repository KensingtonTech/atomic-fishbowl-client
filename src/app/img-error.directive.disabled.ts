import { Directive, OnInit, ElementRef, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { AuthenticationService } from 'services/authentication.service';
import * as log from 'loglevel';

// A directive that catches errors on image load

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[imgerror] imgerror [imgerr] imgerr'
})



export class ImageErrorDirective implements OnInit, OnDestroy {

  constructor(
    private el: ElementRef,
    private authService: AuthenticationService) {}



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



  onError = (error) => {

  }


}
