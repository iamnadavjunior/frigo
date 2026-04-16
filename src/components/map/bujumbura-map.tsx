"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPos {
  id: string;
  posName: string;
  owner: string | null;
  channel: string | null;
  neighbourhood: string | null;
  city: string;
  lat: number;
  lng: number;
  fridgeCount: number;
  activeFridges: number;
  underRepairFridges: number;
}

interface Props {
  posList: MapPos[];
  onSelectPos?: (pos: MapPos) => void;
  selectedPosId?: string | null;
}

const BUJUMBURA_CENTER: [number, number] = [-3.3731, 29.3644];
const DEFAULT_ZOOM = 13;

function markerColor(pos: MapPos): string {
  if (pos.underRepairFridges > 0) return "#f97316"; // orange
  if (pos.activeFridges === pos.fridgeCount && pos.fridgeCount > 0) return "#22c55e"; // green
  return "#3b82f6"; // blue
}

function createIcon(color: string, selected: boolean) {
  const size = selected ? 16 : 12;
  const border = selected ? 3 : 2;
  return L.divIcon({
    className: "",
    iconSize: [size + border * 2, size + border * 2],
    iconAnchor: [(size + border * 2) / 2, (size + border * 2) / 2],
    html: `<div style="
      width:${size}px;height:${size}px;
      border-radius:50%;
      background:${color};
      border:${border}px solid ${selected ? "#fff" : "rgba(255,255,255,0.6)"};
      box-shadow:0 0 ${selected ? 12 : 6}px ${color}${selected ? "" : "80"};
      transition:all .15s;
    "></div>`,
  });
}

export default function BujumburaMap({ posList, onSelectPos, selectedPosId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [ready, setReady] = useState(false);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: BUJUMBURA_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tile layer (CartoDB dark_all)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Zoom control bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Attribution bottom-left
    L.control
      .attribution({ position: "bottomleft", prefix: false })
      .addAttribution('&copy; <a href="https://carto.com/">CARTO</a>')
      .addTo(map);

    mapRef.current = map;
    setReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    posList.forEach((pos) => {
      const color = markerColor(pos);
      const selected = pos.id === selectedPosId;
      const marker = L.marker([pos.lat, pos.lng], { icon: createIcon(color, selected) });

      marker.bindPopup(
        `<div style="min-width:180px">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px;color:#e2e8f0">${pos.posName}</div>
          ${pos.owner ? `<div style="color:#94a3b8;font-size:12px;margin-bottom:2px">${pos.owner}</div>` : ""}
          <div style="color:#64748b;font-size:11px;margin-bottom:8px">${pos.neighbourhood || ""} · ${pos.city}</div>
          <div style="display:flex;gap:8px;font-size:11px">
            <span style="color:#22c55e">● ${pos.activeFridges} active</span>
            ${pos.underRepairFridges > 0 ? `<span style="color:#f97316">● ${pos.underRepairFridges} repair</span>` : ""}
          </div>
          <div style="color:#64748b;font-size:11px;margin-top:2px">${pos.fridgeCount} fridge${pos.fridgeCount !== 1 ? "s" : ""} total</div>
        </div>`,
        {
          className: "dark-popup",
          closeButton: false,
        }
      );

      marker.on("click", () => onSelectPos?.(pos));
      marker.addTo(map);
      markersRef.current.set(pos.id, marker);
    });
  }, [posList, selectedPosId, onSelectPos]);

  useEffect(() => {
    if (ready) updateMarkers();
  }, [ready, updateMarkers]);

  // Fly to selected
  useEffect(() => {
    if (!mapRef.current || !selectedPosId) return;
    const marker = markersRef.current.get(selectedPosId);
    if (marker) {
      mapRef.current.flyTo(marker.getLatLng(), 15, { duration: 0.5 });
      marker.openPopup();
    }
  }, [selectedPosId]);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ background: "#0a0a0a" }} />
  );
}
