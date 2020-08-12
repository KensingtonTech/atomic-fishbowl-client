import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { ContentCount } from 'types/contentcount';

@Component({
  selector: 'content-count-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-count-widget.component.html'
})

export class ContentCountWidgetComponent {

  @Input() contentCount: ContentCount;

}
