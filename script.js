const STATIONS = [
  { id: "mumbai-csmt", name: "Mumbai CSMT", city: "Mumbai" },
  { id: "thane", name: "Thane", city: "Thane" },
  { id: "pune", name: "Pune Junction", city: "Pune" },
  { id: "ratnagiri", name: "Ratnagiri", city: "Ratnagiri" },
  { id: "madgaon", name: "Madgaon · Goa", city: "Goa" },
  { id: "solapur", name: "Solapur Junction", city: "Solapur" },
  { id: "hyderabad", name: "Hyderabad Deccan", city: "Hyderabad" },
  { id: "delhi", name: "New Delhi", city: "Delhi" },
  { id: "agra", name: "Agra Cantt", city: "Agra" },
  { id: "jaipur", name: "Jaipur Junction", city: "Jaipur" },
  { id: "ajmer", name: "Ajmer Junction", city: "Ajmer" },
  { id: "ahmedabad", name: "Ahmedabad Junction", city: "Ahmedabad" },
  { id: "bhopal", name: "Bhopal Junction", city: "Bhopal" },
  { id: "nagpur", name: "Nagpur Junction", city: "Nagpur" },
];

const TRAINS = [
  {
    id: "western-coast",
    number: "20417",
    name: "Western Coast Express",
    stops: ["mumbai-csmt", "thane", "pune", "ratnagiri", "madgaon"],
    times: ["06:30", "07:15", "10:05", "15:20", "20:10"],
    segmentFares: [330, 590, 1080, 860],
    classes: ["AC 2 Tier", "AC 3 Tier", "Sleeper"],
    amenities: ["On-board pantry", "Charging points"],
    rating: 4.7,
    bookedSeats: [3, 7, 12],
  },
  {
    id: "konkan-dayliner",
    number: "20631",
    name: "Konkan Dayliner",
    stops: ["mumbai-csmt", "thane", "pune", "madgaon"],
    times: ["07:20", "08:00", "10:55", "18:30"],
    segmentFares: [300, 540, 1240],
    classes: ["AC 2 Tier", "AC 3 Tier", "Sleeper"],
    amenities: ["Pantry car", "Scenic route"],
    rating: 4.5,
    bookedSeats: [1, 5, 9, 15],
  },
  {
    id: "deccan-night",
    number: "21805",
    name: "Deccan Night Express",
    stops: ["mumbai-csmt", "thane", "pune", "solapur", "hyderabad"],
    times: ["21:40", "22:20", "01:05", "05:40", "10:30"],
    segmentFares: [270, 510, 650, 880],
    classes: ["AC 2 Tier", "AC 3 Tier", "Sleeper"],
    amenities: ["Overnight service", "Bedding included"],
    rating: 4.6,
    bookedSeats: [2, 6, 10, 14],
  },
  {
    id: "pink-city",
    number: "21143",
    name: "Pink City Express",
    stops: ["delhi", "jaipur", "ajmer", "ahmedabad"],
    times: ["05:50", "10:30", "13:40", "19:15"],
    segmentFares: [690, 430, 920],
    classes: ["AC 2 Tier", "AC 3 Tier", "Sleeper"],
    amenities: ["Seat-side charging", "Meals available"],
    rating: 4.4,
    bookedSeats: [4, 8, 11],
  },
  {
    id: "central-link",
    number: "22309",
    name: "Central Link Express",
    stops: ["delhi", "agra", "bhopal", "nagpur", "hyderabad"],
    times: ["17:10", "19:45", "04:50", "11:45", "18:50"],
    segmentFares: [410, 830, 720, 970],
    classes: ["AC 2 Tier", "AC 3 Tier", "Sleeper"],
    amenities: ["Pantry car", "Quiet coach"],
    rating: 4.8,
    bookedSeats: [2, 5, 13, 16],
  },
  {
    id: "southern-connector",
    number: "20753",
    name: "Southern Connector",
    stops: ["pune", "solapur", "hyderabad"],
    times: ["13:10", "17:25", "22:15"],
    segmentFares: [610, 820],
    classes: ["AC 2 Tier", "AC 3 Tier", "Sleeper"],
    amenities: ["Café coach", "Charging points"],
    rating: 4.3,
    bookedSeats: [3, 8, 12],
  },
];

const CLASS_MULTIPLIERS = {
  "AC 2 Tier": 2.2,
  "AC 3 Tier": 1.65,
  Sleeper: 1,
};
const SERVICE_FEE_PER_TRAVELLER = 45;
const STORAGE_KEY = "railday.demo.bookings.v1";
const SEAT_COUNT = 16;

const bookingStore = (() => {
  let memoryBookings = [];
  let storageAvailable = true;

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function read() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : memoryBookings;
      memoryBookings = Array.isArray(parsed) ? parsed : [];
      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;
      console.warn(
        "Browser storage is unavailable; using memory for this visit.",
        error,
      );
    }
    return clone(memoryBookings);
  }

  function write(nextBookings) {
    memoryBookings = clone(nextBookings);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryBookings));
      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;
      console.warn(
        "Could not save to browser storage; this visit will use memory.",
        error,
      );
    }
    return { bookings: clone(memoryBookings), persistent: storageAvailable };
  }

  return {
    getAll: read,

    add(...newBookings) {
      return write([...read(), ...newBookings]);
    },
    remove(reference) {
      return write(read().filter((booking) => booking.reference !== reference));
    },
  };
})();

const state = {
  view: "book",
  search: null,
  matchingTrains: [],
  activeTrain: null,
  selectedSeats: [],
  selectedClass: "AC 3 Tier",
  stage: "seats",
  pendingSearch: 0,
};

const elements = {
  searchForm: document.getElementById("search-form"),
  fromStation: document.getElementById("from-station"),
  toStation: document.getElementById("to-station"),
  travelDate: document.getElementById("travel-date"),
  passengerCount: document.getElementById("passenger-count"),
  resultsSection: document.getElementById("results-section"),
  resultsSummary: document.getElementById("results-summary"),
  resultsMessage: document.getElementById("results-message"),
  trainList: document.getElementById("train-list"),
  sortTrains: document.getElementById("sort-trains"),
  classFilter: document.getElementById("class-filter"),
  bookingFlow: document.getElementById("booking-flow"),
  bookingsPage: document.getElementById("bookings-page"),
  savedBookings: document.getElementById("saved-bookings"),
  searchPanel: document.getElementById("journey-search"),
  tripCount: document.getElementById("my-trip-count"),
  toast: document.getElementById("toast"),
};

let toastTimer;

function escapeHtml(value) {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value).replace(
    /[&<>"']/g,
    (character) => replacements[character],
  );
}

function stationById(id) {
  return STATIONS.find((station) => station.id === id);
}

function cityFor(id) {
  return stationById(id)?.city ?? id;
}

function dateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(
  value,
  options = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  },
) {
  return new Intl.DateTimeFormat("en-IN", options).format(
    new Date(`${value}T12:00:00`),
  );
}

function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function durationInMinutes(start, end) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  let duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (duration < 0) duration += 24 * 60;
  return duration;
}

function durationBetweenStops(times, fromIndex, toIndex) {
  let total = 0;
  for (let index = fromIndex; index < toIndex; index += 1) {
    total += durationInMinutes(times[index], times[index + 1]);
  }
  return total;
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function arrivalDayOffset(departure, duration) {
  const [hour, minute] = departure.split(":").map(Number);
  return Math.floor((hour * 60 + minute + duration) / (24 * 60));
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3600);
}

function updateTripCount() {
  const count = bookingStore.getAll().length;
  elements.tripCount.textContent = String(count);
  elements.tripCount.hidden = count === 0;
}

function populateStationSelects(preserveDestination = true) {
  const previousFrom = elements.fromStation.value;
  const previousTo = elements.toStation.value;
  elements.fromStation.innerHTML = STATIONS.map(
    (station) =>
      `<option value="${station.id}">${escapeHtml(station.name)}</option>`,
  ).join("");
  if (STATIONS.some((station) => station.id === previousFrom))
    elements.fromStation.value = previousFrom;

  elements.toStation.innerHTML = STATIONS.filter(
    (station) => station.id !== elements.fromStation.value,
  )
    .map(
      (station) =>
        `<option value="${station.id}">${escapeHtml(station.name)}</option>`,
    )
    .join("");
  if (
    preserveDestination &&
    STATIONS.some((station) => station.id === previousTo) &&
    previousTo !== elements.fromStation.value
  ) {
    elements.toStation.value = previousTo;
  }
}

function setDefaultDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  elements.travelDate.min = dateForInput(new Date());
  elements.travelDate.value = dateForInput(tomorrow);
}

function setView(view) {
  state.view = view;
  const isBookings = view === "bookings";
  elements.searchPanel.hidden = isBookings;
  elements.resultsSection.hidden = isBookings || !state.search;
  elements.bookingFlow.hidden = isBookings || !state.activeTrain;
  elements.bookingsPage.hidden = !isBookings;
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (isBookings) renderSavedBookings();
}

function getMatchingTrains(search) {
  return TRAINS.flatMap((train) => {
    const fromIndex = train.stops.indexOf(search.from);
    const toIndex = train.stops.indexOf(search.to);
    if (fromIndex < 0 || toIndex < 0 || toIndex <= fromIndex) return [];
    const departure = train.times[fromIndex];
    const arrival = train.times[toIndex];
    return [
      {
        ...train,
        fromIndex,
        toIndex,
        departure,
        arrival,
        duration: durationBetweenStops(train.times, fromIndex, toIndex),
      },
    ];
  });
}

function fareFor(train, travelClass, travellers = 1) {
  const segmentTotal = train.segmentFares
    .slice(train.fromIndex, train.toIndex)
    .reduce((total, fare) => total + fare, 0);
  const oneTraveller = Math.round(
    segmentTotal * CLASS_MULTIPLIERS[travelClass],
  );
  const fare = oneTraveller * travellers;
  const serviceFee = SERVICE_FEE_PER_TRAVELLER * travellers;
  return { oneTraveller, fare, serviceFee, total: fare + serviceFee };
}

function occupiedSeats(train, travelClass, travelDate) {
  const staticOccupancy = train.bookedSeats;
  const savedOccupancy = bookingStore
    .getAll()
    .filter(
      (booking) =>
        booking.trainId === train.id &&
        booking.date === travelDate &&
        booking.travelClass === travelClass,
    )
    .flatMap((booking) => booking.seats);
  return new Set([...staticOccupancy, ...savedOccupancy]);
}

function fareForListItem(train) {
  const suggestedClass =
    elements.classFilter.value === "all"
      ? state.selectedClass
      : elements.classFilter.value;
  return fareFor(train, suggestedClass, 1).total;
}

function renderTrainCard(train, index) {
  const from = stationById(train.stops[train.fromIndex]);
  const to = stationById(train.stops[train.toIndex]);
  const seatClasses = train.classes.map((item) => escapeHtml(item)).join(" · ");
  const amenities = train.amenities
    .slice(0, 2)
    .map((item) => `<span class="train-badge">${escapeHtml(item)}</span>`)
    .join("");
  const estimatedFare = fareForListItem(train);
  const dayOffset = arrivalDayOffset(train.departure, train.duration);
  const arrivalNote = dayOffset ? ` · +${dayOffset} day` : "";
  return `
    <article class="train-card" style="animation-delay:${index * 45}ms">
      <div class="train-info">
        <div class="train-name-row"><span class="train-emblem" aria-hidden="true">↗</span><h3 class="train-name">${escapeHtml(train.name)}</h3></div>
        <p class="train-number">${escapeHtml(train.number)} <span aria-hidden="true">·</span> ★ ${train.rating.toFixed(1)}</p>
        <div class="train-badges"><span class="train-badge">${seatClasses}</span>${amenities}</div>
      </div>
      <div class="train-timing" aria-label="Leaves ${escapeHtml(from.name)} at ${train.departure}, arrives ${escapeHtml(to.name)} at ${train.arrival}">
        <div class="time-point"><strong>${train.departure}</strong><span>${escapeHtml(from.name)}</span></div>
        <div class="time-connector"><span>${formatDuration(train.duration)}</span></div>
        <div class="time-point"><strong>${train.arrival}</strong><span>${escapeHtml(to.name)}${arrivalNote}</span></div>
      </div>
      <div class="train-action">
        <div><span class="fare-label">From · ${escapeHtml(elements.classFilter.value === "all" ? state.selectedClass : elements.classFilter.value)}</span><div class="fare-value">${money(estimatedFare)} <small>/ traveller</small></div></div>
        <button class="choose-button" type="button" data-train-id="${train.id}">Choose seats <span aria-hidden="true">→</span></button>
      </div>
    </article>`;
}

function renderTrainResults() {
  if (!state.search) return;
  const filtered = state.matchingTrains.filter(
    (train) =>
      elements.classFilter.value === "all" ||
      train.classes.includes(elements.classFilter.value),
  );
  const sorted = [...filtered].sort((left, right) => {
    if (elements.sortTrains.value === "price")
      return fareForListItem(left) - fareForListItem(right);
    if (elements.sortTrains.value === "duration")
      return left.duration - right.duration;
    return left.departure.localeCompare(right.departure);
  });
  const from = stationById(state.search.from);
  const to = stationById(state.search.to);
  const travellerLabel =
    state.search.passengers === 1
      ? "1 traveller"
      : `${state.search.passengers} travellers`;
  elements.resultsSummary.textContent = `${from.name} to ${to.name} · ${displayDate(state.search.date)} · ${travellerLabel}`;

  if (sorted.length === 0) {
    elements.trainList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-mark" aria-hidden="true">⌁</div>
        <h3>No sample trains on this route</h3>
        <p>Try another pair of stations. The schedule in this learning demo is limited to the routes shown in its sample data.</p>
      </div>`;
    return;
  }
  elements.trainList.innerHTML = sorted.map(renderTrainCard).join("");
}

function loadDemoTrains(search) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(getMatchingTrains(search)), 330);
  });
}

async function handleSearch(event) {
  event.preventDefault();
  if (!elements.searchForm.reportValidity()) return;

  const requestNumber = ++state.pendingSearch;
  state.search = {
    from: elements.fromStation.value,
    to: elements.toStation.value,
    date: elements.travelDate.value,
    passengers: Number(elements.passengerCount.value),
  };
  state.activeTrain = null;
  state.selectedSeats = [];
  elements.bookingFlow.hidden = true;
  elements.resultsSection.hidden = false;
  elements.resultsMessage.textContent = "Checking the sample timetable…";
  elements.trainList.innerHTML = "";
  elements.resultsSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  try {
    const matching = await loadDemoTrains(state.search);
    if (requestNumber !== state.pendingSearch) return;
    state.matchingTrains = matching;
    elements.resultsMessage.textContent = `${matching.length} sample ${matching.length === 1 ? "train" : "trains"} found`;
    renderTrainResults();
  } catch (error) {
    console.error("Could not load sample trains.", error);
    elements.resultsMessage.textContent =
      "The sample timetable could not be loaded. Please try again.";
  }
}

function renderStepper(currentStage) {
  const seatsCurrent = currentStage === "seats";
  const detailsCurrent = currentStage === "passengers";
  return `<div class="stepper" aria-label="Booking progress">
    <div class="step-item ${seatsCurrent ? "is-current" : "is-done"}"><span class="step-number">${seatsCurrent ? "1" : "✓"}</span><span class="step-label">Choose seats</span></div>
    <span class="step-line"></span>
    <div class="step-item ${detailsCurrent ? "is-current" : ""}"><span class="step-number">2</span><span class="step-label">Passenger details</span></div>
    <span class="step-line"></span>
    <div class="step-item"><span class="step-number">3</span><span class="step-label">Demo confirmation</span></div>
  </div>`;
}

function renderBookingHeader() {
  const train = state.activeTrain;
  const from = stationById(train.stops[train.fromIndex]);
  const to = stationById(train.stops[train.toIndex]);
  return `<div class="section-heading">
    <div><p class="eyebrow eyebrow-dark">${escapeHtml(train.number)} · ${escapeHtml(train.name)}</p>
      <h2 id="booking-title">${escapeHtml(from.city)} <span aria-hidden="true">→</span> ${escapeHtml(to.city)}</h2>
      <p class="section-description">${displayDate(state.search.date)} · ${state.search.passengers} ${state.search.passengers === 1 ? "traveller" : "travellers"}</p>
    </div>
    <button class="text-button" type="button" data-action="back-to-results">← Back to trains</button>
  </div>`;
}

function renderSummaryPanel() {
  const train = state.activeTrain;
  const from = stationById(train.stops[train.fromIndex]);
  const to = stationById(train.stops[train.toIndex]);
  const dayOffset = arrivalDayOffset(train.departure, train.duration);
  const prices = fareFor(train, state.selectedClass, state.search.passengers);
  const seatDescription = state.selectedSeats.length
    ? state.selectedSeats.join(", ")
    : "Choose seats";
  const canContinue = state.selectedSeats.length === state.search.passengers;
  const seatAction =
    state.stage === "seats"
      ? `<button class="primary-button" type="button" data-action="continue-to-passengers" ${canContinue ? "" : "disabled"}><span>Continue to passengers</span><span aria-hidden="true">→</span></button>`
      : `<button class="primary-button" type="submit" form="passenger-form" ${state.isSubmitting ? "disabled" : ""}><span>${state.isSubmitting ? "Saving demo booking…" : "Save demo booking"}</span><span aria-hidden="true">→</span></button>`;

  return `<aside class="summary-panel" aria-label="Trip summary">
    <p class="summary-overline">TRIP SUMMARY</p>
    <h3>${escapeHtml(train.name)}</h3>
    <div class="summary-route"><div class="summary-city"><strong>${escapeHtml(from.city)}</strong><span>${train.departure}</span></div><span class="summary-arrow" aria-hidden="true">→</span><div class="summary-city"><strong>${escapeHtml(to.city)}</strong><span>${train.arrival}${dayOffset ? ` · +${dayOffset} day` : ""}</span></div></div>
    <div class="summary-row"><span>Date</span><strong>${displayDate(state.search.date, { day: "numeric", month: "short", year: "numeric" })}</strong></div>
    <div class="summary-row"><span>Class</span><strong>${escapeHtml(state.selectedClass)}</strong></div>
    <div class="summary-row"><span>Travellers</span><strong>${state.search.passengers}</strong></div>
    <div class="summary-row"><span>Seats</span><strong>${escapeHtml(seatDescription)}</strong></div>
    <div class="summary-rule"></div>
    <div class="summary-row"><span>Fare × ${state.search.passengers}</span><strong>${money(prices.fare)}</strong></div>
    <div class="summary-row"><span>Demo service charge</span><strong>${money(prices.serviceFee)}</strong></div>
    <div class="summary-row summary-total"><span>Total demo fare</span><strong>${money(prices.total)}</strong></div>
    <div class="summary-actions">${seatAction}${state.stage === "passengers" ? '<button class="text-button" type="button" data-action="back-to-seats">← Change seats</button>' : ""}</div>
    <p class="demo-disclosure">Sample pricing only. This flow saves a local demo record; it does not make a real reservation.</p>
  </aside>`;
}

function renderSeats() {
  const train = state.activeTrain;
  const occupied = occupiedSeats(train, state.selectedClass, state.search.date);
  return Array.from({ length: SEAT_COUNT }, (_, index) => {
    const seat = index + 1;
    const isBooked = occupied.has(seat);
    const isSelected = state.selectedSeats.includes(seat);
    return `<button class="seat-button ${isSelected ? "is-selected" : ""}" type="button" data-seat="${seat}" aria-pressed="${isSelected}" aria-label="Seat ${seat}${isBooked ? ", unavailable" : isSelected ? ", selected" : ", available"}" ${isBooked ? "disabled" : ""}>${String(seat).padStart(2, "0")}</button>`;
  }).join("");
}

function renderSeatStage() {
  elements.bookingFlow.innerHTML = `${renderBookingHeader()}${renderStepper("seats")}
    <div class="booking-layout">
      <section class="booking-panel" aria-labelledby="seat-title">
        <h3 id="seat-title">Choose your seats</h3>
        <p class="panel-description">Select ${state.search.passengers} ${state.search.passengers === 1 ? "seat" : "seats"} for your trip.</p>
        <div class="coach-control"><label for="coach-class">Travel class</label><select id="coach-class">
          ${Object.keys(CLASS_MULTIPLIERS)
            .map(
              (travelClass) =>
                `<option value="${travelClass}" ${travelClass === state.selectedClass ? "selected" : ""}>${travelClass}</option>`,
            )
            .join("")}
        </select></div>
        <div class="seat-legend" aria-label="Seat status legend"><span class="legend-item"><i class="legend-swatch"></i>Available</span><span class="legend-item"><i class="legend-swatch selected"></i>Selected</span><span class="legend-item"><i class="legend-swatch booked"></i>Unavailable</span></div>
        <div class="seat-map" id="seat-map" aria-label="Sample seat selection">${renderSeats()}</div>
        <p class="seat-help" id="seat-help" aria-live="polite">${state.selectedSeats.length} of ${state.search.passengers} seats selected</p>
      </section>
      ${renderSummaryPanel()}
    </div>`;
  elements.bookingFlow.hidden = false;
}

function renderPassengerRows() {
  return Array.from(
    { length: state.search.passengers },
    (_, index) => `
    <fieldset class="passenger-row">
      <legend class="visually-hidden">Traveller ${index + 1}</legend>
      <h4>Traveller ${index + 1} <span class="booking-code-small">· Seat ${String(state.selectedSeats[index]).padStart(2, "0")}</span></h4>
      <div class="passenger-fields">
        <label class="field" for="passenger-name-${index}"><span class="field-label">Full name</span><input id="passenger-name-${index}" name="passengerName" type="text" autocomplete="name" minlength="2" maxlength="70" placeholder="As shown on your ID" required></label>
        <label class="field" for="passenger-age-${index}"><span class="field-label">Age</span><input id="passenger-age-${index}" name="passengerAge" type="number" min="1" max="120" inputmode="numeric" placeholder="Age" required></label>
        <label class="field gender-field" for="passenger-gender-${index}"><span class="field-label">Gender</span><select id="passenger-gender-${index}" name="passengerGender"><option>Prefer not to say</option><option>Female</option><option>Male</option><option>Non-binary</option></select></label>
      </div>
    </fieldset>`,
  ).join("");
}

function renderPassengerStage() {
  elements.bookingFlow.innerHTML = `${renderBookingHeader()}${renderStepper("passengers")}
    <div class="passenger-layout">
      <form class="passenger-panel" id="passenger-form">
        <h3>Passenger details</h3>
        <p class="panel-description">Enter sample details to finish the local booking demo.</p>
        ${renderPassengerRows()}
        <div class="contact-fields">
          <label class="field" for="contact-email"><span class="field-label">Contact email</span><input id="contact-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="120" required></label>
          <label class="field" for="contact-phone"><span class="field-label">Mobile number</span><input id="contact-phone" name="phone" type="tel" autocomplete="tel" pattern="[0-9+() -]{7,18}" placeholder="+91 98765 43210" required></label>
        </div>
        <p class="demo-disclosure">Please use sample details. This browser-only project does not send passenger information anywhere.</p>
      </form>
      ${renderSummaryPanel()}
    </div>`;
  elements.bookingFlow.hidden = false;
  document
    .getElementById("passenger-form")
    .addEventListener("submit", handlePassengerSubmit);
}

function chooseTrain(trainId) {
  const selected = state.matchingTrains.find((train) => train.id === trainId);
  if (!selected) return;
  state.activeTrain = selected;
  state.selectedSeats = [];
  const filteredClass = elements.classFilter.value;
  state.selectedClass =
    filteredClass !== "all" && selected.classes.includes(filteredClass)
      ? filteredClass
      : selected.classes.includes("AC 3 Tier")
        ? "AC 3 Tier"
        : selected.classes[0];
  state.stage = "seats";
  state.isSubmitting = false;
  renderSeatStage();
  elements.bookingFlow.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleSeatClick(event) {
  const seatButton = event.target.closest("[data-seat]");
  if (!seatButton) return;
  const seat = Number(seatButton.dataset.seat);
  if (state.selectedSeats.includes(seat)) {
    state.selectedSeats = state.selectedSeats.filter((item) => item !== seat);
  } else if (state.selectedSeats.length < state.search.passengers) {
    state.selectedSeats = [...state.selectedSeats, seat].sort(
      (left, right) => left - right,
    );
  } else {
    showToast(
      `Choose only ${state.search.passengers} ${state.search.passengers === 1 ? "seat" : "seats"} for this booking.`,
    );
  }
  renderSeatStage();
}

function createReference() {
  return `RLD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function makeBooking(formData) {
  const train = state.activeTrain;
  const passengers = formData.getAll("passengerName").map((name, index) => ({
    name: name.trim(),
    age: Number(formData.getAll("passengerAge")[index]),
    gender: formData.getAll("passengerGender")[index],
    seat: state.selectedSeats[index],
  }));
  const prices = fareFor(train, state.selectedClass, passengers.length);
  return {
    reference: createReference(),
    trainId: train.id,
    trainName: train.name,
    trainNumber: train.number,
    from: train.stops[train.fromIndex],
    to: train.stops[train.toIndex],
    departure: train.departure,
    arrival: train.arrival,
    date: state.search.date,
    travelClass: state.selectedClass,
    passengers,
    email: formData.get("email").trim(),
    phone: formData.get("phone").trim(),
    seats: [...state.selectedSeats],
    total: prices.total,
    status: "Demo booking",
    createdAt: new Date().toISOString(),
  };
}

function saveBookingAsync(booking) {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try {
        resolve(bookingStore.add(booking));
      } catch (error) {
        reject(error);
      }
    }, 460);
  });
}

async function handlePassengerSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const submitButton = elements.bookingFlow.querySelector(
    'button[type="submit"][form="passenger-form"]',
  );
  const booking = makeBooking(new FormData(form));
  state.isSubmitting = true;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML =
      '<span>Saving demo booking…</span><span aria-hidden="true">◌</span>';
  }

  try {
    const saved = await saveBookingAsync(booking);
    state.isSubmitting = false;
    renderConfirmation(booking);
    updateTripCount();
    if (!saved.persistent)
      showToast("Saved for this visit only; browser storage is unavailable.");
  } catch (error) {
    state.isSubmitting = false;
    console.error("Could not save the demo booking.", error);
    showToast("Could not save this demo booking. Please try again.");
    renderPassengerStage();
  }
}

function renderConfirmation(booking) {
  const from = stationById(booking.from);
  const to = stationById(booking.to);
  const names = booking.passengers
    .map((traveller) => escapeHtml(traveller.name))
    .join(", ");
  elements.bookingFlow.innerHTML = `${renderBookingHeader()}${renderStepper("complete")}
    <section class="confirmation-panel" aria-labelledby="confirmation-title">
      <div class="confirmation-check" aria-hidden="true">✓</div>
      <p class="eyebrow eyebrow-dark">LOCAL DEMO RECORD SAVED</p>
      <h3 id="confirmation-title">Your trip is ready to review.</h3>
      <p>This sample booking stays in this browser. It is not a railway ticket.</p>
      <div class="demo-booking-code">DEMO REFERENCE · ${escapeHtml(booking.reference)}</div>
      <div class="confirmation-details">
        <div><span>Route</span><strong>${escapeHtml(from.city)} → ${escapeHtml(to.city)}</strong></div>
        <div><span>Train</span><strong>${escapeHtml(booking.trainName)} · ${escapeHtml(booking.trainNumber)}</strong></div>
        <div><span>Date &amp; departure</span><strong>${displayDate(booking.date, { day: "numeric", month: "short", year: "numeric" })} · ${booking.departure}</strong></div>
        <div><span>Class &amp; seats</span><strong>${escapeHtml(booking.travelClass)} · ${booking.seats.map((seat) => String(seat).padStart(2, "0")).join(", ")}</strong></div>
        <div><span>Travellers</span><strong>${names}</strong></div>
        <div><span>Total demo fare</span><strong>${money(booking.total)}</strong></div>
      </div>
      <div class="confirmation-actions"><button class="primary-button" type="button" data-action="view-bookings"><span>View my trips</span><span aria-hidden="true">→</span></button><button class="secondary-button" type="button" data-action="print-summary">Print summary</button></div>
    </section>`;
  elements.bookingFlow.hidden = false;
  elements.bookingFlow.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSavedBooking(booking) {
  const from = stationById(booking.from);
  const to = stationById(booking.to);
  return `<article class="saved-booking">
    <div><h3>${escapeHtml(booking.trainName)}</h3><p>${escapeHtml(booking.trainNumber)} · ${displayDate(booking.date, { day: "numeric", month: "short", year: "numeric" })}</p></div>
    <div><div class="saved-route">${escapeHtml(from?.city ?? booking.from)}<span>→</span>${escapeHtml(to?.city ?? booking.to)}</div><p>${escapeHtml(booking.travelClass)} · Seat ${booking.seats.map((seat) => String(seat).padStart(2, "0")).join(", ")}</p></div>
    <div><div class="saved-status">${escapeHtml(booking.status)}</div><p>${money(booking.total)} · ${booking.passengers.length} ${booking.passengers.length === 1 ? "traveller" : "travellers"}</p></div>
    <div class="saved-actions"><span class="booking-code-small">${escapeHtml(booking.reference)}</span><button class="danger-button" type="button" data-remove-booking="${escapeHtml(booking.reference)}">Remove</button></div>
  </article>`;
}

function renderSavedBookings() {
  const bookings = bookingStore
    .getAll()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  updateTripCount();
  elements.savedBookings.innerHTML = bookings.length
    ? bookings.map(renderSavedBooking).join("")
    : `<div class="empty-state"><div class="empty-state-mark" aria-hidden="true">⌁</div><h3>No saved demo trips yet</h3><p>Search a sample route and save a demo booking to see it here.</p><button class="choose-button" type="button" data-action="new-search" style="margin-top:16px">Find a train →</button></div>`;
}

function updateDestinationAfterOriginChange() {
  const currentDestination = elements.toStation.value;
  populateStationSelects(false);
  if (
    currentDestination !== elements.fromStation.value &&
    [...elements.toStation.options].some(
      (option) => option.value === currentDestination,
    )
  ) {
    elements.toStation.value = currentDestination;
  }
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    setView(viewButton.dataset.view);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const trainButton = event.target.closest("[data-train-id]");
  if (trainButton) {
    chooseTrain(trainButton.dataset.trainId);
    return;
  }

  const removeButton = event.target.closest("[data-remove-booking]");
  if (removeButton) {
    bookingStore.remove(removeButton.dataset.removeBooking);
    renderSavedBookings();
    showToast("Demo booking removed from this browser.");
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  switch (actionButton.dataset.action) {
    case "continue-to-passengers":
      if (state.selectedSeats.length === state.search.passengers) {
        state.stage = "passengers";
        renderPassengerStage();
        elements.bookingFlow.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      break;
    case "back-to-seats":
      state.stage = "seats";
      renderSeatStage();
      break;
    case "back-to-results":
      state.activeTrain = null;
      elements.bookingFlow.hidden = true;
      elements.resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      break;
    case "view-bookings":
      setView("bookings");
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    case "new-search":
      state.activeTrain = null;
      state.search = null;
      setView("book");
      elements.searchPanel.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      break;
    case "print-summary":
      window.print();
      break;
    default:
      break;
  }
});

elements.searchForm.addEventListener("submit", handleSearch);
elements.fromStation.addEventListener(
  "change",
  updateDestinationAfterOriginChange,
);
elements.sortTrains.addEventListener("change", renderTrainResults);
elements.classFilter.addEventListener("change", () => {
  renderTrainResults();
});
elements.bookingFlow.addEventListener("click", (event) => {
  const seatButton = event.target.closest("[data-seat]");
  if (seatButton) handleSeatClick(event);
});
elements.bookingFlow.addEventListener("change", (event) => {
  if (event.target.id === "coach-class") {
    state.selectedClass = event.target.value;
    state.selectedSeats = [];
    renderSeatStage();
  }
});
document.getElementById("swap-stations").addEventListener("click", () => {
  const from = elements.fromStation.value;
  const to = elements.toStation.value;
  elements.fromStation.value = to;
  populateStationSelects(false);
  elements.toStation.value = from;
});

populateStationSelects(false);
elements.fromStation.value = "mumbai-csmt";
populateStationSelects(false);
elements.toStation.value = "madgaon";
setDefaultDate();
updateTripCount();
renderSavedBookings();
setView("book");
