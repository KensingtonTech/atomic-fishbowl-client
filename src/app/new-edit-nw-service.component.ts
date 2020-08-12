import { Component, OnInit, ChangeDetectionStrategy, EventEmitter, ViewChild, ChangeDetectorRef, NgZone, Input, ElementRef, Output } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { ModalService } from './modal/modal.service';
import { NgForm } from '@angular/forms';
import { UUID } from 'angular2-uuid';
import { NwServer } from 'types/nwserver';
import * as log from 'loglevel';

@Component({
  selector: 'new-edit-nw-service-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-edit-nw-service.component.html'
})

export class NewEditNwServiceModalComponent implements OnInit {

  constructor(private dataService: DataService,
              private modalService: ModalService,
              private toolService: ToolService,
              private changeDetectionRef: ChangeDetectorRef,
              private zone: NgZone ) {}

  id = this.toolService.newEditNwServiceModalId;

  @Input() addingService = true; // if true, we're adding a service.  If false, we're editing a service
  @Input() selectedApiServer: NwServer; // the service we are editing (if we're editing)
  @Output() newApiServer: EventEmitter<NwServer> = new EventEmitter<NwServer>();

  @ViewChild('hostName', { static: true }) hostNameRef: ElementRef;

  apiServerButtonText = 'Save'; // or 'Update'
  passwordRequired = true;
  thumbClass = '';
  testError = '';
  testInProgress = false;
  serviceFormModel = {
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



  addServiceFormValid(form: NgForm): boolean {
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



  resetForm(): void {
    this.serviceFormModel.hostname = '';
    this.serviceFormModel.restPort = 50103;
    this.serviceFormModel.ssl = false;
    this.serviceFormModel.user = '';
    this.serviceFormModel.password = '';
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }


}
