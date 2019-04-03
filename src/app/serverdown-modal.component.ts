import { Component, OnInit, Input } from '@angular/core';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'serverdown-modal',
  template: `
<modal *ngIf="id" id="{{id}}" escapeEnabled="false" bodyStyle="position: relative; width: 800px; text-align: center;" bodyClass="splash-body">

    <div style="position: relative; display: inline-block; text-align: left; vertical-align: middle;">
      <span class="fa fa-exclamation-triangle fa-4x" style="float: left; color: yellow;">&nbsp;</span><span style="color: white;">I'm afraid the server has become unreachable.  Kindly address the problem and this message will disappear.</span>
    </div>

</modal>
  `,

  styles: [` `]

})

export class ServerDownModalComponent implements OnInit {

  @Input() public id: string; // = 'serverdown-modal'

  ngOnInit(): void {
    log.debug('ServerDownModalComponent: ngOnInit()');
    // log.debug("modalService:", this.modalService);
  }

}
