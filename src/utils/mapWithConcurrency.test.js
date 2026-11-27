import { mapWithConcurrency } from './mapWithConcurrency';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('mapWithConcurrency', () => {
  it('keeps input order regardless of completion time', async () => {
    const out = await mapWithConcurrency([30, 5, 15], 3, async (ms) => {
      await delay(ms);
      return ms * 2;
    });
    expect(out).toEqual([
      { ok: true, value: 60 },
      { ok: true, value: 10 },
      { ok: true, value: 30 },
    ]);
  });

  it('never runs more than limit workers at once', async () => {
    let active = 0;
    let peak = 0;
    const out = await mapWithConcurrency(Array.from({ length: 12 }, (_, i) => i), 5, async (i) => {
      active += 1;
      peak = Math.max(peak, active);
      await delay(5);
      active -= 1;
      return i;
    });
    expect(peak).toBe(5);
    expect(out).toHaveLength(12);
  });

  it('collects per-item errors without rejecting', async () => {
    const boom = new Error('boom');
    const out = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw boom;
      return n;
    });
    expect(out).toEqual([
      { ok: true, value: 1 },
      { ok: false, error: boom },
      { ok: true, value: 3 },
    ]);
  });

  it('returns an empty array for empty input', async () => {
    const worker = jest.fn();
    expect(await mapWithConcurrency([], 5, worker)).toEqual([]);
    expect(worker).not.toHaveBeenCalled();
  });

  it('handles a limit larger than the item count', async () => {
    const out = await mapWithConcurrency(['a', 'b'], 50, async (v) => v.toUpperCase());
    expect(out).toEqual([
      { ok: true, value: 'A' },
      { ok: true, value: 'B' },
    ]);
  });
});
