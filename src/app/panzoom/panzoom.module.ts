import { NgModule }      from '@angular/core';
import { PanZoomComponent } from './panzoom.component';
import { PanZoomApiService } from './panzoom-api.service';
import { PanZoomConfigService } from './panzoom-config.service';
import { PanZoomModelService } from './panzoom-model.service';
import { WindowRefService } from './panzoom-windowref.service';
import { KMousewheel } from '../mousewheel/mousewheel.directive';

@NgModule({
  imports: [], //MaterialModule
  declarations: [ PanZoomComponent, KMousewheel ], //DisplacerPortalDirective, DisplacerComponent
  providers: [ PanZoomApiService, PanZoomConfigService, WindowRefService, PanZoomModelService ],
  exports: [ PanZoomComponent ]
})

export class PanZoomModule {

}
