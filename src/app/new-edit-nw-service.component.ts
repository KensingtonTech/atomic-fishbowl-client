import { Component, OnInit, ChangeDetectionStrategy, EventEmitter, ViewChild, ChangeDetectorRef, NgZone, Input, ElementRef, Output } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { ModalService } from './modal/modal.service';
import { User } from 'types/user';
import { NgForm } from '@angular/forms';
import { UUID } from 'angular2-uuid';
import { Logger } from 'loglevel';
import { NwServer, NwServers } from 'types/nwserver';
declare var log: Logger;

@Component({
  selector: 'new-edit-nw-service-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<modal id="{{id}}" background="true" secondLevel="true" modalClass="new-edit-nw-server-modal" bodyClass="noselect new-edit-nw-server-modal-body" (opened)="onOpened()">

  <!--ADD A NETWITNESS SERVICE BOX-->
  <div #addServiceBox style="margin-top: 1.052631579em;">

    <form #addServiceForm="ngForm" (ngSubmit)="addApiServerSubmit(addServiceForm)" novalidate>
      <mat-card style="padding: 0.657894737em;">
        <mat-card-content>

          <mat-card-title *ngIf="addingService">
            Add a NetWitness Service
          </mat-card-title>

          <mat-card-title *ngIf="!addingService">
            Edit a NetWitness Service
          </mat-card-title>

          <!--HOSTNAME-->
          <div>
            <mat-form-field class="full-width">
              <input #hostName matNativeControl [(ngModel)]="serviceFormModel.hostname" type="text" name="hostname" autocomplete="off" required>
              <mat-label>Hostname</mat-label>
              <mat-error *ngIf="!serviceFormModel.hostname">Hostname is required</mat-error>
            </mat-form-field><br>
          </div>

          <!--USERNAME-->
          <div>
            <mat-form-field class="full-width">
              <input matNativeControl [(ngModel)]="serviceFormModel.user" type="text" name="user" autocomplete="off" required>
              <mat-label>Username</mat-label>
              <mat-error *ngIf="!serviceFormModel.user">Username is required</mat-error>
            </mat-form-field><br>
          </div>

          <!--PASSWORD-->
          <div>
            <mat-form-field class="full-width">
              <input matNativeControl [(ngModel)]="serviceFormModel.password" type="password" name="password" [required]="passwordRequired" autocomplete="off">
              <mat-label>Password</mat-label>
              <mat-error *ngIf="addingService && !serviceFormModel.password">Password is required</mat-error>
            </mat-form-field><br>
          </div>

          <div>

            <!--REST PORT-->
              <mat-form-field style="width: 4em;">
                <input matNativeControl [(ngModel)]="serviceFormModel.restPort" type="number" name="restPort" autocomplete="off" min="0" max="65535">
                <mat-label>REST Port</mat-label>
                <mat-error *ngIf="!serviceFormModel.restPort">REST Port is required</mat-error>
              </mat-form-field>

            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

            <!--SSL-->
            <mat-checkbox style="vertical-align: baseline;" labelPosition="after" [(ngModel)]="serviceFormModel.ssl" type="checkbox" name="ssl">SSL</mat-checkbox>

            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

            <!--INVESTIGATION DEVICE ID-->
              <mat-form-field style="width: 6em;" pTooltip="In NetWitness, every core service is assigned a numeric identifier, which is used to browse that specific service in Investigation.  You can find the ID for your device by browsing to Investigation in NetWitness, selecting this service, and viewing the URL.  The URL will look like https://hostname/investigation/<DEVICENUMBER> ." showDelay="1000" hideDelay="1000" tooltipStyleClass="investigationTooltip">
                <input matNativeControl [(ngModel)]="serviceFormModel.deviceNumber" type="number" name="deviceNumber" autocomplete="off" required>
                <mat-label>Investigation ID</mat-label>
                <mat-error *ngIf="!serviceFormModel.deviceNumber">Investigation ID is required</mat-error>
              </mat-form-field>

          </div>

          <!--SAVE SERVICE OR TEST OR CANCEL-->
          <mat-card-actions align="end">

            <!-- thumbs-up / thumbs-down icon -->
            <div *ngIf="thumbClass" style="margin-left: 1em; margin-right: auto; line-height: 36px;">{{testError}} <i style="vertical-align: top;" [ngClass]="thumbClass" class="fa fa-lg"></i></div>

            <!-- test button -->
            <button mat-button type="button" (click)="onTestApiServerClicked()" [disabled]="!addServiceFormValid(addServiceForm) || testInProgress" color="accent">Test</button>

            <!-- save / update button -->
            <button mat-button type="submit" [disabled]="!addServiceFormValid(addServiceForm)">{{apiServerButtonText}}</button>

            <!-- cancel button -->
            <button mat-button type="button" (click)="close()">Cancel</button>

          </mat-card-actions>



        </mat-card-content>
      </mat-card>
    </form>

  </div>

</modal>
`
})

export class NewEditNwServiceModalComponent implements OnInit {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService,
              private changeDetectionRef: ChangeDetectorRef,
              private zone: NgZone ) {}

  public id = this.toolService.newEditNwServiceModalId;

  @Input() addingService = true; // if true, we're adding a service.  If false, we're editing a service
  @Input() selectedApiServer: NwServer; // the service we are editing (if we're editing)
  @Output() newApiServer: EventEmitter<NwServer> = new EventEmitter<NwServer>();

  @ViewChild('hostName') hostNameRef: ElementRef;

  public apiServerButtonText = 'Save'; // or 'Update'
  public passwordRequired = true;
  public thumbClass = '';
  public testError = '';
  public testInProgress = false;
  public serviceFormModel = {
    hostname: '',
    restPort: 50103,
    ssl: false,
    user: '',
    password: '',
    deviceNumber: 1
  };


  ngOnInit() {}



  close() {
    this.resetForm();
    this.modalService.close(this.id);
  }



  onOpened() {
    this.thumbClass = '';
    if (this.addingService) {
      this.onAddingNwServiceAfterOpen();
    }
    else {
      this.onEditingApiServiceAfterOpen();
    }
  }



  onAddingNwServiceAfterOpen(): void {
    this.apiServerButtonText = 'Save';
    this.passwordRequired = true;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.zone.runOutsideAngular( () => setTimeout( () => this.hostNameRef.nativeElement.focus(), 20 ) );
  }



  onEditingApiServiceAfterOpen(): void {
    log.debug('NewEditNwServiceModalComponent: onEditingApiServiceAfterOpen()');

    let server = this.selectedApiServer;
    log.debug('NewEditNwServiceModalComponent: onEditingApiServiceAfterOpen(): server:', server);
    let tempModel = {
      hostname: server.host,
      user: server.user,
      restPort: server.port,
      ssl: server.ssl,
      password: '',
      deviceNumber: server.deviceNumber
    };
    this.serviceFormModel = tempModel;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();

    this.passwordRequired = false;
    this.thumbClass = '';
    this.addingService = false;
    this.apiServerButtonText = 'Update';
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    setTimeout( () => {
      // need this to fix stupid material bug where label doesn't clear
      this.hostNameRef.nativeElement.focus();
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    });
  }



  public addServiceFormValid(form: NgForm): boolean {
    // log.debug('NewEditNwServiceModalComponent: addServiceFormValid()');

    if (this.addingService && this.serviceFormModel.hostname && this.serviceFormModel.user && this.serviceFormModel.password && this.serviceFormModel.restPort && this.serviceFormModel.deviceNumber) {
      return true;
    }

    if (!this.addingService && this.serviceFormModel.hostname && this.serviceFormModel.user && this.serviceFormModel.restPort && this.serviceFormModel.deviceNumber) {
      return true;
    }

    return false;
  }



  onTestApiServerClicked(): void {
    if (this.testInProgress) {
      return;
    }

    this.testError = 'Test in progress';
    this.thumbClass = '';
    this.testInProgress = true;

    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();

    let server = {};
    if (this.addingService) {
      server = {
        host: this.serviceFormModel.hostname,
        port: this.serviceFormModel.restPort,
        ssl: this.serviceFormModel.ssl,
        user: this.serviceFormModel.user,
        password: this.dataService.encryptor.encrypt(this.serviceFormModel.password)
      };
    }
    else if (!this.addingService) {
      server = {
        id: this.selectedApiServer.id,
        host: this.serviceFormModel.hostname,
        port: this.serviceFormModel.restPort,
        ssl: this.serviceFormModel.ssl,
        user: this.serviceFormModel.user
      };
      if (this.serviceFormModel.password) {
        // we only set the password if we've changed it
        server['password'] = this.dataService.encryptor.encrypt(this.serviceFormModel.password);
      }
    }
    this.dataService.testNwServer(server)
                    .then( () => {
                      this.testInProgress = false;
                      let msg = 'Connection was successful';
                      this.thumbClass = 'fa-thumbs-up';
                      this.testError = msg;
                    })
                    .catch( (err) => {
                      this.testInProgress = false;
                      let msg = 'Connection failed';
                      this.thumbClass = 'fa-thumbs-down';
                      this.testError = msg;
                      log.info('Test connection failed with error:', err);
                    })
                    .then( () => {
                      this.changeDetectionRef.markForCheck();
                      this.changeDetectionRef.detectChanges();
                    });
  }



  addApiServerSubmit(f: NgForm) {
    // log.debug("NewEditNwServiceModalComponent: addApiServerSubmit(): f:", f);
    this.resetForm();
    let encPassword = this.dataService.encryptor.encrypt(f.value.password);
    let newServer: NwServer = {
      id: UUID.UUID(),
      host: f.value.hostname,
      port: f.value.restPort,
      ssl: f.value.ssl,
      user: f.value.user,
      password: encPassword,
      deviceNumber: f.value.deviceNumber,
      friendlyName: f.value.user + '@' + f.value.hostname + ':' + f.value.restPort + ' (' + f.value.deviceNumber + ')'
    };
    if (!this.addingService) {
      newServer.id = this.selectedApiServer.id;
    }
    if (newServer.ssl) {
      // newServer.friendlyName = newServer.friendlyName + ':ssl';
      newServer.friendlyName = f.value.user + '@' + f.value.hostname + ':' + f.value.restPort + ':ssl' + ' (' + f.value.deviceNumber + ')';
    }
    log.debug('NewEditNwServiceModalComponent: addNwServer() newServer:', newServer);

    let apiMethod = this.addingService ? this.dataService.addNwServer.bind(this.dataService) : this.dataService.editNwServer.bind(this.dataService);

    apiMethod(newServer)
                        .then( () => {
                          if (this.addingService) {
                            this.newApiServer.emit(newServer);
                          }
                          this.close();
                          this.resetForm();
                        })
                        .catch( (err) => {
                          let error = JSON.parse(err);
                          log.error('NewEditNwServiceModalComponent: addApiServerSubmit(): error response from server:', error.error);
                        });

  }



  public resetForm(): void {
    this.serviceFormModel.hostname = '';
    this.serviceFormModel.restPort = 50103;
    this.serviceFormModel.ssl = false;
    this.serviceFormModel.user = '';
    this.serviceFormModel.password = '';
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }


}
