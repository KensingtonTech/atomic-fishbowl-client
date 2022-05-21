import {
  Component,
  ChangeDetectorRef,
  OnInit,
  Output,
  EventEmitter
} from '@angular/core';
import { Router } from '@angular/router';
import { ToolService } from 'services/tool.service';
import * as log from 'loglevel';

interface RouterOption {
  name: string;
  link: string;
  class: string;
  tooltip: string;
}

@Component({
  selector: 'app-router-dropdown',
  templateUrl: './controlbar-router-dropdown.component.html'
})

export class RouterDropdownComponent implements OnInit {

  constructor(
    private router: Router,
    private toolService: ToolService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  routerOptions: RouterOption[] = [
    {
      name: 'masonryGrid',
      link: '/masonryGrid',
      class: 'icon fa fa-th-large fa-2x fa-fw',
      tooltip: 'Masonry'
    },
    {
      name: 'classicGrid',
      link: '/classicGrid',
      class: 'icon fa fa-th fa-2x fa-fw',
      tooltip: 'Classic'
    }
  ];

  @Output() isOpen = new EventEmitter<boolean>();
  selectedRoute: RouterOption;
  selectionExpanded = false;



  ngOnInit(): void {
    this.selectedRoute = this.getSelectedRoute();
    this.orderRouterOptions();
  }



  orderRouterOptions(): void {
    // this will place the currently selected route last in the selection
    let optionToSplice: RouterOption;
    for (let i = 0; i < this.routerOptions.length; i++) {
      const option = this.routerOptions[i];
      if (this.selectedRoute.name.startsWith(option.name)) {
        optionToSplice = this.routerOptions[i];
        this.routerOptions.splice(i, 1);
        this.routerOptions.push(optionToSplice);
      }
    }
  }



  getSelectedRoute(): RouterOption {
    const route = this.router.url;
    log.debug(`RouterDropdownComponent: getSelectedRoute(): route ${route}`);
    for (const routerOption of this.routerOptions) {
      if (route.startsWith(routerOption.link)) {
        return routerOption;
      }
    }
    throw new Error('Did not find selected route!');
  }



  collapseRouterOptions(): void {
    log.debug('RouterDropdownComponent: collapseRouterOptions()');
    this.selectionExpanded = false;
    this.isOpen.emit(false);
  }



  expandRouterOptions(): void {
    log.debug('RouterDropdownComponent: expandRouterOptions()');
    this.selectionExpanded = true;
    this.isOpen.emit(true);
  }



  routeSelected(route: RouterOption): void {
    if (this.selectedRoute !== route) {
      this.selectedRoute = route;
      this.selectionExpanded = false;
      // execute route
      this.router.navigate([route.link]);
      this.changeDetectorRef.markForCheck();
      this.toolService.loadCollectionOnRouteChange = true;
    }
    else {
      this.collapseRouterOptions();
    }
  }



}
