import { Component, OnInit } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
import { buildProperties } from './build-properties';
import { ToolService } from './tool.service';
import * as log from 'loglevel';

@Component({
  selector: 'splash-screen-modal',
  template: `
<modal id="{{id}}" (opened)="onOpen()" (cancelled)="onCancelled()">
  <div class="modal">
    <div class="modal-body splash-body" style="position: relative; width: 400px; background-color: rgba(0,0,0,.9); color: white; font-family: 'Gill Sans', 'Lucida Grande','Lucida Sans Unicode', Arial, Helvetica, sans-serif;">
      <h1 align="left" style="margin-bottom: 0px;">Atomic Fishbowl</h1>
      <span>Client Version {{version}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span *ngIf="serverVersion">Server Version {{serverVersion}}</span>
      <p align="center">
        <img src="resources/logo-medium.png" style="width: 450px; height: auto;">
      </p>
      <p style="font-size: 9pt;">Copyright &copy; 2018 Kensington Technology Associates<br>
      All Rights Reserved</p>
      <div *ngIf="!firstLoad" (click)="closeModal()" style="position: absolute; top: 2px; right: 5px; z-index: 100; color: white;" class="fa fa-times-circle-o fa-2x"></div>
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
              private dataService: DataService,
              private toolService: ToolService ) {}

  public id = 'splashScreenModal';
  public version: string;
  public serverVersion: string;
  private closeTimeout: any;
  public firstLoad = true;


  ngOnInit(): void {
    log.debug('SplashScreenModalComponent: ngOnInit()');
    this.version = `${buildProperties.major}.${buildProperties.minor}.${buildProperties.patch}.${buildProperties.build}-${buildProperties.level}`;
    this.dataService.getServerVersion()
                    .then( (ver: string) => this.serverVersion = ver);
  }



  onOpen(): void {
    log.debug("SplashScreenModalComponent: onOpen(): toolService.splashLoaded:", this.toolService.splashLoaded);
    if (!this.toolService.splashLoaded) {
      this.toolService.splashLoaded = true;
      this.closeTimeout = setTimeout( () => {
        this.toolService.onSplashScreenAtStartupClosed.next();
        this.modalService.close(this.id);
        setTimeout( () => {
          this.firstLoad = false;
        }, 250); // this is necessary due to some timing issues on first displaying the component.  the component gets initialized before it gets displayed.  We keep firstLoad separate from splashLoaded so that other components can detect the state right away
      }, 3000);
    }
  }



  onCancelled(): void {
    if (!this.toolService.splashLoaded) {
      clearTimeout(this.closeTimeout);
      this.toolService.splashLoaded = true;
      // we only trigger this if closing automatically.  If cancelling, we don't want anything else to happen
      // this.toolService.onSplashScreenAtStartupClosed.next();
    }
  }
  


  closeModal(): void {
    this.modalService.close(this.id);
  }


}
