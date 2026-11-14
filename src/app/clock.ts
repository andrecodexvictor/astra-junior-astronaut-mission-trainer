/** Monotonic elapsed time only; the pure simulation owns the fixed tick and saved remainder. */
export class MissionClock {
 private last: number | undefined;
 reset(now?: number) { this.last = now; }
 advance(now: number, paused: boolean, speed = 1): number {
  if (!Number.isFinite(now)) return 0;
  if (this.last === undefined || now < this.last) { this.last = now; return 0; }
  const elapsed = (now - this.last) / 1000; this.last = now;
  return paused ? 0 : elapsed * speed;
 }
}
