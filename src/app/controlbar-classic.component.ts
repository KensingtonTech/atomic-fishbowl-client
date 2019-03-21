import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { PanZoomAPI } from 'ng2-panzoom';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'control-bar-classic',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="noselect" style="position: absolute; top: 20px; left: 10px; background-color: rgba(0,0,0,0.8); font-size: 12px; border-radius:10px;">

  <div style="position: absolute; left: 0;"><router-dropdown (isOpen)="onRouterDropdownOpen($event)"></router-dropdown></div>

  <div *ngIf="!routerDropdownOpen" style="position: absolute; left: 40px;" toggleFullscreen class="icon fa fa-desktop fa-2x fa-fw"></div>

  <div *ngIf="!routerDropdownOpen" style="position: absolute; left: 80px;" (click)="zoomToFit()" class="icon fa fa-home fa-2x fa-fw"></div>

  <div *ngIf="!routerDropdownOpen" style="position: absolute; left: 120px;" (click)="zoomOut()" class="icon fa fa-search-minus fa-2x fa-fw"></div>

  <div *ngIf="!routerDropdownOpen" style="position: absolute; left: 160px;" (click)="zoomIn()" class="icon fa fa-search-plus fa-2x fa-fw"></div>

</div>
`,
  styles: [`
    .icon {
      background-color: rgb(75,173,243);
      color: white;
      border-radius: 10px;
      padding: 3px;
    }

  `]
})

export class ClassicControlBarComponent implements OnInit, OnDestroy {

  constructor(private changeDetectionRef: ChangeDetectorRef) {}

  @Input() initialZoomWidth: number;
  @Input() initialZoomHeight: number;
  @Input() panzoomConfig: any;
  private panZoomAPI: PanZoomAPI;
  private apiSubscription: Subscription;
  public routerDropdownOpen = false;

  ngOnInit(): void {
    log.debug('ClassicControlBarComponent: OnInit');
    this.apiSubscription = this.panzoomConfig.api.subscribe( (api: any) => {
      log.debug('ClassicControlBarComponent: newApiSubscription: Got new API');
      this.panZoomAPI = api;
    });
  }

  ngOnDestroy(): void {
    this.apiSubscription.unsubscribe();
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