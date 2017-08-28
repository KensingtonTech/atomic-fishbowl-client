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

// Our Pipes
import { FromEpochPipe } from './pipes/from-epoch.pipe';
import { FormatTimePipe } from './pipes/format-time.pipe';
import { MapValuesPipe } from './pipes/mapValues.pipe';

// Our Directives
import { ToggleFullscreenDirective } from './fullscreen.directive';
import { ClickOutsideDirective } from './click-outside.directive';

// Our Components
import { AppComponent } from './app.component';
import { ToolbarWidgetComponent } from './toolbar-widget.component';
import { SplashScreenModalComponent } from './splashscreen-modal.component';
import { AddCollectionModalComponent } from './addcollection-modal.component';
import { DeleteCollectionConfirmModalComponent } from './deletecollection-confirm-modal.component';
import { PreferencesModalComponent } from './preferences-modal.component';
import { ManageUsersModalComponent } from './manageusers-modal.component';
import { ClassicGridComponent } from './classic-grid.component';
import { MasonryGridComponent } from './masonry-grid.component';
import { ClassicControlBarComponent } from './classic-controlbar.component';
import { MasonryControlBarComponent } from './masonry-controlbar.component';
import { ClassicSessionPopupComponent } from './classic-session-popup.component';
import { PdfViewerComponent } from 'ng2-pdf-viewer';
import { PdfViewerModalComponent } from './pdfviewer-modal.component';
import { ClassicTileComponent } from './classic-tile.component';
import { MetaAccordionComponent } from './meta-accordion.component';
import { RouterDropdownComponent } from './router-dropdown.component';
import { MasonryTileComponent } from './masonry-tile.component';
import { SessionDetailsModalComponent } from './session-details-modal.component';
import { DeleteUserConfirmModalComponent } from './deleteuser-confirm-modal.component';
import { ServerDownModalComponent } from './serverdown-modal.component';
import { LoginComponent } from './login.component';
import { DownloadFileConfirmModalComponent } from './downloadfile-confirm-modal.component';

// Not yet used but imported to prevent compiler error
import { SessionWidgetComponent } from './session-widget.component';

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
                  ClassicSessionPopupComponent,
                  ToolbarWidgetComponent,
                  FromEpochPipe,
                  FormatTimePipe,
                  MapValuesPipe,
                  AddCollectionModalComponent,
                  DeleteCollectionConfirmModalComponent,
                  ClassicControlBarComponent,
                  PreferencesModalComponent,
                  ToggleFullscreenDirective,
                  MetaAccordionComponent,
                  ClassicTileComponent,
                  PdfViewerComponent,
                  PdfViewerModalComponent,
                  SplashScreenModalComponent,
                  RouterDropdownComponent,
                  MasonryControlBarComponent,
                  ClickOutsideDirective,
                  MasonryTileComponent,
                  SessionDetailsModalComponent,
                  LoginComponent,
                  ManageUsersModalComponent,
                  DeleteUserConfirmModalComponent,
                  ServerDownModalComponent,
                  DownloadFileConfirmModalComponent,
                  SessionWidgetComponent
                ],
  providers:    [ DataService,
                  AuthenticationService,
                  ToolService
                ],
  bootstrap:    [ AppComponent ]

})

export class AppModule {

}
