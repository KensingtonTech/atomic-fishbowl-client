import { Injectable }        from '@angular/core';
import { Observable }        from 'rxjs/Observable';
import { Subject }           from 'rxjs/Subject';
import { LoggerService } from './logger-service';

declare var oboe: any;

@Injectable()
export class HttpJsonStreamService {

  constructor(private loggerService: LoggerService) {}

  private oboeService: any;

  fetchStream(url: string) : Observable<any> {
    console.log('HttpJsonStreamService: fetchStream()');
    var subject: Subject<any> = new Subject<any>();
    var config = {
      //headers: {'Authorization': 'Bearer ' +  token},
      'url': url,
      'method': "GET",
      'body': '',
      'cached': false
    }
    this.oboeService = oboe(config);
    this.oboeService.node('!', (o: any) => {
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
