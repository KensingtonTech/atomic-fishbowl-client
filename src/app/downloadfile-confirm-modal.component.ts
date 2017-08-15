import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from './tool.service';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeWhile';
declare var log: any;

@Component({
  selector: 'downloadfile-confirm-modal',
  template: `
<modal id="{{id}}" class="downloadfile-confirm-modal">
  <div class="modal">
    <div class="modal-body center-modal" style="width: 700px; height: 90px;">

      <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 100px; text-align: center;">
        <span class="fa fa-exclamation-circle fa-fw fa-5x" style="display: inline-block; color: red; vertical-align: middle; line-height: 100px;"></span>
      </div>

      <div style="position: absolute; left: 100px; right: 10px; top: 0; bottom: 0; font-size: 10pt;">
        <p>Are you sure you want to download file '<b>{{reduceContentFile(file)}}</b>'?</p>
        <p>This is potentially unsafe.  Be sure you know what you're doing!</p>
        <div style="float: right;">
          <button (click)="confirm()">Confirm</button>
          <button (click)="cancel()">Cancel</button>
        </div>
      </div>



    </div>

  </div>
  <div class="modal-background"></div>
</modal>
  `,
  styles: [`

    .downloadfile-confirm-modal .modal {
      z-index: 1100;
    }

    .downloadfile-confirm-modal .modal-background {
      opacity: 0.85;

      /* z-index must be below .modal and above everything else  */
      z-index: 1050 !important;
    }

  `]
})

export class DownloadFileConfirmModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  public id = 'downloadfile-confirm-modal';
  public file: string;
  private alive = true;

  ngOnInit(): void {
    this.toolService.fileToDownload.takeWhile(() => this.alive).subscribe( (f: string) => { this.file = f; });
  }

  public ngOnDestroy() {
    this.alive = false;
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

  reduceContentFile(s: string): string {
    const RE = /([^/]*)$/;
    let match = RE.exec(s);
    return match[0];
  }

  /*keyDownFunction(event: any): void {
    log.debug(event.keyCode);
  }
  */

}
