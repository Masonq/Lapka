import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

function pawDivIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 30px; height: 30px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

const ICONS = {
  lost: pawDivIcon("#D64545"), // var(--red)
  found: pawDivIcon("#2E8340"), // var(--green-strong)
};

export default function PostLocationMap({ lat, lng, type }) {
  return (
    <div className="post-location-map" style={{ height: 180, borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={ICONS[type] || ICONS.lost} />
      </MapContainer>
    </div>
  );
}
