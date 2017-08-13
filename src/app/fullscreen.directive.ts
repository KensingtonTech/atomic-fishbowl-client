import { Directive, HostListener } from '@angular/core';
declare var screenfull: any;
declare var log: any;


@Directive({
	selector: '[toggleFullscreen]',
})
export class ToggleFullscreenDirective {

	@HostListener('click') onClick() {
		if (screenfull.enabled) {
			screenfull.toggle();
		}
	}
}
