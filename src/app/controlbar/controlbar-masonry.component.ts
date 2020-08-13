import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { ToolService } from 'services/tool.service';
import { Subscription } from 'rxjs';
import * as log from 'loglevel';

@Component({
  selector: 'control-bar-masonry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './controlbar-masonry.component.html'
})

export class MasonryControlBarComponent implements OnInit, OnDestroy {

  constructor(private toolService: ToolService,
              private changeDetectionRef: ChangeDetectorRef) {}

  scrollStarted = false;
  showMeta = true;
  routerDropdownOpen = false;

  private subscriptions = new Subscription;

  ngOnInit(): void {
    log.debug('MasonryControlBarComponent: OnInit');

    this.subscriptions.add(this.toolService.scrollToBottomStopped.subscribe( () => {
      log.debug('MasonryControlBarComponent: scrollToBottomStoppedSubscription: scrollToBottomStopped');
      this.scrollStarted = false;
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    }));

    let showMeta = this.toolService.getPreference('showMeta');
    this.showMeta =  showMeta === null ? true : showMeta;
    this.toolService.showMasonryTextArea.next(this.showMeta);
  }



  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }



  scrollToBottom(): void {
    this.scrollStarted = true;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.toolService.scrollToBottom.next();
  }



  stopScrollToBottom(): void {
    this.scrollStarted = false;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.toolService.stopScrollToBottom.next();
  }



  showMetaFunction(): void {
    this.showMeta = true;
    this.toolService.setPreference('showMeta', true);
    this.toolService.showMasonryTextArea.next(true);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  hideMetaFunction(): void {
    this.showMeta = false;
    this.toolService.setPreference('showMeta', false);
    this.toolService.showMasonryTextArea.next(false);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
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
