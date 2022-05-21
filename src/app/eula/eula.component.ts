import { Component } from '@angular/core';
import { ToolService } from 'services/tool.service';
import { EulaHtml } from '../eula';

@Component({
  selector: 'app-eula',
  templateUrl: './eula.component.html',
  styleUrls: [
    './eula.component.scss'
  ]
})

export class EulaComponent {

  constructor(private toolService: ToolService) {}

  eula = EulaHtml;

  onAccept(): void {
    this.toolService.setPreference('eulaAccepted', true);
    this.toolService.eulaAccepted.next();
  }

}
