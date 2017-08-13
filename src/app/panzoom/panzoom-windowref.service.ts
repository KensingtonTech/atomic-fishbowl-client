import { Injectable } from '@angular/core';
declare var log: any;

function getWindow (): any {
    return window;
}

@Injectable()

export class WindowRefService {
    get nativeWindow (): any {
        return getWindow();
    }
}
