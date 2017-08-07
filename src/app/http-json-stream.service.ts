import { Injectable }        from '@angular/core';
import { Observable }        from 'rxjs/Observable';
import { Subject }           from 'rxjs/Subject';
import { LoggerService } from './logger-service';

declare var oboe: any;

@Injectable()
export class HttpJsonStreamService {

  //subject: Subject<any>;
  //this.subject = new Subject<any>();
  constructor(private loggerService: LoggerService) {}

  private oboeService: any;

  fetchStream(url: string) : Observable<any> {
    console.log('CollectionBuilderService: buildCollection()');
    var subject: Subject<any> = new Subject<any>();
    var config = {
      'url': url,
      'method': "GET",
      //'headers': { 'Connection': 'keep-alive' },
      //headers: {'Authorization': 'Bearer ' +  token},
      'body': '',
      'cached': false
      //'withCredentials': true
    }
    this.oboeService = oboe(config);
    this.oboeService.node('!', (o: any) => {
                                  //console.log("new broker message", o);
                                  subject.next(o);
                                });
    return subject;
  }

  abort(): void {
    try {
      this.oboeService.abort();
    }
    catch(e) {
      return;
    }
  }

}
