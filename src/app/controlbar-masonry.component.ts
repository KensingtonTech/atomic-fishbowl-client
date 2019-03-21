import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'control-bar-masonry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="noselect" style="position: absolute; top: 20px; left: 10px; padding: 5px; background-color: rgba(0,0,0,0.8); font-size: 12px; border-radius:10px; z-index: 100;">

  <!-- change view icon -->
  <div style="position: absolute; left: 0;"><router-dropdown (isOpen)="onRouterDropdownOpen($event)"></router-dropdown></div>

  <ng-container *ngIf="!routerDropdownOpen">

    <!-- full screen button -->
    <div style="position: absolute; left: 40px;" toggleFullscreen class="icon fa fa-desktop fa-2x fa-fw"></div>

    <!-- autoscroller start button -->
    <div *ngIf="!scrollStarted" style="position: absolute; left: 0; top: 40px;" class="icon fa fa-level-down fa-2x fa-fw" (click)="scrollToBottom()" pTooltip="Start autoscroller"></div>

    <!-- autoscroller stop button -->
    <div *ngIf="scrollStarted" style="position: absolute; left: 0; top: 40px;" class="icon fa fa-stop fa-2x fa-fw" (click)="stopScrollToBottom()" pTooltip="Stop autoscroller"></div>

    <!-- show meta -->
    <div *ngIf="showMeta" style="position: absolute; left: 40px; top: 40px;" class="icon fa fa-comment fa-2x fa-fw" (click)="hideMetaFunction()" pTooltip="Hide Meta"></div>

    <!-- hide meta -->
    <div *ngIf="!showMeta" style="position: absolute; left: 40px; top: 40px;" class="icon fa fa-comment-o fa-2x fa-fw" (click)="showMetaFunction()" pTooltip="Show Meta"></div>

  </ng-container>

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
              private changeDetectionRef: ChangeDetectorRef,
              private zone: NgZone) {}

  public scrollStarted = false;
  public showMeta = true;
  public routerDropdownOpen = false;

  private scrollToBottomStoppedSubscription: Subscription;

  ngOnInit(): void {
    log.debug('MasonryControlBarComponent: OnInit');

    this.scrollToBottomStoppedSubscription = this.toolService.scrollToBottomStopped.subscribe( () => {
      log.debug('MasonryControlBarComponent: scrollToBottomStoppedSubscription: scrollToBottomStopped');
      this.scrollStarted = false;
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    });

    this.showMeta = this.toolService.showMasonryTextAreaState;
  }



  ngOnDestroy(): void {
    this.scrollToBottomStoppedSubscription.unsubscribe();
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
    this.zone.runOutsideAngular( () => setTimeout( () => { this.toolService.refreshMasonryLayout.next(); }, 10) );
  }



  hideMetaFunction(): void {
    this.showMeta = false;
    this.toolService.showMasonryTextArea.next(false);
    this.zone.runOutsideAngular( () => setTimeout( () => { this.toolService.refreshMasonryLayout.next(); }, 10) );
  }



  onRouterDropdownOpen(open: boolean): void {
    if (open === this.routerDropdownOpen) {
      return;
    }
    log.debug('MasonryControlBarComponent: open:', open);
    this.routerDropdownOpen = open;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }

}
