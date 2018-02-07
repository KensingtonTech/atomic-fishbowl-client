import { Pipe, PipeTransform } from '@angular/core';
declare var moment: any;
import * as log from 'loglevel';

@Pipe({name: 'formatTime'})

export class FormatTimePipe implements PipeTransform {

  transform(value: any, args: string): any {
    // log.debug('FormatTimePipe: transform(): value:', value);
    if (!value) {
      return undefined;
    }
    let t = moment(value * 1000);
    let formatter = 'YYYY/MM/DD HH:mm:ss'; // default formatter
    if (typeof args !== 'undefined') {
      formatter = args;
    }
    return t.format(formatter);
  }
}
