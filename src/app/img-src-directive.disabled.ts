import {
  Directive,
  Input,
  ElementRef,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnDestroy
} from '@angular/core';
import { DataService } from 'services/data.service';

// A directive that loads images from the dataService and thus makes load errors catch-able

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[imgsrc]'
})



export class ImageSourceDirective implements OnChanges, OnDestroy {

  constructor(
    private el: ElementRef,
    private dataService: DataService
  ) {}

  @Input('imgsrc') source: string;
  @Output() errorReceived = new EventEmitter<any>();



  async loadImage() {
    // log.debug('ImageSourceDirective: loadImage(): starting image load');
    try {
      const url = await this.dataService.getImage(this.source);
      this.el.nativeElement.src = url;
    }
    catch (error) {
      this.errorReceived.emit(error);
    }
  }



  ngOnDestroy() {
    // we don't want the browser hanging on to the blobs in memory after being destroyed
    this.dataService.removeBlob(this.source);
  }



  ngOnChanges(values: SimpleChanges) {
    // log.debug('ImageSourceDirective: ngOnChanges(): values:', values);
    if (!values.source.isFirstChange && values.source.currentValue === values.source.previousValue) {
      return;
    }
    this.loadImage();
  }

}
