import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "vehicles";
    const registration = url.searchParams.get("registration");
    const vehicleId = url.searchParams.get("vehicle_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const limit = url.searchParams.get("limit") || "100";

    const username = Deno.env.get("CARTRACK_USERNAME");
    const password = Deno.env.get("CARTRACK_PASSWORD");
    const baseUrl = Deno.env.get("CARTRACK_BASE_URL") || "https://fleetapi-pt.cartrack.com/rest";

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Credenciais da Cartrack não configuradas nos Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = "Basic " + btoa(`${username}:${password}`);

    let targetEndpoint = "/vehicles";
    const queryParams = new URLSearchParams();
    queryParams.set("limit", limit);

    if (action === "vehicles_status") {
      targetEndpoint = "/vehicles/status";
      if (registration) queryParams.set("registration", registration);
      if (vehicleId) queryParams.set("vehicle_id", vehicleId);
    } else if (action === "vehicle_detail" && registration) {
      targetEndpoint = `/vehicles/${registration}`;
    } else if (action === "odometer" && registration) {
      targetEndpoint = `/vehicles/${registration}/odometer`;
      if (startDate) queryParams.set("start_timestamp", startDate);
      if (endDate) queryParams.set("end_timestamp", endDate);
    } else if (action === "trips") {
      targetEndpoint = "/trips";
      if (registration) queryParams.set("registration", registration);
      if (startDate) queryParams.set("filter[start_timestamp]", startDate);
      if (endDate) queryParams.set("filter[end_timestamp]", endDate);
    } else {
      if (registration) queryParams.set("registration", registration);
    }

    const fullTargetUrl = `${baseUrl}${targetEndpoint}?${queryParams.toString()}`;
    console.log(`[CartrackProxy] Forwarding to ${targetEndpoint}`);

    const cartrackRes = await fetch(fullTargetUrl, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json"
      }
    });

    if (!cartrackRes.ok) {
      const errText = await cartrackRes.text();
      console.error(`[CartrackProxy Error ${cartrackRes.status}]`, errText);
      return new Response(
        JSON.stringify({ error: `Erro na comunicação com Cartrack (${cartrackRes.status})` }),
        { status: cartrackRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await cartrackRes.json();

    if (action === "vehicles_status" && Array.isArray(data?.data)) {
      const sample = data.data[0];
      console.log("[CartrackProxy] vehicles_status payload", {
        total: data.data.length,
        topLevelKeys: sample ? Object.keys(sample).sort() : [],
        locationKeys: sample?.location ? Object.keys(sample.location).sort() : [],
        sample: sample ? {
          vehicle_id: sample.vehicle_id,
          registration: sample.registration,
          event_ts: sample.event_ts,
          speed: sample.speed,
          ignition: sample.ignition,
          idling: sample.idling,
          driver_id: sample.driver?.driver_id,
          driver_first_name: sample.driver?.first_name,
          driver_last_name: sample.driver?.last_name,
          driver_id_tag: sample.driver?.driver_id_tag,
          last_identification_tag_id: sample.last_identification_tag_id,
          locationUpdated: sample.location?.updated,
          latitude: sample.location?.latitude,
          longitude: sample.location?.longitude,
          gps_fix_type: sample.location?.gps_fix_type
        } : null
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[CartrackProxy Exception]", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno do servidor proxy." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
