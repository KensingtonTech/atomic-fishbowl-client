import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpModule } from '@angular/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ModalModule } from './modal/modal.module';
import { PanZoomModule } from './panzoom/panzoom.module';
import { MasonryModule } from './masonry/masonry.module';
import { CalendarModule } from 'primeng/components/calendar/calendar';
import { TooltipModule } from 'primeng/components/tooltip/tooltip';
import { RadioButtonModule } from 'primeng/components/radiobutton/radiobutton';
import { MdCardModule, MdInputModule, MdButtonModule, MdCheckboxModule } from '@angular/material';

// Our Services
import { DataService } from './data.service';
import { AuthenticationService } from './authentication.service';
import { ToolService } from './tool.service';
import { HttpJsonStreamService } from './http-json-stream.service';

// Our Pipes
import { FromEpochPipe } from './from-epoch.pipe';
import { FormatTimePipe } from './format-time.pipe';
import { MapValuesPipe } from './mapValues.pipe';

// Our Directives
import { ToggleFullscreenDirective } from './fullscreen.directive';
import { ClickOutsideDirective } from './click-outside.directive';

// Our Components
import { AppComponent } from './app.component';
import { ToolbarWidgetComponent } from './toolbar-widget.component';
import { SplashScreenModal } from './splashscreen-modal.component';
import { AddCollectionModalComponent } from './addcollection-modal.component';
import { DeleteCollectionConfirmModalComponent } from './deletecollection-confirm-modal.component';
import { PreferencesModalComponent } from './preferences-modal.component';
import { ManageUsersModalComponent } from './manageusers-modal.component';
import { ClassicGridComponent } from './classic-grid.component';
import { MasonryGridComponent } from './masonry-grid.component';
import { GridControlBarComponent } from './grid-controlbar.component';
import { MasonryControlBarComponent } from './masonry-controlbar.component';
import { SessionWidgetComponent } from './session-widget.component';
import { PdfViewerComponent } from 'ng2-pdf-viewer';
import { PdfViewerModalComponent } from './pdfviewer-modal.component';
import { ImgTileComponent } from './img-tile.component';
import { AccordionLIComponent } from './accordion-li.component';
import { AccordionULComponent } from './accordion-ul.component';
import { RouterDropdownComponent } from './router-dropdown.component';
import { MasonryTileComponent } from './masonry-tile.component';
import { SessionDetailsModalComponent } from './session-details-modal.component';
import { DeleteUserConfirmModalComponent } from './deleteuser-confirm-modal.component';
import { ServerDownModalComponent } from './serverdown-modal.component';
import { LoginComponent } from './login.component';

// Other
// import 'hammerjs'; // required for Material gesture support.  Not sure that we need it but including for now.
import * as $ from 'jquery';

@NgModule({
  imports:      [ BrowserModule,
                  BrowserAnimationsModule,
                  HttpModule,
                  FormsModule,
                  ReactiveFormsModule,
                  PanZoomModule,
                  ModalModule,
                  CalendarModule,
                  TooltipModule,
                  MasonryModule,
                  RadioButtonModule,
                  MdCardModule,
                  MdInputModule,
                  MdCheckboxModule,
                  MdButtonModule,
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
                  ToolbarWidgetComponent,
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
  providers:    [ DataService,
                  AuthenticationService,
                  ToolService,
                  HttpJsonStreamService
                ],
  bootstrap:    [ AppComponent ]

})

export class AppModule {

}
