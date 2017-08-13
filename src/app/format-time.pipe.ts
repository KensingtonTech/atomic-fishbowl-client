import { Pipe, PipeTransform } from '@angular/core';
declare var moment: any;
declare var log: any;

@Pipe({name: 'formatTime'})

export class FormatTimePipe implements PipeTransform {

  transform(value: any, args: string) : any {
    if (!value) {
      return undefined;
    }
    //let t = new Date(0);
    //t.setUTCSeconds(value);
    var t = moment(value * 1000);
    var formatter = "YYYY/MM/DD HH:mm:ss"; //default formatter
    //log.debug("args:", args)
    if (typeof args !== 'undefined') {
      formatter = args;
      //log.debug("formatter:", formatter);
    }
    return t.format(formatter);
    //log.debug(t);
    //return t;
  }
}
