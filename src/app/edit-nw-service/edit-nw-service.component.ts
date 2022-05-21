import {
  Component,
  ChangeDetectionStrategy,
  EventEmitter,
  ViewChild,
  ChangeDetectorRef,
  NgZone,
  Input,
  ElementRef,
  Output,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { DataService } from 'services/data.service';
import { NgForm } from '@angular/forms';
import { v4 as UUIDv4 } from 'uuid';
import { NwServer, NwServerTest } from 'types/nwserver';
import * as log from 'loglevel';
import * as utils from '../utils';

@Component({
  selector: 'app-edit-nw-service-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-nw-service.component.html',
  styleUrls: [
    './edit-nw-service.component.scss'
  ]
})

export class EditNwServiceModalComponent implements OnChanges {

  constructor(
    private dataService: DataService,
    private changeDetectionRef: ChangeDetectorRef,
    private zone: NgZone
  ) {}


  @Input() addingService = true; // if true, we're adding a service.  If false, we're editing a service
  @Input() selectedApiServer?: NwServer; // the service we are editing (if we're editing)
  @Output() newApiServerId = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('hostName', { static: true }) hostNameRef: ElementRef;

  passwordRequired = true;
  testError = '';
  testInProgress = false;
  testSuccess?: boolean;

  name = '';
  hostname = '';
  user = '';
  password = '';
  restPort = 50103;
  ssl = false;
  deviceNumber = 1;



  ngOnChanges(changes: SimpleChanges): void {
    if (utils.firstOrChangedSimpleChange('addingService', changes) || utils.firstOrChangedSimpleChange('selectedApiServer', changes)) {
      this.resetForm();
      if (this.addingService) {
        this.onAddingNwService();
      }
      else if (this.selectedApiServer) {
        this.onEditingApiService(this.selectedApiServer);
      }
    }
  }



  resetForm(): void {
    this.hostname = '';
    this.restPort = 50103;
    this.ssl = false;
    this.user = '';
    this.password = '';
    this.testSuccess = undefined;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  close() {
    this.resetForm();
    this.closed.next();
  }



  onAddingNwService(): void {
    this.passwordRequired = true;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.zone.runOutsideAngular(
      () => setTimeout(
        () => this.hostNameRef.nativeElement.focus(),
        20
      )
    );
  }



  onEditingApiService(server: NwServer): void {
    log.debug('EditNwServiceModalComponent: onEditingApiService(): ', {server});
    this.name = server.friendlyName;
    this.hostname = server.host;
    this.user = server.user;
    this.restPort = server.port;
    this.ssl = server.ssl;
    this.deviceNumber = server.deviceNumber;
    this.password = '';
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();

    this.passwordRequired = false;
    this.addingService = false;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    setTimeout( () => {
      // need this to fix stupid material bug where label doesn't clear
      this.hostNameRef.nativeElement.focus();
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    });
  }



  addServiceFormValid(): boolean {
    // log.debug('EditNwServiceModalComponent: addServiceFormValid()');
    if (this.addingService && this.hostname && this.user && this.password && this.restPort && this.deviceNumber) {
      return true;
    }

    if (!this.addingService && this.hostname && this.user && this.restPort && this.deviceNumber) {
      return true;
    }

    return false;
  }



  async onTestApiServerClicked(selectedServer?: NwServer): Promise<void> {
    log.debug('EditNwServiceModalComponent: onTestApiServerClicked()');
    if (this.testInProgress) {
      return;
    }

    this.testError = 'Test in progress';
    this.testInProgress = true;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();

    let server: NwServerTest;
    if (!selectedServer) {
      server = {
        host: this.hostname.trim(),
        port: this.restPort,
        ssl: this.ssl,
        user: this.user.trim(),
        password: this.dataService.encrypt(this.password.trim())
      };
    }
    else {
      server = {
        id: selectedServer.id,
        host: this.hostname.trim(),
        port: this.restPort,
        ssl: this.ssl,
        user: this.user.trim()
      };
      if (this.password) {
        // we only set the password if we've changed it
        server.password = this.dataService.encrypt(this.password.trim());
      }
    }
    try {
      await this.dataService.testNwServer(server);
      this.testInProgress = false;
      const msg = 'Connection was successful';
      this.testSuccess = true;
      this.testError = msg;
    }
    catch (error) {
      this.testInProgress = false;
      const msg = 'Connection failed';
      this.testSuccess = false;
      this.testError = msg;
      log.info('Test connection failed with error:', error);
    }
    finally {
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    }
  }



  async addServerSubmit() {
    log.debug('EditNwServiceModalComponent: addServerSubmit()');
    const encPassword = this.dataService.encrypt(this.password.trim());
    const name = this.name.trim();
    const newServer: Optional<NwServer, 'password'> = {
      id: !this.addingService && this.selectedApiServer
        ? this.selectedApiServer.id
        : UUIDv4(),
      host: this.hostname.trim(),
      port: this.restPort,
      ssl: this.ssl,
      user: this.user.trim(),
      password: encPassword,
      deviceNumber: this.deviceNumber,
      friendlyName: name.trim() || `${this.user}@${this.hostname}:${this.restPort}${this.ssl ? ':ssl' : ''} (${this.deviceNumber})`
    };
    if (!this.addingService && !this.password.trim()) {
      delete newServer.password;
    }
    log.debug('EditNwServiceModalComponent: addServerSubmit() newServer:', newServer);

    const apiMethod = this.addingService
      ? this.dataService.addNwServer.bind(this.dataService)
      : this.dataService.editNwServer.bind(this.dataService);

    try {
      await apiMethod(newServer as NwServer);
      this.newApiServerId.emit(newServer.id);
      this.close();
      this.resetForm();
    }
    catch (err: any) {
      const error = JSON.parse(err);
      log.error('EditNwServiceModalComponent: addServerSubmit(): error response from server:', error.error);
    }
    finally {
      this.resetForm();
    }
  }
}
