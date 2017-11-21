import { Pipe, PipeTransform } from '@angular/core';
import * as log from 'loglevel';

@Pipe({name: 'fromEpoch'})

export class FromEpochPipe implements PipeTransform {

  transform(value: any, args: string[]): any {
    if (!value) {
      return undefined;
    }
    let t = new Date(0);
    t.setUTCSeconds(value);
    return t;
  }
}
