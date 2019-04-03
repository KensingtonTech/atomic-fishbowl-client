import { Component, OnInit, Renderer2, ElementRef } from '@angular/core';
import { ToolService } from 'services/tool.service';
import { Logger } from 'loglevel';
import { EulaHtml } from './eula';
declare var log: Logger;

@Component({
  selector: 'eula',
  template: `
<div style="text-align: center; margin-bottom: 50px;">
  <h1>Atomic Fishbowl</h1>
  <h2>End User License Agreement</h2>

  <div [innerHTML]="eula" style="text-align: left;">

  </div>
  <p-button type="button" (onClick)="onAccept()" label="I Agree"></p-button>
</div>
  `,
  styles: [``]
})

export class EulaComponent implements OnInit {

  constructor(private toolService: ToolService,
              private renderer: Renderer2,
              private elRef: ElementRef ) {}

  public eula = EulaHtml;

  ngOnInit() {
    this.renderer.setStyle(this.elRef.nativeElement.ownerDocument.body, 'background-color', 'white');
  }

  onAccept(): void {
    this.toolService.setPreference('eulaAccepted', true);
    this.toolService.eulaAccepted.next();
  }

}
