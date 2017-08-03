import { Pipe, PipeTransform } from '@angular/core';
//import { LoggerService } from './logger-service';

@Pipe({name: 'mapValues'})

export class MapValuesPipe implements PipeTransform {

  //constructor(private loggerService: LoggerService) {}

  transform(value: any, args:string[]) : any {
    if (!value) {
      return value;
    }
    let values = [];
    for (let key in value) {
      values.push(value[key]);
    }
    return values;

  }
}
