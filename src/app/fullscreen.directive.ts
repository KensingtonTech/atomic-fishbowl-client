import { Directive, HostListener } from '@angular/core';
//import { LoggerService } from './logger-service';
//const screenfull = require('screenfull');
declare var screenfull: any;


@Directive({
	selector: '[toggleFullscreen]',
})
export class ToggleFullscreenDirective {

  //constructor(private loggerService: LoggerService) {}

	@HostListener('click') onClick() {
		if (screenfull.enabled) {
			screenfull.toggle();
		}
	}
}
