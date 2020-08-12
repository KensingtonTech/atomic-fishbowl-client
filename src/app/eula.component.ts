import { Component } from '@angular/core';
import { ToolService } from 'services/tool.service';
import { EulaHtml } from './eula';

@Component({
  selector: 'eula',
  templateUrl: './eula.component.html'
})

export class EulaComponent {

  constructor(private toolService: ToolService) {}

  eula = EulaHtml;

  onAccept(): void {
    this.toolService.setPreference('eulaAccepted', true);
    this.toolService.eulaAccepted.next();
  }

}
