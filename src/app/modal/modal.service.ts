import { ModalComponent } from './modal.component';
declare var log;

export class ModalService {

    private modals: ModalComponent[] = [];

    add(modal: ModalComponent) {
        // add modal to array of active modals
        this.modals.push(modal);
    }

    remove(id: string) {
        // remove modal from array of active modals
        for (let i = 0; i < this.modals.length; i++) {
            if (this.modals[i].id === id) {
                this.modals.splice(i, 1);
                break;
            }
        }
    }

    open(id: string) {
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
        for ( let i = 0; i < this.modals.length; i++ ) {
            let modal: ModalComponent = this.modals[i];
            modal.close();
        }
    }

}
