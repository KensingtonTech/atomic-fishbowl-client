import { Component, ChangeDetectionStrategy, OnInit, Input } from '@angular/core';
import { PanZoomApiService } from './panzoom/panzoom-api.service';
import { LoggerService } from './logger-service';

@Component({
  selector: 'grid-control-bar',
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
    .noselect {
      -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
      -khtml-user-select: none; /* Konqueror HTML */
      -moz-user-select: none; /* Firefox */
      -ms-user-select: none; /* Internet Explorer/Edge */
      user-select: none; /* Non-prefixed version, currently supported by Chrome and Opera */
    }
  `]
})

export class GridControlBarComponent implements OnInit {
  //private panzoomConfig: PanZoomConfigService
  constructor(private panZoomApiService: PanZoomApiService,
              private loggerService: LoggerService ) {}

  private panZoomAPI: any;
  //private canvasWidth = 2400;
  //private initialZoomHeight = 1080;
  @Input('canvasWidth') canvasWidth: number;
  @Input('initialZoomHeight') initialZoomHeight: number;

  ngOnInit(): void {
    console.log("ControlBarComponent: OnInit")
    this.panZoomApiService.getAPI('abc').then( (v: any) => {this.panZoomAPI = v;});
    //console.log("deferred:",this.panZoomAPI);
  }

  zoomIn(): void {
    //console.log("zoomIn");
    this.panZoomAPI.zoomIn();
  }

  zoomOut(): void {
    //console.log("zoomOut");
    this.panZoomAPI.zoomOut();
  }

  zoomToFit(): void {
    this.panZoomAPI.zoomToFit( {x: 0, y: 0, width: this.canvasWidth, height: this.initialZoomHeight } );
    //this.panZoomAPI.zoomToFit( this.panzoomConfig.initialZoomToFit );
  }

}
