import { Component, ChangeDetectorRef, OnInit, OnDestroy, Input } from '@angular/core';
import { ToolService } from './tool.service';
declare var log: any;

@Component({
  selector: 'masonry-control-bar',
  // pToolpTooltip="View selector"
  template: `
<div class="noselect" style="position: absolute; top: 20px; left: 10px; padding: 5px; background-color: rgba(0,0,0,0.8); font-size: 12px; border-radius:10px; z-index: 100;">
  <div style="position: absolute; left: 0;"><router-dropdown></router-dropdown></div>
  <div style="position: absolute; left: 40px;" toggleFullscreen class="icon fa fa-desktop fa-2x fa-fw"></div>
  <div *ngIf="!scrollStarted" style="position: absolute; left: 0; top: 40px;" class="icon fa fa-level-down fa-2x fa-fw" (click)="scrollToBottom()" pTooltip="Start autoscroller"></div>
  <div *ngIf="scrollStarted" style="position: absolute; left: 0; top: 40px;" class="icon fa fa-stop fa-2x fa-fw" (click)="stopScrollToBottom()" pTooltip="Stop autoscroller"></div>
  <div *ngIf="showMeta" style="position: absolute; left: 40px; top: 40px;" class="icon fa fa-comment fa-2x fa-fw" (click)="hideMetaFunction()" pTooltip="Hide Meta"></div>
  <div *ngIf="!showMeta" style="position: absolute; left: 40px; top: 40px;" class="icon fa fa-comment-o fa-2x fa-fw" (click)="showMetaFunction()" pTooltip="Show Meta"></div>
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

  public scrollStarted = false;
  private scrollToBottomStoppedSubscription: any;
  public showMeta = true;
  // private scrollToBottomRunningSubscription: any;

  ngOnInit(): void {

    /*this.scrollToBottomRunningSubscription = this.toolService.scrollToBottomRunning.subscribe( () => {
      log.debug('MasonryControlBarComponent: scrollToBottomRunningSubscription: scrollToBottomRunning');
      this.scrollStarted = true;
      this.changeDetectionRef.markForCheck();
    });*/
    this.scrollToBottomStoppedSubscription = this.toolService.scrollToBottomStopped.subscribe( () => {
      log.debug('MasonryControlBarComponent: scrollToBottomStoppedSubscription: scrollToBottomStopped');
      this.scrollStarted = false;
      this.changeDetectionRef.markForCheck();
    });

    this.showMeta = this.toolService.showMasonryTextAreaState;
  }

  ngOnDestroy(): void {
    this.scrollToBottomStoppedSubscription.unsubscribe();
    // this.scrollToBottomRunningSubscription.unsubscribe();
  }

  scrollToBottom(): void {
    this.scrollStarted = true;
    this.toolService.scrollToBottom.next();
  }

  stopScrollToBottom(): void {
    this.scrollStarted = false;
    this.toolService.stopScrollToBottom.next();
  }

  showMetaFunction(): void {
    this.showMeta = true;
    this.toolService.showMasonryTextArea.next(true);
    setTimeout( () => { this.toolService.refreshMasonryLayout.next(); }, 10);
  }

  hideMetaFunction(): void {
    this.showMeta = false;
    this.toolService.showMasonryTextArea.next(false);
    setTimeout( () => { this.toolService.refreshMasonryLayout.next(); }, 10);
  }

}
