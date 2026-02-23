export function getPriceSSE(asset: string, currency: string): EventSource {
  const key = `${asset}:${currency}`;
  const w = window as any;
  w.__gvSSE = w.__gvSSE || {};
  const existing = w.__gvSSE[key] as EventSource | undefined;
  if (existing && existing.readyState !== 2 /* CLOSED */) return existing;
  const sse = new EventSource(
    `/api/stream/prices?asset=${asset}&currency=${currency}`
  );
  w.__gvSSE[key] = sse;
  return sse;
}

export function closePriceSSE(asset: string, currency: string) {
  const key = `${asset}:${currency}`;
  const w = window as any;
  if (w.__gvSSE?.[key]) {
    try {
      w.__gvSSE[key].close();
    } catch {}
    delete w.__gvSSE[key];
  }
}
