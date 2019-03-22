import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subject, Subscription } from 'rxjs';
import * as utils from './utils';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'downloadfile-confirm-modal',
  template: `
<modal id="{{id}}" class="downloadfile-confirm-modal" secondLevel="true" bodyClass="center-modal" bodyStyle="width: 700px; height: 90px;">

  <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 100px; text-align: center;">
    <span class="fa fa-exclamation-circle fa-fw fa-5x" style="display: inline-block; color: red; vertical-align: middle; line-height: 100px;"></span>
  </div>

  <div style="position: absolute; left: 100px; right: 10px; top: 0; bottom: 0; font-size: 10pt;">
    <p>Are you sure you want to download file '<b>{{utils.pathToFilename(file)}}</b>'?</p>
    <p>This is potentially unsafe.  Be sure you know what you're doing!</p>
    <div style="float: right;">
      <button (click)="confirm()">Confirm</button>
      <button (click)="cancel()">Cancel</button>
    </div>
  </div>

</modal>
  `,
  styles: [` `]
})

export class DownloadFileConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  public utils = utils;
  public id = 'downloadfile-confirm-modal';
  public file: string;
  private fileToDownloadSubscription: Subscription;

  ngOnInit(): void {
    this.fileToDownloadSubscription = this.toolService.fileToDownload.subscribe( (f: string) => { this.file = f; });
  }

  public ngOnDestroy() {
    this.fileToDownloadSubscription.unsubscribe();
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
