import { Pipe, PipeTransform } from '@angular/core';
//import { LoggerService } from './logger-service';

@Pipe({name: 'fromEpoch'})

export class FromEpochPipe implements PipeTransform {

  //constructor (private loggerService: LoggerService) {}

  transform(value: any, args:string[]) : any {
    if (!value) {
      return undefined;
    }
    let t = new Date(0);
    t.setUTCSeconds(value);
    //console.log(t);
    return t;
  }
}
