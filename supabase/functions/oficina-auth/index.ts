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
const OFICINA_CODE_PEPPER = Deno.env.get("OFICINA_CODE_PEPPER") || "";
const OFICINA_SESSION_TTL_MINUTES = Number(Deno.env.get("OFICINA_SESSION_TTL_MINUTES") || "480");

function jsonResponse(payload: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCode(value: unknown): string {
  return normalizeText(value).toUpperCase().replace(/\s+/g, "");
}

function buildCodeHint(code: string): string {
  if (code.length <= 4) {
    return `${code[0] || "*"}${"*".repeat(Math.max(code.length - 1, 0))}`;
  }

  return `${code.slice(0, 4)}${"*".repeat(Math.max(code.length - 6, 0))}${code.slice(-2)}`;
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

function resolveRole(user: JsonRecord | null): string {
  if (!user) {
    return "";
  }

  const appMetadata = (user.app_metadata || {}) as JsonRecord;
  const userMetadata = (user.user_metadata || {}) as JsonRecord;
  const fromApp = normalizeText(appMetadata.role).toLowerCase();
  const fromUser = normalizeText(userMetadata.role).toLowerCase();

  if (fromApp || fromUser) {
    return fromApp || fromUser;
  }

  // Contas antigas sem `role` configurado mantêm acesso total (migração incremental, mesma regra do frontend).
  const hasAnyRoleField = "role" in appMetadata || "role" in userMetadata;
  return hasAnyRoleField ? "" : "administrador";
}

function buildMechanicCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `OFI-${digits}`;
}

function buildCardNumber(): string {
  const groups: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    const bytes = new Uint8Array(2);
    crypto.getRandomValues(bytes);
    const value = (bytes[0] << 8 | bytes[1]) % 10000;
    groups.push(value.toString().padStart(4, "0"));
  }
  return groups.join(" ");
}

function normalizeCardNumber(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, "");
}

async function hashMechanicCode(code: string): Promise<{ lookupHash: string; salt: string; hash: string; hint: string }> {
  const normalizedCode = normalizeCode(code);
  const salt = randomHex(16);
  const hash = await sha256Hex(`${salt}:${normalizedCode}`);
  const lookupHash = await sha256Hex(`${OFICINA_CODE_PEPPER}:${normalizedCode}`);

  return {
    lookupHash,
    salt,
    hash,
    hint: buildCodeHint(normalizedCode)
  };
}

async function hashCardPin(pin: string): Promise<{ salt: string; hash: string }> {
  const salt = randomHex(16);
  const hash = await sha256Hex(`${salt}:${pin}`);
  return { salt, hash };
}

async function loginMotorista(reqBody: JsonRecord, supabase: ReturnType<typeof createClient>): Promise<Response> {
  const numeroCartao = normalizeCardNumber(reqBody.numeroCartao);
  const pin = normalizeText(reqBody.pin);

  if (!numeroCartao || !/^\d{4,32}$/.test(numeroCartao) || !/^\d{4,8}$/.test(pin)) {
    return jsonResponse({ error: "Numero de cartao ou PIN invalido." }, 400);
  }

  const formattedCardNumber = numeroCartao.match(/.{1,4}/g)?.join(" ") || numeroCartao;
  const { data: cartao, error: cartaoError } = await supabase
    .from("combustivel_motorista_cartoes")
    .select("id, numero_cartao, qr_token_id, estado, pin_hash, pin_salt, motorista:combustivel_motoristas(id, nome)")
    .eq("numero_cartao", formattedCardNumber)
    .maybeSingle();

  if (cartaoError) {
    return jsonResponse({ error: cartaoError.message }, 500);
  }

  const motorista = Array.isArray(cartao?.motorista) ? cartao.motorista[0] : cartao?.motorista;
  if (!cartao || !cartao.pin_hash || !cartao.pin_salt || !motorista) {
    return jsonResponse({ error: "Cartao ou PIN invalido." }, 401);
  }

  const pinHash = await sha256Hex(`${cartao.pin_salt}:${pin}`);
  if (!timingSafeEqual(pinHash, cartao.pin_hash) || cartao.estado !== "ativo") {
    return jsonResponse({ error: cartao.estado === "ativo" ? "Cartao ou PIN invalido." : "Cartao bloqueado ou suspenso." }, 401);
  }

  const secret = randomHex(32);
  const tokenHash = await sha256Hex(secret);
  const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const { data: session, error: sessionError } = await supabase
    .from("motorista_sessoes")
    .insert({ cartao_id: cartao.id, token_hash: tokenHash, expira_at: expires.toISOString() })
    .select("id")
    .single();

  if (sessionError || !session) {
    return jsonResponse({ error: sessionError?.message || "Falha ao criar sessao do motorista." }, 500);
  }

  return jsonResponse({
    token: `${session.id}.${secret}`,
    expiresAt: expires.toISOString(),
    card: {
      numeroCartao: cartao.numero_cartao,
      motoristaId: motorista.id,
      motoristaNome: motorista.nome,
      qrTokenId: cartao.qr_token_id,
      estado: cartao.estado
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

async function requireAdmin(req: Request, supabase: ReturnType<typeof createClient>): Promise<{ id: string } | Response> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return jsonResponse({ error: "Sessao autenticada necessaria." }, 401);
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return jsonResponse({ error: "Token de autenticacao invalido." }, 401);
  }

  const role = resolveRole(data.user as unknown as JsonRecord);
  if (role !== "administrador") {
    return jsonResponse({ error: "Acesso reservado a administrador." }, 403);
  }

  return { id: data.user.id };
}

async function loginMechanic(reqBody: JsonRecord, supabase: ReturnType<typeof createClient>, req: Request): Promise<Response> {
  if (!OFICINA_CODE_PEPPER) {
    return jsonResponse({ error: "Secret OFICINA_CODE_PEPPER nao configurado." }, 500);
  }

  const code = normalizeCode(reqBody.codigo);
  const terminalCode = normalizeText(reqBody.terminalCode || "OF-TERM-01").toUpperCase();

  if (!code) {
    return jsonResponse({ error: "Codigo de acesso obrigatorio." }, 400);
  }

  const lookupHash = await sha256Hex(`${OFICINA_CODE_PEPPER}:${code}`);

  const { data: mecanico, error: mecanicoError } = await supabase
    .from("oficina_mecanicos_acessos")
    .select("id, nome, estado, codigo_hash, codigo_salt")
    .eq("codigo_lookup_hash", lookupHash)
    .maybeSingle();

  if (mecanicoError) {
    return jsonResponse({ error: mecanicoError.message }, 500);
  }

  if (!mecanico || mecanico.estado !== "ativo") {
    return jsonResponse({ error: "Codigo invalido ou inativo." }, 401);
  }

  const compareHash = await sha256Hex(`${mecanico.codigo_salt}:${code}`);
  if (!timingSafeEqual(compareHash, mecanico.codigo_hash)) {
    return jsonResponse({ error: "Codigo invalido ou inativo." }, 401);
  }

  const { data: terminal, error: terminalError } = await supabase
    .from("oficina_terminais")
    .select("id, codigo_terminal, nome_terminal, oficina_nome, estado")
    .eq("codigo_terminal", terminalCode)
    .maybeSingle();

  if (terminalError) {
    return jsonResponse({ error: terminalError.message }, 500);
  }

  if (!terminal || terminal.estado !== "ativo") {
    return jsonResponse({ error: "Terminal invalido ou bloqueado." }, 401);
  }

  const secret = randomHex(32);
  const tokenSalt = randomHex(16);
  const tokenHash = await sha256Hex(`${tokenSalt}:${secret}`);

  const now = new Date();
  const expires = new Date(now.getTime() + OFICINA_SESSION_TTL_MINUTES * 60 * 1000);

  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const userAgent = req.headers.get("user-agent") || "";

  const { data: sessionRow, error: insertSessionError } = await supabase
    .from("oficina_sessoes")
    .insert({
      mecanico_acesso_id: mecanico.id,
      terminal_id: terminal.id,
      token_hash: tokenHash,
      token_salt: tokenSalt,
      expira_at: expires.toISOString(),
      ip: forwardedFor,
      user_agent: userAgent
    })
    .select("id")
    .single();

  if (insertSessionError || !sessionRow) {
    return jsonResponse({ error: insertSessionError?.message || "Falha ao criar sessao." }, 500);
  }

  await supabase
    .from("oficina_mecanicos_acessos")
    .update({
      ultimo_acesso_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    .eq("id", mecanico.id);

  await supabase
    .from("oficina_terminais")
    .update({
      ultimo_ping_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    .eq("id", terminal.id);

  return jsonResponse({
    token: `${sessionRow.id}.${secret}`,
    expiresAt: expires.toISOString(),
    mecanico: {
      id: mecanico.id,
      nome: mecanico.nome
    },
    terminal: {
      id: terminal.id,
      codigo: terminal.codigo_terminal,
      nome: terminal.nome_terminal,
      oficinaNome: terminal.oficina_nome
    }
  });
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

    const action = normalizeText(body.action || "status").toLowerCase();

    if (action === "status") {
      return jsonResponse({
        ok: true,
        configured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
        codePepperConfigured: Boolean(OFICINA_CODE_PEPPER)
      });
    }

    if (action === "login") {
      return await loginMechanic(body, supabase, req);
    }

    if (action === "login_motorista") {
      return await loginMotorista(body, supabase);
    }

    const admin = await requireAdmin(req, supabase);
    if (admin instanceof Response) {
      return admin;
    }

    if (action === "list_accesses") {
      const { data, error } = await supabase
        .from("oficina_mecanicos_acessos")
        .select("id, nome, codigo_hint, estado, created_at, updated_at, ultimo_acesso_at, bloqueado_at, revogado_at")
        .order("created_at", { ascending: false });

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ items: data || [] });
    }

    if (action === "create_access") {
      if (!OFICINA_CODE_PEPPER) {
        return jsonResponse({ error: "Secret OFICINA_CODE_PEPPER nao configurado." }, 500);
      }

      const nome = normalizeText(body.nome);
      const incomingCode = normalizeCode(body.codigo);
      const code = incomingCode || buildMechanicCode();

      if (!nome) {
        return jsonResponse({ error: "Nome do mecanico obrigatorio." }, 400);
      }

      if (code.length < 6 || code.length > 32) {
        return jsonResponse({ error: "Codigo de acesso invalido." }, 400);
      }

      const hashed = await hashMechanicCode(code);
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("oficina_mecanicos_acessos")
        .insert({
          nome,
          codigo_lookup_hash: hashed.lookupHash,
          codigo_hash: hashed.hash,
          codigo_salt: hashed.salt,
          codigo_hint: hashed.hint,
          estado: "ativo",
          criado_por_user_id: admin.id,
          created_at: now,
          updated_at: now
        })
        .select("id, nome, codigo_hint, estado, created_at, updated_at")
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({
        item: data,
        generatedCode: code
      });
    }

    if (action === "set_state") {
      const acessoId = normalizeText(body.acessoId);
      const estado = normalizeText(body.estado).toLowerCase();

      if (!acessoId || !["ativo", "bloqueado", "revogado"].includes(estado)) {
        return jsonResponse({ error: "Parametros invalidos para estado." }, 400);
      }

      const now = new Date().toISOString();
      const payload: JsonRecord = {
        estado,
        updated_at: now
      };

      if (estado === "bloqueado") {
        payload.bloqueado_at = now;
      }

      if (estado === "revogado") {
        payload.revogado_at = now;
      }

      const { error } = await supabase
        .from("oficina_mecanicos_acessos")
        .update(payload)
        .eq("id", acessoId);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      if (estado === "bloqueado" || estado === "revogado") {
        await supabase
          .from("oficina_sessoes")
          .update({ revoked_at: now })
          .eq("mecanico_acesso_id", acessoId)
          .is("revoked_at", null);
      }

      return jsonResponse({ ok: true });
    }

    if (action === "regenerate_code") {
      if (!OFICINA_CODE_PEPPER) {
        return jsonResponse({ error: "Secret OFICINA_CODE_PEPPER nao configurado." }, 500);
      }

      const acessoId = normalizeText(body.acessoId);
      const incomingCode = normalizeCode(body.codigo);
      const newCode = incomingCode || buildMechanicCode();

      if (!acessoId) {
        return jsonResponse({ error: "acessoId obrigatorio." }, 400);
      }

      if (newCode.length < 6 || newCode.length > 32) {
        return jsonResponse({ error: "Codigo de acesso invalido." }, 400);
      }

      const hashed = await hashMechanicCode(newCode);
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("oficina_mecanicos_acessos")
        .update({
          codigo_lookup_hash: hashed.lookupHash,
          codigo_hash: hashed.hash,
          codigo_salt: hashed.salt,
          codigo_hint: hashed.hint,
          estado: "ativo",
          updated_at: now,
          revogado_at: null,
          bloqueado_at: null
        })
        .eq("id", acessoId)
        .select("id, nome, codigo_hint, estado, created_at, updated_at, ultimo_acesso_at")
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      await supabase
        .from("oficina_sessoes")
        .update({ revoked_at: now })
        .eq("mecanico_acesso_id", acessoId)
        .is("revoked_at", null);

      return jsonResponse({
        item: data,
        generatedCode: newCode
      });
    }

    if (action === "list_motoristas") {
      const { data, error } = await supabase
        .from("combustivel_motoristas")
        .select("id, external_driver_id, nome, acesso_viaturas")
        .order("nome", { ascending: true });

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ items: data || [] });
    }

    if (action === "create_motorista") {
      const nome = normalizeText(body.nome);
      const externalDriverId = normalizeText(body.externalDriverId) || null;

      if (!nome) {
        return jsonResponse({ error: "Nome do motorista obrigatorio." }, 400);
      }

      const { data, error } = await supabase
        .from("combustivel_motoristas")
        .insert({ nome, external_driver_id: externalDriverId })
        .select("id, external_driver_id, nome, acesso_viaturas")
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ item: data });
    }

    if (action === "list_veiculos") {
      const { data, error } = await supabase
        .from("veiculos_admin")
        .select("cartrack_vehicle_id, cartrack_registration, id_interno")
        .eq("ativo", true)
        .order("cartrack_registration", { ascending: true });

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ items: data || [] });
    }

    if (action === "list_cartoes") {
      const { data, error } = await supabase
        .from("combustivel_motorista_cartoes")
        .select("id, numero_cartao, estado, created_at, updated_at, last_used_at, motorista:combustivel_motoristas(id, nome)")
        .order("created_at", { ascending: false });

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      const { data: ultimosAbastecimentos } = await supabase
        .from("oficina_operacoes_abastecimento")
        .select("cartao_id, operacao_ts")
        .not("cartao_id", "is", null)
        .order("operacao_ts", { ascending: false });

      const ultimoAbastecimentoPorCartao = new Map<string, string>();
      for (const row of ultimosAbastecimentos || []) {
        const cartaoId = (row as JsonRecord).cartao_id as string;
        if (!ultimoAbastecimentoPorCartao.has(cartaoId)) {
          ultimoAbastecimentoPorCartao.set(cartaoId, (row as JsonRecord).operacao_ts as string);
        }
      }

      const items = (data || []).map((row: JsonRecord) => {
        const motorista = Array.isArray(row.motorista) ? row.motorista[0] : row.motorista;
        return {
          id: row.id,
          numero_cartao: row.numero_cartao,
          estado: row.estado,
          created_at: row.created_at,
          updated_at: row.updated_at,
          last_used_at: row.last_used_at,
          ultimo_abastecimento_at: ultimoAbastecimentoPorCartao.get(row.id as string) || null,
          motorista_id: (motorista as JsonRecord | undefined)?.id,
          motorista_nome: (motorista as JsonRecord | undefined)?.nome || "Motorista sem nome"
        };
      });

      return jsonResponse({ items });
    }

    if (action === "create_cartao") {
      const motoristaId = normalizeText(body.motoristaId);
      const pin = normalizeText(body.pin);
      if (!motoristaId) {
        return jsonResponse({ error: "Motorista obrigatorio." }, 400);
      }

      if (!/^\d{4,8}$/.test(pin)) {
        return jsonResponse({ error: "PIN numerico entre 4 e 8 digitos obrigatorio." }, 400);
      }

      const { data: motorista, error: motoristaError } = await supabase
        .from("combustivel_motoristas")
        .select("id, nome")
        .eq("id", motoristaId)
        .maybeSingle();

      if (motoristaError) {
        return jsonResponse({ error: motoristaError.message }, 500);
      }

      if (!motorista) {
        return jsonResponse({ error: "Motorista nao encontrado." }, 404);
      }

      const now = new Date().toISOString();
      const pinData = await hashCardPin(pin);
      let lastError: string | null = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const numeroCartao = buildCardNumber();

        const { data, error } = await supabase
          .from("combustivel_motorista_cartoes")
          .insert({
            motorista_id: motoristaId,
            numero_cartao: numeroCartao,
            pin_hash: pinData.hash,
            pin_salt: pinData.salt,
            estado: "ativo",
            criado_por_user_id: admin.id,
            created_at: now,
            updated_at: now
          })
          .select("id, numero_cartao, estado, created_at, updated_at")
          .single();

        if (!error && data) {
          return jsonResponse({
            item: {
              ...data,
              motorista_id: motorista.id,
              motorista_nome: motorista.nome
            }
          });
        }

        lastError = error?.message || "Falha ao criar cartao.";
        if (!lastError.toLowerCase().includes("duplicate") && !lastError.toLowerCase().includes("unique")) {
          break;
        }
      }

      return jsonResponse({ error: lastError || "Nao foi possivel gerar um numero de cartao unico." }, 500);
    }

    if (action === "set_cartao_estado") {
      const cartaoId = normalizeText(body.cartaoId);
      const estado = normalizeText(body.estado).toLowerCase();

      if (!cartaoId || !["ativo", "bloqueado", "suspenso"].includes(estado)) {
        return jsonResponse({ error: "Parametros invalidos para estado do cartao." }, 400);
      }

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("combustivel_motorista_cartoes")
        .update({ estado, updated_at: now })
        .eq("id", cartaoId);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ ok: true });
    }

    if (action === "regenerate_cartao") {
      const cartaoId = normalizeText(body.cartaoId);
      if (!cartaoId) {
        return jsonResponse({ error: "cartaoId obrigatorio." }, 400);
      }

      const now = new Date().toISOString();
      let lastError: string | null = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const numeroCartao = buildCardNumber();

        const { data, error } = await supabase
          .from("combustivel_motorista_cartoes")
          .update({
            numero_cartao: numeroCartao,
            qr_token_id: crypto.randomUUID(),
            updated_at: now
          })
          .eq("id", cartaoId)
          .select("id, numero_cartao, estado, created_at, updated_at")
          .single();

        if (!error && data) {
          return jsonResponse({ item: data });
        }

        lastError = error?.message || "Falha ao regenerar cartao.";
        if (!lastError.toLowerCase().includes("duplicate") && !lastError.toLowerCase().includes("unique")) {
          break;
        }
      }

      return jsonResponse({ error: lastError || "Nao foi possivel regenerar o cartao." }, 500);
    }

    if (action === "cartao_historico") {
      const cartaoId = normalizeText(body.cartaoId);
      if (!cartaoId) {
        return jsonResponse({ error: "cartaoId obrigatorio." }, 400);
      }

      const { data, error } = await supabase
        .from("oficina_operacoes_abastecimento")
        .select("id, operacao_ts, registration, cartrack_vehicle_id, mecanico_nome_snapshot, fuel_type, litros, quilometragem_km")
        .eq("cartao_id", cartaoId)
        .order("operacao_ts", { ascending: false })
        .limit(50);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ items: data || [] });
    }

    if (action === "get_motorista_acesso") {
      const motoristaId = normalizeText(body.motoristaId);
      if (!motoristaId) {
        return jsonResponse({ error: "motoristaId obrigatorio." }, 400);
      }

      const { data: motorista, error: motoristaError } = await supabase
        .from("combustivel_motoristas")
        .select("id, acesso_viaturas")
        .eq("id", motoristaId)
        .maybeSingle();

      if (motoristaError) {
        return jsonResponse({ error: motoristaError.message }, 500);
      }

      const { data: permitidas, error: permitidasError } = await supabase
        .from("combustivel_motorista_viaturas_permitidas")
        .select("cartrack_vehicle_id")
        .eq("motorista_id", motoristaId);

      if (permitidasError) {
        return jsonResponse({ error: permitidasError.message }, 500);
      }

      return jsonResponse({
        modo: motorista?.acesso_viaturas || "todas",
        veiculoIds: (permitidas || []).map((row: JsonRecord) => row.cartrack_vehicle_id)
      });
    }

    if (action === "set_motorista_acesso") {
      const motoristaId = normalizeText(body.motoristaId);
      const modo = normalizeText(body.modo).toLowerCase();
      const veiculoIds = Array.isArray(body.veiculoIds) ? body.veiculoIds.map((v) => normalizeText(v)).filter(Boolean) : [];

      if (!motoristaId || !["todas", "restrito"].includes(modo)) {
        return jsonResponse({ error: "Parametros invalidos para acesso a viaturas." }, 400);
      }

      const { error: updateError } = await supabase
        .from("combustivel_motoristas")
        .update({ acesso_viaturas: modo, updated_at: new Date().toISOString() })
        .eq("id", motoristaId);

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500);
      }

      const { error: deleteError } = await supabase
        .from("combustivel_motorista_viaturas_permitidas")
        .delete()
        .eq("motorista_id", motoristaId);

      if (deleteError) {
        return jsonResponse({ error: deleteError.message }, 500);
      }

      if (modo === "restrito" && veiculoIds.length > 0) {
        const rows = veiculoIds.map((cartrackVehicleId: string) => ({
          motorista_id: motoristaId,
          cartrack_vehicle_id: cartrackVehicleId
        }));

        const { error: insertError } = await supabase
          .from("combustivel_motorista_viaturas_permitidas")
          .insert(rows);

        if (insertError) {
          return jsonResponse({ error: insertError.message }, 500);
        }
      }

      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Acao nao suportada." }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno inesperado.";
    return jsonResponse({ error: message }, 500);
  }
});
