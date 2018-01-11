import { Component, OnInit } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
import { buildProperties } from './build-properties';
import * as log from 'loglevel';

@Component({
  selector: 'splash-screen-modal',
  template: `
<modal id="{{id}}" (opened)="onOpen()">
  <div class="modal">
    <div class="modal-body splash-body" style="position: relative; width: 400px; background-color: rgba(0,0,0,.9); color: white; font-family: 'Gill Sans', 'Lucida Grande','Lucida Sans Unicode', Arial, Helvetica, sans-serif;">
      <h1 align="left" style="margin-bottom: 0px;">Atomic Fishbowl</h1>
      <span>Client Version {{version}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span *ngIf="serverVersion">Server Version {{serverVersion}}</span>
      <p align="center">
        <img src="resources/logo-medium.png" style="width: 450px; height: auto;">
      </p>
      <p style="font-size: 9pt;">Copyright &copy; 2017 Kensington Technology Associates<br>
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

export class SplashScreenModalComponent implements OnInit {

  constructor(private modalService: ModalService,
              private dataService: DataService ) {}

  public id = 'splashScreenModal';
  public firstOpen = true;
  public version: string;
  public serverVersion: string;

  ngOnInit(): void {
    log.debug('SplashScreenModalComponent: ngOnInit()');
    this.version = `${buildProperties.major}.${buildProperties.minor}.${buildProperties.patch}.${buildProperties.build}-${buildProperties.level}`;
    this.dataService.getServerVersion()
                    .then( (ver: string) => this.serverVersion = ver);
  }

  onOpen(): void {
    // log.debug("SplashScreenModalComponent: onOpen()");
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
