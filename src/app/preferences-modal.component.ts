import { Component, ChangeDetectionStrategy, ElementRef, ViewChild, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { DataService } from './data.service';
import { ModalService } from './modal/modal.service';
import { NgForm } from '@angular/forms';
import { defaultQueries } from './default-queries';
import { LoggerService } from './logger-service';

@Component({
  selector: 'preferences-modal',
  //changeDetection: ChangeDetectionStrategy.OnPush,
/*
<select style="width: 200px;" [(ngModel)]="selectedCollection" (ngModelChange)="collectionSelected($event)">
  <option *ngFor="let collection of collections" [ngValue]="collection">{{collection.name}}</option>
</select></a>
*/
/*
<a><button (click)="addNwServer()">Save</button> <button (click)="hideServiceAddBox()">Cancel</button></a>
*/
//[disabled]="!addServiceForm.form.valid"
  templateUrl: './preferences-modal.component.html',
  styleUrls: ['./preferences-modal.component.css']

})

export class PreferencesModalComponent {

  constructor(private dataService : DataService,
              private modalService: ModalService,
              private changeDetectionRef: ChangeDetectorRef,
              private loggerService: LoggerService ) {}

  //enabled: boolean = false;

  @Input('enabled') enabled: boolean;
  @ViewChild('topDiv') topDiv: ElementRef;

  public id: string = 'preferences-modal';

  private defaultNwInvestigateUrl: string = '';
  private defaultDefaultNwquery: string = "vis.level exists || content = 'application/pdf'";
  private defaultMinX: number = 1;
  private defaultMinY: number = 1;
  private defaultGsPath: string = '/usr/bin/gs';
  private defaultPdftotextPath: string = '/usr/bin/pdftotext';
  private defaultUnrarPath: string = '/usr/bin/unrar';
  private defaultDisplayedKeys = [ 'size', 'service', 'ip.src', 'ip.dst', 'alias.host', 'city.dst', 'country.dst', 'action', 'content', 'ad.username.src', 'ad.computer.src', 'filename', 'client'];
  private defaultDefaultImageLimit: number = 1000;
  private defaultDefaultRollingHours: number = 1;
  public defaultQueries = defaultQueries;
  private defaultMasonryColumnSize: number = 350;

  private defaultMasonryKeys: any = [
                                { key: 'alias.host', friendly: 'Hostname' },
                                { key: 'ad.username.src', friendly: 'AD User' },
                                { key: 'ad.computer.src', friendly: 'AD Computer' },
                                { key: 'ad.domain.src', friendly: 'AD Domain' }
                              ];

  public preferencesModel: any = { nwInvestigateUrl: this.defaultNwInvestigateUrl,
                                    defaultNwQuery: this.defaultDefaultNwquery,
                                    minX: this.defaultMinX,
                                    minY: this.defaultMinY,
                                    gsPath: this.defaultGsPath,
                                    pdftotextPath: this.defaultPdftotextPath,
                                    displayedKeys: this.getDisplayedKeysValue(this.defaultDisplayedKeys),
                                    defaultImageLimit: this.defaultDefaultImageLimit,
                                    defaultRollingHours: this.defaultDefaultRollingHours,
                                    defaultQuerySelection: this.defaultQueries[0].text, //this only has effect on the first run of 221B.  After the prefs have been set, it will be read in from the prefs
                                    unrarPath: this.defaultUnrarPath,
                                    masonryColumnSize: this.defaultMasonryColumnSize,
                                    masonryKeys: this.getMasonryKeysValue(this.defaultMasonryKeys)
                                  }

  getDisplayedKeysValue(a: any): string {
    var text: string = "";
    for (var i = 0; i < a.length; i++) {
      text += a[i];
      if (i < a.length - 1) { //omit the newline on the last line
       text += '\n';
      }
    }
    return text;
  }

  getMasonryKeysValue(a: any): string {
    var text: string = "";
    for (var i = 0; i < a.length; i++) {
      text += a[i].key + ',' + a[i].friendly;
      if (i < a.length - 1) { //omit the newline on the last line
       text += '\n';
      }
    }
    return text;
  }

  setDisplayedKeysValue(v: string): any {
    let newarray = v.split('\n');
    return newarray;
  }

  setMasonryKeysValue(v: string): any {
    let newArray = v.split('\n');
    let keysArray = [];
    for (let i=0; i < newArray.length; i++) {
      let x = {};
      let y = newArray[i].split(',');
      x['key'] = y[0];
      x['friendly'] = y[1];
      keysArray.push(x);
    }
    return keysArray;
  }

  cancel(): void {
    //this.resetForm();
    this.modalService.close(this.id);
  }

  closeModal(): void {
    this.modalService.close(this.id);
  }

  cancelledEventReceived(): void {
    //console.log("PreferencesModalComponent: cancelledEventReceived()");
    //this.resetForm();
  }

  onOpen(): void {
    console.log("PreferencesModalComponent: onOpen()");
    this.dataService.getPreferences()
                    .then( (prefs: any) => {  console.log("prefs:", prefs);
                                              if ( 'nwInvestigateUrl' in prefs ) {
                                                this.preferencesModel.nwInvestigateUrl = prefs.nwInvestigateUrl;
                                              }
                                              if ( 'defaultQuerySelection' in prefs ) {
                                                this.preferencesModel.defaultQuerySelection = prefs.defaultQuerySelection;
                                              }
                                              if ( 'defaultNwQuery' in prefs ) {
                                                this.preferencesModel.defaultNwQuery = prefs.defaultNwQuery;
                                              }
                                              if ( 'minX' in prefs ) {
                                                this.preferencesModel.minX = prefs.minX;
                                              }
                                              if ( 'minY' in prefs ) {
                                                this.preferencesModel.minY = prefs.minY;
                                              }
                                              if ( 'gsPath' in prefs ) {
                                                this.preferencesModel.gsPath = prefs.gsPath;
                                              }
                                              if ( 'pdftotextPath' in prefs ) {
                                                this.preferencesModel.pdftotextPath = prefs.pdftotextPath;
                                              }
                                              if ( 'unrarPath' in prefs ) {
                                                this.preferencesModel.unrarPath = prefs.unrarPath;
                                              }
                                              if ( 'displayedKeys' in prefs ) {
                                                this.preferencesModel.displayedKeys = this.getDisplayedKeysValue(prefs.displayedKeys);
                                              }
                                              if ( 'defaultImageLimit' in prefs ) {
                                                this.preferencesModel.defaultImageLimit = prefs.defaultImageLimit;
                                              }
                                              if ( 'defaultRollingHours' in prefs ) {
                                                this.preferencesModel.defaultRollingHours = prefs.defaultRollingHours;
                                              }
                                              if ( 'masonryColumnSize' in prefs ) {
                                                this.preferencesModel.masonryColumnSize = prefs.masonryColumnSize;
                                              }
                                              if ( 'masonryKeys' in prefs ) {
                                                this.preferencesModel.masonryKeys = this.getMasonryKeysValue(prefs.masonryKeys);
                                              }
                                              this.changeDetectionRef.markForCheck();
                                            })
                    .then( () => console.log(this.preferencesModel) );
  }

  submitPreferences(f: any): void {
    console.log("PreferencesModalComponent: submitPreferences()", f);
    let prefs = {
      nwInvestigateUrl: f.value.nwInvestigateUrl,
      defaultNwQuery: f.value.defaultNwQuery,
      minX: f.value.minX,
      minY: f.value.minY,
      gsPath: f.value.gsPath,
      pdftotextPath: f.value.pdftotextPath,
      displayedKeys: this.setDisplayedKeysValue(f.value.displayedKeys),
      defaultRollingHours: f.value.defaultRollingHours,
      defaultQuerySelection: f.value.defaultQuerySelection,
      unrarPath: f.value.unrarPath,
      defaultImageLimit: f.value.defaultImageLimit,
      masonryColumnSize: f.value.masonryColumnSize,
      masonryKeys: this.setMasonryKeysValue(f.value.masonryKeys)
    }
    this.dataService.setPreferences(prefs)
                    .then( () => this.closeModal() );
  }

}
