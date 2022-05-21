import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { DataService } from 'services/data.service';
import { defaultNwQueries } from '../default-nw-queries';
import { defaultSaQueries } from '../default-sa-queries';
import { SelectItem } from 'primeng/api/selectitem';
import { Preferences, MasonryKey } from 'types/preferences';
import { Subscription } from 'rxjs';
import { ToolService } from 'services/tool.service';
import * as log from 'loglevel';

@Component({
  selector: 'app-preferences-modal',
  templateUrl: './preferences-modal.component.html',
  styleUrls: [
    './preferences-modal.component.scss'
  ]
})

export class PreferencesModalComponent implements OnInit, OnDestroy {

  constructor(
    private dataService: DataService,
    private toolService: ToolService,
    private changeDetectionRef: ChangeDetectorRef
  ) {}

  @Input() displayPreferencesModal = false;
  @Output() displayPreferencesModalChange = new EventEmitter<boolean>();

  defaultNwQueries = defaultNwQueries;
  defaultNwQueriesOptions: SelectItem[] = [];

  defaultSaQueries = defaultSaQueries;
  defaultSaQueriesOptions: SelectItem[] = [];

  displayedNwKeysString: string;
  masonryNwKeysString: string;
  displayedSaKeysString: string;
  masonrySaKeysString: string;

  masonryColumnWidth: number;

  preferences: Preferences;

  serviceTypeOptions: SelectItem[] = [
    { label: 'NetWitness', value: 'nw' },
    { label: 'Symantec SA', value: 'sa' }
  ];

  nwEnabled = false;
  saEnabled = false;
  selectedTabIndex = 0;
  autoScrollSpeed = 0;

  // Subscriptions
  private subscriptions = new Subscription();



  ngOnInit(): void {
    for (const query of this.defaultNwQueries) {
      const option: SelectItem = { label: query.text, value: query.text };
      this.defaultNwQueriesOptions.push(option);
    }
    for (const query of this.defaultSaQueries) {
      const option: SelectItem = { label: query.text, value: query.text };
      this.defaultSaQueriesOptions.push(option);
    }

    this.subscriptions.add(
      this.dataService.preferencesChanged.subscribe(
        (preferences) => this.onPreferencesChanged(preferences)
      )
    );

    this.masonryColumnWidth = this.toolService.getNumberPreference('masonryColumnWidth', 350);

    this.autoScrollSpeed = this.toolService.getNumberPreference('autoScrollSpeed', 200);

    this.changeDetectionRef.markForCheck();
  }



  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }



  getMasonryKeysString(masonryKeys: MasonryKey[]): string {
    return masonryKeys
      .map( (masonryKey) => `${masonryKey.key},${masonryKey.friendly}`)
      .join('\n');
  }



  getDisplayedKeysArrayFromString(keysStr: string): string[] {
    return keysStr
      .split('\n')
      .map(key => key.trim())
      .filter(line => !line.match(/^$/));
  }



  getMasonryKeysFromString(keysStr: string): MasonryKey[] {
    return keysStr
      .split('\n')
      .map( (keyStr) => keyStr.trim() )
      .filter( keyStr => !keyStr.match(/^$/) )
      .map( (keyStr) => {
        const [key, friendly] = keyStr.split(',');
        return {
          key: key.trim(),
          friendly: friendly?.trim() ?? ''
        };
      });
  }



  close(): void {
    this.displayPreferencesModalChange.next(false);
  }



  onClose(): void {
    // log.debug('PreferencesModalComponent: onClose()';
    // this.resetForm();
  }



  onPreferencesChanged(preferences?: Preferences) {
    if (!preferences) {
      return;
    }
    if (Object.keys(preferences).length === 0) {
      return;
    }
    log.debug('PreferencesModalComponent: onPreferencesChanged(): preferences:', preferences);
    this.preferences = preferences;
    if (preferences.serviceTypes.nw) {
      this.nwEnabled = true;
      this.displayedNwKeysString = this.preferences.nw.displayedKeys.join('\n');
      this.masonryNwKeysString = this.getMasonryKeysString(this.preferences.nw.masonryKeys);
    }
    if (preferences.serviceTypes.sa) {
      this.saEnabled = true;
      this.displayedSaKeysString = this.preferences.sa.displayedKeys.join('\n');
      this.masonrySaKeysString = this.getMasonryKeysString(this.preferences.sa.masonryKeys);
    }
    this.changeDetectionRef.markForCheck();
  }



  async onSubmitPreferences(): Promise<void> {
    log.debug('PreferencesModalComponent: onSubmitPreferences()');

    this.toolService.setPreference('masonryColumnWidth', this.masonryColumnWidth);
    this.toolService.masonryColumnWidthChanged.next(this.masonryColumnWidth);

    this.toolService.setPreference('autoScrollSpeed', this.autoScrollSpeed);
    this.toolService.masonryAutoscrollSpeedChanged.next(this.autoScrollSpeed);

    const prefs: Preferences = this.preferences;
    if (this.preferences.serviceTypes.nw) {
      prefs.nw.masonryKeys = this.getMasonryKeysFromString(this.masonryNwKeysString);
      prefs.nw.displayedKeys = this.getDisplayedKeysArrayFromString(this.displayedNwKeysString);
    }
    if (this.preferences.serviceTypes.sa) {
      prefs.sa.masonryKeys = this.getMasonryKeysFromString(this.masonrySaKeysString);
      prefs.sa.displayedKeys = this.getDisplayedKeysArrayFromString(this.displayedSaKeysString);
    }

    await this.dataService.setPreferences(prefs);
    this.close();
  }



  onServiceTypeChanged(): void {
    log.debug('PreferencesModalComponent: onServiceTypeChanged()');
    this.preferences.serviceTypes.nw = this.nwEnabled;
    this.preferences.serviceTypes.sa = this.saEnabled;
    this.changeDetectionRef.markForCheck();
  }
}
