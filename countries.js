// countries.js
import { getMap } from "./map.js";

let countriesLayer;

export async function loadCountriesMask() {
  const map = getMap();
  if (!map) return;

  // Ensure a pane for the dim layer above tiles
  if (!map.getPane("maskPane")) {
    map.createPane("maskPane");
    map.getPane("maskPane").style.zIndex = 300; // below other vector overlays
    map.getPane("maskPane").style.pointerEvents = "none";
  }

  const response = await fetch(
    "./boundaries/geoJson/Countries_italy_merged.geojson"
  );
  const data = await response.json();

  // Try to detect Italy features by common property keys
  const isItaly = (props) => {
    const candidates = [
      props?.ADMIN,
      props?.NAME,
      props?.NAME_EN,
      props?.name,
      props?.sovereignt,
    ];
    return candidates.some(
      (v) => typeof v === "string" && v.toLowerCase() === "italy"
    );
  };

  let italyBounds = null;

  countriesLayer = L.geoJSON(data, {
    pane: "maskPane",
    style: (feature) => {
      const italy = isItaly(feature?.properties);
      return italy
        ? {
            color: "#bdbdbd",
            strokeWidth: 2,
            opacity: 0.6,
            fillOpacity: 0.0,
          }
        : {
            color: "#ffffff",
            strokeWidth: 2,
            opacity: 0,
            fillColor: "#bdbdbd",
            fillOpacity: 0.9,
          };
    },
    onEachFeature: (feature, layer) => {
      if (isItaly(feature?.properties)) {
        try {
          const b = layer.getBounds && layer.getBounds();
          if (b && b.isValid && b.isValid()) {
            italyBounds = italyBounds
              ? italyBounds.extend(b)
              : L.latLngBounds(b.getSouthWest(), b.getNorthEast());
          }
        } catch (_) {}
      }
    },
  });

  countriesLayer.addTo(map);

  // Fit map to show all of Italy fully
  if (italyBounds && italyBounds.isValid && italyBounds.isValid()) {
    map.fitBounds(italyBounds, { padding: [40, 40], maxZoom: 7 });
  }
}

export function removeCountriesMask() {
  const map = getMap();
  if (countriesLayer && map) {
    map.removeLayer(countriesLayer);
    countriesLayer = undefined;
  }
}

let differenceLayer;

export async function loadDifferenceMask() {
  const map = getMap();
  if (!map) return;

  // Use the same pane behavior as the countries mask
  if (!map.getPane("maskPane")) {
    map.createPane("maskPane");
    map.getPane("maskPane").style.zIndex = 300;
    map.getPane("maskPane").style.pointerEvents = "none";
  }

  const response = await fetch("./boundaries/geoJson/difference.geojson");
  const data = await response.json();

  // Reuse the same Italy detection logic
  const isItaly = (props) => {
    const candidates = [
      props?.ADMIN,
      props?.NAME,
      props?.NAME_EN,
      props?.name,
      props?.sovereignt,
    ];
    return candidates.some(
      (v) => typeof v === "string" && v.toLowerCase() === "italy"
    );
  };

  let italyBounds = null;

  if (differenceLayer) map.removeLayer(differenceLayer);

  differenceLayer = L.geoJSON(data, {
    pane: "maskPane",
    style: (feature) => {
      // FIX: Call isItaly function directly here instead of using undefined variable
      const isItalyFeature = isItaly(feature?.properties);
      return isItalyFeature
        ? { color: "#ffffff", strokeWidth: 2, opacity: 0.6, fillOpacity: 0.0 }
        : { color: "#ffffff", strokeWidth: 2, opacity: 0, fillOpacity: 0.9 };
    },
    onEachFeature: (feature, layer) => {
      if (isItaly(feature?.properties)) {
        try {
          const b = layer.getBounds && layer.getBounds();
          if (b && b.isValid && b.isValid()) {
            italyBounds = italyBounds
              ? italyBounds.extend(b)
              : L.latLngBounds(b.getSouthWest(), b.getNorthEast());
          }
        } catch (_) {}
      }
    },
  });

  differenceLayer.addTo(map);

  if (italyBounds && italyBounds.isValid && italyBounds.isValid()) {
    map.fitBounds(italyBounds, { padding: [40, 40], maxZoom: 7 });
  }
}
export function removeDifferenceMask() {
  const map = getMap();
  if (differenceLayer && map) {
    map.removeLayer(differenceLayer);
    differenceLayer = undefined;
  }
}
