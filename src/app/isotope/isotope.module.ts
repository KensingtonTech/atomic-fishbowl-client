import { NgModule } from '@angular/core';
import { IsotopeDirective } from './isotope.directive';
import { IsotopeBrickDirective } from './isotope-brick.directive';

const DIRECTIVES = [IsotopeDirective, IsotopeBrickDirective];

@NgModule({
    declarations: DIRECTIVES,
    exports: DIRECTIVES
})
export class IsotopeModule { }
