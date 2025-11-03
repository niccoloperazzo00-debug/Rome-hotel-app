// municipi.js
import { getMap } from "./map.js";
import { romanToNumber, getMunicipioColor } from "./utils.js";

export let municipioLayers = [];

export function loadMunicipioBoundaries(skipFit = false) {
  const promises = [];
  const map = getMap();
  const overallBounds = L.latLngBounds();
  for (let i = 1; i <= 15; i++) {
    promises.push(
      fetch(`./boundaries/geoJson/municipi_${i}.geojson`)
        .then((response) => response.json())
        .then((data) => {
          L.geoJSON(data, {
            style: (feature) => ({
              fillColor: "transparent",
              weight: 2,
              opacity: 0.7,
              color: "#333333",
              fillOpacity: 0,
              interactive: true,
              bubblingMouseEvents: true,
            }),
            onEachFeature: (feature, layer) => {
              layer.municipioId = Number(feature.properties.municipio);
              layer.municipioData = feature.properties;
              const center =
                layer.getBounds && layer.getBounds().getCenter
                  ? layer.getBounds().getCenter()
                  : null;
              const coordLine = center
                ? `Lat: ${center.lat.toFixed(5)}, Lng: ${center.lng.toFixed(5)}`
                : "";
              layer.bindPopup(
                `<h3>Municipio ${feature.properties.numero_rom}</h3>
                  <div class=\"municipio-info\">\n                  <strong>ID:</strong> ${feature.properties.municipio}<br>\n                  <strong>Municipio:</strong> ${feature.properties.numero_rom}\n                  </div>
                  <div class=\"tech-details\">${coordLine}</div>`
              );
              municipioLayers.push(layer);
              if (
                layer.getBounds &&
                layer.getBounds().isValid &&
                layer.getBounds().isValid()
              ) {
                overallBounds.extend(layer.getBounds());
              }
              // Debug log
              console.log("Loaded municipio layer", layer.municipioId, layer);
            },
          }).addTo(getMap());
        })
    );
  }
  return Promise.all(promises).then(() => {
    if (!skipFit && overallBounds.isValid && overallBounds.isValid()) {
      const padding = [60, 60];
      map.fitBounds(overallBounds, { padding });
    }
  });
}

export function handleMunicipioViewChange() {
  const map = getMap();
  const view = document.getElementById("viewSelect").value;
  if (view === "full") {
    municipioLayers.forEach((layer) => {
      layer.addTo(map);
      layer.setStyle({
        weight: 3,
        color: "#333333",
        fillOpacity: 0,
      });
      const c1 =
        layer.getBounds && layer.getBounds().getCenter
          ? layer.getBounds().getCenter()
          : null;
      const c1Text = c1
        ? `Lat: ${c1.lat.toFixed(5)}, Lng: ${c1.lng.toFixed(5)}`
        : "";
      layer.bindPopup(
        `<h3>Municipio ${layer.municipioData.numero_rom}</h3>
          <div class=\"municipio-info\">\n          <strong>ID:</strong> ${layer.municipioData.municipio}<br>\n          <strong>Municipio:</strong> ${layer.municipioData.numero_rom}\n          </div>
          <div class=\"tech-details\">${c1Text}</div>`
      );
      layer.on("click", onMunicipioClick);
    });
    map.setView(window.ROME_CENTER || [41.9028, 12.4964], 10);
  } else {
    const selectedId = Number(romanToNumber(view));
    municipioLayers.forEach((layer) => {
      layer.addTo(map);
      if (Number(layer.municipioId) === selectedId) {
        layer.setStyle({
          weight: 5,
          color: "#FF0000",
          fillOpacity: 0.0,
          fillColor: "transparent",
        });
        const c2 =
          layer.getBounds && layer.getBounds().getCenter
            ? layer.getBounds().getCenter()
            : null;
        const c2Text = c2
          ? `Lat: ${c2.lat.toFixed(5)}, Lng: ${c2.lng.toFixed(5)}`
          : "";
        layer.bindPopup(
          `<h3>Municipio ${layer.municipioData.numero_rom}</h3>
            <div class=\"municipio-info\">\n            <strong>ID:</strong> ${layer.municipioData.municipio}<br>\n            <strong>Municipio:</strong> ${layer.municipioData.numero_rom}\n            </div>
            <div class=\"tech-details\">${c2Text}</div>`
        );
        layer.on("click", onMunicipioClick);
        if (layer.bringToFront) layer.bringToFront();
        if (
          layer.getBounds &&
          layer.getBounds().isValid &&
          layer.getBounds().isValid()
        ) {
          map.fitBounds(layer.getBounds(), {
            padding: [80, 80],
            maxZoom: 13,
            animate: true,
          });
        } else {
          console.warn(
            "No valid bounds for municipio",
            layer.municipioId,
            layer
          );
        }
        console.log("Activated municipio", selectedId, layer);
      } else {
        layer.setStyle({
          weight: 2,
          color: "#000000",
          fillOpacity: 0,
          fillColor: "transparent",
        });
      }
    });
  }
}

function onMunicipioClick(e) {
  const layer = e.target;
  // ✅ Only update if clicking on a different municipio
  const currentView = document.getElementById("viewSelect").value;
  if (currentView !== layer.municipioData.numero_rom) {
    document.getElementById("viewSelect").value =
      layer.municipioData.numero_rom;
    handleMunicipioViewChange();
    if (typeof window.handleHotelViewChange === "function")
      window.handleHotelViewChange();
  }
  e.originalEvent.preventDefault(); // ✅ Stop event propagation
}
