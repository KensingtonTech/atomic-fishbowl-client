import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'fromEpoch'})

export class FromEpochPipe implements PipeTransform {

  transform(value?: number): Date | void {
    if (!value) {
      return;
    }
    const t = new Date(0);
    t.setUTCSeconds(value);
    return t;
  }
}
