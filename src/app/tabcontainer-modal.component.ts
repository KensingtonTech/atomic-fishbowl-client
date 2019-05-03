import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from 'services/tool.service';
import { Logger } from 'loglevel';
import { CollectionsComponent } from './collections.component';
declare var log: Logger;

@Component({
  selector: 'tab-container-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<modal id="{{id}}" (opened)="onOpen()" (closed)="onClose()" [background]="true" modalClass="tab-container-modal" bodyClass="tab-container-modal-body" bodyStyle="background-color: white;">

      <p-tabView [activeIndex]="selectedTabIndex" (onChange)="onTabChange($event)">
        <p-tabPanel header="Collections" headerStyleClass="noselect nooutline">
          <collections></collections>
        </p-tabPanel>
        <p-tabPanel header="Hash Feeds" headerStyleClass="noselect nooutline">
          <feeds></feeds>
        </p-tabPanel>
      </p-tabView>

      <div (click)="closeModal()" class="fa fa-times-circle-o fa-2x closeButton"></div>

</modal>
  `,
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

  @ViewChild(CollectionsComponent) CollectionsComponent;

  public id = this.toolService.tabContainerModalId;
  public selectedTabIndex = 0;



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



  public closeModal(): void {
    this.modalService.close(this.id);
  }

}
