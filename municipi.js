// municipi.js
import { getMap } from "./map.js";
import { romanToNumber, getMunicipioColor } from "./utils.js";
import { getHotels } from "./hotels.js";

export let municipioLayers = [];
let infoModePopup = null;

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
          weight: 4,
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
        
        // ✅ Zoom to municipio when selecting from dropdown
        if (layer.getBounds && layer.getBounds().isValid && layer.getBounds().isValid()) {
          map.fitBounds(layer.getBounds(), { padding: [50, 50] });
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

// Calculate statistics for a municipio
function calculateMunicipioStats(municipioNum) {
  const hotels = getHotels();
  const municipioHotels = hotels.filter((hotel) => {
    const hotelMunicipioNum = typeof hotel.municipio === "number"
      ? hotel.municipio
      : romanToNumber(hotel.municipio || "");
    return hotelMunicipioNum === municipioNum;
  });

  const stats = {
    total: municipioHotels.length,
    status: {
      White: 0,
      Green: 0,
      Yellow: 0,
      Red: 0,
    },
    stars: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  };

  municipioHotels.forEach((hotel) => {
    // Count by status
    const status = hotel.status || "White";
    if (stats.status.hasOwnProperty(status)) {
      stats.status[status]++;
    }

    // Count by star rating
    const stars = hotel.star_rating;
    if (stars >= 1 && stars <= 5) {
      stats.stars[stars]++;
    }
  });

  return stats;
}

// Format statistics for display
function formatStatsHTML(municipioName, stats) {
  const statusRows = Object.entries(stats.status)
    .map(([status, count]) => `<tr><td style="text-align: right; padding-right: 10px;">${status}:</td><td style="text-align: center;"><strong>${count}</strong></td></tr>`)
    .join("");

  const starRows = Object.entries(stats.stars)
    .filter(([_, count]) => count > 0)
    .map(([stars, count]) => `<tr><td style="text-align: right; padding-right: 10px;">${stars}★:</td><td style="text-align: center;"><strong>${count}</strong></td></tr>`)
    .join("");

  return `
    <div style="padding: 15px; min-width: 250px; font-family: Arial, sans-serif; text-align: center;">
      <h3 style="margin: 0 0 15px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px; text-align: center;">
        Municipio ${municipioName}
      </h3>
      
      <div style="margin-bottom: 15px; text-align: center;">
        <p style="margin: 5px 0; font-size: 18px; color: #34495e; text-align: center;">
          <strong>Total Hotels:</strong> <span style="color: #3498db; font-size: 20px;">${stats.total}</span>
        </p>
      </div>

      <div style="margin-bottom: 15px;">
        <h4 style="margin: 0 0 8px 0; color: #7f8c8d; font-size: 14px; text-transform: uppercase; text-align: center;">Status Breakdown:</h4>
        <table style="width: auto; margin: 0 auto; border-collapse: collapse;">
          ${statusRows}
        </table>
      </div>

      ${starRows ? `
      <div>
        <h4 style="margin: 0 0 8px 0; color: #7f8c8d; font-size: 14px; text-transform: uppercase; text-align: center;">Star Ratings:</h4>
        <table style="width: auto; margin: 0 auto; border-collapse: collapse;">
          ${starRows}
        </table>
      </div>
      ` : ""}
    </div>
  `;
}

function onMunicipioClick(e) {
  const layer = e.target;
  const map = getMap();
  
  // Close any existing info popup
  if (infoModePopup) {
    map.closePopup(infoModePopup);
    infoModePopup = null;
  }

  // Always highlight the clicked municipio in blue with thinner outline
  // Reset all municipios to default style
  municipioLayers.forEach((l) => {
    const view = document.getElementById("viewSelect").value;
    if (view === "full") {
      l.setStyle({
        weight: 3,
        color: "#333333",
        fillOpacity: 0,
      });
    } else {
      l.setStyle({
        weight: 2,
        color: "#000000",
        fillOpacity: 0,
        fillColor: "transparent",
      });
    }
  });

  // Highlight clicked municipio in red with thicker outline
  layer.setStyle({
    weight: 4,
    color: "#FF0000",
    fillOpacity: 0.0,
    fillColor: "transparent",
  });

  // Check Info Mode state
  const infoModeBtn = document.getElementById("infoModeToggle");
  const isInfoModeOn = infoModeBtn && infoModeBtn.textContent.includes("ON");

  if (isInfoModeOn) {
    // Calculate and display statistics
    const municipioNum = layer.municipioId;
    const stats = calculateMunicipioStats(municipioNum);
    const municipioName = layer.municipioData.numero_rom || municipioNum;
    
    const center = layer.getBounds() && layer.getBounds().getCenter
      ? layer.getBounds().getCenter()
      : null;

    if (center) {
      const statsHTML = formatStatsHTML(municipioName, stats);
      infoModePopup = L.popup({
        maxWidth: 300,
        className: "municipio-info-popup",
      })
        .setLatLng(center)
        .setContent(statsHTML)
        .openOn(map);
    }
  }

  // ✅ No zoom when clicking municipios on map
  e.originalEvent.preventDefault(); // Stop event propagation
}
