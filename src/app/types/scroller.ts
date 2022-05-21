export interface ScrollerOptions {
  scrollingX: boolean;
  scrollingY: boolean;
  animating: boolean;
  animationDuration: number;
  bouncing: boolean;
  easing: boolean;
  locking: boolean;
  paging: boolean;
  snapping: boolean;
  zooming: boolean;
  minZoom: number;
  maxZoom: number;
  speedMultiplier: number;
  scrollingComplete: () => void;
  penetrationDeceleration: number;
  penetrationAcceleration: number;
}
