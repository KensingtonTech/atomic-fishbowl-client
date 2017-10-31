import { Pipe, PipeTransform } from '@angular/core';
declare var moment: any;
declare var log: any;

@Pipe({name: 'formatTime'})

export class FormatTimePipe implements PipeTransform {

  transform(value: any, args: string): any {
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
