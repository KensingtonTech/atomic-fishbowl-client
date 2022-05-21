import { Pipe, PipeTransform } from '@angular/core';
import { capitalizeFirstLetter } from '../utils';

@Pipe({name: 'capitaliseFirstLetter'})

export class CapFirstLetterPipe implements PipeTransform {

  transform(value: string): string {
    return capitalizeFirstLetter(value);
  }
}
