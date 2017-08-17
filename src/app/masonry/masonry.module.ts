import { NgModule } from '@angular/core';
import { MasonryComponent } from './masonry.component';
import { MasonryBrickDirective } from './masonry-brick.directive';

const DIRECTIVES = [MasonryComponent, MasonryBrickDirective];

@NgModule({
    declarations: DIRECTIVES,
    exports: DIRECTIVES
})
export class MasonryModule { }
