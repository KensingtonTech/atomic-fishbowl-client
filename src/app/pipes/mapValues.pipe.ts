import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'mapValues'})

export class MapValuesPipe implements PipeTransform {

  transform<T>(value?: Record<any, T>): T[] | void {
    if (!value) {
      return;
    }
    return Object.values(value).map( v => v );
  }
}
