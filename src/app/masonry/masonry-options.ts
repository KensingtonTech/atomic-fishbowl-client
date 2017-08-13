/**
 * MasonryOptions
 */
export interface MasonryOptions {
    itemSelector?: string;
    masonry: {
      columnWidth: number | string,
      gutter?: number,
      horizontalOrder?: boolean,
      fitWidth?: boolean
    };
    percentPosition?: boolean;
    stamp?: string;
    originLeft?: boolean;
    originTop?: boolean;
    containerStyle?: string;
    transitionDuration?: string;
    resize?: boolean;
    initLayout?: boolean;
    layoutMode?: string;
}
