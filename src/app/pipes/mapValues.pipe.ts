import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'mapValues'})

export class MapValuesPipe implements PipeTransform {

  transform(value: any): any {
    if (!value) {
      return value;
    }
    const values = Object.values(value).map( v => v );
    return values;
  }
}
