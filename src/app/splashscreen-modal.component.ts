import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { ModalService } from './modal/modal.service';
import { buildProperties } from './build-properties';
import { Subscription } from 'rxjs';
import * as log from 'loglevel';

@Component({
  selector: 'splash-screen-modal',
  templateUrl: './splashscreen-modal.component.html'
})

export class SplashScreenModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private dataService: DataService,
              private toolService: ToolService,
              private changeDetectionRef: ChangeDetectorRef,
              private zone: NgZone ) {}

  id = this.toolService.splashScreenModalId;
  version: string;
  serverVersion: string;
  private closeTimeout: any;
  firstLoad = this.toolService.firstLoad;

  private subscriptions = new Subscription;


  ngOnInit(): void {
    log.debug('SplashScreenModalComponent: ngOnInit()');

    this.version = `${buildProperties.major}.${buildProperties.minor}.${buildProperties.patch}-${buildProperties.level} Build ${buildProperties.build}`;

    this.subscriptions.add(this.dataService.serverVersionChanged.subscribe( version => this.onServerVersionChanged(version) ));

  }



  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }



  onServerVersionChanged(version) {
    if (!version) {
      return;
    }
    this.serverVersion = version;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onOpen(): void {
    log.debug('SplashScreenModalComponent: onOpen(): toolService.splashLoaded:', this.toolService.splashLoaded);
    this.changeDetectionRef.markForCheck();
    if (!this.toolService.splashLoaded) {
      // if the splash screen loaded on first login
      this.toolService.splashLoaded = true;
      this.closeTimeout = this.zone.runOutsideAngular( () => setTimeout( () => {
        // if this is the splash on first login, close after three seconds
        this.toolService.onSplashScreenAtStartupClosed.next();
        this.modalService.close(this.id);
        this.zone.runOutsideAngular( () => setTimeout( () => {
          // this will display the close button after first display
          this.firstLoad = false;
          this.toolService.firstLoad = false;
          this.changeDetectionRef.markForCheck();
        }, 250) ); // this is necessary due to some timing issues on first displaying the component.  the component gets initialized before it gets displayed.  We keep firstLoad separate from splashLoaded so that other components can detect the state right away
      }, 3000) );
    }
  }



  onClose(): void {
    if (!this.toolService.splashLoaded) {
      clearTimeout(this.closeTimeout);
      this.toolService.splashLoaded = true;
      // we only trigger this if closing automatically.  If cancelling, we don't want anything else to happen
    }
  }



  closeModal(): void {
    this.modalService.close(this.id);
  }


}
