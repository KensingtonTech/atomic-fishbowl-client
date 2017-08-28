import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { ToolService } from './tool.service';
declare var log: any;
declare var oboe: any;

export class HttpJsonStream {

  constructor(private toolService: ToolService) {}

  private oboeService: any;
  public connected = false;

  private startCallback = () => {
    log.debug('HttpJsonStream: start event');
    // log.debug('HttpJsonStream: oboeService', this.oboeService);
    this.connected = true;
    // this.oboeService.removeListener('start', this.failCallback);
    this.toolService.HttpJsonStreamConnected.next(this.connected);
  }

  private doneCallback = () => {
    log.debug('HttpJsonStream: done event');
    this.connected = false;
    // log.debug('HttpJsonStream: oboeService', this.oboeService);
    // this.oboeService.removeListener('done', this.doneCallback);
    // this.oboeService.removeListener('fail', this.failCallback);
    this.toolService.HttpJsonStreamConnected.next(this.connected);
  }

  private failCallback = () => {
    log.debug('HttpJsonStream: fail event');
    this.connected = false;
    // this.oboeService.removeListener('done', this.doneCallback);
    // this.oboeService.removeListener('fail', this.failCallback);
    this.toolService.HttpJsonStreamConnected.next(this.connected);
  }

  fetchStream(url: string, headers = {} ): Observable<any> {
    log.debug('HttpJsonStream: fetchStream()');
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
      subject.next( JSON.parse(JSON.stringify(o)) );
      return oboe.drop;
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
