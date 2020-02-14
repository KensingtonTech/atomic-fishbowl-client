import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'boolToString'})

export class BoolToStringPipe implements PipeTransform {

  transform(value: string, args: string): any {
    return value ? 'true' : 'false';
  }
}
