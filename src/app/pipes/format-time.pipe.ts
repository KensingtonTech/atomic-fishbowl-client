import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';


@Pipe({name: 'formatTime'})

export class FormatTimePipe implements PipeTransform {

  transform(value?: number | string | number[] | string[], args?: string): string | void {
    if (Array.isArray(value)) {
      value = value[0];
    }
    if (typeof value === 'string') {
      return value;
    }
    if (!value) {
      return;
    }
    const t = dayjs(value * 1000);
    const formatter = args !== undefined ? args : 'YYYY/MM/DD HH:mm:ss';
    return t.format(formatter);
  }
}
