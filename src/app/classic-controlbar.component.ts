import { Component, ChangeDetectionStrategy, OnInit, Input } from '@angular/core';
import { PanZoomApiService } from './panzoom/panzoom-api.service';
declare var log: any;

@Component({
  selector: 'classic-control-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

export class ClassicControlBarComponent implements OnInit {

  constructor(private panZoomApiService: PanZoomApiService ) {}

  @Input() canvasWidth: number;
  @Input() initialZoomHeight: number;
  private panZoomAPI: any;

  ngOnInit(): void {
    log.debug('ClassicControlBarComponent: OnInit');
    this.panZoomApiService.getAPI('abc').then( (v: any) => { this.panZoomAPI = v; });
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
    this.panZoomAPI.zoomToFit( {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight } );
  }

}
