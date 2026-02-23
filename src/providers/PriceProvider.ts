export interface PriceData {
  ds: string;
  price: number;
}

export interface ProviderStatus {
  last_fetch_at: string | null;
  last_price: PriceData | null;
  retries_last_run: number;
  fallback_used_last_run: boolean;
  scheduler_interval_min: number;
}

export interface PriceProvider {
  name: string;
  fetchLatestPrice(): Promise<PriceData>;
  getStatus(): ProviderStatus;
}
