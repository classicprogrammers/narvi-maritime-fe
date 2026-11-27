// Runs `worker(item, index)` over `items` with at most `limit` in flight.
// Resolves (never rejects) to an array in input order of
// { ok: true, value } or { ok: false, error }.
export const mapWithConcurrency = async (items, limit, worker) => {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  const size = Math.max(1, Math.min(Math.floor(Number(limit)) || 1, list.length));
  let next = 0;

  const run = async () => {
    while (next < list.length) {
      const index = next;
      next += 1;
      try {
        results[index] = { ok: true, value: await worker(list[index], index) };
      } catch (error) {
        results[index] = { ok: false, error };
      }
    }
  };

  await Promise.all(Array.from({ length: list.length ? size : 0 }, run));
  return results;
};

export default mapWithConcurrency;
