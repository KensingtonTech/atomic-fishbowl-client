import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'allCaps'})

export class AllCapsPipe implements PipeTransform {

  transform(value: string): string {
    return value.toUpperCase();
  }
}
