import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';

@Pipe({name: 'formatSaTime'})

export class FormatSaTimePipe implements PipeTransform {

  transform(value: string[] | string, args?: string): any {
    let v;
    if (typeof value === 'string') {
      v = parseInt(value.substring(0, value.indexOf(':')), 10);
    }
    else { // array containing a string
      v = parseInt(value[0].substring(0, value[0].indexOf(':')), 10);
    }
    if (!v) {
      return;
    }
    const t = dayjs(v * 1000);
    const formatter = args !== undefined ? args : 'YYYY/MM/DD HH:mm:ss';
    return t.format(formatter);
  }
}
