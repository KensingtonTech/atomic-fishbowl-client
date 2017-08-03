import { Pipe, PipeTransform } from '@angular/core';
//import { LoggerService } from './logger-service';
declare var moment: any;

@Pipe({name: 'formatTime'})

export class FormatTimePipe implements PipeTransform {

  //constructor(private loggerService: LoggerService) {}

  transform(value: any, args: string) : any {
    if (!value) {
      return undefined;
    }
    //let t = new Date(0);
    //t.setUTCSeconds(value);
    var t = moment(value * 1000);
    var formatter = "YYYY/MM/DD HH:mm:ss"; //default formatter
    //console.log("args:", args)
    if (typeof args !== 'undefined') {
      formatter = args;
      //console.log("formatter:", formatter);
    }
    return t.format(formatter);
    //console.log(t);
    //return t;
  }
}
