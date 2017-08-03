import { NgModule } from '@angular/core';
import { MasonryComponent } from './masonry.component';
import { AngularMasonryBrick } from './masonry-brick.directive';

const DIRECTIVES = [MasonryComponent, AngularMasonryBrick];

@NgModule({
    declarations: DIRECTIVES,
    exports: DIRECTIVES
})
export class MasonryModule { }
