import { Component, OnInit, ElementRef, ViewChild, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'serverdown-modal',
//<div class="modal-body imgContainer" style="position: absolute; top: 60px; left: 100px; right: 100px; height: 85%; background-color: rgba(128, 128, 128, .95); font-size: 10pt;">
  template: `
<modal *ngIf="id" id="{{id}}" escapeEnabled="false">
  <div class="modal">
    <div class="modal-body splash-body" style="position: relative; width: 800px; text-align: center;">
      <div style="position: relative; display: inline-block; text-align: left; vertical-align: middle;">
        <span class="fa fa-exclamation-triangle fa-4x" style="float: left; color: yellow;">&nbsp;</span><span style="color: white; font-size: 22pt;">I'm afraid the server has become unreachable.  Kindly sort out the problem and this message will disappear.</span>
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

  @Input() public id: string;// = 'serverdown-modal'

  ngOnInit(): void {
    console.log("ServerDownModalComponent: ngOnInit()");
    //console.log("modalService:", this.modalService);
  }

}
