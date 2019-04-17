import { Component } from '@angular/core';
import { ToolService } from 'services/tool.service';
import { EulaHtml } from './eula';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'eula',
  template: `
<div style="position: relative; height: 100%; width: 100%; overflow: auto; text-align: center; margin-bottom: 2.5em; background-color: white;">
  <h1>Atomic Fishbowl</h1>
  <h2>End User License Agreement</h2>

  <div [innerHTML]="eula" style="text-align: left;">

  </div>
  <p-button type="button" (onClick)="onAccept()" label="I Agree"></p-button>
</div>
  `,
  styles: [``]
})

export class EulaComponent {

  constructor(private toolService: ToolService) {}

  public eula = EulaHtml;

  onAccept(): void {
    this.toolService.setPreference('eulaAccepted', true);
    this.toolService.eulaAccepted.next();
  }

}
