import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  Input,
  ChangeDetectorRef,
  Output,
  EventEmitter
} from '@angular/core';
import { Subscription } from 'rxjs';
import { PanZoomAPI } from 'ngx-panzoom';
import * as log from 'loglevel';
import { PanZoomConfig } from 'ngx-panzoom';

@Component({
  selector: 'app-control-bar-classic',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './controlbar-classic.component.html',
  styleUrls: [
    './controlbar-classic.component.scss'
  ]
})

export class ClassicControlBarComponent implements OnInit, OnDestroy {

  constructor(private changeDetectionRef: ChangeDetectorRef) {}

  @Input() initialZoomWidth: number;
  @Input() initialZoomHeight: number;
  @Input() panzoomConfig: PanZoomConfig;

  // Monitoring Collections
  @Input() isMonitoringCollection = false;
  @Input() pauseMonitoring = false;
  @Output() suspendMonitoringClicked = new EventEmitter<void>();
  @Output() resumeMonitoringClicked = new EventEmitter<void>();

  private panZoomAPI: PanZoomAPI;
  routerDropdownOpen = false;
  private subscriptions = new Subscription();

  ngOnInit(): void {
    log.debug('ClassicControlBarComponent: OnInit');
    this.subscriptions.add(
      this.panzoomConfig.api.subscribe(
        (api) => {
          log.debug('ClassicControlBarComponent: newApiSubscription: Got new API');
          this.panZoomAPI = api;
        }
      )
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  zoomIn(): void {
    // log.debug("ClassicControlBarComponent: zoomIn");
    this.panZoomAPI.zoomIn();
  }

  zoomOut(): void {
    // log.debug("ClassicControlBarComponent: zoomOut");
    this.panZoomAPI.zoomOut();
  }

  zoomToFit(): void {
    // log.debug('ClassicControlBarComponent: zoomToFit(): this.initialZoomWidth:', this.initialZoomWidth);
    this.panZoomAPI.resetView();
  }

  onRouterDropdownOpen(open: boolean): void {
    if (open === this.routerDropdownOpen) {
      return;
    }
    log.debug('ClassicControlBarComponent: open:', open);
    this.routerDropdownOpen = open;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }

}
