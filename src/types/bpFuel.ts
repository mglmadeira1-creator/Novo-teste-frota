export type BpEnvironment = 'sandbox' | 'production';

export interface BpFuelConnectionStatus {
  configured: boolean;
  environment: BpEnvironment;
  message: string;
  lastSyncAt?: string;
}

export interface BpFuelSyncResult {
  success: boolean;
  message: string;
  imported: number;
  updated: number;
  duplicates: number;
  fetched: number;
  lastSyncAt?: string;
}

export interface BpFuelSyncRequest {
  startDate?: string;
  endDate?: string;
  forceFullSync?: boolean;
}

export interface BpFuelTransactionNormalized {
  transaction_id: string;
  transaction_date: string;
  transaction_time?: string;
  transaction_datetime?: string;
  card_id?: string;
  driver_tag?: string;
  vehicle_id?: string;
  vehicle_registration?: string;
  driver_name?: string;
  fuel_type?: string;
  litres?: number;
  price_per_litre?: number;
  total_amount?: number;
  currency?: string;
  odometer?: number;
  site_id?: string;
  site_name?: string;
  site_address?: string;
  country?: string;
  invoice_number?: string;
  raw_data: Record<string, unknown>;
}
