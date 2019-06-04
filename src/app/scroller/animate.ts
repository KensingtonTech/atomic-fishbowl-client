import { NgZone } from '@angular/core';

export class ScrollerAnimate {

  private desiredFrames = 60;
  private millisecondsPerSecond = 1000;
  private running = {};
  private counter = 1;
  private zone: NgZone;

  private animationFrameFunc: Function;


  constructor(zone) {
    this.zone = zone;
    this.zone.runOutsideAngular( () => this.animationFrameFunc = window.requestAnimationFrame );
  }



  /**
   * Stops the given animation.
   *
   * @param id {Integer} Unique animation ID
   * @return {Boolean} Whether the animation was stopped (aka, was running before)
   */
  stop(id: number): boolean {
    let cleared = this.running[id] !== null;
    if (cleared) {
      this.running[id] = null;
    }
    return cleared;
  }



  /**
   * Stops the current animation.
   *
   * @return {Boolean} Whether the animation was stopped (aka, was running before)
   */
  stopCurrent(): boolean {
    let id = this.counter - 1;
    let cleared = this.running[id] != null;
    if (cleared) {
      this.running[id] = null;
    }
    return cleared;
  }



  /**
   * Whether the given animation is still running.
   *
   * @param id {Integer} Unique animation ID
   * @return {Boolean} Whether the animation is still running
   */
  isRunning(id): boolean {
    return this.running[id] !== null;
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
   * @return {Integer} Identifier of animation. Can be used to stop it any time.
   */
  start(stepCallback, verifyCallback, completedCallback, duration = null, easingMethod = null): number {

    let start = performance.now();
    let lastFrame = start;
    let percent = 0;
    let dropCounter = 0;
    let id = this.counter++;

    // Compacting running db automatically every few new animations
    if (id % 20 === 0) {
      let newRunning = {};
      // for (let usedId in this.running) {
      Object.keys(this.running).forEach( usedId => {
        newRunning[usedId] = true;
      });
      this.running = newRunning;
    }

    // This is the internal step method which is called every few milliseconds
    let step = virtual => {

      // Normalize virtual value
      let render = virtual !== true;

      // Get current time
      let now = performance.now();

      // Verification is executed before next animation step
      if (!this.running[id] || (verifyCallback && !verifyCallback(id))) {

        this.running[id] = null;
        if (completedCallback) {
          completedCallback(this.desiredFrames - (dropCounter / ((now - start) / this.millisecondsPerSecond)), id, false);
        }
        return;

      }

      // For the current rendering to apply let's update omitted steps in memory.
      // This is important to bring internal state variables up-to-date with progress in time.
      if (render) {

        let droppedFrames = Math.round((now - lastFrame) / (this.millisecondsPerSecond / this.desiredFrames)) - 1;
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
      let value = easingMethod ? easingMethod(percent) : percent;
      if ((stepCallback(value, now, render) === false || percent === 1) && render) {
        this.running[id] = null;
        if (completedCallback) {
          completedCallback(this.desiredFrames - (dropCounter / ((now - start) / this.millisecondsPerSecond)), id, percent === 1 || duration == null);
        }
      }
      else if (render) {
        lastFrame = now;
        this.animationFrameFunc(step);
      }
    };

    // Mark as running
    this.running[id] = true;

    // Init first step
    this.animationFrameFunc(step);

    // Return unique animation ID
    return id;
  }

}
