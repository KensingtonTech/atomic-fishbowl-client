import { Component, Input } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { ToolService } from 'services/tool.service';

@Component({
  selector: 'collection-deleted-notify-modal',
  templateUrl: './collection-deleted-notify-modal.component.html'
})

export class CollectionDeletedNotifyModalComponent {

  constructor(private modalService: ModalService,
              private toolService: ToolService ) {}

  @Input() user: string = null;
  id = this.toolService.collectionDeletedModalId;

  onOpen(): void {}


  closeModal(): void {
    this.modalService.close(this.id);
  }

}
