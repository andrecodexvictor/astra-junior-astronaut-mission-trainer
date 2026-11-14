/** Monotonic elapsed time only; the pure simulation owns the fixed tick and saved remainder. */
export class MissionClock {
  private last: number | undefined;

  reset(now?: number) {
    this.last = now !== undefined && Number.isFinite(now) ? now : undefined;
  }

  getLastTimestamp(): number | undefined {
    return this.last;
  }

  advance(now: number, paused: boolean, speed = 1, maxDeltaSeconds = Number.POSITIVE_INFINITY): number {
    if (!Number.isFinite(now)) return 0;
    if (this.last === undefined || now < this.last) {
      this.last = now;
      return 0;
    }
    const elapsed = (now - this.last) / 1000;
    this.last = now;
    if (paused) return 0;
    const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 0;
    const cap = Number.isFinite(maxDeltaSeconds) && maxDeltaSeconds > 0 ? maxDeltaSeconds : Number.POSITIVE_INFINITY;
    return Math.min(elapsed * safeSpeed, cap);
  }
}
