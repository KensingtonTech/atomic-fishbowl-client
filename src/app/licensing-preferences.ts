import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { License } from 'types/license';
import { Subscription } from 'rxjs';

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

  public license: License;
  public licenseValid: string;
  private subscriptions = new Subscription;


  ngOnInit() {
    this.subscriptions.add(this.dataService.licensingChanged.subscribe( license =>  this.onLicenseChanged(license) ));
  }



  ngOnDestroy() {
    this.subscriptions.unsubscribe();
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
