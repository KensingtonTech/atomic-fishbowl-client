import { Component, ChangeDetectorRef, OnInit, OnDestroy, Input } from '@angular/core';
import { ToolService } from './tool.service';
import 'rxjs/add/operator/takeWhile';
declare var log: any;

@Component({
  selector: 'masonry-control-bar',
  template: `
<div class="noselect" style="position: absolute; top: 20px; left: 10px; padding: 5px; background-color: rgba(0,0,0,0.8); font-size: 12px; border-radius:10px; z-index: 100;">
  <div style="position: absolute; left: 0;" pTooltip="View selector"><router-dropdown></router-dropdown></div>
  <div style="position: absolute; left: 40px;" toggleFullscreen class="icon fa fa-desktop fa-2x fa-fw"></div>
  <div *ngIf="!scrollStarted" style="position: absolute; left: 0; top: 40px;" class="icon fa fa-level-down fa-2x fa-fw" (click)="scrollToBottom()" pTooltip="Autoscroller"></div>
  <div *ngIf="scrollStarted" style="position: absolute; left: 0; top: 40px;" class="icon fa fa-stop fa-2x fa-fw" (click)="stopScrollToBottom()"></div>
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

export class MasonryControlBarComponent implements OnInit, OnDestroy {

  constructor(private toolService: ToolService,
              private changeDetectionRef: ChangeDetectorRef) {}

  private alive = true;
  public scrollStarted = false;

  ngOnInit(): void {

    /*this.toolService.scrollToBottomRunning.takeWhile(() => this.alive).subscribe( () => {
      log.debug('MasonryControlBarComponent: scrollToBottomRunningSubscription: scrollToBottomRunning');
      this.scrollStarted = true;
      this.changeDetectionRef.markForCheck();
    });*/
    this.toolService.scrollToBottomStopped.takeWhile(() => this.alive).subscribe( () => {
      log.debug('MasonryControlBarComponent: scrollToBottomStoppedSubscription: scrollToBottomStopped');
      this.scrollStarted = false;
      this.changeDetectionRef.markForCheck();
    });
  }

  public ngOnDestroy() {
    this.alive = false;
  }

  scrollToBottom(): void {
    this.scrollStarted = true;
    this.toolService.scrollToBottom.next();
  }

  stopScrollToBottom(): void {
    this.scrollStarted = false;
    this.toolService.stopScrollToBottom.next();
  }

}
