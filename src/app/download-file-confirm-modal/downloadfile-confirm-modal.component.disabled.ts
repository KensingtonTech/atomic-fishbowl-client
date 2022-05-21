import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { ToolService } from 'services/tool.service';
import { Subscription } from 'rxjs';
import * as utils from '../utils';

@Component({
  selector: 'app-downloadfile-confirm-modal',
  templateUrl: './downloadfile-confirm-modal.component.html'
})

export class DownloadFileConfirmModalComponent implements OnInit, OnDestroy {

  constructor(
    private modalService: ModalService,
    private toolService: ToolService
  ) {}

  utils = utils;
  id = this.toolService.confirmDownloadFileModalId;
  file: string;
  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.subscriptions.add(
      this.toolService.fileToDownload.subscribe(
        (f) => this.file = f
      )
    );
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
