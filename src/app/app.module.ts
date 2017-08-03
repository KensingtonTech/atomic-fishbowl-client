import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent }  from './app.component';
import { HttpModule }    from '@angular/http';
import { FormsModule }   from '@angular/forms';
import { RouterModule }   from '@angular/router';

import { DataService } from './data.service';
import { AuthenticationService } from './authentication.service';

import { FromEpochPipe } from './from-epoch.pipe';
import { FormatTimePipe } from './format-time.pipe';
import { MapValuesPipe } from './mapValues.pipe';

import { ModalModule } from './modal/modal.module';
import { ToolWidgetComponent } from './tool-widget.component';
import { SplashScreenModal } from './splashscreen-modal.component';
import { AddCollectionModalComponent } from './addcollection-modal.component';
import { DeleteCollectionConfirmModalComponent } from './deletecollection-confirm-modal.component';
import { PreferencesModalComponent } from './preferences-modal.component';
import { ManageUsersModalComponent } from './manageusers-modal.component';
import { ToggleFullscreenDirective } from './fullscreen.directive';
import { ToolWidgetCommsService } from './tool-widget.comms.service';

import { ClassicGridComponent } from './classic-grid.component';
import { MasonryGridComponent } from './masonry-grid.component';
import { GridControlBarComponent } from './grid-controlbar.component';
import { MasonryControlBarComponent } from './masonry-controlbar.component';
import { PanZoomModule } from "./panzoom/panzoom.module";
import { SessionWidgetComponent } from './session-widget.component';
import { PdfViewerComponent } from 'ng2-pdf-viewer';
import { PdfViewerModalComponent } from './pdfviewer-modal.component'
import { ImgTileComponent } from './img-tile.component';
import { AccordionLIComponent } from './accordion-li.component';
import { AccordionULComponent } from './accordion-ul.component';
import { RouterDropdownComponent } from './router-dropdown.component';
import { ClickOutsideDirective } from './click-outside.directive';
import { MasonryModule } from './masonry/masonry.module';
import { MasonryTileComponent } from './masonry-tile.component';
import { SessionDetailsModalComponent } from './session-details-modal.component';

import { CalendarModule } from 'primeng/components/calendar/calendar';
import { TooltipModule } from 'primeng/components/tooltip/tooltip';
import { RadioButtonModule } from 'primeng/components/radiobutton/radiobutton';
import { DeleteUserConfirmModalComponent } from './deleteuser-confirm-modal.component';
import { ServerDownModalComponent } from './serverdown-modal.component';

import { LoginComponent } from './login.component';
import { LoggerService } from './logger-service';
import { HttpJsonStreamService } from './http-json-stream.service';

@NgModule({
  imports:      [ BrowserModule,
                  BrowserAnimationsModule,
                  HttpModule,
                  FormsModule,
                  PanZoomModule,
                  ModalModule,
                  CalendarModule,
                  TooltipModule,
                  MasonryModule,
                  RadioButtonModule,
                  RouterModule.forRoot([
                    {
                      path: '',
                      redirectTo: '/masonryGrid',
                      pathMatch: 'full'
                    },
                    {
                      path: 'classicGrid',
                      component: ClassicGridComponent
                    },
                    {
                      path: 'masonryGrid',
                      component: MasonryGridComponent
                    },
                    {
                      path: 'login',
                      component: LoginComponent
                    }
                  ])
                ],
  declarations: [ AppComponent,
                  ClassicGridComponent,
                  MasonryGridComponent,
                  SessionWidgetComponent,
                  ToolWidgetComponent,
                  FromEpochPipe,
                  FormatTimePipe,
                  MapValuesPipe,
                  AddCollectionModalComponent,
                  DeleteCollectionConfirmModalComponent,
                  GridControlBarComponent,
                  PreferencesModalComponent,
                  ToggleFullscreenDirective,
                  AccordionULComponent,
                  AccordionLIComponent,
                  ImgTileComponent,
                  PdfViewerComponent,
                  PdfViewerModalComponent,
                  SplashScreenModal,
                  RouterDropdownComponent,
                  MasonryControlBarComponent,
                  ClickOutsideDirective,
                  MasonryTileComponent,
                  SessionDetailsModalComponent,
                  LoginComponent,
                  ManageUsersModalComponent,
                  DeleteUserConfirmModalComponent,
                  ServerDownModalComponent
                ],
  providers:    [ AuthenticationService,
                  DataService,
                  ToolWidgetCommsService,
                  LoggerService,
                  HttpJsonStreamService
                ],
  bootstrap:    [ AppComponent ]

})

export class AppModule {

}
