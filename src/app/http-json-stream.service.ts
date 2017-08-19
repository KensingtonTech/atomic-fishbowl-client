import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
declare var log: any;
declare var oboe: any;

@Injectable()
export class HttpJsonStreamService {

  private oboeService: any;

  fetchStream(url: string, headers = {} ): Observable<any> {
    log.debug('HttpJsonStreamService: fetchStream()');
    let subject: Subject<any> = new Subject<any>();
    let config = {
      // headers: {'Authorization': 'Bearer ' +  token},
      'url': url,
      'method': 'GET',
      'body': '',
      'cached': false
    };
    if (Object.keys(headers).length !== 0) {
      config['headers'] = headers;
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
    catch (e) {
      return;
    }
  }

}
