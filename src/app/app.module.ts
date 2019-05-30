import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ModalModule } from './modal/modal.module';
import { Ng2PanZoomModule } from 'ng2-panzoom';
import { IsotopeModule } from './isotope/isotope.module';

// Global Error Handler
// import { ErrorHandlerGlobal } from './error-handler-global';

// PrimeNG
import { CalendarModule } from 'primeng/calendar';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DropdownModule } from 'primeng/dropdown';
import { ListboxModule } from 'primeng/listbox';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { CheckboxModule } from 'primeng/checkbox';
import { DragDropModule } from 'primeng/dragdrop';
import { TabViewModule } from 'primeng/tabview';
import { ToolbarModule } from 'primeng/toolbar';
import { MenuModule } from 'primeng/menu';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';

// Dragula
import { DragulaModule } from 'ng2-dragula';

// PDF Viewer
import { PdfViewerModule } from 'ng2-pdf-viewer';

// Our Services
import { DataService } from 'services/data.service';
import { AuthenticationService } from 'services/authentication.service';
import { ToolService } from 'services/tool.service';

// Our Pipes
import { FromEpochPipe } from './pipes/from-epoch.pipe';
import { FormatTimePipe } from './pipes/format-time.pipe';
import { FormatSaTimePipe } from './pipes/format-satime.pipe';
import { MapValuesPipe } from './pipes/mapValues.pipe';
import { AllCapsPipe } from './pipes/allcaps.pipe';
import { CapFirstLetterPipe } from './pipes/cap-firstletter.pipe';
import { BoolToStringPipe } from './pipes/boolToString.pipe';

// Our Directives
import { ToggleFullscreenDirective } from './fullscreen.directive';
import { ClickOutsideDirective } from './click-outside.directive';

// Our Components
import { AppComponent } from './app.component';
import { DefaultRouteComponent } from './default-route.component';
import { ToolbarWidgetComponent } from './toolbar-widget.component';
import { SplashScreenModalComponent } from './splashscreen-modal.component';
import { NwCollectionModalComponent } from './nwcollection-modal.component';
import { DeleteCollectionConfirmModalComponent } from './confirmation-modals/deletecollection-confirm-modal.component';
import { PreferencesModalComponent } from './preferences-modal.component';
import { ManageUsersModalComponent } from './manageusers-modal.component';
import { ClassicGridComponent } from './classic-grid/classic-grid.component';
import { MasonryGridComponent } from './masonry-grid/masonry-grid.component';
import { ClassicControlBarComponent } from './controlbar/controlbar-classic.component';
import { MasonryControlBarComponent } from './controlbar/controlbar-masonry.component';
import { RouterDropdownComponent } from './controlbar/controlbar-router-dropdown.component';
import { ClassicSessionPopupComponent } from './classic-grid/classic-session-popup.component';
import { ClassicTileComponent } from './classic-grid/classic-tile.component';
import { MetaAccordionComponent } from './viewers/meta-accordion.component';
import { MasonryTileComponent } from './masonry-grid/masonry-tile.component';
import { SessionDetailsModalComponent } from './viewers/content-details-modal.component';
import { DeleteUserConfirmModalComponent } from './confirmation-modals/deleteuser-confirm-modal.component';
import { ServerDownModalComponent } from './serverdown-modal.component';
import { LoginFormComponent } from './login-form.component';
// import { DownloadFileConfirmModalComponent } from './confirmation-modals/downloadfile-confirm-modal.component';
import { DeleteNwServerConfirmModalComponent } from './confirmation-modals/deletenwserver-confirm-modal.component';
import { CollectionsComponent } from './collections.component';
import { FeedsComponent } from './feeds.component';
import { FeedWizardComponent } from './feed-wizard';
import { DeleteFeedConfirmModalComponent } from './confirmation-modals/deletefeed-confirm-modal.component';
import { TabContainerComponent } from './tabcontainer-modal.component';
import { SaCollectionModalComponent } from './sacollection-modal.component';
import { DeleteSaServerConfirmModalComponent } from './confirmation-modals/deletesaserver-confirm-modal.component';
import { CollectionDeletedNotifyModalComponent } from './collection-deleted-notify-modal.component';
import { EulaComponent } from './eula.component';
import { LicensingPreferencesComponent } from './licensing-preferences';
import { LicenseExpiredModalComponent } from './license-expired-modal.component';
import { ContentViewerComponent } from './viewers/content-viewer.component';
import { SessionWidgetComponent } from './viewers/meta-widget.component';
import { ContentCountWidgetComponent } from './viewers/content-count-widget.component';
import { NewEditUserModalComponent } from './new-edit-user.modal.component';
import { NewEditNwServiceModalComponent } from './new-edit-nw-service.component';
import { LoggedOutNotifyModalComponent } from './logged-out-notify-modal.component';
import { CustomScrollPanelComponent } from './scrollpanel/scrollpanel';

// Other
// import 'hammerjs'; // required for Material gesture support
import { FlexLayoutModule } from '@angular/flex-layout';



@NgModule({
  imports:      [ BrowserModule,
                  BrowserAnimationsModule,
                  HttpClientModule,
                  FormsModule,
                  ReactiveFormsModule,
                  Ng2PanZoomModule,
                  ModalModule,
                  CalendarModule,
                  TooltipModule,
                  ButtonModule,
                  IsotopeModule,
                  RadioButtonModule,
                  SelectButtonModule,
                  DropdownModule,
                  ListboxModule,
                  InputTextModule,
                  FileUploadModule,
                  CheckboxModule,
                  DragDropModule,
                  TabViewModule,
                  ToolbarModule,
                  MatCardModule,
                  MatInputModule,
                  MatCheckboxModule,
                  MatButtonModule,
                  MatToolbarModule,
                  FlexLayoutModule,
                  DragulaModule.forRoot(),
                  PdfViewerModule,
                  MenuModule,
                  RouterModule.forRoot([
                    {
                      path: '',
                      component: DefaultRouteComponent // if no path is specified, then this component will decide which path to take
                    },
                    {
                      path: 'masonryGrid',
                      component: MasonryGridComponent
                    },

                    {
                      path: 'classicGrid',
                      component: ClassicGridComponent
                    }
                  ])
                ],
  declarations: [ AppComponent,
                  DefaultRouteComponent,
                  ClassicGridComponent,
                  MasonryGridComponent,
                  ClassicSessionPopupComponent,
                  ToolbarWidgetComponent,
                  FromEpochPipe,
                  FormatTimePipe,
                  FormatSaTimePipe,
                  MapValuesPipe,
                  AllCapsPipe,
                  CapFirstLetterPipe,
                  NwCollectionModalComponent,
                  DeleteCollectionConfirmModalComponent,
                  ClassicControlBarComponent,
                  PreferencesModalComponent,
                  ToggleFullscreenDirective,
                  MetaAccordionComponent,
                  ClassicTileComponent,
                  SplashScreenModalComponent,
                  RouterDropdownComponent,
                  MasonryControlBarComponent,
                  ClickOutsideDirective,
                  MasonryTileComponent,
                  SessionDetailsModalComponent,
                  LoginFormComponent,
                  ManageUsersModalComponent,
                  DeleteUserConfirmModalComponent,
                  ServerDownModalComponent,
                  // DownloadFileConfirmModalComponent,
                  SessionWidgetComponent,
                  DeleteNwServerConfirmModalComponent,
                  CollectionsComponent,
                  FeedsComponent,
                  FeedWizardComponent,
                  DeleteFeedConfirmModalComponent,
                  TabContainerComponent,
                  SaCollectionModalComponent,
                  DeleteSaServerConfirmModalComponent,
                  CollectionDeletedNotifyModalComponent,
                  EulaComponent,
                  LicensingPreferencesComponent,
                  BoolToStringPipe,
                  LicenseExpiredModalComponent,
                  ContentViewerComponent,
                  ContentCountWidgetComponent,
                  NewEditUserModalComponent,
                  NewEditNwServiceModalComponent,
                  LoggedOutNotifyModalComponent,
                  CustomScrollPanelComponent
                ],
  providers:    [ /*{ provide: ErrorHandler,
                    useClass: ErrorHandlerGlobal
                  },*/
                  DataService,
                  AuthenticationService,
                  ToolService
                ],
  bootstrap:    [ AppComponent ]

})

export class AppModule {

}
