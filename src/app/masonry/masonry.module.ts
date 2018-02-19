import { NgModule } from '@angular/core';
import { MasonryDirective } from './masonry.directive';
import { MasonryBrickDirective } from './masonry-brick.directive';

const DIRECTIVES = [MasonryDirective, MasonryBrickDirective];

@NgModule({
    declarations: DIRECTIVES,
    exports: DIRECTIVES
})
export class MasonryModule { }
