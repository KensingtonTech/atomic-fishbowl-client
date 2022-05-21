import { NgZone } from '@angular/core';

export class ScrollerAnimate {

  private desiredFrames = 60;
  private millisecondsPerSecond = 1000;
  private running = new Set<number>();
  private counter = 1;
  private zone: NgZone;

  private animationFrameFunc: ((callback: FrameRequestCallback) => number) & ((callback: FrameRequestCallback) => number);


  constructor(zone: NgZone) {
    this.zone = zone;
    this.zone.runOutsideAngular(
      () => this.animationFrameFunc = window.requestAnimationFrame
    );
  }



  /**
   * Stops the given animation.
   *
   * @param id {Integer} Unique animation ID
   * @return Whether the animation was stopped (aka, was running before)
   */
  stop(id: number): boolean {
    const cleared = this.isRunning(id);
    if (cleared) {
      this.running.delete(id);
    }
    return cleared;
  }



  /**
   * Stops the current animation.
   *
   * @return Whether the animation was stopped (aka, was running before)
   */
  stopCurrent(): boolean {
    const id = this.counter - 1;
    const cleared = this.isRunning(id);
    if (cleared) {
      this.running.delete(id);
    }
    return cleared;
  }



  /**
   * Whether the given animation is still running.
   *
   * @param id {Integer} Unique animation ID
   * @return Whether the animation is still running
   */
  isRunning(id: number): boolean {
    return this.running.has(id);
  }



  /**
   * Start the animation.
   *
   * @param stepCallback {Function} Pointer to function which is executed on every step.
   *   Signature of the method should be `function(percent, now, virtual) { return continueWithAnimation; }`
   * @param verifyCallback {Function} Executed before every animation step.
   *   Signature of the method should be `function() { return continueWithAnimation; }`
   * @param completedCallback {Function}
   *   Signature of the method should be `function(droppedFrames, finishedAnimation) {}`
   * @param duration {Integer} Milliseconds to run the animation
   * @param easingMethod {Function} Pointer to easing function
   *   Signature of the method should be `function(percent) { return modifiedValue; }`
   * @return Identifier of animation. Can be used to stop it any time.
   */
  start(
    stepCallback: (pct: number, now: number, render: boolean) => boolean | void,
    verifyCallback: (id: number) => boolean,
    completedCallback: (droppedFrames: number, animationId: number, wasFinished: boolean) => void,
    duration?: number,
    easingMethod?: (percent: number) => number
  ): number {

    const start = performance.now();
    let lastFrame = start;
    let percent = 0;
    let dropCounter = 0;
    const id = this.counter++;

    // Compacting running db automatically every few new animations
    /*if (id % 20 === 0) {
      const newRunning = new Set<number>();
      Object.keys(this.running).forEach( usedId => {
        newRunning[usedId as unknown as number] = true;
      });
      this.running = newRunning;
    }*/

    // This is the internal step method which is called every few milliseconds
    const step = (virtual?: boolean | number): void => {
      // Normalize virtual value
      // eslint-disable-next-line eqeqeq
      const render = virtual != true;

      // Get current time
      const now = performance.now();

      // Verification is executed before next animation step
      if (!this.isRunning(id) || (verifyCallback && !verifyCallback(id))) {

        this.running.delete(id);
        if (completedCallback) {
          completedCallback(this.desiredFrames - (dropCounter / ((now - start) / this.millisecondsPerSecond)), id, false);
        }
        return;
      }

      // For the current rendering to apply let's update omitted steps in memory.
      // This is important to bring internal state variables up-to-date with progress in time.
      if (render) {
        const droppedFrames = Math.round((now - lastFrame) / (this.millisecondsPerSecond / this.desiredFrames)) - 1;
        for (let j = 0; j < Math.min(droppedFrames, 4); j++) {
          step(true);
          dropCounter++;
        }

      }

      // Compute percent value
      if (duration) {
        percent = (now - start) / duration;
        if (percent > 1) {
          percent = 1;
        }
      }

      // Execute step callback, then...
      const value = easingMethod ? easingMethod(percent) : percent;
      if ((stepCallback(value, now, render) === false || percent === 1) && render) {
        this.running.delete(id);
        if (completedCallback) {
          completedCallback(this.desiredFrames - (dropCounter / ((now - start) / this.millisecondsPerSecond)), id, percent === 1 || duration === undefined);
        }
      }
      else if (render) {
        lastFrame = now;
        this.animationFrameFunc(step);
      }
    };

    // Mark as running
    this.running.add(id);

    // Init first step
    this.animationFrameFunc(step);

    // Return unique animation ID
    return id;
  }

}
