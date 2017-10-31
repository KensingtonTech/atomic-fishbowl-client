import { Component, OnInit, ElementRef, ViewChild, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
declare var log: any;

@Component({
  selector: 'serverdown-modal',
  template: `
<modal *ngIf="id" id="{{id}}" escapeEnabled="false">
  <div class="modal">
    <div class="modal-body splash-body" style="position: relative; width: 800px; text-align: center;">
      <div style="position: relative; display: inline-block; text-align: left; vertical-align: middle;">
        <span class="fa fa-exclamation-triangle fa-4x" style="float: left; color: yellow;">&nbsp;</span><span style="color: white; font-size: 22pt;">I'm afraid the server has become unreachable.  Kindly address the problem and this message will disappear.</span>
      </div>
    </div>
  </div>
</modal>
  `,

  styles: [`
.splash-body {
  background-color: black !important;
  position: relative;
  top: 50% !important;
  -webkit-transform: translateY(-50%);
  -moz-transform: translateY(-50%);
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
}
  `]

})

export class ServerDownModalComponent implements OnInit {

  @Input() public id: string; // = 'serverdown-modal'

  ngOnInit(): void {
    log.debug('ServerDownModalComponent: ngOnInit()');
    // log.debug("modalService:", this.modalService);
  }

}
