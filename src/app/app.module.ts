import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ModalModule } from './modal/modal.module';
import { PanZoomModule } from './panzoom/panzoom.module';
import { MasonryModule } from './masonry/masonry.module';
// import { DatePipe } from '@angular/common';

// PrimeNG
import { CalendarModule } from 'primeng/components/calendar/calendar';
import { TooltipModule } from 'primeng/components/tooltip/tooltip';
import { ButtonModule } from 'primeng/components/button/button';
import { RadioButtonModule } from 'primeng/components/radiobutton/radiobutton';
import { SelectButtonModule } from 'primeng/components/selectbutton/selectbutton';
import { DropdownModule } from 'primeng/components/dropdown/dropdown';
import { ListboxModule } from 'primeng/components/listbox/listbox';
import { InputTextModule } from 'primeng/components/inputtext/inputtext';
import { FileUploadModule } from 'primeng/components/fileupload/fileupload';
import { CheckboxModule } from 'primeng/components/checkbox/checkbox';
import { DragDropModule } from 'primeng/components/dragdrop/dragdrop';
import { TabViewModule } from 'primeng/components/tabview/tabview';
import { ToolbarModule } from 'primeng/components/toolbar/toolbar';

// Angular Material
import { MatCardModule, MatInputModule, MatButtonModule, MatCheckboxModule, MatToolbarModule } from '@angular/material';

// Dragula
import { DragulaModule } from 'ng2-dragula';

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
import { DeleteNwServerConfirmModalComponent } from './deletenwserver-confirm-modal.component';
import { CollectionsModalComponent } from './collections-modal';
import { FeedsModalComponent } from './feeds-modal';
import { FeedWizardComponent } from './feed-wizard';
import { DeleteFeedConfirmModalComponent } from './deletefeed-confirm-modal.component';

// Not yet used but imported to prevent compiler error
import { SessionWidgetComponent } from './session-widget.component';

// Other
// import 'hammerjs'; // required for Material gesture support
import { FlexLayoutModule } from '@angular/flex-layout';
import * as $ from 'jquery';

@NgModule({
  imports:      [ BrowserModule,
                  BrowserAnimationsModule,
                  HttpClientModule,
                  FormsModule,
                  ReactiveFormsModule,
                  PanZoomModule,
                  ModalModule,
                  CalendarModule,
                  TooltipModule,
                  ButtonModule,
                  MasonryModule,
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
                  SessionWidgetComponent,
                  DeleteNwServerConfirmModalComponent,
                  CollectionsModalComponent,
                  FeedsModalComponent,
                  FeedWizardComponent,
                  DeleteFeedConfirmModalComponent
                ],
  providers:    [ DataService,
                  AuthenticationService,
                  ToolService
                ],
  bootstrap:    [ AppComponent ]

})

export class AppModule {

}
