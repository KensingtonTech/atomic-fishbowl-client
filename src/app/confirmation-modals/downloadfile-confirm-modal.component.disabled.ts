import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { ToolService } from 'services/tool.service';
import { Subscription } from 'rxjs';
import * as utils from '../utils';

@Component({
  selector: 'downloadfile-confirm-modal',
  template: `
<modal id="{{id}}" class="downloadfile-confirm-modal" secondLevel="true" bodyClass="noselect modal-confirm">

  <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 100px; text-align: center;">
    <span class="fa fa-exclamation-circle fa-fw fa-5x" style="display: inline-block; color: red; vertical-align: middle; line-height: 100px;"></span>
  </div>

  <div style="position: absolute; left: 100px; right: 10px; top: 0; bottom: 0;">
    <p>Are you sure you want to download file '<b>{{utils.pathToFilename(file)}}</b>'?</p>
    <p>This is potentially unsafe.  Only do this if you're really sure that you know what you're doing!</p>
    <div style="float: right;">
      <p-button (onClick)="confirm()" label="Confirm"></p-button>
      <p-button (onClick)="cancel()" label="Cancel"></p-button>
    </div>
  </div>

</modal>
  `
})

export class DownloadFileConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  utils = utils;
  id = this.toolService.confirmDownloadFileModalId;
  file: string;
  private subscriptions = new Subscription;

  ngOnInit(): void {
    this.subscriptions.add(this.toolService.fileToDownload.subscribe( (f: string) => { this.file = f; }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  confirm(): void {
    this.toolService.confirmDownloadFile.next(this.file);
    this.closeModal();
  }

  cancel(): void {
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

}
