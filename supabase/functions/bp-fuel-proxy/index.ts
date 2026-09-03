import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

type JsonRecord = Record<string, unknown>;

interface NormalizedBpTransaction {
  transaction_id: string;
  transaction_datetime: string | null;
  transaction_date: string | null;
  transaction_time: string | null;
  card_id: string | null;
  driver_tag: string | null;
  vehicle_id: string | null;
  vehicle_registration: string | null;
  driver_name: string | null;
  fuel_type: string | null;
  litres: number | null;
  price_per_litre: number | null;
  total_amount: number | null;
  currency: string | null;
  odometer: number | null;
  site_id: string | null;
  site_name: string | null;
  site_address: string | null;
  country: string | null;
  invoice_number: string | null;
  raw_data: JsonRecord;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const BP_ENV = (Deno.env.get("BP_ENV") || "sandbox").toLowerCase() === "production" ? "production" : "sandbox";
const BP_CLIENT_ID = Deno.env.get("BP_CLIENT_ID") || "";
const BP_CLIENT_SECRET = Deno.env.get("BP_CLIENT_SECRET") || "";
const BP_API_KEY = Deno.env.get("BP_API_KEY") || "";
const BP_SCOPE = Deno.env.get("BP_SCOPE") || "";

const BP_AUTH_BASE_URL = Deno.env.get("BP_AUTH_BASE_URL") || (BP_ENV === "production"
  ? "https://api.fleet.bp.com/authentication/v1.0"
  : "https://api.sandbox.fleet.bp.com/authentication/v1.0");

const BP_TRANSACTION_BASE_URL = Deno.env.get("BP_TRANSACTION_BASE_URL") || (BP_ENV === "production"
  ? "https://api.fleet.bp.com/transaction-management/v1.0"
  : "https://api.sandbox.fleet.bp.com/transaction-management/v1.0");

const BP_AUTH_TOKEN_PATH = Deno.env.get("BP_AUTH_TOKEN_PATH") || "/token";
const BP_TRANSACTIONS_PATH = Deno.env.get("BP_TRANSACTIONS_PATH") || "/transactions";
const BP_DEFAULT_PARENT_IDS = Deno.env.get("BP_DEFAULT_PARENT_IDS") || "[]";
const BP_DEFAULT_AUTHORITY_IDS = Deno.env.get("BP_DEFAULT_AUTHORITY_IDS") || "[]";
const BP_TX_FROM_PARAM = Deno.env.get("BP_TX_FROM_PARAM") || "FromDate";
const BP_TX_TO_PARAM = Deno.env.get("BP_TX_TO_PARAM") || "ToDate";
const BP_TX_PAGE_PARAM = Deno.env.get("BP_TX_PAGE_PARAM") || "Page";
const BP_TX_PAGE_SIZE_PARAM = Deno.env.get("BP_TX_PAGE_SIZE_PARAM") || "PageSize";
const BP_TX_PAGE_SIZE = Number(Deno.env.get("BP_TX_PAGE_SIZE") || "100");
const BP_TX_MAX_PAGES = Number(Deno.env.get("BP_TX_MAX_PAGES") || "20");

function jsonResponse(payload: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, ".").replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getPath(obj: JsonRecord, path: string): unknown {
  const parts = path.split(".");
  let cursor: unknown = obj;

  for (const part of parts) {
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }

    cursor = (cursor as JsonRecord)[part];
  }

  return cursor;
}

function pickValue(obj: JsonRecord, candidates: string[]): unknown {
  for (const candidate of candidates) {
    const value = getPath(obj, candidate);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function normalizeIsoDateTime(value: unknown): string | null {
  const source = normalizeText(value);
  if (!source) {
    return null;
  }

  const withT = source.includes("T") ? source : source.replace(" ", "T");
  const withTimezone = withT.replace(/([+-]\d{2})$/, "$1:00");
  const parsed = Date.parse(withTimezone);

  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function normalizeDate(value: unknown): string | null {
  const source = normalizeText(value);
  if (!source) {
    return null;
  }

  const parsed = Date.parse(source);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(source) ? source : null;
}

function normalizeTime(value: unknown): string | null {
  const source = normalizeText(value);
  if (!source) {
    return null;
  }

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(source)) {
    return source;
  }

  const parsed = Date.parse(source);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString().slice(11, 19);
}

function resolveFuelType(rawValue: unknown): string | null {
  const fuelValue = normalizeText(rawValue);
  if (!fuelValue) {
    return null;
  }

  const normalized = fuelValue.toLowerCase();
  if (normalized.includes("diesel") || normalized.includes("gasoleo") || normalized.includes("gasoil")) return "gasoleo";
  if (normalized.includes("gasoline") || normalized.includes("petrol") || normalized.includes("gasolina")) return "gasolina";
  if (normalized.includes("adblue")) return "adblue";
  if (normalized.includes("lpg") || normalized.includes("gpl")) return "gpl";
  if (normalized.includes("electric")) return "eletrico";
  return "outro";
}

function resolveTransactionId(row: JsonRecord): string | null {
  const raw = pickValue(row, [
    "transaction_id",
    "transactionId",
    "id",
    "transaction.id",
    "reference",
    "transactionReference"
  ]);

  const value = normalizeText(raw);
  return value;
}

function normalizeTransaction(row: JsonRecord): NormalizedBpTransaction | null {
  const transactionId = resolveTransactionId(row);
  if (!transactionId) {
    return null;
  }

  const transactionDate = normalizeDate(pickValue(row, ["transaction_date", "transactionDate", "date", "transaction.date"]));
  const transactionTime = normalizeTime(pickValue(row, ["transaction_time", "transactionTime", "time", "transaction.time"]));
  const transactionDateTime = normalizeIsoDateTime(pickValue(row, [
    "transaction_datetime",
    "transactionDateTime",
    "datetime",
    "dateTime",
    "transaction.timestamp",
    "timestamp"
  ]));

  let resolvedDate = transactionDate;
  let resolvedTime = transactionTime;
  let resolvedDateTime = transactionDateTime;

  if (!resolvedDateTime && resolvedDate) {
    const candidate = `${resolvedDate}T${resolvedTime || "00:00:00"}Z`;
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) {
      resolvedDateTime = new Date(parsed).toISOString();
    }
  }

  if (!resolvedDate && resolvedDateTime) {
    resolvedDate = resolvedDateTime.slice(0, 10);
  }

  if (!resolvedTime && resolvedDateTime) {
    resolvedTime = resolvedDateTime.slice(11, 19);
  }

  return {
    transaction_id: transactionId,
    transaction_datetime: resolvedDateTime,
    transaction_date: resolvedDate,
    transaction_time: resolvedTime,
    card_id: normalizeText(pickValue(row, ["card_id", "cardId", "card.id", "card.number"])),
    driver_tag: normalizeText(pickValue(row, ["driver_tag", "driverTag", "tag", "rfid", "driver.idTag", "driver.tag", "driver.identifier"])),
    vehicle_id: normalizeText(pickValue(row, ["vehicle_id", "vehicleId", "vehicle.id"])),
    vehicle_registration: normalizeText(pickValue(row, ["vehicle_registration", "vehicleRegistration", "registration", "vehicle.registration"])),
    driver_name: normalizeText(pickValue(row, ["driver_name", "driverName", "driver.fullName", "driver.name"])),
    fuel_type: resolveFuelType(pickValue(row, ["fuel_type", "fuelType", "product", "product_name", "productName"])),
    litres: normalizeNumber(pickValue(row, ["litres", "liters", "volume", "quantity", "fuel.volume"])),
    price_per_litre: normalizeNumber(pickValue(row, ["price_per_litre", "pricePerLitre", "price_per_liter", "pricePerLiter", "unit_price", "unitPrice"])),
    total_amount: normalizeNumber(pickValue(row, ["total_amount", "totalAmount", "amount", "grossAmount", "total"])),
    currency: normalizeText(pickValue(row, ["currency", "currencyCode"])),
    odometer: normalizeNumber(pickValue(row, ["odometer", "odometer_km", "vehicle.odometer"])),
    site_id: normalizeText(pickValue(row, ["site_id", "siteId", "station.id", "retailSite.id"])),
    site_name: normalizeText(pickValue(row, ["site_name", "siteName", "station.name", "retailSite.name"])),
    site_address: normalizeText(pickValue(row, ["site_address", "siteAddress", "station.address", "retailSite.address"])),
    country: normalizeText(pickValue(row, ["country", "countryCode", "station.country", "retailSite.country"])),
    invoice_number: normalizeText(pickValue(row, ["invoice_number", "invoiceNumber", "invoice.id"])),
    raw_data: row
  };
}

function readArrayResponse(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter((row) => row && typeof row === "object") as JsonRecord[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as JsonRecord;
  const candidates = ["data", "transactions", "items", "results", "content", "records"];
  for (const key of candidates) {
    const value = root[key];
    if (Array.isArray(value)) {
      return value.filter((row) => row && typeof row === "object") as JsonRecord[];
    }
  }

  return [];
}

function hasMorePages(payload: unknown, itemsLength: number, page: number, pageSize: number): boolean {
  if (!payload || typeof payload !== "object") {
    return itemsLength >= pageSize;
  }

  const root = payload as JsonRecord;
  const explicitHasMore = pickValue(root, ["hasMore", "has_next", "hasNext", "pagination.hasMore"]);
  if (typeof explicitHasMore === "boolean") {
    return explicitHasMore;
  }

  const nextPage = pickValue(root, ["nextPage", "pagination.nextPage", "page.next"]);
  if (typeof nextPage === "number") {
    return nextPage > page;
  }
  if (typeof nextPage === "string") {
    const asNumber = Number(nextPage);
    return Number.isFinite(asNumber) && asNumber > page;
  }

  const totalPages = pickValue(root, ["totalPages", "pagination.totalPages"]);
  if (typeof totalPages === "number") {
    return page < totalPages;
  }

  return itemsLength >= pageSize;
}

function configured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && BP_CLIENT_ID && BP_CLIENT_SECRET);
}

async function getBpToken(): Promise<string> {
  const url = `${BP_AUTH_BASE_URL}${BP_AUTH_TOKEN_PATH}`;
  const body = new URLSearchParams();
  body.set("client_id", BP_CLIENT_ID);
  body.set("client_secret", BP_CLIENT_SECRET);

  const grantType = Deno.env.get("BP_GRANT_TYPE") || "client_credentials";
  body.set("grant_type", grantType);
  if (BP_SCOPE) {
    body.set("scope", BP_SCOPE);
  }

  const authRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  if (!authRes.ok) {
    const errText = await authRes.text();
    throw new Error(`Falha na autenticação BP (${authRes.status}): ${errText.slice(0, 300)}`);
  }

  const payload = await authRes.json();
  const accessToken = normalizeText(payload?.access_token) || normalizeText(payload?.token);
  if (!accessToken) {
    throw new Error("BP não devolveu access_token na autenticação.");
  }

  return accessToken;
}

async function fetchBpTransactions(token: string, startDate?: string, endDate?: string): Promise<NormalizedBpTransaction[]> {
  const allRows: JsonRecord[] = [];
  let page = 1;

  while (page <= BP_TX_MAX_PAGES) {
    const params = new URLSearchParams();
    params.set("ParentIds", BP_DEFAULT_PARENT_IDS);
    params.set("AuthorityIds", BP_DEFAULT_AUTHORITY_IDS);
    params.set(BP_TX_PAGE_PARAM, String(page));
    params.set(BP_TX_PAGE_SIZE_PARAM, String(BP_TX_PAGE_SIZE));

    if (startDate) {
      params.set(BP_TX_FROM_PARAM, startDate);
    }

    if (endDate) {
      params.set(BP_TX_TO_PARAM, endDate);
    }

    const url = `${BP_TRANSACTION_BASE_URL}${BP_TRANSACTIONS_PATH}?${params.toString()}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    if (BP_API_KEY) {
      headers["x-api-key"] = BP_API_KEY;
    }

    const txRes = await fetch(url, {
      method: "GET",
      headers
    });

    if (!txRes.ok) {
      const errText = await txRes.text();
      throw new Error(`Falha ao obter transações BP (${txRes.status}): ${errText.slice(0, 300)}`);
    }

    const payload = await txRes.json();
    const rows = readArrayResponse(payload);
    allRows.push(...rows);

    if (!hasMorePages(payload, rows.length, page, BP_TX_PAGE_SIZE)) {
      break;
    }

    page += 1;
  }

  const normalized: NormalizedBpTransaction[] = [];
  for (const row of allRows) {
    const tx = normalizeTransaction(row);
    if (tx) {
      normalized.push(tx);
    }
  }

  return normalized;
}

async function loadAssociationMaps(supabase: ReturnType<typeof createClient>, tags: string[], registrations: string[]) {
  const tagMap = new Map<string, JsonRecord>();
  const vehicleCostCenterMap = new Map<string, string>();

  if (tags.length > 0) {
    const { data: associationRows } = await supabase
      .from("bp_tag_associations")
      .select("driver_tag, cartrack_vehicle_id, vehicle_registration, driver_id, driver_name_override, cost_center")
      .in("driver_tag", tags);

    (associationRows || []).forEach((row: JsonRecord) => {
      const key = normalizeText(row.driver_tag);
      if (key) {
        tagMap.set(key, row);
      }
    });
  }

  if (registrations.length > 0) {
    const { data: adminRows } = await supabase
      .from("veiculos_admin")
      .select("cartrack_registration, centro_custo")
      .in("cartrack_registration", registrations);

    (adminRows || []).forEach((row: JsonRecord) => {
      const registration = normalizeText(row.cartrack_registration);
      const center = normalizeText(row.centro_custo);
      if (registration && center) {
        vehicleCostCenterMap.set(registration.toUpperCase(), center);
      }
    });
  }

  return { tagMap, vehicleCostCenterMap };
}

async function upsertTransactions(
  supabase: ReturnType<typeof createClient>,
  transactions: NormalizedBpTransaction[]
): Promise<{ imported: number; updated: number; duplicates: number; fetched: number }> {
  const deduped = new Map<string, NormalizedBpTransaction>();
  let duplicates = 0;

  transactions.forEach((tx) => {
    if (deduped.has(tx.transaction_id)) {
      duplicates += 1;
    }
    deduped.set(tx.transaction_id, tx);
  });

  const uniqueTransactions = [...deduped.values()];
  const transactionIds = uniqueTransactions.map((tx) => tx.transaction_id);

  const existingIds = new Set<string>();
  const chunkSize = 500;
  for (let i = 0; i < transactionIds.length; i += chunkSize) {
    const chunk = transactionIds.slice(i, i + chunkSize);
    const { data } = await supabase
      .from("bp_fuel_transactions")
      .select("transaction_id")
      .in("transaction_id", chunk);

    (data || []).forEach((row: JsonRecord) => {
      const transactionId = normalizeText(row.transaction_id);
      if (transactionId) {
        existingIds.add(transactionId);
      }
    });
  }

  const tags = uniqueTransactions
    .map((tx) => tx.driver_tag)
    .filter((tag): tag is string => Boolean(tag));

  const registrations = uniqueTransactions
    .map((tx) => tx.vehicle_registration)
    .filter((registration): registration is string => Boolean(registration));

  const { tagMap, vehicleCostCenterMap } = await loadAssociationMaps(supabase, tags, registrations);

  const rowsToUpsert = uniqueTransactions.map((tx) => {
    const association = tx.driver_tag ? tagMap.get(tx.driver_tag) : undefined;
    const associationRegistration = normalizeText(association?.vehicle_registration);
    const associationDriverName = normalizeText(association?.driver_name_override);
    const associationVehicleId = normalizeText(association?.cartrack_vehicle_id);
    const associationDriverId = normalizeText(association?.driver_id);
    const associationCostCenter = normalizeText(association?.cost_center);

    const finalRegistration = tx.vehicle_registration || associationRegistration || null;
    const costCenterFromVehicle = finalRegistration ? vehicleCostCenterMap.get(finalRegistration.toUpperCase()) || null : null;

    return {
      transaction_id: tx.transaction_id,
      transaction_datetime: tx.transaction_datetime,
      transaction_date: tx.transaction_date,
      transaction_time: tx.transaction_time,
      card_id: tx.card_id,
      driver_tag: tx.driver_tag,
      vehicle_id: tx.vehicle_id || associationVehicleId,
      vehicle_registration: finalRegistration,
      driver_id: associationDriverId,
      driver_name: tx.driver_name || associationDriverName,
      fuel_type: tx.fuel_type,
      litres: tx.litres,
      price_per_litre: tx.price_per_litre,
      total_amount: tx.total_amount,
      currency: tx.currency,
      odometer: tx.odometer,
      site_id: tx.site_id,
      site_name: tx.site_name,
      site_address: tx.site_address,
      country: tx.country,
      invoice_number: tx.invoice_number,
      cost_center: associationCostCenter || costCenterFromVehicle,
      raw_data: tx.raw_data,
      updated_at: new Date().toISOString()
    };
  });

  if (rowsToUpsert.length > 0) {
    const { error } = await supabase
      .from("bp_fuel_transactions")
      .upsert(rowsToUpsert, { onConflict: "transaction_id" });

    if (error) {
      throw new Error(`Erro ao gravar transações BP: ${error.message}`);
    }
  }

  let updated = 0;
  let imported = 0;
  uniqueTransactions.forEach((tx) => {
    if (existingIds.has(tx.transaction_id)) {
      updated += 1;
    } else {
      imported += 1;
    }
  });

  return {
    imported,
    updated,
    duplicates,
    fetched: transactions.length
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "status";

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Supabase service role não configurado para a Edge Function." }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "status") {
      const { data: lastRun } = await supabase
        .from("bp_sync_runs")
        .select("status, finished_at, message")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isConfigured = configured();

      return jsonResponse({
        configured: isConfigured,
        environment: BP_ENV,
        message: isConfigured ? "Ligado" : "API BP não configurada",
        last_sync_at: normalizeText(lastRun?.finished_at),
        last_sync_status: normalizeText(lastRun?.status),
        last_sync_message: normalizeText(lastRun?.message)
      });
    }

    if (action !== "sync") {
      return jsonResponse({ error: "Ação inválida. Usa action=status ou action=sync." }, 400);
    }

    if (!configured()) {
      return jsonResponse({
        success: false,
        message: "API BP não configurada",
        required_secrets: [
          "BP_CLIENT_ID",
          "BP_CLIENT_SECRET",
          "BP_ENV (sandbox|production)",
          "BP_AUTH_BASE_URL (opcional)",
          "BP_TRANSACTION_BASE_URL (opcional)"
        ]
      }, 400);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const startDate = normalizeText((body as JsonRecord).startDate);
    const endDate = normalizeText((body as JsonRecord).endDate);

    const { data: runRow, error: runCreateError } = await supabase
      .from("bp_sync_runs")
      .insert({
        status: "running",
        environment: BP_ENV,
        started_at: new Date().toISOString(),
        message: "Sincronizando dados BP..."
      })
      .select("id")
      .single();

    if (runCreateError) {
      throw new Error(`Falha ao criar registo de sincronização: ${runCreateError.message}`);
    }

    const runId = runRow.id as string;

    try {
      const token = await getBpToken();
      const transactions = await fetchBpTransactions(token, startDate || undefined, endDate || undefined);
      const counters = await upsertTransactions(supabase, transactions);

      const finishedAt = new Date().toISOString();
      const successMessage = "Sincronização concluída";

      await supabase
        .from("bp_sync_runs")
        .update({
          status: "success",
          finished_at: finishedAt,
          imported_count: counters.imported,
          updated_count: counters.updated,
          duplicate_count: counters.duplicates,
          fetched_count: counters.fetched,
          message: successMessage
        })
        .eq("id", runId);

      return jsonResponse({
        success: true,
        message: successMessage,
        imported: counters.imported,
        updated: counters.updated,
        duplicates: counters.duplicates,
        fetched: counters.fetched,
        last_sync_at: finishedAt
      });
    } catch (syncError: unknown) {
      const errorMessage = syncError instanceof Error ? syncError.message : "Erro desconhecido na sincronização BP.";
      await supabase
        .from("bp_sync_runs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          message: "Sincronização BP falhou",
          error_details: errorMessage
        })
        .eq("id", runId);

      return jsonResponse({ success: false, message: errorMessage }, 500);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno da Edge Function BP.";
    return jsonResponse({ error: message }, 500);
  }
});
