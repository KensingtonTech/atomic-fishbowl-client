import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from 'services/tool.service';
import { CollectionsComponent } from './collections.component';
import * as log from 'loglevel';

@Component({
  selector: 'tab-container-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tabcontainer-modal.component.html',
  styles: [`

  .ui-tabview {
    height: 100% !important;
    position: relative !important;
  }

  `]
})

export class TabContainerComponent {

  constructor(private modalService: ModalService,
              private changeDetectionRef: ChangeDetectorRef,
              private toolService: ToolService ) {}

  @ViewChild(CollectionsComponent, { static: true }) CollectionsComponent;

  id = this.toolService.tabContainerModalId;
  selectedTabIndex = 0;



  onClose(): void {
    this.CollectionsComponent.onClose();
  }



  onOpen(): void {
    if (this.selectedTabIndex === 0) {
      this.toolService.collectionsOpened.next();
    }
    if (this.selectedTabIndex === 1) {
      this.toolService.feedsOpened.next();
    }
  }



  onTabChange(event): void {
    // log.debug('TabContainerComponent: onTabChange(): event:', event);
    let index = event.index;
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
    this.modalService.close(this.id);
  }

}
