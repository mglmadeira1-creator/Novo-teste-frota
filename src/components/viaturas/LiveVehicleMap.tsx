import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { Truck } from 'lucide-react';
import { ViaturaCompleta } from '../../types/viaturaCompleta';

interface LiveVehicleMapProps {
  viaturas: ViaturaCompleta[];
  onSelectViatura: (viatura: ViaturaCompleta) => void;
  isLoading?: boolean;
  lastUpdated?: string | null;
}

function markerColor(viatura: ViaturaCompleta): string {
  if (viatura.estado_operacional === 'em_marcha') return '#34d399';
  if (viatura.estado_operacional === 'parado') return '#fbbf24';
  if (viatura.estado_operacional === 'ignicao_off') return '#94a3b8';
  return '#fb7185';
}

function markerIcon(viatura: ViaturaCompleta): L.DivIcon {
  const color = markerColor(viatura);

  return L.divIcon({
    className: 'live-vehicle-marker',
    html: `<span aria-label="${viatura.registration}" title="${viatura.registration}" style="--marker-color:${color}">${renderToStaticMarkup(<Truck size={22} strokeWidth={2.5} />)}</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
}

export const LiveVehicleMap: React.FC<LiveVehicleMapProps> = ({
  viaturas,
  onSelectViatura,
  isLoading = false,
  lastUpdated
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([39.5, -8], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    viaturas.forEach((viatura) => {
      if (!Number.isFinite(viatura.latitude) || !Number.isFinite(viatura.longitude) || (viatura.latitude === 0 && viatura.longitude === 0)) {
        return;
      }

      const position: L.LatLngExpression = [viatura.latitude, viatura.longitude];
      bounds.push(position);
      const marker = L.marker(position, { icon: markerIcon(viatura) });
      marker.bindTooltip(
        `<strong>${viatura.registration}</strong><br>${viatura.make} ${viatura.model}<br>${viatura.speed} km/h`,
        { direction: 'top', offset: [0, -14] }
      );
      marker.on('click', () => onSelectViatura(viatura));
      marker.addTo(markers);
    });

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [35, 35], maxZoom: 15 });
    }
  }, [viaturas, onSelectViatura]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-100">Mapa live</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">Clique numa viatura para abrir localização e trajetos.</p>
        </div>
        <span className="text-[11px] text-slate-500">
          {isLoading ? 'A atualizar...' : lastUpdated ? `Atualizado ${new Date(lastUpdated).toLocaleTimeString('pt-PT')}` : 'A aguardar dados'}
        </span>
      </div>
      <div ref={mapContainerRef} className="h-[calc(100vh-220px)] min-h-[520px] w-full bg-slate-950 sm:h-[calc(100vh-190px)]" />
    </section>
  );
};
