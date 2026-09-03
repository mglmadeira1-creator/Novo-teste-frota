import { createClient } from '@supabase/supabase-js';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co');
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key');

const invalidAnonKeyValues = new Set([
	'',
	'placeholder-key',
	'sua-anon-key-aqui'
]);

export function isSupabaseConfigured(): boolean {
	const hasValidUrl = typeof supabaseUrl === 'string' && supabaseUrl.startsWith('https://');
	const hasValidAnonKey = !invalidAnonKeyValues.has(supabaseAnonKey);

	return hasValidUrl && hasValidAnonKey;
}

export function getSupabaseConfigError(): string | null {
	if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
		return 'VITE_SUPABASE_URL inválida ou ausente.';
	}

	if (invalidAnonKeyValues.has(supabaseAnonKey)) {
		return 'VITE_SUPABASE_ANON_KEY ausente ou em placeholder.';
	}

	return null;
}

let supabaseClient: any;

try {
	supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
	console.error('[Supabase] Falha ao inicializar cliente', error);
	supabaseClient = null;
}

export const supabase = supabaseClient;
