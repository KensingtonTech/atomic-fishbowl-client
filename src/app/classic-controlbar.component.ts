import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, Input } from '@angular/core';
import { ClassicGridComponent } from './classic-grid.component';
import { Subscription } from 'rxjs/Subscription';
declare var log: any;

@Component({
  selector: 'classic-control-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // pTooltip="View selector"
  template: `
<div class="noselect" style="position: absolute; top: 20px; left: 10px; padding: 5px; background-color: rgba(0,0,0,0.8); font-size: 12px; border-radius:10px;">
    <div style="position: absolute; left: 0;"><router-dropdown></router-dropdown></div>
    <div style="position: absolute; left: 40px;" toggleFullscreen class="icon fa fa-desktop fa-2x fa-fw"></div>
    <div style="position: absolute; left: 80px;" (click)="zoomToFit()" class="icon fa fa-home fa-2x fa-fw"></div>
    <div style="position: absolute; left: 120px;" (click)="zoomOut()" class="icon fa fa-search-minus fa-2x fa-fw"></div>
    <div style="position: absolute; left: 160px;" (click)="zoomIn()" class="icon fa fa-search-plus fa-2x fa-fw"></div>
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

  constructor() {}

  @Input() initialZoomWidth: number;
  @Input() initialZoomHeight: number;
  @Input() panzoomConfig: any;
  private panZoomAPI: any;
  private newApiSubscription: Subscription;

  ngOnInit(): void {
    log.debug('ClassicControlBarComponent: OnInit');
    this.newApiSubscription = this.panzoomConfig.newApi.subscribe( (api: any) => {
      log.debug('ClassicControlBarComponent: newApiSubscription: Got new API');
      this.panZoomAPI = api;
    });
  }

  ngOnDestroy(): void {
    this.newApiSubscription.unsubscribe();
  }

  zoomIn(): void {
    // log.debug("zoomIn");
    this.panZoomAPI.zoomIn();
  }

  zoomOut(): void {
    // log.debug("zoomOut");
    this.panZoomAPI.zoomOut();
  }

  zoomToFit(): void {
    // log.debug('this.initialZoomWidth:', this.initialZoomWidth);
    this.panZoomAPI.zoomToFit( {x: 0, y: 0, width: this.initialZoomWidth, height: this.initialZoomHeight } );
  }

}
