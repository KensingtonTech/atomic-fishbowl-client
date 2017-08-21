import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { ToolService } from './tool.service';
declare var log: any;
declare var oboe: any;

@Injectable()
export class HttpJsonStreamService {

  constructor(private toolService: ToolService) {}

  private oboeService: any;
  public connected = false;

  private startCallback = () => {
    log.debug('HttpJsonStreamService: start event');
    // log.debug('HttpJsonStreamService: oboeService', this.oboeService);
    this.connected = true;
    // this.oboeService.removeListener('start', this.failCallback);
    this.toolService.HttpJsonStreamServiceConnected.next(this.connected);
  }

  private doneCallback = () => {
    log.debug('HttpJsonStreamService: done event');
    this.connected = false;
    // log.debug('HttpJsonStreamService: oboeService', this.oboeService);
    // this.oboeService.removeListener('done', this.doneCallback);
    // this.oboeService.removeListener('fail', this.failCallback);
    this.toolService.HttpJsonStreamServiceConnected.next(this.connected);
  }

  private failCallback = () => {
    log.debug('HttpJsonStreamService: fail event');
    this.connected = false;
    // this.oboeService.removeListener('done', this.doneCallback);
    // this.oboeService.removeListener('fail', this.failCallback);
    this.toolService.HttpJsonStreamServiceConnected.next(this.connected);
  }

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

    this.oboeService.on('start', this.startCallback);

    this.oboeService.on('done', this.doneCallback);

    this.oboeService.on('fail', this.failCallback);

    /*this.oboeService.node('!', (o: any) => {
      subject.next(o);
    });*/

    this.oboeService.node('!.*', (o: any) => {
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
