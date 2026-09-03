import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
