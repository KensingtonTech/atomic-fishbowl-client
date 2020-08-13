import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DataService } from 'services/data.service';
import { License } from 'types/license';
import { Subscription } from 'rxjs';

@Component({
  selector: 'licensing-prefs, licensingprefs',
  templateUrl: './licensing-preferences.component.html',
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
              private changeDetectionRef: ChangeDetectorRef) { }

  license: License;
  licenseValid: string;
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
