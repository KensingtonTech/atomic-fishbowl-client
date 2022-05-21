import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  OnInit,
  OnDestroy
} from '@angular/core';
import { ToolService } from 'services/tool.service';
import { CollectionsComponent } from '../collections/collections.component';
import * as log from 'loglevel';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tab-container-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tabcontainer-modal.component.html',
  styleUrls: [
    './tabcontainer-modal.component.scss'
  ]
})

export class TabContainerComponent implements OnInit, OnDestroy {

  constructor(
    private changeDetectionRef: ChangeDetectorRef,
    private toolService: ToolService
  ) {}

  @ViewChild(CollectionsComponent, { static: true }) CollectionsComponent: CollectionsComponent;

  selectedTabIndex = 0;
  subscriptions = new Subscription();



  ngOnInit(): void {
    this.subscriptions.add(
      this.toolService.displayTabContainerModal.subscribe(
        (displayed) => {
          if (displayed) {
            this.onOpen();
          }
          else {
            this.onClose();
          }
        }
      )
    );
  }



  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }



  onOpen(): void {
    if (this.selectedTabIndex === 0) {
      this.toolService.collectionsOpened.next();
    }
    if (this.selectedTabIndex === 1) {
      this.toolService.feedsOpened.next();
    }
  }



  onClose(): void {
    this.CollectionsComponent.onClose();
  }



  onTabChange(event: {originalEvent: Event; index: number}): void {
    // log.debug('TabContainerComponent: onTabChange(): event:', event);
    const index = event.index;
    this.selectedTabIndex = index;
    log.debug('TabContainerComponent: onTabChange(): index:', index);
    if (index === 0) {
      this.toolService.collectionsOpened.next();
    }
    if (index === 1) {
      this.toolService.feedsOpened.next();
      this.CollectionsComponent.onClose();
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  closeModal(): void {
    this.toolService.displayTabContainerModal.next(false);
  }

}
