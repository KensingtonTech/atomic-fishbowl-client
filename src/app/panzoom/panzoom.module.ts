import { NgModule } from '@angular/core';
import { PanZoomComponent } from './panzoom.component';
import { KMousewheelDirective } from '../mousewheel/mousewheel.directive';

@NgModule({
  imports: [],
  declarations: [ PanZoomComponent, KMousewheelDirective ],
  providers: [],
  exports: [ PanZoomComponent ]
})

export class PanZoomModule {

}
