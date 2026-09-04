import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function jsonResponse(payload: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function getServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY nao configurados.");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFuelType(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function normalizeCardNumber(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, "");
}

function formatCardNumber(digitsOnly: string): string {
  return (digitsOnly.match(/.{1,4}/g) || [digitsOnly]).join(" ").trim();
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  const max = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < max; i += 1) {
    diff |= (i < aBytes.length ? aBytes[i] : 0) ^ (i < bBytes.length ? bBytes[i] : 0);
  }
  return diff === 0;
}

interface CartrackVeiculoResumo {
  cartrack_vehicle_id: string;
  cartrack_registration: string;
  odometer_km: number | null;
}

async function fetchCartrackVeiculos(): Promise<CartrackVeiculoResumo[]> {
  if (!SUPABASE_URL) {
    return [];
  }

  try {
    const [vehiclesResponse, statusResponse] = await Promise.all([
      fetch(`${SUPABASE_URL}/functions/v1/cartrack-proxy?action=vehicles&limit=500`),
      fetch(`${SUPABASE_URL}/functions/v1/cartrack-proxy?action=vehicles_status&limit=500`)
    ]);
    if (!vehiclesResponse.ok) {
      return [];
    }

    const json = await vehiclesResponse.json();
    const statusJson = statusResponse.ok ? await statusResponse.json() : {};
    const data = Array.isArray(json?.data) ? json.data : [];
    const statuses = Array.isArray(statusJson?.data) ? statusJson.data : [];
    const statusByVehicle = new Map<string, JsonRecord>();
    statuses.forEach((status: JsonRecord) => statusByVehicle.set(String(status.vehicle_id), status));

    return data
      .map((vehicle: JsonRecord) => {
        const vehicleId = String(vehicle.vehicle_id);
        const status = statusByVehicle.get(vehicleId) || {};
        const odometerInKm = Number(status.odometer_in_kms);
        const rawOdometer = Number(status.odometer);
        const odometerKm = Number.isFinite(odometerInKm)
          ? odometerInKm
          : Number.isFinite(rawOdometer)
            ? (status.location || status.event_ts ? Math.round(rawOdometer / 1000) : rawOdometer)
            : null;

        return {
          cartrack_vehicle_id: vehicleId,
          cartrack_registration: String(vehicle.registration || ""),
          odometer_km: Number.isFinite(odometerKm) ? odometerKm : null
        };
      })
      .filter((v: CartrackVeiculoResumo) => v.cartrack_registration)
      .sort((a: CartrackVeiculoResumo, b: CartrackVeiculoResumo) => a.cartrack_registration.localeCompare(b.cartrack_registration));
  } catch (err) {
    console.error("[oficina-terminal] Falha ao obter viaturas da Cartrack", err);
    return [];
  }
}

function normalizePositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ".").replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  const max = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;

  for (let i = 0; i < max; i += 1) {
    const av = i < aBytes.length ? aBytes[i] : 0;
    const bv = i < bBytes.length ? bBytes[i] : 0;
    diff |= av ^ bv;
  }

  return diff === 0;
}

function parseSessionToken(source: string): { sessionId: string; secret: string } | null {
  const token = source.trim();
  const [sessionId, secret] = token.split(".");
  if (!sessionId || !secret) {
    return null;
  }

  const uuidV4ish = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidV4ish.test(sessionId)) {
    return null;
  }

  return { sessionId, secret };
}

function extractSessionToken(req: Request, body: JsonRecord): string {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const fromHeader = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (fromHeader) {
    return fromHeader;
  }

  return normalizeText(body.sessionToken);
}

interface ValidSession {
  sessionId: string;
  mecanicoId: string;
  mecanicoNome: string;
  terminalId: string;
  terminalCodigo: string;
  terminalNome: string;
  oficinaNome: string | null;
}

async function validateSession(supabase: ReturnType<typeof createClient>, req: Request, body: JsonRecord): Promise<ValidSession | Response> {
  const token = extractSessionToken(req, body);
  const parsed = parseSessionToken(token);
  if (!parsed) {
    return jsonResponse({ error: "Sessao do terminal invalida." }, 401);
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from("oficina_sessoes")
    .select("id, mecanico_acesso_id, terminal_id, token_hash, token_salt, expira_at, revoked_at")
    .eq("id", parsed.sessionId)
    .maybeSingle();

  if (sessionError) {
    return jsonResponse({ error: sessionError.message }, 500);
  }

  if (!sessionRow) {
    return jsonResponse({ error: "Sessao nao encontrada." }, 401);
  }

  if (sessionRow.revoked_at) {
    return jsonResponse({ error: "Sessao revogada." }, 401);
  }

  const expiraAt = Date.parse(sessionRow.expira_at);
  if (Number.isNaN(expiraAt) || expiraAt <= Date.now()) {
    return jsonResponse({ error: "Sessao expirada." }, 401);
  }

  const computed = await sha256Hex(`${sessionRow.token_salt}:${parsed.secret}`);
  if (!timingSafeEqual(computed, sessionRow.token_hash)) {
    return jsonResponse({ error: "Sessao invalida." }, 401);
  }

  const { data: mecanico, error: mecanicoError } = await supabase
    .from("oficina_mecanicos_acessos")
    .select("id, nome, estado")
    .eq("id", sessionRow.mecanico_acesso_id)
    .maybeSingle();

  if (mecanicoError) {
    return jsonResponse({ error: mecanicoError.message }, 500);
  }

  if (!mecanico || mecanico.estado !== "ativo") {
    return jsonResponse({ error: "Mecanico inativo." }, 401);
  }

  const { data: terminal, error: terminalError } = await supabase
    .from("oficina_terminais")
    .select("id, codigo_terminal, nome_terminal, oficina_nome, estado")
    .eq("id", sessionRow.terminal_id)
    .maybeSingle();

  if (terminalError) {
    return jsonResponse({ error: terminalError.message }, 500);
  }

  if (!terminal || terminal.estado !== "ativo") {
    return jsonResponse({ error: "Terminal bloqueado." }, 401);
  }

  const nowIso = new Date().toISOString();
  await supabase
    .from("oficina_sessoes")
    .update({ last_seen_at: nowIso })
    .eq("id", sessionRow.id);

  await supabase
    .from("oficina_terminais")
    .update({ ultimo_ping_at: nowIso, updated_at: nowIso })
    .eq("id", terminal.id);

  return {
    sessionId: sessionRow.id,
    mecanicoId: mecanico.id,
    mecanicoNome: mecanico.nome,
    terminalId: terminal.id,
    terminalCodigo: terminal.codigo_terminal,
    terminalNome: terminal.nome_terminal,
    oficinaNome: terminal.oficina_nome || null
  };
}

function extractUuidFromQr(qr: string): string | null {
  const trimmed = qr.trim();
  const uuidRegex = /([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i;
  const match = trimmed.match(uuidRegex);
  return match ? match[1] : null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    let body: JsonRecord = {};
    if (req.method === "POST") {
      try {
        body = (await req.json()) as JsonRecord;
      } catch {
        body = {};
      }
    }

    const action = normalizeText(body.action || "validate_session").toLowerCase();

    if (action === "status") {
      return jsonResponse({ ok: true, configured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) });
    }

    const session = await validateSession(supabase, req, body);
    if (session instanceof Response) {
      return session;
    }

    if (action === "validate_session") {
      return jsonResponse({
        ok: true,
        mecanico: {
          id: session.mecanicoId,
          nome: session.mecanicoNome
        },
        terminal: {
          id: session.terminalId,
          codigo: session.terminalCodigo,
          nome: session.terminalNome,
          oficinaNome: session.oficinaNome
        }
      });
    }

    if (action === "logout") {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("oficina_sessoes")
        .update({ revoked_at: nowIso, last_seen_at: nowIso })
        .eq("id", session.sessionId)
        .is("revoked_at", null);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ ok: true });
    }

    if (action === "list_viaturas") {
      const motoristaId = normalizeText(body.motoristaId);
      const data = await fetchCartrackVeiculos();

      if (!motoristaId) {
        return jsonResponse({ items: data });
      }

      const { data: motorista, error: motoristaError } = await supabase
        .from("combustivel_motoristas")
        .select("acesso_viaturas")
        .eq("id", motoristaId)
        .maybeSingle();

      if (motoristaError) {
        return jsonResponse({ error: motoristaError.message }, 500);
      }

      if (!motorista || motorista.acesso_viaturas !== "restrito") {
        return jsonResponse({ items: data });
      }

      const { data: permitidas, error: permitidasError } = await supabase
        .from("combustivel_motorista_viaturas_permitidas")
        .select("cartrack_vehicle_id")
        .eq("motorista_id", motoristaId);

      if (permitidasError) {
        return jsonResponse({ error: permitidasError.message }, 500);
      }

      const allowedIds = new Set((permitidas || []).map((row: JsonRecord) => row.cartrack_vehicle_id));
      return jsonResponse({ items: (data || []).filter((item: JsonRecord) => allowedIds.has(item.cartrack_vehicle_id)) });
    }

    if (action === "resolve_motorista_qr" || action === "resolve_cartao") {
      const qrRaw = normalizeText(body.qrCode);
      const tokenId = qrRaw ? extractUuidFromQr(qrRaw) : null;
      const numeroCartao = normalizeCardNumber(body.numeroCartao);
      const pin = normalizeText(body.pin);

      if (!tokenId && !numeroCartao) {
        return jsonResponse({ error: "Le o QR Code ou introduz o numero do cartao." }, 400);
      }

      if (!/^\d{4,8}$/.test(pin)) {
        return jsonResponse({ error: "PIN numerico entre 4 e 8 digitos obrigatorio." }, 400);
      }

      const cardQuery = supabase
        .from("combustivel_motorista_cartoes")
        .select("id, motorista_id, estado, qr_token_id, numero_cartao, pin_hash, pin_salt, motorista:combustivel_motoristas(id, external_driver_id, nome, acesso_viaturas)");

      const { data: card, error: cardError } = tokenId
        ? await cardQuery.eq("qr_token_id", tokenId).maybeSingle()
        : await cardQuery.eq("numero_cartao", formatCardNumber(numeroCartao)).maybeSingle();

      if (cardError) {
        return jsonResponse({ error: cardError.message }, 500);
      }

      if (!card) {
        return jsonResponse({ error: "Cartao nao encontrado." }, 404);
      }

      const pinHash = card.pin_hash && card.pin_salt
        ? await sha256Hex(`${card.pin_salt}:${pin}`)
        : "";
      if (!card.pin_hash || !card.pin_salt || !timingSafeEqual(pinHash, card.pin_hash)) {
        return jsonResponse({ error: "PIN do cartao invalido." }, 401);
      }

      const motorista = Array.isArray(card.motorista) ? card.motorista[0] : card.motorista;

      if (card.estado !== "ativo") {
        return jsonResponse({
          error: "Cartao nao autorizado para abastecimento.",
          cartao: { id: card.id, numeroCartao: card.numero_cartao, estado: card.estado },
          motorista: { id: motorista?.id, nome: motorista?.nome || "Motorista sem nome" }
        }, 403);
      }

      await supabase
        .from("combustivel_motorista_cartoes")
        .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", card.id);

      return jsonResponse({
        cartao: {
          id: card.id,
          qrTokenId: card.qr_token_id,
          numeroCartao: card.numero_cartao,
          estado: card.estado
        },
        motorista: {
          id: motorista?.id,
          external_driver_id: motorista?.external_driver_id,
          nome: motorista?.nome || "Motorista sem nome",
          acessoViaturas: motorista?.acesso_viaturas || "todas"
        }
      });
    }

    if (action === "registar_abastecimento") {
      const motoristaId = normalizeText(body.motoristaId) || null;
      const motoristaNome = normalizeText(body.motoristaNomeSnapshot);
      const motoristaQrCodigo = normalizeText(body.motoristaQrCodigo) || null;
      const cartaoId = normalizeText(body.cartaoId) || null;
      const cartrackVehicleId = normalizeText(body.cartrackVehicleId);
      const registration = normalizeText(body.registration).toUpperCase();
      const fuelType = normalizeFuelType(body.fuelType);
      const litros = normalizePositiveNumber(body.litros);
      const quilometragemKm = normalizePositiveNumber(body.quilometragemKm);

      if (!motoristaNome) {
        return jsonResponse({ error: "Motorista obrigatorio." }, 400);
      }

      if (!cartrackVehicleId || !registration) {
        return jsonResponse({ error: "Viatura obrigatoria." }, 400);
      }

      if (!fuelType || !["gasoleo", "gasolina", "adblue", "gpl", "eletrico", "outro"].includes(fuelType)) {
        return jsonResponse({ error: "Tipo de combustivel invalido." }, 400);
      }

      if (!litros || !quilometragemKm) {
        return jsonResponse({ error: "Litros e quilometragem obrigatorios." }, 400);
      }

      if (cartaoId) {
        const { data: cartaoAtual, error: cartaoError } = await supabase
          .from("combustivel_motorista_cartoes")
          .select("id, estado")
          .eq("id", cartaoId)
          .maybeSingle();

        if (cartaoError) {
          return jsonResponse({ error: cartaoError.message }, 500);
        }

        if (!cartaoAtual || cartaoAtual.estado !== "ativo") {
          return jsonResponse({ error: "Cartao nao autorizado para abastecimento." }, 403);
        }
      }

      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from("oficina_operacoes_abastecimento")
        .insert({
          motorista_id: motoristaId,
          motorista_nome_snapshot: motoristaNome,
          motorista_qr_codigo: motoristaQrCodigo,
          cartao_id: cartaoId,
          cartrack_vehicle_id: cartrackVehicleId,
          registration,
          mecanico_acesso_id: session.mecanicoId,
          mecanico_nome_snapshot: session.mecanicoNome,
          terminal_id: session.terminalId,
          fuel_type: fuelType,
          litros,
          quilometragem_km: Math.round(quilometragemKm),
          operacao_ts: nowIso,
          origem: "OFICINA"
        })
        .select("id, operacao_ts, origem")
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({
        ok: true,
        operacao: {
          ...data,
          motoristaNomeSnapshot: motoristaNome,
          registration,
          fuelType,
          litros,
          quilometragemKm: Math.round(quilometragemKm),
          mecanicoNome: session.mecanicoNome,
          terminalNome: session.terminalNome
        }
      });
    }

    if (action === "operacoes_recentes") {
      const limit = Math.min(Math.max(Number(body.limit || 20), 1), 100);

      const { data, error } = await supabase
        .from("oficina_operacoes_abastecimento")
        .select("id, operacao_ts, motorista_nome_snapshot, registration, cartrack_vehicle_id, mecanico_nome_snapshot, fuel_type, litros, quilometragem_km, origem, terminal_id")
        .eq("terminal_id", session.terminalId)
        .order("operacao_ts", { ascending: false })
        .limit(limit);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ items: data || [] });
    }

    return jsonResponse({ error: "Acao nao suportada." }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno inesperado.";
    return jsonResponse({ error: message }, 500);
  }
});
