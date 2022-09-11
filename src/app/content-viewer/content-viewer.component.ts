import {
  Component,
  ChangeDetectionStrategy,
  OnChanges,
  Input,
  SimpleChanges,
  ChangeDetectorRef
} from '@angular/core';
import { ContentItem } from 'types/collection';
import * as utils from '../utils';

@Component({
  selector: 'app-content-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-viewer.component.html',
  styleUrls: [
    './content-viewer.component.scss'
  ]
})

export class ContentViewerComponent implements OnChanges {

  constructor( private changeDetectionRef: ChangeDetectorRef ) {}

  @Input() content: ContentItem;
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
