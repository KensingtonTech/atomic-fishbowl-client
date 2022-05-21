import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxPanZoomModule } from 'ngx-panzoom';
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
import { MenuModule } from 'primeng/menu';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';

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
import { ToolbarWidgetComponent } from './toolbar-widget/toolbar-widget.component';
import { SplashScreenModalComponent } from './splashscreen-modal/splashscreen-modal.component';
import { NwCollectionModalComponent } from './nw-collection-modal/nw-collection-modal.component';
import { PreferencesModalComponent } from './preferences-modal/preferences-modal.component';
import { ManageUsersModalComponent } from './manage-users-modal/manage-users-modal.component';
import { ClassicGridComponent } from './classic-grid/classic-grid.component';
import { MasonryGridComponent } from './masonry-grid/masonry-grid.component';
import { ClassicControlBarComponent } from './controlbar/controlbar-classic.component';
import { MasonryControlBarComponent } from './controlbar/controlbar-masonry.component';
import { RouterDropdownComponent } from './controlbar/controlbar-router-dropdown.component';
import { ClassicSessionPopupComponent } from './classic-grid/classic-session-popup.component';
import { ClassicTileComponent } from './classic-grid/classic-tile.component';
import { MetaAccordionComponent } from './meta-accordion/meta-accordion.component';
import { MasonryTileComponent } from './masonry-grid/masonry-tile.component';
import { SessionDetailsModalComponent } from './content-details-modal/content-details-modal.component';
import { ServerDownModalComponent } from './serverdown-modal/serverdown-modal.component';
import { LoginFormComponent } from './login-form/login-form.component';
import { CollectionsComponent } from './collections/collections.component';
import { FeedsComponent } from './feeds/feeds.component';
import { FeedWizardComponent } from './feed-wizard/feed-wizard.component';
import { TabContainerComponent } from './tabcontainer-modal/tabcontainer-modal.component';
// import { SaCollectionModalComponent } from './sacollection-modal/sacollection-modal.component.ts.disabled';
import { EulaComponent } from './eula/eula.component';
import { ContentViewerComponent } from './content-viewer/content-viewer.component';
import { MetaWidgetComponent } from './meta-widget/meta-widget.component';
import { ContentCountWidgetComponent } from './content-count-widget/content-count-widget.component';
import { EditUserModalComponent } from './edit-user-modal/edit-user-modal.component';
import { EditNwServiceModalComponent } from './edit-nw-service/edit-nw-service.component';
import { CustomScrollPanelComponent } from './scrollpanel/scrollpanel.component';



@NgModule({
  imports:      [ BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgxPanZoomModule,
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
    DragulaModule.forRoot(),
    PdfViewerModule,
    MenuModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DialogModule,
    TableModule,
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
    ],
    {
      relativeLinkResolution: 'legacy'
    })
  ],
  declarations: [
    AppComponent,
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
    ServerDownModalComponent,
    MetaWidgetComponent,
    CollectionsComponent,
    FeedsComponent,
    FeedWizardComponent,
    TabContainerComponent,
    // SaCollectionModalComponent,
    EulaComponent,
    BoolToStringPipe,
    ContentViewerComponent,
    ContentCountWidgetComponent,
    EditUserModalComponent,
    EditNwServiceModalComponent,
    CustomScrollPanelComponent
  ],
  providers:    [ ConfirmationService ],
  bootstrap:    [ AppComponent ]
})

export class AppModule {}
