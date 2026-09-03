import { BpFuelConnectionStatus, BpFuelSyncRequest, BpFuelSyncResult } from '../types/bpFuel';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function assertSupabaseConfig(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'sua-anon-key-aqui') {
    throw new Error('Supabase não configurado no frontend. Define VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
}

async function callBpProxy<T>(action: string, body?: Record<string, unknown>): Promise<T> {
  assertSupabaseConfig();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/bp-fuel-proxy?action=${encodeURIComponent(action)}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : `Erro HTTP ${response.status} no proxy BP`;
    throw new Error(message);
  }

  return payload as T;
}

export const bpFuelService = {
  async getConnectionStatus(): Promise<BpFuelConnectionStatus> {
    const result = await callBpProxy<{
      configured: boolean;
      environment?: 'sandbox' | 'production';
      message?: string;
      last_sync_at?: string;
    }>('status');

    return {
      configured: result.configured,
      environment: result.environment || 'sandbox',
      message: result.message || (result.configured ? 'Ligado' : 'API BP não configurada'),
      lastSyncAt: result.last_sync_at || undefined
    };
  },

  async syncTransactions(request: BpFuelSyncRequest = {}): Promise<BpFuelSyncResult> {
    const result = await callBpProxy<{
      success: boolean;
      message?: string;
      imported?: number;
      updated?: number;
      duplicates?: number;
      fetched?: number;
      last_sync_at?: string;
    }>('sync', request as Record<string, unknown>);

    return {
      success: result.success,
      message: result.message || 'Sincronização concluída',
      imported: result.imported || 0,
      updated: result.updated || 0,
      duplicates: result.duplicates || 0,
      fetched: result.fetched || 0,
      lastSyncAt: result.last_sync_at || undefined
    };
  }
};
