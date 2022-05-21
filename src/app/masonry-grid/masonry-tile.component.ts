import {
  Component,
  OnInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  Input,
  Inject,
  forwardRef,
  ChangeDetectorRef,
  OnChanges,
  ElementRef,
  NgZone,
  ViewChild
} from '@angular/core';
import { MasonryGridComponent } from './masonry-grid.component';
import { DataService } from 'services/data.service';
import * as log from 'loglevel';
import * as utils from '../utils';
import { ContentItem, Session } from 'types/collection';

interface MasonryKey {
  key: string;
  friendly: string;
}

interface MasonryMeta {
  key: string;
  friendly: string;
  value: string | number | string[] | number[];
}

interface TableEntry {
  key: string;
  value: string | number;
}


@Component({
  selector: 'app-masonry-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './masonry-tile.component.html',
  styleUrls: [
    './masonry-tile.component.scss'
  ]
})

export class MasonryTileComponent implements OnInit, AfterViewInit, OnChanges {

  constructor(
    private changeDetectionRef: ChangeDetectorRef,
    public dataService: DataService,
    private el: ElementRef,
    private zone: NgZone,
    @Inject(forwardRef(() => MasonryGridComponent)) private parent: MasonryGridComponent
  ) {}

  utils = utils;

  @ViewChild('image') imageRef: ElementRef;
  @Input() content: ContentItem;
  @Input() sessionId: number;
  @Input() masonryKeys: MasonryKey[];
  @Input() masonryColumnWidth: number;
  @Input() serviceType: 'nw' | 'sa'; // 'nw' or 'sa'
  @Input() collectionId?: string;
  @Input() displayTextArea = true;

  session: Session; // holds meta, among other things
  masonryMeta: MasonryMeta[] = [];
  imageSource: string;
  extraClass: string;
  textAreaList: string[] = [];
  textAreaTableItems: TableEntry[] = [];
  loadImage = false;
  fileIconClass?: string;

  ngOnInit(): void {
    // log.debug('MasonryTileComponent: ngOnInit()');
    const parentSession = this.parent.sessions[this.sessionId];
    const session: Session = {
      meta: {},
      id: this.sessionId
    };
    // de-dupe meta
    for (const key in parentSession.meta) {
      if (parentSession.meta.hasOwnProperty(key)) {
        session.meta[key] = utils.deduplicateArray(parentSession.meta[key]);
      }
    }
    this.session = session;

    this.updateMasonryMeta();

    // set up the image
    switch (this.content.contentType) {
      case 'image':
        this.imageSource = `/collections/${this.collectionId}/${utils.uriEncodeFilename(this.content.thumbnail as string)}`;
        break;
      case 'pdf':
        this.imageSource = `/collections/${this.collectionId}/${utils.uriEncodeFilename(this.content.thumbnail as string)}`;
        this.extraClass = 'pdf';
        this.fileIconClass = 'fa-file-pdf-o';
        break;
      case 'office':
        this.imageSource = `/collections/${this.collectionId}/${utils.uriEncodeFilename(this.content.thumbnail as string)}`;
        this.extraClass = this.content.contentSubType;
        switch (this.content.contentSubType) {
          case 'excel':
            this.fileIconClass = 'fa-file-excel-o';
            break;
          case 'powerpoint':
            this.fileIconClass = 'fa-file-powerpoint-o';
            break;
          case 'word':
            this.fileIconClass = 'fa-file-word-o';
            break;
        }
        break;
      case 'encryptedZipEntry':
        this.imageSource = '/resources/zip_icon_locked.png';
        this.fileIconClass = 'fa-lock';
        break;
      case 'unsupportedZipEntry':
        this.imageSource = '/resources/zip_icon_unknown.png';
        this.fileIconClass = 'fa-lock';
        break;
      case 'encryptedRarEntry':
        this.imageSource = '/resources/rar_icon_locked.png';
        this.fileIconClass = 'fa-lock';
        break;
      case 'encryptedRarTable':
        this.imageSource = '/resources/rar_icon_locked.png';
        this.fileIconClass = 'fa-lock';
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
    let msg: string | undefined;
    if (['encryptedRarEntry', 'encryptedZipEntry'].includes(this.content.contentType)) {
      msg = `Encrypted file within a ${this.content.archiveType.toUpperCase()} archive`;
    }
    if (this.content.contentType === 'unsupportedZipEntry') {
      msg = `Unsupported ZIP format`;
    }
    if (this.content.contentType === 'encryptedRarTable') {
      msg = `RAR archive has an encrypted table`;
    }
    if (this.content.contentType === 'hash' && this.content.hashType) {
      msg = `Found executable matching ${this.content.hashType.toUpperCase()} hash value`;
    }
    if (['office', 'pdf'].includes(this.content.contentType) && this.content.textDistillationEnabled && 'textTermsMatched' in this.content && this.content.textTermsMatched && this.content.textTermsMatched.length > 0) {
      const type = this.content.contentType === 'pdf' ? 'PDF' : utils.capitalizeFirstLetter(this.content.contentSubType);
      msg = `Found ${type} document containing text term`;
    }
    if (['office', 'pdf'].includes(this.content.contentType) && this.content.regexDistillationEnabled && 'regexTermsMatched' in this.content && this.content.regexTermsMatched && this.content.regexTermsMatched.length > 0) {
      const type = this.content.contentType === 'pdf' ? 'PDF' : utils.capitalizeFirstLetter(this.content.contentSubType);
      msg = `Found ${type} document matching Regex term`;
    }
    if (msg) {
      this.textAreaList.push(msg);
    }

    // set up the text area table items
    this.textAreaTableItems = this.masonryMeta.map(
      (item) => ({
        key: item.friendly ?? item.key,
        value: utils.isArray(item.value)
          ? (item.value as unknown[]).join(', ')
          : item.value as string | number
      })
    );

    if (this.content.contentType === 'hash' && this.content.hashType && this.content.hashValue) {
      let item = {
        key: `${this.content.hashType.toUpperCase()} Hash:`,
        value: this.content.hashValue
      };
      this.textAreaTableItems.push(item);

      if (this.content.hashFriendly) {
        item = {
          key: `${this.content.hashType} Description:`,
          value: this.content.hashFriendly
        };
        this.textAreaTableItems.push(item);
      }

      item = {
        key: `Filename:`,
        value: utils.pathToFilename(this.content.contentFile)
      };
      this.textAreaTableItems.push(item);
    }

    if (['pdf', 'office'].includes(this.content.contentType) && this.content.contentFile) {
      const type = this.content.contentType === 'pdf' ? 'PDF' : 'Office';
      const item = {
        key: `${type} Filename:`,
        value: utils.pathToFilename(this.content.contentFile)
      };
      this.textAreaTableItems.push(item);
    }

    if (this.content.isArchive) {
      const item = {
        key: `Archive File:`,
        value: utils.pathToFilename(this.content.contentFile)
      };
      this.textAreaTableItems.push(item);
    }

    if (this.content.fromArchive && this.content.archiveFilename) {
      const item = {
        key: `Archived Filename:`,
        value: utils.pathToFilename(this.content.archiveFilename)
      };
      this.textAreaTableItems.push(item);
    }

    if (['encryptedZipEntry', 'encryptedRarEntry'].includes(this.content.contentType)) {
      const item = {
        key: `Encrypted File:`,
        value: utils.pathToFilename(this.content.contentFile)
      };
      this.textAreaTableItems.push(item);
    }

    if (this.content.textDistillationEnabled && 'textTermsMatched' in this.content && this.content.textTermsMatched && this.content.textTermsMatched.length > 0) {
      const item = {
        key: `Matched Text:`,
        value: this.content.textTermsMatched.join(', ')
      };
      this.textAreaTableItems.push(item);
    }

    if (this.content.regexDistillationEnabled && 'regexTermsMatched' in this.content && this.content.regexTermsMatched && this.content.regexTermsMatched.length > 0) {
      const item = {
        key: `Matched RegEx:`,
        value: this.content.regexTermsMatched.join(', ')
      };
      this.textAreaTableItems.push(item);
    }
  }



  ngAfterViewInit(): void {
    this.changeDetectionRef.detach();
  }



  ngOnChanges(): void {
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
    setTimeout(
      () => this.changeDetectionRef.detach(),
      0
    );
    const event = new Event('onloaded');
    this.zone.runOutsideAngular( () => {
      this.el.nativeElement.dispatchEvent(event);
    });
  }



  updateMasonryMeta() {
    if (this.masonryKeys && this.session && this.masonryKeys.length !== 0 && 'meta' in this.session && Object.keys(this.session.meta).length !== 0) {
      this.masonryMeta = this.masonryKeys
        .filter( (masonryKey) =>  masonryKey.key in this.session.meta )
        .map( (masonryKey) => ({
          key: masonryKey.key,
          friendly: masonryKey.friendly,
          value: this.session.meta[masonryKey.key]
        }));
    }
  }



  async getImage(origUrl: string) {
    // we don't want to bind this directly to the image with an async pipe as it gets stuck in a loop
    return  await this.dataService.getImage(origUrl);
  }
}
