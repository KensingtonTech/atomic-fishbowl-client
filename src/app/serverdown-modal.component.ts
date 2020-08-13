import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ToolService } from 'services/tool.service';

@Component({
  selector: 'serverdown-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './serverdown-modal.component.html'
})

export class ServerDownModalComponent {

  constructor( private toolService: ToolService ) {}

  id = this.toolService.serverDownModalId; // = 'serverdown-modal'

}
