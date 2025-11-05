import { getMap } from "./map.js";
import { getStatusColor, romanToNumber } from "./utils.js";
import { municipioLayers } from "./municipi.js";
import { API_URL } from "./config.js";
import { SUPABASE_CONFIG } from "./supabase-config.js";

// Initialize Supabase client - preload to avoid dynamic import delay
let supabase = null;
let supabaseInitPromise = null; // Promise to ensure only one initialization

// Pre-initialize Supabase client (called once on module load)
async function initSupabase() {
  // If already initialized, return immediately
  if (supabase) {
    return supabase;
  }
  
  // If initialization is in progress, await the existing promise
  if (supabaseInitPromise) {
    return await supabaseInitPromise;
  }
  
  // Start initialization and store the promise
  supabaseInitPromise = (async () => {
    const startTime = performance.now();
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    console.log(`[supabase] Initialized in ${(performance.now() - startTime).toFixed(2)}ms`);
    return supabase;
  })();
  
  return await supabaseInitPromise;
}

// Pre-initialize Supabase on module load (don't await to avoid blocking)
initSupabase();

let hotels = [];
let currentMarkers = [];
let currentHotel = null;

// Export function to get hotels array for statistics calculation
export function getHotels() {
  return hotels;
}

// Highlight management (using localStorage until DB is ready)
function getHighlightedHotels() {
  const stored = localStorage.getItem("highlightedHotels");
  return stored ? JSON.parse(stored) : [];
}

function saveHighlightedHotels(highlightedIds) {
  localStorage.setItem("highlightedHotels", JSON.stringify(highlightedIds));
}

function isHotelHighlighted(hotelId) {
  const highlighted = getHighlightedHotels();
  return highlighted.includes(hotelId);
}

function toggleHotelHighlight(hotelId) {
  const highlighted = getHighlightedHotels();
  const index = highlighted.indexOf(hotelId);
  if (index > -1) {
    highlighted.splice(index, 1);
  } else {
    highlighted.push(hotelId);
  }
  saveHighlightedHotels(highlighted);
  return index === -1; // Returns true if now highlighted
}

export async function loadHotels() {
  try {
    const startTime = performance.now();
    
    // Try to load from cache first for instant display
    const cacheKey = 'hotels_cache';
    const cacheTimestampKey = 'hotels_cache_timestamp';
    const cacheMaxAge = 5 * 60 * 1000; // 5 minutes
    
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(cacheTimestampKey);
    const now = Date.now();
    
    // Load from cache if available and not expired
    if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < cacheMaxAge) {
      try {
        hotels = JSON.parse(cachedData);
        console.log(`[hotels] loaded ${hotels.length} hotels from cache (instant)`);
        handleHotelViewChange(); // Show cached data immediately
        
        // Still fetch fresh data in background (don't await)
        fetchFreshHotels(startTime);
        return;
      } catch (e) {
        console.warn("[hotels] cache parse error, fetching fresh data", e);
      }
    }
    
    // No cache or expired - fetch fresh data
    await fetchFreshHotels(startTime);
    
  } catch (error) {
    console.error("[hotels] load error", error);
    // Try to use cache as fallback
    const cachedData = localStorage.getItem('hotels_cache');
    if (cachedData) {
      try {
        hotels = JSON.parse(cachedData);
        console.log("[hotels] using cached data as fallback");
        handleHotelViewChange();
      } catch (e) {
        hotels = [];
        handleHotelViewChange();
      }
    } else {
      hotels = [];
      handleHotelViewChange();
    }
  }
}

async function fetchFreshHotels(startTime) {
  try {
    // Initialize Supabase if not already done
    const supabaseClient = await initSupabase();
    
    // Fetch only needed columns for map display (exclude large location column and unused address columns)
    const { data, error } = await supabaseClient
      .from('Hotels')
      .select('id, nome, via, civico, Latitude, Longitude, stelle, municipio, status, phase, notes, TOTroom');

    if (error) throw error;
    if (!data || !Array.isArray(data)) throw new Error("Invalid data format");

    // Map Supabase column names to frontend expected format
    hotels = data.map((r) => ({
      id: r.id,
      hotel_name: r.nome || r.hotel_name || r.Hotel_Name,
      latitude: Number(r.Latitude || r.latitude),
      longitude: Number(r.Longitude || r.longitude),
      star_rating: r.stelle || r.star_rating || r.Star_Rating,
      municipio: r.municipio || r.Municipio,
      status: r.status || r.Status || 'White', // Default to White if not set
      phase: r.phase || r.Phase || null,
      notes: r.notes || r.Notes || '',
      address: r.address || r.Address || (r.via && r.civico ? `${r.via} ${r.civico}` : r.via || r.civico || null),
      totroom: r.TOTroom || r.totroom || r.TOTRoom || null,
      via: r.via,
      civico: r.civico,
    }));

    // Cache the data
    localStorage.setItem('hotels_cache', JSON.stringify(hotels));
    localStorage.setItem('hotels_cache_timestamp', Date.now().toString());

    const loadTime = performance.now() - startTime;
    console.log(`[hotels] fetched ${hotels.length} hotels from Supabase in ${loadTime.toFixed(2)}ms`);

    handleHotelViewChange(); // Update with fresh data
  } catch (error) {
    console.error("[hotels] Supabase fetch error", error);
    throw error; // Re-throw to be handled by caller
  }
}

export function handleHotelViewChange() {
  const map = getMap();
  if (!map) return;

  // ✅ Debounce rapid filter changes
  if (window.hotelFilterTimeout) clearTimeout(window.hotelFilterTimeout);
  window.hotelFilterTimeout = setTimeout(() => {
    map.closePopup();

    // ✅ PROPERLY Clear all existing markers and their hitboxes
    currentMarkers.forEach((marker) => {
      if (marker) {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
        // Also remove hitbox if it exists
        if (marker.hitbox && map.hasLayer(marker.hitbox)) {
          map.removeLayer(marker.hitbox);
        }
      }
    });
    currentMarkers = [];

    const currentZoom = map.getZoom();
    const initialRadius = getMarkerRadius(currentZoom);
    const view = document.getElementById("viewSelect").value;
    const starFilter = document.getElementById("starFilter").value;
    const statusFilter = document.getElementById("statusFilter").value;
    const phaseFilter = document.getElementById("phaseFilter").value;

    const normalizeMunicipioToNumber = (val) => {
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (/^\d+$/.test(trimmed)) return Number(trimmed);
        return romanToNumber(trimmed);
      }
      return 0;
    };

    const viewNum = normalizeMunicipioToNumber(view);

    let hotelsInView = 0;
    const markersToAdd = [];

    hotels.forEach((hotel) => {
      const hotelMunicipioNum = normalizeMunicipioToNumber(hotel.municipio);

      // Apply filters
      if (view !== "full" && hotelMunicipioNum !== viewNum) return;
      if (starFilter !== "all" && hotel.star_rating != parseInt(starFilter))
        return;
      if (statusFilter === "highlighted") {
        // Show only highlighted hotels
        if (!isHotelHighlighted(hotel.id)) return;
      } else if (statusFilter !== "all" && hotel.status !== statusFilter) {
        return;
      }
      // Phase filter logic
      if (phaseFilter !== "all") {
        if (phaseFilter === "none") {
          // Show only hotels with no phase (null or undefined)
          if (hotel.phase !== null && hotel.phase !== undefined) return;
        } else {
          // Show only hotels with the selected phase number
          const phaseNum = parseInt(phaseFilter);
          if (hotel.phase !== phaseNum) return;
        }
      }

      hotelsInView++;

      const isHighlighted = isHotelHighlighted(hotel.id);
      
      // Create invisible larger hitbox for easier clicking (behind visible marker)
      const hitboxRadius = Math.max(initialRadius + 4, 8); // At least 4px larger, minimum 8px
      const hitbox = L.circleMarker([hotel.latitude, hotel.longitude], {
        radius: hitboxRadius,
        fillColor: "transparent",
        color: "transparent",
        weight: 0,
        opacity: 0,
        fillOpacity: 0,
        interactive: true,
        bubblingMouseEvents: false,
      });
      
      // Create visible marker
      const marker = L.circleMarker([hotel.latitude, hotel.longitude], {
        radius: initialRadius,
        fillColor: getStatusColor(hotel.status),
        color: isHighlighted ? "#0080FF" : "#000", // Thin blue outline for highlighted
        weight: isHighlighted ? 1 : 1, // Thin outline (1px) for highlighted hotels
        opacity: 1,
        fillOpacity: 0.9,
        interactive: true,
        bubblingMouseEvents: false,
      });

      // Store hotel data in both markers
      marker.hotelData = hotel;
      hitbox.hotelData = hotel;
      
      // Attach click handlers to both (hitbox forwards to marker's handler)
      marker.on("click", onMarkerClick);
      marker.on("touchstart", function (e) {
        e.originalEvent.preventDefault();
        onMarkerClick(e);
      });
      
      // Hitbox also handles clicks (makes clicking easier)
      hitbox.on("click", onMarkerClick);
      hitbox.on("touchstart", function (e) {
        e.originalEvent.preventDefault();
        onMarkerClick(e);
      });

      // Add hitbox first (so it's behind), then marker (on top)
      hitbox.addTo(map);
      marker.addTo(map);
      
      // Store both in marker object for cleanup
      marker.hitbox = hitbox;
      markersToAdd.push(marker);
    });

    currentMarkers = markersToAdd;

    // ✅ SHOW "NO HOTELS" POPUP WHEN NEEDED
    if (view !== "full" && hotelsInView === 0) {
      const selectedMunicipio = municipioLayers.find(
        (layer) => layer.municipioId === viewNum
      );

      if (selectedMunicipio && selectedMunicipio.getBounds) {
        try {
          const bounds = selectedMunicipio.getBounds();
          if (bounds && bounds.isValid && bounds.isValid()) {
            const center = bounds.getCenter();

            // Close any existing popups first
            map.closePopup();

            // Small delay to ensure clean state
            setTimeout(() => {
              L.popup()
                .setLatLng(center)
                .setContent(
                  `<div style="padding: 10px; text-align: center;">
                              <h3>No Hotels Found</h3>
                              <p>No hotels available in Municipio ${view}</p>
                              <p><small>Try changing star rating filter</small></p>
                            </div>`
                )
                .openOn(map);
            }, 100);
          }
        } catch (error) {
          console.warn("[hotels] Could not show no-hotels popup:", error);
        }
      }

      console.warn("[hotels] no markers after filtering", {
        view,
        viewNum,
        starFilter,
        statusFilter,
        phaseFilter,
        totalHotels: hotels.length,
        hotelsInView: hotelsInView,
      });
    }

    console.log("[hotels] filtering complete", {
      view,
      viewNum,
      starFilter,
      statusFilter,
      phaseFilter,
      totalHotels: hotels.length,
      hotelsInView: hotelsInView,
      markersDisplayed: currentMarkers.length,
    });
  }, 150); // ✅ Wait 150ms before applying filters
}

let zoomTimeout;
export function setupMapPerformance() {
  const map = getMap();
  if (!map) return;

  // ✅ Debounced zoom handler to prevent excessive marker updates
  map.on("zoomend", function () {
    clearTimeout(zoomTimeout);
    zoomTimeout = setTimeout(() => {
      const currentZoom = map.getZoom();
      updateMarkerSizes(currentZoom);
    }, 150); // Wait 150ms after zoom ends
  });
}

function updateMarkerSizes(zoom) {
  const newRadius = getMarkerRadius(zoom);
  currentMarkers.forEach((marker) => {
    if (marker.setRadius) {
      marker.setRadius(newRadius);
    }
    // Update hitbox size to maintain larger clickable area
    if (marker.hitbox && marker.hitbox.setRadius) {
      const hitboxRadius = Math.max(newRadius + 4, 8); // At least 4px larger, minimum 8px
      marker.hitbox.setRadius(hitboxRadius);
    }
    // Preserve highlight style on zoom (thin blue outline at all zoom levels)
    if (marker.hotelData && isHotelHighlighted(marker.hotelData.id)) {
      marker.setStyle({
        color: "#0080FF", // Thin blue outline
        weight: 1, // Always 1px at all zoom levels
      });
    }
  });
}

function getMarkerRadius(zoom) {
  const minSize = 3,
    maxSize = 12, // Increased from 8 to 12 for larger pins when zoomed in
    zoomRange = 15;
  
  // At minimum zoom (zoom 10 - full map view), apply slight reduction for better visibility
  if (zoom === 10) {
    return 2.5; // Keep small size at zoomed out position (unchanged)
  }
  
  // At all other zoom levels, make pins larger when zoomed in
  // Using a slightly exponential curve to make higher zoom levels even more noticeable
  const zoomProgress = (zoom - 10) / zoomRange; // 0 to 1
  const exponentialFactor = Math.pow(zoomProgress, 0.8); // Slight curve for smoother growth
  return minSize + exponentialFactor * (maxSize - minSize);
}

function onMarkerClick(e) {
  const hotel = e.target.hotelData;
  const map = getMap();

  console.log("[hotels] click", hotel);
  map.closePopup();

  setTimeout(() => {
    // Update hotel name - bold serif font
    document.getElementById("popupName").textContent = hotel.hotel_name;

    // Update municipality in top right
    const municipioEl = document.getElementById("popupMunicipio");
    if (municipioEl) {
      municipioEl.textContent = hotel.municipio || "—";
    }

    // Update star rating - golden yellow, format: "3★"
    const starsEl = document.getElementById("popupStars");
    if (starsEl) {
      starsEl.innerHTML = `<span class="star-number">${hotel.star_rating || "—"}</span>★`;
    }

    // Convert status to Italian for display only
    const statusItalian = getStatusItalian(hotel.status);
    document.getElementById("statusText").textContent = statusItalian;
    document.getElementById(
      "statusText"
    ).className = `status-text status-${statusItalian.toLowerCase()}`;
    
    // Update status dropdown trigger background color
    const statusTrigger = document.getElementById("statusDropdownTrigger");
    if (statusTrigger) {
      statusTrigger.className = `status-dropdown-trigger status-${statusItalian.toLowerCase()}`;
    }
    
    updateNeatlineColor(statusItalian);

    // Ensure dropdown is closed when opening popup
    const dropdown = document.getElementById("statusDropdown");
    if (dropdown) {
      dropdown.classList.add("hidden");
    }

    // Update address section
    const addressValue = document.getElementById("addressValue");
    if (addressValue) {
      const displayAddress = hotel.address || (hotel.via && hotel.civico ? `${hotel.via} ${hotel.civico}` : hotel.via || hotel.civico || "—");
      addressValue.textContent = displayAddress;
      console.log("[hotels] address for hotel", hotel.id, ":", displayAddress, { address: hotel.address, via: hotel.via, civico: hotel.civico });
    }

          // Update coordinates
      const lat = Number(hotel.latitude);
      const lng = Number(hotel.longitude);
      const coordLat = document.getElementById("coordLat");
      const coordLong = document.getElementById("coordLong");
      if (coordLat) {
        coordLat.value = isFinite(lat) ? lat.toFixed(5) : "";
      }
      if (coordLong) {
        coordLong.value = isFinite(lng) ? lng.toFixed(5) : "";
      }

      // Update TOTroom
      const totroomValue = document.getElementById("totroomValue");
      if (totroomValue) {
        totroomValue.textContent = hotel.totroom !== null && hotel.totroom !== undefined ? hotel.totroom : "—";
      }

    // Update phase display and dropdown
    const phaseDisplay = document.getElementById("phaseDisplay");
    const phaseDropdown = document.getElementById("popupPhase");
    if (phaseDisplay) {
      phaseDisplay.textContent = hotel.phase ? `Phase ${hotel.phase}` : "No Phase";
    }
    if (phaseDropdown) {
      // Set the value - use empty string for null/undefined phase
      const phaseValue = hotel.phase ? String(hotel.phase) : "";
      phaseDropdown.value = phaseValue;
      
      // Remove all existing change listeners by cloning the element
      const newDropdown = phaseDropdown.cloneNode(true);
      // Preserve the value after cloning
      newDropdown.value = phaseValue;
      phaseDropdown.parentNode.replaceChild(newDropdown, phaseDropdown);
      
      // Add new change listener
      newDropdown.addEventListener('change', function() {
        const display = document.getElementById('phaseDisplay');
        if (display) {
          // Update display text based on selection
          if (this.value === "" || this.value === null) {
            display.textContent = "No Phase";
          } else {
            display.textContent = `Phase ${this.value}`;
          }
        }
      });
    }

    // Update notes
    const notesEl = document.getElementById("popupNotes");
    if (notesEl) {
      notesEl.value = hotel.notes || "";
    }

    // Update highlight button state
    updateHighlightButton(hotel.id);

    // Show/hide phase controls based on Italian status
    const phaseControls = document.querySelector(".phase-controls");
    if (statusItalian === "VERDE" || statusItalian === "GIALLO") {
      phaseControls.classList.remove("hidden");
    } else {
      phaseControls.classList.add("hidden");
    }

    document.getElementById("popup").classList.remove("hidden");
    currentHotel = hotel;
  }, 50);
}

function positionPopupForMobile() {
  const popup = document.getElementById("popup");
  const map = getMap();
  const mapRect = map.getContainer().getBoundingClientRect();

  // Check if mobile device
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // Position popup at bottom for mobile
    popup.style.position = "fixed";
    popup.style.bottom = "0";
    popup.style.left = "0";
    popup.style.right = "0";
    popup.style.top = "auto";
    popup.style.transform = "none";
    popup.style.zIndex = "1000";
    popup.style.maxHeight = "60vh";
    popup.style.overflowY = "auto";

    // Add backdrop for mobile
    addMobileBackdrop();
  } else {
    // Reset styles for desktop
    popup.style.position = "";
    popup.style.bottom = "";
    popup.style.left = "";
    popup.style.right = "";
    popup.style.top = "";
    popup.style.transform = "";
    popup.style.zIndex = "";
    popup.style.maxHeight = "";
    popup.style.overflowY = "";

    removeMobileBackdrop();
  }
}

function addMobileBackdrop() {
  let backdrop = document.getElementById("mobileBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "mobileBackdrop";
    backdrop.style.position = "fixed";
    backdrop.style.top = "0";
    backdrop.style.left = "0";
    backdrop.style.right = "0";
    backdrop.style.bottom = "0";
    backdrop.style.backgroundColor = "rgba(0,0,0,0.5)";
    backdrop.style.zIndex = "999";
    backdrop.addEventListener("click", closePopup);
    document.body.appendChild(backdrop);
  }
  backdrop.classList.remove("hidden");
}

function removeMobileBackdrop() {
  const backdrop = document.getElementById("mobileBackdrop");
  if (backdrop) {
    backdrop.classList.add("hidden");
  }
}

// Fix toggleStatusDropdown function
function toggleStatusDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById("statusDropdown");
  if (dropdown) {
    dropdown.classList.toggle("hidden");
  }
}

// Phase dropdown is handled by native select overlay
// Add click outside to close dropdown
document.addEventListener("click", function (event) {
  const dropdown = document.getElementById("statusDropdown");
  const trigger = document.querySelector(".status-dropdown-trigger");

  if (
    dropdown &&
    !dropdown.contains(event.target) &&
    !trigger.contains(event.target)
  ) {
    dropdown.classList.add("hidden");
  }
});

// Helper function to convert status to Italian
function getStatusItalian(status) {
  const statusMap = {
    Green: "VERDE",
    Yellow: "GIALLO",
    Red: "ROSSO",
    White: "BIANCO",
  };
  return statusMap[status] || status;
}

// Helper function to convert Italian back to English for saving
function getStatusEnglish(italianStatus) {
  const statusMap = {
    VERDE: "Green",
    GIALLO: "Yellow",
    ROSSO: "Red",
    BIANCO: "White",
  };
  return statusMap[italianStatus] || italianStatus;
}

function updateNeatlineColor(status) {
  const neatline = document.querySelector(".popup-top-line");
  if (!neatline) return;

  // Remove all color classes
  neatline.classList.remove(
    "neatline-verde",
    "neatline-giallo",
    "neatline-rosso",
    "neatline-bianco"
  );

  // Add the appropriate color class
  switch (status) {
    case "VERDE":
      neatline.classList.add("neatline-verde");
      break;
    case "GIALLO":
      neatline.classList.add("neatline-giallo");
      break;
    case "ROSSO":
      neatline.classList.add("neatline-rosso");
      break;
    case "BIANCO":
      neatline.classList.add("neatline-bianco");
      break;
    default:
      neatline.classList.add("neatline-verde"); // Default fallback
  }
}

function changeStatus(newStatus) {
  const statusTextEl = document.getElementById("statusText");
  statusTextEl.textContent = newStatus;
  statusTextEl.className = `status-text status-${newStatus.toLowerCase()}`;
  
  // Update status dropdown trigger background color
  const statusTrigger = document.getElementById("statusDropdownTrigger");
  if (statusTrigger) {
    statusTrigger.className = `status-dropdown-trigger status-${newStatus.toLowerCase()}`;
  }
  
  // Update the top neatline color
  updateNeatlineColor(newStatus);
  
  // Close dropdown after selection
  const dropdown = document.getElementById("statusDropdown");
  if (dropdown) {
    dropdown.classList.add("hidden");
  }

  const phaseControls = document.querySelector(".phase-controls");
  if (newStatus === "VERDE" || newStatus === "GIALLO") {
    phaseControls.classList.remove("hidden");
  } else {
    phaseControls.classList.add("hidden");
    const phaseDropdown = document.getElementById("popupPhase");
    if (phaseDropdown) {
      phaseDropdown.value = "";
    }
    const phaseDisplay = document.getElementById("phaseDisplay");
    if (phaseDisplay) {
      phaseDisplay.textContent = "—";
    }
  }
}

// Add global click listener to close dropdown when clicking outside
document.addEventListener("click", function (event) {
  const dropdown = document.getElementById("statusDropdown");
  const trigger = document.querySelector(".status-dropdown-trigger");

  if (dropdown && !dropdown.classList.contains("hidden")) {
    if (!dropdown.contains(event.target) && !trigger.contains(event.target)) {
      dropdown.classList.add("hidden");
    }
  }
});

async function saveHotel() {
  if (!currentHotel) return;
  const id = currentHotel.id;

  // Convert Italian status back to English for database
  const italianStatus = document.getElementById("statusText").textContent;
  const status = getStatusEnglish(italianStatus);

  const phaseDropdown = document.getElementById("popupPhase");
  const phaseVal = phaseDropdown ? phaseDropdown.value : "";
  const notes = document.getElementById("popupNotes").value;
  // Convert empty string to null, otherwise convert to number
  const phase = phaseVal === "" || phaseVal === null ? null : Number(phaseVal);

  // ✅ OPTIMISTIC UI UPDATE - Update immediately for instant feedback
  const updatedData = {
    status: status,
    phase: phase,
    notes: notes || null,
  };

  // Update local data immediately
  currentHotel.status = status;
  currentHotel.phase = phase;
  currentHotel.notes = notes || null;

  // Update hotels array immediately
  const idx = hotels.findIndex((h) => h.id === id);
  if (idx !== -1) {
    hotels[idx] = { ...hotels[idx], ...updatedData };
  }

  // Update marker immediately (optimistic UI)
  const marker = currentMarkers.find(
    (m) => m.hotelData && m.hotelData.id === id
  );
  if (marker) {
    marker.hotelData = { ...marker.hotelData, ...updatedData };
    const isHighlighted = isHotelHighlighted(id);
    if (marker.setStyle) {
      marker.setStyle({ 
        fillColor: getStatusColor(status),
        color: isHighlighted ? "#0080FF" : "#000",
        weight: isHighlighted ? 1 : 1,
      });
    }
  }

  // Update cache immediately
  if (idx !== -1) {
    localStorage.setItem('hotels_cache', JSON.stringify(hotels));
    localStorage.setItem('hotels_cache_timestamp', Date.now().toString());
  }

  // Close popup immediately for instant feedback
  closePopup();

  // ✅ Save to Supabase in background (non-blocking)
  try {
    const startTime = performance.now();
    const supabaseClient = await initSupabase();
    
    const { data: updatedHotel, error } = await supabaseClient
      .from('Hotels')
      .update({
        status: status,
        phase: phase ? Number(phase) : null,
        notes: notes || null,
      })
      .eq('id', id)
      .select('id, status, phase, notes')
      .single();

    if (error) throw error;

    const saveTime = performance.now() - startTime;
    console.log(`✅ Hotel saved successfully in ${saveTime.toFixed(2)}ms:`, updatedHotel);
  } catch (err) {
    console.error("[hotels] save error", err);
    // Revert optimistic update on error
    if (idx !== -1 && hotels[idx]) {
      hotels[idx] = { ...hotels[idx], ...currentHotel };
    }
    alert("Failed to save hotel. Please try again.");
  }
}

// Fix the closePopup function to handle null elements
function closePopup() {
  const popup = document.getElementById("popup");
  if (popup) {
    popup.classList.add("hidden");
  }

  const dropdown = document.getElementById("statusDropdown");
  if (dropdown) {
    dropdown.classList.add("hidden");
  }

  // Remove mobile backdrop if it exists
  const backdrop = document.getElementById("mobileBackdrop");
  if (backdrop) {
    backdrop.classList.add("hidden");
  }

  document.body.classList.remove("popup-open");
  currentHotel = null;
}

function updateHighlightButton(hotelId) {
  const highlightBtn = document.getElementById("highlightBtn");
  const highlightIcon = document.getElementById("highlightIcon");
  const highlightText = document.getElementById("highlightText");
  
  if (!highlightBtn || !highlightIcon || !highlightText) return;
  
  const isHighlighted = isHotelHighlighted(hotelId);
  
  if (isHighlighted) {
    highlightIcon.textContent = "★";
    highlightIcon.style.color = "#00FFFF";
    highlightText.textContent = "Highlighted";
    highlightBtn.classList.add("highlighted");
  } else {
    highlightIcon.textContent = "☆";
    highlightIcon.style.color = "";
    highlightText.textContent = "Highlight";
    highlightBtn.classList.remove("highlighted");
  }
}

function toggleHighlight() {
  if (!currentHotel) return;
  
  const wasHighlighted = toggleHotelHighlight(currentHotel.id);
  
  // Update button state
  updateHighlightButton(currentHotel.id);
  
  // Update marker style
  const marker = currentMarkers.find(
    (m) => m.hotelData && m.hotelData.id === currentHotel.id
  );
  if (marker) {
    const statusColor = getStatusColor(currentHotel.status);
    marker.setStyle({
      fillColor: statusColor,
      color: wasHighlighted ? "#0080FF" : "#000", // Thin blue outline when highlighted
      weight: 1, // Always thin outline (1px) at all zoom levels
    });
  }
  
  console.log(`Hotel ${wasHighlighted ? "highlighted" : "unhighlighted"}:`, currentHotel.id);
}

window.closePopup = closePopup;
window.saveHotel = saveHotel;
window.toggleStatusDropdown = toggleStatusDropdown;
window.changeStatus = changeStatus;
window.toggleHighlight = toggleHighlight;
