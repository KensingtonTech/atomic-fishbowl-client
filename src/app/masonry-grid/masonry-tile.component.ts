import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, Input, Inject, forwardRef, ChangeDetectorRef, OnChanges, ElementRef, NgZone, ViewChild } from '@angular/core';
import { MasonryGridComponent } from './masonry-grid.component';
import { DataService } from 'services/data.service';
import * as log from 'loglevel';
import * as utils from '../utils';

interface MasonryKey {
  key: string;
  friendly: string;
}

interface TableEntry {
  key: string;
  value: string;
}


@Component({
  selector: 'masonry-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './masonry-tile.component.html'
})

export class MasonryTileComponent implements OnInit, AfterViewInit, OnChanges {

  constructor(  private changeDetectionRef: ChangeDetectorRef,
                public dataService: DataService,
                private el: ElementRef,
                private zone: NgZone,
                @Inject(forwardRef(() => MasonryGridComponent)) private parent: MasonryGridComponent ) {}

  utils = utils;

  @ViewChild('image') imageRef: ElementRef;

  @Input() content: any;
  @Input() sessionId: number;
  @Input() masonryKeys: MasonryKey[];
  @Input() masonryColumnWidth: number;
  @Input() serviceType: string; // 'nw' or 'sa'
  @Input() collectionId: string = null;
  @Input() margin: number;
  @Input() displayTextArea = true;

  session; // holds meta, among other things
  masonryMeta = [];
  imageSource: string;
  extraClass: string;
  textAreaList: string[] = [];
  textAreaTableItems: TableEntry[] = [];
  loadImage = false;



  ngOnInit(): void {
    // log.debug('MasonryTileComponent: ngOnInit()');

    const parentSession = this.parent.sessions[this.sessionId];

    const session = { meta: {}, id: this.sessionId };
    for (const key in parentSession.meta) {
      // de-dupe meta
      if (parentSession.meta.hasOwnProperty(key)) {
        session['meta'][key] = utils.uniqueArrayValues(parentSession.meta[key]);
      }
    }
    this.session = session;

    this.updateMasonryMeta();

    // set up the image
    switch (this.content.contentType) {
      case 'image':
        this.imageSource = '/collections/' + this.collectionId + '/' + utils.uriEncodeFilename(this.content.thumbnail);
        break;
      case 'pdf':
        this.imageSource = '/collections/' + this.collectionId + '/' + utils.uriEncodeFilename(this.content.thumbnail);
        this.extraClass = 'pdf';
        break;
      case 'office':
        this.imageSource = '/collections/' + this.collectionId + '/' + utils.uriEncodeFilename(this.content.thumbnail);
        this.extraClass = this.content.contentSubType;
        break;
      case 'encryptedZipEntry':
        this.imageSource = '/resources/zip_icon_locked.png';
        break;
      case 'unsupportedZipEntry':
        this.imageSource = '/resources/zip_icon_unknown.png';
        break;
      case 'encryptedRarEntry':
        this.imageSource = '/resources/rar_icon_locked.png';
        break;
      case 'encryptedRarTable':
        this.imageSource = '/resources/rar_icon_locked.png';
        break;
      case 'hash':
        switch (this.content.hashType) {
          case 'md5':
            this.imageSource = '/resources/md5_hash_icon.png';
            break;
          case 'sha1':
            this.imageSource = '/resources/sha1_hash_icon.png';
            break;
          case 'sha256':
            this.imageSource = '/resources/sha256_hash_icon.png';
            break;
        }
    }

    // set up the text area list items
    let msg: string;
    if (['encryptedRarEntry', 'encryptedZipEntry'].includes(this.content.contentType)) {
      msg = `Encrypted file within a ${utils.toCaps(this.content.archiveType)} archive`;
    }
    if (this.content.contentType === 'unsupportedZipEntry') {
      msg = `Unsupported ZIP format`;
    }
    if (this.content.contentType === 'encryptedRarTable') {
      msg = `RAR archive has an encrypted table`;
    }
    if (this.content.contentType === 'hash') {
      msg = `Found executable matching ${utils.toCaps(this.content.hashType)} hash value`;
    }
    if (['office', 'pdf'].includes(this.content.contentType) && this.content.textDistillationEnabled && 'textTermsMatched' in this.content && this.content.textTermsMatched.length > 0) {
      const type = this.content.contentType === 'pdf' ? 'PDF' : utils.capitalizeFirstLetter(this.content.contentSubType);
      msg = `Found ${type} document containing text term`;
    }
    if (['office', 'pdf'].includes(this.content.contentType) && this.content.regexDistillationEnabled && 'regexTermsMatched' in this.content && this.content.regexTermsMatched.length > 0) {
      const type = this.content.contentType === 'pdf' ? 'PDF' : utils.capitalizeFirstLetter(this.content.contentSubType);
      msg = `Found ${type} document matching Regex term`;
    }
    if (msg) {
      this.textAreaList.push(msg);
    }

    // set up the text area table items
    this.masonryMeta.forEach( struct => {
      this.textAreaTableItems.push( { key: struct.friendly || struct.key, value: struct.value } );
    });

    if (this.content.contentType === 'hash') {
      let struct = { key: `${utils.toCaps(this.content.hashType)} Hash:`, value: this.content.hashValue};
      this.textAreaTableItems.push(struct);

      if (this.content.hashFriendly) {
        struct = { key: `${utils.toCaps(this.content.hashType)} Description:`, value: this.content.hashFriendly};
        this.textAreaTableItems.push(struct);
      }

      struct = { key: `Filename:`, value: utils.pathToFilename(this.content.contentFile)};
      this.textAreaTableItems.push(struct);
    }

    if (['pdf', 'office'].includes(this.content.contentType) && this.content.contentFile) {
      const type = this.content.contentType === 'pdf' ? 'PDF' : 'Office';
      const struct = { key: `${type} Filename:`, value: utils.pathToFilename(this.content.contentFile)};
      this.textAreaTableItems.push(struct);
    }

    if (this.content.isArchive) {
      const struct = { key: `Archive File:`, value: utils.pathToFilename(this.content.contentFile)};
      this.textAreaTableItems.push(struct);
    }

    if (this.content.fromArchive) {
      const struct = { key: `Archived Filename:`, value: utils.pathToFilename(this.content.archiveFilename)};
      this.textAreaTableItems.push(struct);
    }

    if (['encryptedZipEntry', 'encryptedRarEntry'].includes(this.content.contentType)) {
      const struct = { key: `Encrypted File:`, value: utils.pathToFilename(this.content.contentFile)};
      this.textAreaTableItems.push(struct);
    }

    if (this.content.textDistillationEnabled && 'textTermsMatched' in this.content && this.content.textTermsMatched.length > 0) {
      const struct = { key: `Matched Text:`, value: this.content.textTermsMatched};
      this.textAreaTableItems.push(struct);
    }

    if (this.content.regexDistillationEnabled && 'regexTermsMatched' in this.content && this.content.regexTermsMatched.length > 0) {
      const struct = { key: `Matched RegEx:`, value: this.content.regexTermsMatched};
      this.textAreaTableItems.push(struct);
    }

  }



  ngAfterViewInit(): void {
    this.changeDetectionRef.detach();
  }



  ngOnChanges(values): void {
    // log.debug('MasonryTileComponent: ngOnChanges(): values:', values);
    this.updateMasonryMeta();
    this.changeDetectionRef.reattach();
    setTimeout( () => this.changeDetectionRef.detach(), 0);
  }



  onImageLoaded() {
    // log.debug('MasonryTileComponent: onImageLoaded()');
    const event = new Event('onloaded');
    this.zone.runOutsideAngular( () => {
        this.el.nativeElement.dispatchEvent(event);
    });
  }



  async onImageError() {
    log.debug('MasonryTileComponent: onImageError()');
    // we should load an error image here
    this.imageSource = '/resources/error_icon.png';
    this.changeDetectionRef.reattach();
    setTimeout( () => this.changeDetectionRef.detach(), 0);
    const event = new Event('onloaded');
    this.zone.runOutsideAngular( () => {
      this.el.nativeElement.dispatchEvent(event);
    });
  }



  updateMasonryMeta() {
    if (this.masonryKeys && this.session && this.masonryKeys.length !== 0 && 'meta' in this.session && Object.keys(this.session.meta).length !== 0) {
      const masonryMeta = [];
      for (let i = 0; i < this.masonryKeys.length; i++) {
        const masonryKey = this.masonryKeys[i];
        if (masonryKey.key in this.session.meta) {
          const struct = { key: masonryKey.key, friendly: masonryKey.friendly, value: this.session.meta[masonryKey.key]};
          masonryMeta.push(struct);
        }
      }
      this.masonryMeta = masonryMeta;
    }
  }



  async getImage(origUrl: string) {
    // we don't want to bind this directly to the image with an async pipe as it gets stuck in a loop
    return  await this.dataService.getImage(origUrl);
  }



}
