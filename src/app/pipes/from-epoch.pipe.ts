import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'fromEpoch'})

export class FromEpochPipe implements PipeTransform {

  transform(value: any, args: string[]): any {
    if (!value) {
      return;
    }
    const t = new Date(0);
    t.setUTCSeconds(value);
    return t;
  }
}
