import { ModalComponent } from './modal.component';
import { Injectable } from '@angular/core';
import { Logger } from 'loglevel';
declare var log: Logger;

@Injectable()

export class ModalService {

    constructor() {
        // log.debug('ModalService: constructor()');
    }

    private modals: ModalComponent[] = [];

    add(modal: ModalComponent) {
        // log.debug('ModalService: add(): modal:', modal);
        // add modal to array of active modals
        this.modals.push(modal);
    }

    remove(id: string) {
        // log.debug('ModalService: remove(): id:', id);
        // remove modal from array of active modals
        for (let i = 0; i < this.modals.length; i++) {
            if (this.modals[i].id === id) {
                this.modals.splice(i, 1);
                break;
            }
        }
    }

    open(id: string) {
        // log.debug('ModalService: open(): id:', id);
        // log.debug('ModalService: open(): modals:', this.modals);
        let modal: ModalComponent = null;
        // open modal specified by id
        for (let i = 0; i < this.modals.length; i++) {
            if (this.modals[i].id === id) {
                modal = this.modals[i];
                break;
            }
        }
        modal.open();
    }

    close(id: string) {
        // log.debug('ModalService: close(): id:', id);
        let modal: ModalComponent = null;
        // close modal specified by id
        for (let i = 0; i < this.modals.length; i++) {
            if (this.modals[i].id === id) {
                modal = this.modals[i];
                break;
            }
        }
        modal.close();
    }

    closeAll(): void {
        // log.debug('ModalService: closeAll()');
        for ( let i = 0; i < this.modals.length; i++ ) {
            let modal: ModalComponent = this.modals[i];
            modal.close();
        }
    }

}
