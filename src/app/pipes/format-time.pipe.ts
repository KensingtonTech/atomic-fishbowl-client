import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';


@Pipe({name: 'formatTime'})

export class FormatTimePipe implements PipeTransform {

  transform(value: any, args?: string): any {
    if (!value) {
      return;
    }
    const t = moment(value * 1000);
    const formatter = args !== undefined ? args : 'YYYY/MM/DD HH:mm:ss';
    return t.format(formatter);
  }
}
