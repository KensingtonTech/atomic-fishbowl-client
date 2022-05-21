import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { DataService } from 'services/data.service';
import { buildProperties } from '../build-properties';
import { Subscription } from 'rxjs';
import * as log from 'loglevel';

@Component({
  selector: 'app-splash-screen-modal',
  templateUrl: './splashscreen-modal.component.html',
  styleUrls: [
    './splashscreen-modal.component.scss'
  ]
})

export class SplashScreenModalComponent implements OnInit, OnDestroy {

  constructor(
    private dataService: DataService,
    private changeDetectionRef: ChangeDetectorRef,
  ) {}

  @Input() firstLoad = false;
  @Input() displaySplashScreenModal = false;
  @Output() displaySplashScreenModalChange = new EventEmitter<boolean>();

  version: string;
  serverVersion: string;

  private subscriptions = new Subscription();


  ngOnInit(): void {
    log.debug('SplashScreenModalComponent: ngOnInit()');

    this.version = `${buildProperties.major}.${buildProperties.minor}.${buildProperties.patch}-${buildProperties.level} Build ${buildProperties.build}`;

    this.subscriptions.add(
      this.dataService.serverVersionChanged.subscribe(
        version => this.onServerVersionChanged(version)
      )
    );
  }



  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }



  onServerVersionChanged(version: string) {
    if (!version) {
      return;
    }
    this.serverVersion = version;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }


  closeModal(): void {
    this.displaySplashScreenModalChange.next(false);
  }
}
