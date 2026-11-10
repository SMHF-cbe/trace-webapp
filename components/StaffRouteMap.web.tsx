import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapStore = {
  id: number;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  entered_today?: boolean;
  is_active?: boolean;
};

type Props = {
  stores: MapStore[];
  nextStoreId: number | null;
};

const COLORS = {
  completed: "#16A34A",
  next: "#F59E0B",
  remaining: "#DC2626",
  current: "#2563EB",
};

function markerColor(store: MapStore, nextStoreId: number | null): string {
  if (store.entered_today) return COLORS.completed;
  if (store.id === nextStoreId) return COLORS.next;
  return COLORS.remaining;
}

export function StaffRouteMap({ stores, nextStoreId }: Props) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinsRef = useRef<L.LayerGroup | null>(null);
  const currentPinRef = useRef<L.CircleMarker | null>(null);
  const hasCenteredOnLocation = useRef(false);
  const [locationState, setLocationState] = useState("Requesting location…");
  const [locationError, setLocationError] = useState<string | null>(null);

  const mappedStores = useMemo(
    () => stores.filter((store) => Number.isFinite(store.latitude) && Number.isFinite(store.longitude)),
    [stores]
  );

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    const map = L.map(mapElement.current, { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    pinsRef.current = L.layerGroup().addTo(map);
    map.setView([11.0168, 76.9558], 11);

    return () => {
      map.remove();
      mapRef.current = null;
      pinsRef.current = null;
      currentPinRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const pins = pinsRef.current;
    if (!map || !pins) return;

    pins.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    mappedStores.forEach((store, index) => {
      const latitude = Number(store.latitude);
      const longitude = Number(store.longitude);
      const color = markerColor(store, nextStoreId);
      const marker = L.circleMarker([latitude, longitude], {
        radius: store.id === nextStoreId ? 11 : 9,
        color: "#FFFFFF",
        weight: 3,
        fillColor: color,
        fillOpacity: 0.95,
      });
      const status = store.entered_today
        ? "Completed today"
        : store.id === nextStoreId
          ? "Next stop"
          : "Remaining";
      marker.bindPopup(
        `<strong>${index + 1}. ${escapeHtml(store.name)}</strong><br/><span style="color:${color};font-weight:700">${status}</span>`
      );
      marker.addTo(pins);
      bounds.push([latitude, longitude]);
    });

    if (bounds.length > 0 && !hasCenteredOnLocation.current) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [28, 28], maxZoom: 15 });
    }
  }, [mappedStores, nextStoreId]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState("Location is not supported by this browser");
      return;
    }

    setLocationState("Waiting for location…");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const map = mapRef.current;
        if (map) {
          if (!currentPinRef.current) {
            currentPinRef.current = L.circleMarker([latitude, longitude], {
              radius: 8,
              color: "#FFFFFF",
              weight: 3,
              fillColor: COLORS.current,
              fillOpacity: 1,
            }).addTo(map);
            currentPinRef.current.bindPopup("Your current location");
          } else {
            currentPinRef.current.setLatLng([latitude, longitude]);
          }
          if (!hasCenteredOnLocation.current) {
            hasCenteredOnLocation.current = true;
            map.setView([latitude, longitude], 15);
          }
        }
        setLocationState("Live location active");
        setLocationError(null);
      },
      (error) => {
        setLocationState("Location unavailable");
        setLocationError(error.message || "Allow location access to see your position.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 420 }}>
      <div ref={mapElement} style={{ width: "100%", height: "100%", minHeight: 420 }} />
      <div
        style={{
          position: "absolute",
          zIndex: 500,
          left: 12,
          right: 12,
          bottom: 12,
          background: "rgba(18, 22, 31, 0.94)",
          borderRadius: 12,
          padding: "10px 12px",
          color: "#FFFFFF",
          fontSize: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: locationError ? 6 : 0 }}>
          <span><b style={{ color: COLORS.completed }}>●</b> Completed</span>
          <span><b style={{ color: COLORS.next }}>●</b> Next stop</span>
          <span><b style={{ color: COLORS.remaining }}>●</b> Remaining</span>
          <span><b style={{ color: COLORS.current }}>●</b> You</span>
          <span style={{ marginLeft: "auto", color: "#D1D5DB" }}>{locationState}</span>
        </div>
        {locationError ? <div style={{ color: "#FCD34D" }}>{locationError}</div> : null}
      </div>
      {mappedStores.length === 0 ? (
        <div
          style={{
            position: "absolute",
            zIndex: 500,
            top: 12,
            left: 12,
            right: 12,
            background: "rgba(18, 22, 31, 0.94)",
            borderRadius: 10,
            padding: 10,
            color: "#FCD34D",
            fontSize: 13,
          }}
        >
          No store locations are available yet. Ask the admin to add map links to the stores.
        </div>
      ) : null}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}
