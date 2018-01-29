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
    <div class="modal-body" style="position: absolute; top: 40px; bottom: 20px; left: 10px; right: 25px; background-color: white; font-size: 10pt;">

      <p-tabView>
        <p-tabPanel header="Collections">
          Content 1
        </p-tabPanel>
        <p-tabPanel header="Feeds">
            Content 2
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

  ngOnInit(): void {

  }

  ngOnDestroy(): void {

  }

  onCancel(): void {
    this.modalService.close(this.id);
  }

  onOpen(): void {
    
  }

}
