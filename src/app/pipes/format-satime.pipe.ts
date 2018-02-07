import { Pipe, PipeTransform } from '@angular/core';
declare var moment: any;
import * as log from 'loglevel';

@Pipe({name: 'formatSaTime'})

export class FormatSaTimePipe implements PipeTransform {

  transform(value: string[], args: string): any {
    // log.debug('FormatSaTimePipe: transform(): value:', value);
    let v = parseInt(value[0].substring(0, value[0].indexOf(':')), 10);
    // log.debug('FormatSaTimePipe: transform(): v:', v);
    if (!v) {
      return undefined;
    }
    let t = moment(v * 1000);
    let formatter = 'YYYY/MM/DD HH:mm:ss'; // default formatter
    if (args) {
      formatter = args;
    }
    return t.format(formatter);
  }
}
