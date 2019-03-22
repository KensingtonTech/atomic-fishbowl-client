import { Pipe, PipeTransform } from '@angular/core';
import { Logger } from 'loglevel';
declare var log: Logger;

@Pipe({name: 'boolToString'})

export class BoolToStringPipe implements PipeTransform {

  transform(value: string, args: string): any {
    return value ? 'true' : 'false';
  }
}
