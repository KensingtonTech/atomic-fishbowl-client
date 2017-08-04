import { Component } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { appVersion } from './version';
import { LoggerService } from './logger-service';

@Component({
  selector: 'splash-screen-modal',
  //encapsulation: ViewEncapsulation.None,

  template: `
<modal id="{{id}}" (opened)="onOpen()">
  <div class="modal">
    <div class="modal-body splash-body" style="position: relative; width: 400px; background-color: rgba(0,0,0,.9); color: white; font-family: 'Gill Sans', 'Lucida Grande','Lucida Sans Unicode', Arial, Helvetica, sans-serif;">
      <h1 align="left" style="margin-bottom: 0px;">221B Beta</h1>
      <span>Version {{version}}</span>
      <p align="center"><img src="resources/221B_logo.png" style="width: 350px; height: auto;"><img style="float: left; width: 75px; height: auto;" src="resources/logo-medium.png"></p>
      <p align="right" style="font-size: 9pt;">Copyright &copy; 2017 Kensington Technology Associates<br>
      All Rights Reserved</p>
      <div *ngIf="!firstOpen" (click)="closeModal()" style="position: absolute; top: 2px; right: 5px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>
    </div>
  </div>
</modal>
`,

  styles: [`

  .splash-body {
    position: relative;
    top: 50% !important;
    -webkit-transform: translateY(-50%);
    -moz-transform: translateY(-50%);
    -ms-transform: translateY(-50%);
    transform: translateY(-50%);
  }

  `]

})

export class SplashScreenModal {

  constructor(private modalService: ModalService,
              private loggerService: LoggerService ) {}

  public id: string = 'splashScreenModal';
  public firstOpen = true;
  public version = appVersion;

  onOpen(): void {
    //console.log("SplashScreenModal: onOpen()");
    if (this.firstOpen) {
      setTimeout( () => {
        this.modalService.close(this.id);
        setTimeout( () => this.firstOpen = false, 1000);
      }, 3000);
    }
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

}
