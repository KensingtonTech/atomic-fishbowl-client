import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { License } from 'types/license';
import * as utils from './utils';
import { Logger } from 'loglevel';
import { Subscription } from 'rxjs';
declare var log: Logger;

@Component({
  selector: 'licensing-prefs, licensingprefs',
  template: `

<table *ngIf="license" style="width: 100%">
  <tr>
    <td>
      <b>License</b>
    </td>
    <td>
      <span [class.licenseValid]="license.valid" [class.licenseInvalid]="!license.valid" style="font-weight: bold;">{{licenseValid}}</span>
    </td>
  </tr>
  <tr>
    <td>
      <b>Expiry Date</b>
    </td>
    <td>
      <span>{{license.expiryTime | formatTime}}</span>
    </td>
  </tr>
</table>

  `,
  styles: [`

    .licenseInvalid {
      color: red;
    }

    .licenseValid {
      color: green;
    }

  `]
})

export class LicensingPreferencesComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private toolService: ToolService,
              private changeDetectionRef: ChangeDetectorRef) { }

  private licensingChangedSubscription: Subscription;
  public license: License;
  public licenseValid: string;


  ngOnInit() {
    this.licensingChangedSubscription = this.dataService.licensingChanged.subscribe( license =>  this.onLicenseChanged(license) );
  }



  ngOnDestroy() {
    this.licensingChangedSubscription.unsubscribe();
  }



  onLicenseChanged(license: License) {
    if (!license) {
      return;
    }
    this.license = license;
    this.licenseValid = this.license.valid ? 'Valid' : 'Expired';
    this.changeDetectionRef.markForCheck();
  }

}