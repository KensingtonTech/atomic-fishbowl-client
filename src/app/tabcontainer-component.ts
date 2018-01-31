import { Component, OnInit, OnDestroy, OnChanges, Input, ViewChild, ElementRef } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subscription } from 'rxjs/Subscription';
import * as utils from './utils';
import * as log from 'loglevel';

@Component({
  selector: 'tab-container-modal',
  template: `
<modal id="{{id}}" (opened)="onOpen()" (cancelled)="onCancel()">
  <div class="modal">
    <div class="modal-body" style="position: relative; top: 40px; width: 90%; height: 1024px; max-height: 1024px; background-color: white; font-size: 10pt;">

      <div (click)="closeModal()" style="position: absolute; top: 16px; right: 16px; z-index: 100; color: black;" class="fa fa-times-circle-o fa-2x"></div>

      <p-tabView [activeIndex]="selectedTabIndex" (onChange)="onTabChange($event)">
        <p-tabPanel header="Collections">
          <collections></collections>
        </p-tabPanel>
        <p-tabPanel header="Hash Feeds">
          <feeds></feeds>
        </p-tabPanel>
      </p-tabView>


    </div>
  </div>
  <div class="modal-background"></div>
</modal>
  `,
  styles: [`

  `]
})

export class TabContainerComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  @Input('id') id: string;

  public selectedTabIndex = 0;

  ngOnInit(): void {

  }

  ngOnDestroy(): void {

  }

  onCancel(): void {
    this.modalService.close(this.id);
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
    }
  }

  public closeModal(): void {
    this.modalService.close(this.id);
  }

}
