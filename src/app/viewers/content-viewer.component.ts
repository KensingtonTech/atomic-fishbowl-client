import { Component, ChangeDetectionStrategy, OnChanges, Input, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { Content } from 'types/content';
import * as utils from '../utils';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'content-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

  <div class="imgContainer">
      <img class="myImg noselect" *ngIf="content.contentType == 'image' && !imageError" [src]="'/collections/' + collectionId + '/' + utils.uriEncodeFilename(content.contentFile)" (error)="onImageError()" draggable="false">
      <img class="myImg noselect" *ngIf="content.contentType == 'encryptedZipEntry'"  src="/resources/zip_icon_locked.png" draggable="false">
      <img class="myImg noselect" *ngIf="content.contentType == 'unsupportedZipEntry'"  src="/resources/zip_icon_unknown.png" draggable="false">
      <img class="myImg noselect" *ngIf="content.contentType == 'encryptedRarEntry'"  src="/resources/rar_icon_locked.png" draggable="false">
      <img class="myImg noselect" *ngIf="content.contentType == 'encryptedRarTable'"  src="/resources/rar_icon_locked.png" draggable="false">
      <img class="myImg noselect" *ngIf="content.contentType == 'hash' && content.hashType == 'md5'" src="/resources/md5_hash_icon.png" draggable="false">
      <img class="myImg noselect" *ngIf="content.contentType == 'hash' && content.hashType == 'sha1'" src="/resources/sha1_hash_icon.png" draggable="false">
      <img class="myImg noselect" *ngIf="content.contentType == 'hash' && content.hashType == 'sha256'" src="/resources/sha256_hash_icon.png" draggable="false">
      <div *ngIf="content.contentType == 'image' && imageError" style="color: red; text-align: center;">
        <h1>Image Load Error</h1>
        <img class="myImg noselect"  src="/resources/error_icon.png" draggable="false">
        <h1>Image Load Error</h1>
      </div>

      <div style="text-align: center; color: white; max-width: 50%;">

        <div style="text-align: left;">
          <div *ngIf="content.contentType == 'encryptedRarEntry' || content.contentType == 'encryptedZipEntry'">
            <h3>Encrypted file within a {{utils.toCaps(content.archiveType)}} archive</h3>
          </div>
          <div *ngIf="content.contentType == 'unsupportedZipEntry'">
            <h3>Unsupported ZIP format</h3>
          </div>
          <div *ngIf="content.contentType == 'encryptedRarTable'">
            <h3>RAR archive has an encrypted table</h3>
          </div>
          <div *ngIf="content.contentType == 'hash'">
            <h3>Found executable matching {{utils.toCaps(content.hashType)}} hash value</h3>
          </div>
          <div *ngIf="content.contentType == 'pdf' && content.textDistillationEnabled && content.textTermsMatched?.length > 0">
            <h3>Found PDF document containing text term</h3>
          </div>
          <div *ngIf="content.contentType == 'office' && content.textDistillationEnabled && content.textTermsMatched?.length > 0">
            <h3>Found Office {{utils.capitalizeFirstLetter(content.contentSubType)}} document containing text term</h3>
          </div>
          <div *ngIf="content.contentType == 'pdf' && content.regexDistillationEnabled && content.regexTermsMatched?.length > 0">
            <h3>Found PDF document matching Regex term</h3>
          </div>
          <div *ngIf="content.contentType == 'office' && content.regexDistillationEnabled && content.regexTermsMatched?.length > 0">
            <h3>Found Office {{utils.capitalizeFirstLetter(content.contentSubType)}} document matching Regex term</h3>
          </div>
        </div>

        <table *ngIf="content.contentType != 'img'" class="selectable">
          <tr *ngIf="content.contentType == 'hash'">
            <td class="column1">{{utils.toCaps(content.hashType)}} Hash:</td>
            <td class="value">{{content.hashValue}}</td>
          </tr>
          <tr *ngIf="content.contentType == 'hash' && content.hashFriendly">
            <td class="column1">{{utils.toCaps(content.hashType)}} Description:</td>
            <td class="value">{{content.hashFriendly}}</td>
          </tr>
          <tr *ngIf="content.contentType == 'hash'">
            <td class="column1">Filename:</td>
            <td class="value">{{utils.pathToFilename(content.contentFile)}}</td>
          </tr>
          <tr *ngIf="content.contentType == 'encryptedZipEntry' || content.contentType == 'encryptedRarEntry'">
            <td class="column1">Encrypted File:</td>
            <td class="value">{{utils.pathToFilename(content.contentFile)}}</td>
          </tr>
          <tr *ngIf="content.isArchive">
            <td class="column1">Archive File:</td>
            <td class="value">{{utils.pathToFilename(content.contentFile)}}</td>
          </tr>
          <tr *ngIf="content.fromArchive && content.contentType != 'image'">
            <td class="column1">Archive Filename:</td>
            <td class="value">{{utils.pathToFilename(content.archiveFilename)}}</td>
          </tr>
          <tr *ngIf="content.textDistillationEnabled && content.textTermsMatched?.length > 0">
            <td class="column1">Matched Text:</td>
            <td class="value">{{content.textTermsMatched}}</td>
          </tr>
          <tr *ngIf="content.regexDistillationEnabled && content.regexTermsMatched?.length > 0">
            <td class="column1">Matched RegEx:</td>
            <td class="value">{{content.regexTermsMatched}}</td>
          </tr>
        </table>
      </div>

    </div>
`
})

export class ContentViewerComponent implements OnChanges {

  constructor( private changeDetectionRef: ChangeDetectorRef ) {}

  @Input() content: Content;
  @Input() collectionId: string;

  public utils = utils;
  public imageError = false;

  onImageError() {
    this.imageError = true;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }

  ngOnChanges(values: SimpleChanges) {
    if ('content' in values) {
      this.imageError = false;
    }
  }

}
