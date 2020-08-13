import { ModalComponent } from './modal.component';
import { Injectable } from '@angular/core';
import * as log from 'loglevel';

@Injectable({providedIn: 'root'})

export class ModalService {

    private modals: ModalComponent[] = [];
    private openModalsCount = 0;
    private modalState = {}; // [id]: open?boolean
    private openModalsStack = [];



    add(modal: ModalComponent) {
        log.debug('ModalService: add(): modal:', modal);
        // add modal to array of active modals
        this.modals.push(modal);
        this.modalState[modal.id] = false;
    }



    remove(id: string) {
        log.debug('ModalService: remove(): id:', id);
        // remove modal from array of active modals
        for (let i = 0; i < this.modals.length; i++) {
            if (this.modals[i].id === id) {
                this.modals.splice(i, 1);
                delete this.modalState[id];
                break;
            }
        }
    }



    open(id: string) {
        log.debug('ModalService: open(): id:', id);
        // log.debug('ModalService: open(): modals:', this.modals);
        // let modal: ModalComponent = null;
        // open modal specified by id
        for (let i = 0; i < this.modals.length; i++) {
            let modal = this.modals[i];
            if (modal.id === id && !this.modalState[id]) {
                log.debug('ModalService: open(): found id:', id);
                this.modalState[id] = true;
                modal.open();
                this.openModalsCount += 1;
                this.openModalsStack.push(modal);
                for (let x = 0; x < this.openModalsStack.length; x++) {
                    // tell the topmost open modal it's at the front...
                    // so it can listen for close escapes
                    if (x === this.openModalsStack.length - 1) {
                        this.openModalsStack[x].isFront = true;
                    }
                    else {
                        // tell other open modals they're no longer at the front...
                        // so they can stop listening for escapes
                        this.openModalsStack[x].isFront = false;
                    }
                }
                break;
            }
        }
    }



    close(id: string) {
        log.debug('ModalService: close(): id:', id);
        // close modal specified by id
        for (let i = 0; i < this.modals.length; i++) {
            let modal = this.modals[i];
            if (modal.id === id && this.modalState[id]) {
                log.debug('ModalService: close(): found id:', id);
                this.modalState[id] = false;
                modal.close();
                this.openModalsCount -= 1;
                for (let x = 0; x < this.openModalsStack.length; x++) {
                    // remove the closed modal from the openModalsStack
                    if (id === this.openModalsStack[x].id) {
                        this.openModalsStack.splice(x, 1);
                        break;
                    }
                }
                for (let x = 0; x < this.openModalsStack.length; x++) {
                    // if modals are still open, tell the topmost open modal it's at the front...
                    // so it can listen for close escapes
                    if (x === this.openModalsStack.length - 1) {
                        this.openModalsStack[x].isFront = true;
                    }
                    else {
                        // tell other open modals they're no longer at the front...
                        // so they can stop listening for escapes
                        this.openModalsStack[x].isFront = false;
                    }
                }
                break;
            }
        }
    }



    closeAll(): void {
        log.debug('ModalService: closeAll()');
        for ( let i = 0; i < this.modals.length; i++ ) {
            let modal: ModalComponent = this.modals[i];
            modal.close();
        }
        Object.keys(this.modalState).forEach( key => this.modalState[key] = false);
        this.openModalsCount = 0;
    }



    get isOpen(): boolean {
        // log.debug('ModalService: isOpen(): openModalsCount:', this.openModalsCount);
        if (this.openModalsCount !== 0) {
            return true;
        }
        return false;
    }

}
