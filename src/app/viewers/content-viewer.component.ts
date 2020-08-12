import { Component, ChangeDetectionStrategy, OnChanges, Input, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { Content } from 'types/content';
import * as utils from '../utils';

@Component({
  selector: 'content-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-viewer.component.html'
})

export class ContentViewerComponent implements OnChanges {

  constructor( private changeDetectionRef: ChangeDetectorRef ) {}

  @Input() content: Content;
  @Input() collectionId: string;

  utils = utils;
  imageError = false;

  onImageError() {
    this.imageError = true;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }

  ngOnChanges(values: SimpleChanges) {
    if ('content' in values) {
      this.imageError = false;
    }
  }

}
