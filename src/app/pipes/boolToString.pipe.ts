import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'boolToString'})

export class BoolToStringPipe implements PipeTransform {

  transform(value: boolean): string {
    return value ? 'true' : 'false';
  }
}
