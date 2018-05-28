import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, Input } from '@angular/core';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs';
declare var log;

@Component({
  selector: 'masonry-control-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // pToolpTooltip="View selector"
  template: `
<div class="noselect" style="position: absolute; top: 20px; left: 10px; padding: 5px; background-color: rgba(0,0,0,0.8); font-size: 12px; border-radius:10px; z-index: 100;">
  <div style="position: absolute; left: 0;"><router-dropdown (isOpen)="onRouterDropdownOpen($event)"></router-dropdown></div>
  <div *ngIf="!routerDropdownOpen" style="position: absolute; left: 40px;" toggleFullscreen class="icon fa fa-desktop fa-2x fa-fw"></div>
  <div *ngIf="!scrollStarted && !routerDropdownOpen" style="position: absolute; left: 0; top: 40px;" class="icon fa fa-level-down fa-2x fa-fw" (click)="scrollToBottom()" pTooltip="Start autoscroller"></div>
  <div *ngIf="scrollStarted && !routerDropdownOpen" style="position: absolute; left: 0; top: 40px;" class="icon fa fa-stop fa-2x fa-fw" (click)="stopScrollToBottom()" pTooltip="Stop autoscroller"></div>
  <div *ngIf="showMeta && !routerDropdownOpen" style="position: absolute; left: 40px; top: 40px;" class="icon fa fa-comment fa-2x fa-fw" (click)="hideMetaFunction()" pTooltip="Hide Meta"></div>
  <div *ngIf="!showMeta && !routerDropdownOpen" style="position: absolute; left: 40px; top: 40px;" class="icon fa fa-comment-o fa-2x fa-fw" (click)="showMetaFunction()" pTooltip="Show Meta"></div>
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
  private scrollToBottomStoppedSubscription: Subscription;
  public showMeta = true;
  // private scrollToBottomRunningSubscription: Subscription;
  private routerDropdownOpen = false;

  ngOnInit(): void {
    log.debug('MasonryControlBarComponent: OnInit');

    /*this.scrollToBottomRunningSubscription = this.toolService.scrollToBottomRunning.subscribe( () => {
      log.debug('MasonryControlBarComponent: scrollToBottomRunningSubscription: scrollToBottomRunning');
      this.scrollStarted = true;
      this.changeDetectionRef.markForCheck();
    });*/
    this.scrollToBottomStoppedSubscription = this.toolService.scrollToBottomStopped.subscribe( () => {
      log.debug('MasonryControlBarComponent: scrollToBottomStoppedSubscription: scrollToBottomStopped');
      // setTimeout( () => this.scrollStarted = false, 0);
      this.scrollStarted = false;
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
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



  onRouterDropdownOpen(open: boolean): void {
    log.debug('MasonryControlBarComponent: open:', open);
    this.changeDetectionRef.detectChanges();
    this.routerDropdownOpen = open;
  }

}
