import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ToolService } from 'services/tool.service';

@Component({
  selector: 'serverdown-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<modal *ngIf="id" id="{{id}}" escapeEnabled="false" bodyClass="serverdown-body">

    <div style="display: inline-block; line-height: 4em;">
      <span class="fa fa-exclamation-triangle fa-4x" style="color: yellow; margin-right: .25em; vertical-align: bottom;"></span>
      <span style="vertical-align: center;">I'm afraid the server has become unreachable.  Kindly address the problem and this message will disappear.</span>
    </div>

</modal>
`
})

export class ServerDownModalComponent {

  constructor( private toolService: ToolService ) {}

  public id = this.toolService.serverDownModalId; // = 'serverdown-modal'

}
