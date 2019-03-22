import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ModalComponent } from './modal.component';
import { ModalService } from './modal.service';

@NgModule({
  imports: [ BrowserModule ],
  declarations: [ ModalComponent ],
  providers: [ ModalService ],
  exports: [ ModalComponent ]
})

export class ModalModule {

}
