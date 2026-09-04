import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CartrackTripPoint } from '../../types/cartrack';

interface TripRouteMapProps {
  points: CartrackTripPoint[];
}

export const TripRouteMap: React.FC<TripRouteMapProps> = ({ points }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || points.length < 2) return;

    const coordinates = points.map((point) => [point.latitude, point.longitude] as L.LatLngExpression);
    const map = L.map(containerRef.current).fitBounds(L.latLngBounds(coordinates), { padding: [24, 24] });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    L.polyline(coordinates, { color: '#38bdf8', weight: 5, opacity: 0.9 }).addTo(map);
    L.circleMarker(coordinates[0], { radius: 7, color: '#f8fafc', weight: 2, fillColor: '#34d399', fillOpacity: 1 }).addTo(map);
    L.circleMarker(coordinates[coordinates.length - 1], { radius: 7, color: '#f8fafc', weight: 2, fillColor: '#fb7185', fillOpacity: 1 }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points]);

  if (points.length < 2) {
    return <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400">A Cartrack não devolveu pontos GPS para esta viagem.</p>;
  }

  return <div ref={containerRef} className="mt-4 h-64 w-full overflow-hidden rounded-lg border border-slate-700" />;
};
