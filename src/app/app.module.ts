import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ModalModule } from './modal/modal.module';
import { Ng2PanZoomModule } from 'ng2-panzoom';
import { IsotopeModule } from './isotope/isotope.module';

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

// Angular Material
import { MatCardModule, MatInputModule, MatButtonModule, MatCheckboxModule, MatToolbarModule } from '@angular/material';

// Dragula
import { DragulaModule } from 'ng2-dragula';

// PDF Viewer
import { PdfViewerModule } from 'ng2-pdf-viewer';

// Our Services
import { DataService } from './data.service';
import { AuthenticationService } from './authentication.service';
import { ToolService } from './tool.service';
import { ModalService } from './modal/modal.service';

// Our Pipes
import { FromEpochPipe } from './pipes/from-epoch.pipe';
import { FormatTimePipe } from './pipes/format-time.pipe';
import { FormatSaTimePipe } from './pipes/format-satime.pipe';
import { MapValuesPipe } from './pipes/mapValues.pipe';
import { AllCapsPipe } from './pipes/allcaps.pipe';
import { CapFirstLetterPipe } from './pipes/cap-firstletter.pipe';

// Our Directives
import { ToggleFullscreenDirective } from './fullscreen.directive';
import { ClickOutsideDirective } from './click-outside.directive';

// Our Components
import { AppComponent } from './app.component';
import { DefaultRouteComponent } from './default-route.component';
import { ToolbarWidgetComponent } from './toolbar-widget.component';
import { SplashScreenModalComponent } from './splashscreen-modal.component';
import { NwCollectionModalComponent } from './nwcollection-modal.component';
import { DeleteCollectionConfirmModalComponent } from './deletecollection-confirm-modal.component';
import { PreferencesModalComponent } from './preferences-modal.component';
import { ManageUsersModalComponent } from './manageusers-modal.component';
import { ClassicGridComponent } from './classic-grid.component';
import { MasonryGridComponent } from './masonry-grid.component';
import { ClassicControlBarComponent } from './controlbar-classic.component';
import { MasonryControlBarComponent } from './controlbar-masonry.component';
import { ClassicSessionPopupComponent } from './classic-session-popup.component';
import { PdfViewerModalComponent } from './pdfviewer-modal.component';
import { ClassicTileComponent } from './classic-tile.component';
import { MetaAccordionComponent } from './meta-accordion.component';
import { RouterDropdownComponent } from './controlbar-router-dropdown.component';
import { MasonryTileComponent } from './masonry-tile.component';
import { SessionDetailsModalComponent } from './session-details-modal.component';
import { DeleteUserConfirmModalComponent } from './deleteuser-confirm-modal.component';
import { ServerDownModalComponent } from './serverdown-modal.component';
import { LoginComponent } from './login.component';
import { DownloadFileConfirmModalComponent } from './downloadfile-confirm-modal.component';
import { DeleteNwServerConfirmModalComponent } from './deletenwserver-confirm-modal.component';
import { CollectionsComponent } from './collections.component';
import { FeedsComponent } from './feeds.component';
import { FeedWizardComponent } from './feed-wizard';
import { DeleteFeedConfirmModalComponent } from './deletefeed-confirm-modal.component';
import { TabContainerComponent } from './tabcontainer-component';
import { SaCollectionModalComponent } from './sacollection-modal.component';
import { DeleteSaServerConfirmModalComponent } from './deletesaserver-confirm-modal.component';
import { CollectionDeletedNotifyModalComponent } from './collection-deleted-notify-modal.component';
import { EulaComponent } from './eula.component';

// Not yet used but imported to prevent compiler error
import { SessionWidgetComponent } from './session-widget.component';

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
                  DragulaModule,
                  PdfViewerModule,
                  RouterModule.forRoot([
                    {
                      path: '',
                      component: DefaultRouteComponent
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
                  EulaComponent
                ],
  providers:    [ DataService,
                  AuthenticationService,
                  ToolService,
                  ModalService
                ],
  bootstrap:    [ AppComponent ]

})

export class AppModule {

}
