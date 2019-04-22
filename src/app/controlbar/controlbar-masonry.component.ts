import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ToolService } from 'services/tool.service';
import { Subscription } from 'rxjs';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'control-bar-masonry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="noselect">

  <!-- change route icon -->
  <div>
    <router-dropdown (isOpen)="onRouterDropdownOpen($event)"></router-dropdown>

    <!-- full screen button -->
    <span *ngIf="!routerDropdownOpen" toggleFullscreen class="icon fa fa-desktop fa-2x fa-fw"></span>

  </div>


  <div *ngIf="!routerDropdownOpen" style="margin-top: .4em;">

    <!-- autoscroller start button -->
    <span *ngIf="!scrollStarted" class="icon fa fa-level-down fa-2x fa-fw" (click)="scrollToBottom()" pTooltip="Start autoscroller"></span>

    <!-- autoscroller stop button -->
    <span *ngIf="scrollStarted" class="icon fa fa-stop fa-2x fa-fw" (click)="stopScrollToBottom()" pTooltip="Stop autoscroller"></span>

    <!-- show meta -->
    <span *ngIf="showMeta" class="icon fa fa-comment fa-2x fa-fw" (click)="hideMetaFunction()" pTooltip="Hide Meta"></span>

    <!-- hide meta -->
    <span *ngIf="!showMeta" class="icon fa fa-comment-o fa-2x fa-fw" (click)="showMetaFunction()" pTooltip="Show Meta"></span>

  </div>


</div>
`,
  styles: []
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