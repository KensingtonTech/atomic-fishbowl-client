import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';
import * as utils from '../utils';

@Pipe({name: 'formatSaTime'})

export class FormatSaTimePipe implements PipeTransform {

  transform(value: string[] | string | number | number[], args?: string): string | void {
    let v;
    if (typeof value === 'string') {
      v = parseInt(value.substring(0, value.indexOf(':')), 10);
    }
    else if (utils.isArray(value)) { // array containing a string
      const innerValue = (value as Array<string | number>)[0];
      switch (typeof innerValue) {
        case 'string':
          v = parseInt(innerValue.substring(0, innerValue.indexOf(':')), 10);
          break;
        case 'number':
          v = innerValue;
          break;
      }
    }
    if (!v) {
      return;
    }
    const t = dayjs(v * 1000);
    const formatter = args !== undefined ? args : 'YYYY/MM/DD HH:mm:ss';
    return t.format(formatter);
  }
}
