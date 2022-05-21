import {
  Component,
  ChangeDetectionStrategy,
  Input
} from '@angular/core';
import { ContentCount } from 'types/contentcount';

@Component({
  selector: 'app-content-count-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-count-widget.component.html',
  styleUrls: [
    './content-count-widget.component.scss'
  ]
})

export class ContentCountWidgetComponent {

  @Input() contentCount: ContentCount;

}
