import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';


@Pipe({name: 'formatTime'})

export class FormatTimePipe implements PipeTransform {

  transform(value: any, args?: string): any {
    if (!value) {
      return;
    }
    const t = dayjs(value * 1000);
    const formatter = args !== undefined ? args : 'YYYY/MM/DD HH:mm:ss';
    return t.format(formatter);
  }
}
