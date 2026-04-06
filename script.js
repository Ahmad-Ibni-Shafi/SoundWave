const LASTFM_KEY = "YOUR_KEY_HERE";
const ITUNES_URL = "https://itunes.apple.com/search";
const LASTFM_URL = "https://ws.audioscrobbler.com/2.0/";

const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");
const typeFilter = document.getElementById("typeFilter");
const explicitFilter = document.getElementById("explicitFilter");
const sortSelect = document.getElementById("sortSelect");
const searchResults = document.getElementById("searchResults");
const searchSpinner = document.getElementById("searchSpinner");
const searchEmptyState = document.getElementById("searchEmptyState");
const emptyMsg = document.getElementById("emptyMsg");
const loadMoreWrapper = document.getElementById("loadMoreWrapper");
const loadMoreBtn = document.getElementById("loadMoreBtn");

const trendingResults = document.getElementById("trendingResults");
const trendingSpinner = document.getElementById("trendingSpinner");
const trendingEmptyState = document.getElementById("trendingEmptyState");

const favResults = document.getElementById("favResults");
const favEmptyState = document.getElementById("favEmptyState");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

const heroSearchBtn = document.getElementById("heroSearchBtn");

const sidebar = document.getElementById("sidebar");
const hamburger = document.getElementById("hamburger");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const playerName = document.getElementById("playerName");
const playerArtist = document.getElementById("playerArtist");
const playerThumb = document.getElementById("playerThumb");
const playerFavBtn = document.getElementById("playerFavBtn");
const playBtn = document.getElementById("playBtn");
const audioPlayer = document.getElementById("audioPlayer");

let allResults = [];
let filteredList = [];
let currentPage = 1;
const CARDS_PER_PAGE = 12;

let isPlaying = false;
let currentTrack = null;

async function searchItunes(query) {
  searchSpinner.classList.add("active");
  searchEmptyState.classList.add("hidden");
  searchResults.innerHTML = "";
  loadMoreWrapper.classList.remove("visible");

  let entityType = "song";
  if (typeFilter.value === "artist") entityType = "allArtist";
  if (typeFilter.value === "album") entityType = "album";

  const apiURL = `${ITUNES_URL}?term=${encodeURIComponent(query)}&media=music&entity=${entityType}&limit=50`;

  try {
    const response = await fetch(apiURL);
    const data = await response.json();
    allResults = data.results || [];
    currentPage = 1;
    filterAndSort();
  } catch (error) {
    console.error("iTunes API Error:", error);
    emptyMsg.textContent = "Could not fetch results. Check your internet.";
    searchEmptyState.classList.remove("hidden");
  } finally {
    searchSpinner.classList.remove("active");
  }
}

async function loadTrending() {
  trendingSpinner.classList.add("active");
  trendingEmptyState.classList.add("hidden");

  if (LASTFM_KEY === "YOUR_KEY_HERE") {
    trendingSpinner.classList.remove("active");
    trendingEmptyState.querySelector("p").textContent =
      "Add your Last.fm API key in script.js to see trending tracks.";
    trendingEmptyState.classList.remove("hidden");
    return;
  }

  const apiURL = `${LASTFM_URL}?method=chart.gettoptracks&api_key=${LASTFM_KEY}&format=json&limit=12`;

  try {
    const response = await fetch(apiURL);
    const data = await response.json();
    const tracks = data.tracks.track;

    if (!tracks || tracks.length === 0) throw new Error("No tracks found");

    trendingResults.innerHTML = tracks.map(buildTrendingCard).join("");
    attachEvents(trendingResults);
  } catch (error) {
    console.error("Last.fm Error:", error);
    trendingEmptyState.querySelector("p").textContent =
      "Could not load trending. Check your Last.fm API key.";
    trendingEmptyState.classList.remove("hidden");
  } finally {
    trendingSpinner.classList.remove("active");
  }
}

function applyFilter(resultsArray) {
  const contentChoice = explicitFilter.value;

  return resultsArray.filter(function (item) {
    if (contentChoice === "all") return true;
    if (contentChoice === "clean") return item.trackExplicitness !== "explicit";
    if (contentChoice === "explicit") return item.trackExplicitness === "explicit";
    return true;
  });
}

function applySort(resultsArray) {
  const sortChoice = sortSelect.value;

  return resultsArray.slice().sort(function (a, b) {
    const nameA = (a.trackName || a.collectionName || a.artistName || "").toLowerCase();
    const nameB = (b.trackName || b.collectionName || b.artistName || "").toLowerCase();
    const dateA = new Date(a.releaseDate || 0);
    const dateB = new Date(b.releaseDate || 0);

    if (sortChoice === "az") return nameA.localeCompare(nameB);
    if (sortChoice === "za") return nameB.localeCompare(nameA);
    if (sortChoice === "newest") return dateB - dateA;
    if (sortChoice === "oldest") return dateA - dateB;
    return 0;
  });
}

function filterAndSort() {
  filteredList = applySort(applyFilter(allResults));

  if (filteredList.length === 0) {
    emptyMsg.textContent =
      allResults.length === 0
        ? "No results found. Try a different search."
        : "No results match your filter. Try changing the filters.";
    searchEmptyState.classList.remove("hidden");
    loadMoreWrapper.classList.remove("visible");
    return;
  }

  searchEmptyState.classList.add("hidden");
  currentPage = 1;
  renderCards();
}

function renderCards() {
  const endIndex = currentPage * CARDS_PER_PAGE;
  searchResults.innerHTML = filteredList
    .slice(0, endIndex)
    .map(buildCard)
    .join("");

  attachEvents(searchResults);
  loadMoreWrapper.classList.toggle("visible", endIndex < filteredList.length);
}

function buildCard(item) {
  const id = item.trackId || item.collectionId || item.artistId || Math.random();
  const title = item.trackName || item.collectionName || item.artistName || "Unknown";
  const artist = item.artistName || "Unknown Artist";
  const album = item.collectionName || "";
  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : "";
  const imgUrl = item.artworkUrl100 ? item.artworkUrl100.replace("100x100", "300x300") : "";
  const preview = item.previewUrl || "";
  const explicit = item.trackExplicitness === "explicit";

  const faved = isFavorite(String(id));
  const heartIcon = faved ? "fas fa-heart" : "far fa-heart";
  const heartClass = faved ? "fav-btn active" : "fav-btn";

  const kind = item.kind || item.wrapperType || "song";
  const badge = kind.includes("song") ? "song" : kind.includes("album") ? "album" : "track";

  const trackData = encodeURIComponent(
    JSON.stringify({ id: String(id), title, artist, imgUrl, preview, explicit })
  );

  return `
    <div class="music-card" data-track="${trackData}">
      <div class="card-img-wrapper">
        ${
          imgUrl
            ? `<img class="card-img" src="${imgUrl}" alt="${title}" loading="lazy">`
            : `<div class="card-img-placeholder"><i class="fas fa-music"></i></div>`
        }
        ${
          preview
            ? `<button class="play-overlay" data-preview="${preview}" data-track="${trackData}">
                <i class="fas fa-play"></i>
              </button>`
            : `<div class="play-overlay" style="background:var(--bg-card)">
                <i class="fas fa-ban" style="color:var(--text-muted)"></i>
              </div>`
        }
      </div>

      <div class="card-info">
        <p class="card-title" title="${title}">${title}</p>
        <p class="card-artist" title="${artist}">${artist}</p>
        ${album ? `<p class="card-meta">${album}</p>` : ""}
        ${year ? `<p class="card-meta">${year}</p>` : ""}
      </div>

      <div class="card-footer">
        <span class="card-badge ${badge} ${explicit ? "explicit" : ""}">
          ${explicit ? "🅴 " : ""}${badge}
        </span>
        <button class="${heartClass}" data-id="${id}" title="Favorite">
          <i class="${heartIcon}"></i>
        </button>
      </div>
    </div>
  `;
}

function buildTrendingCard(track) {
  const id = track.mbid || (track.name + track.artist.name);
  const title = track.name || "Unknown Track";
  const artist = track.artist ? track.artist.name : "Unknown Artist";

  const imgObj = track.image?.find(img => img.size === "large");
  const imgUrl = imgObj?.["#text"] || "";

  const faved = isFavorite(String(id));
  const heartIcon = faved ? "fas fa-heart" : "far fa-heart";
  const heartClass = faved ? "fav-btn active" : "fav-btn";

  const trackData = encodeURIComponent(
    JSON.stringify({ id: String(id), title, artist, imgUrl, preview: "" })
  );

  return `
    <div class="music-card" data-track="${trackData}">
      <div class="card-img-wrapper">
        ${
          imgUrl
            ? `<img class="card-img" src="${imgUrl}" alt="${title}" loading="lazy">`
            : `<div class="card-img-placeholder"><i class="fas fa-music"></i></div>`
        }
        <div class="play-overlay">
          <i class="fas fa-fire"></i>
        </div>
      </div>
      <div class="card-info">
        <p class="card-title">${title}</p>
        <p class="card-artist">${artist}</p>
      </div>
      <div class="card-footer">
        <span class="card-badge">trending</span>
        <button class="${heartClass}" data-id="${id}" title="Favorite">
          <i class="${heartIcon}"></i>
        </button>
      </div>
    </div>
  `;
}

function getFavorites() {
  return JSON.parse(localStorage.getItem("sw_favorites")) || [];
}

function saveFavorites(favArray) {
  localStorage.setItem("sw_favorites", JSON.stringify(favArray));
}

function isFavorite(id) {
  return getFavorites().some(fav => fav.id === String(id));
}

function toggleFavorite(track) {
  let favs = getFavorites();
  const alreadySaved = favs.some(f => f.id === String(track.id));

  if (alreadySaved) {
    favs = favs.filter(f => f.id !== String(track.id));
    showToast("Removed from favorites");
  } else {
    favs.push(track);
    showToast("Added to favorites");
  }

  saveFavorites(favs);
  renderFavorites();
  updateHeartButtons();
}

function renderFavorites() {
  const favs = getFavorites();

  if (favs.length === 0) {
    favEmptyState.classList.remove("hidden");
    favResults.innerHTML = "";
    return;
  }

  favEmptyState.classList.add("hidden");

  favResults.innerHTML = favs
    .map(track => {
      const trackData = encodeURIComponent(JSON.stringify(track));
      return `
        <div class="music-card" data-track="${trackData}">
          <div class="card-img-wrapper">
            ${
              track.imgUrl
                ? `<img class="card-img" src="${track.imgUrl}" alt="${track.title}" loading="lazy">`
                : `<div class="card-img-placeholder"><i class="fas fa-music"></i></div>`
            }
            ${
              track.preview
                ? `<button class="play-overlay" data-preview="${track.preview}" data-track="${trackData}">
                    <i class="fas fa-play"></i>
                  </button>`
                : ""
            }
          </div>
          <div class="card-info">
            <p class="card-title">${track.title || "Unknown"}</p>
            <p class="card-artist">${track.artist || "—"}</p>
          </div>
          <div class="card-footer">
            <span class="card-badge song">saved</span>
            <button class="fav-btn active" data-id="${track.id}" title="Remove">
              <i class="fas fa-heart"></i>
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  attachEvents(favResults);
}

function updateHeartButtons() {
  document.querySelectorAll(".fav-btn[data-id]").forEach(btn => {
    const id = btn.dataset.id;
    const icon = btn.querySelector("i");

    if (isFavorite(id)) {
      btn.classList.add("active");
      icon.className = "fas fa-heart";
    } else {
      btn.classList.remove("active");
      icon.className = "far fa-heart";
    }
  });
}

function attachEvents(container) {
  container.querySelectorAll(".fav-btn").forEach(btn => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const card = btn.closest(".music-card");
      const track = JSON.parse(decodeURIComponent(card.dataset.track));
      toggleFavorite(track);
    });
  });

  container.querySelectorAll(".play-overlay[data-preview]").forEach(btn => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const track = JSON.parse(decodeURIComponent(btn.dataset.track));
      loadInPlayer(track);
    });
  });

  container.querySelectorAll(".music-card").forEach(card => {
    card.addEventListener("click", function () {
      const track = JSON.parse(decodeURIComponent(card.dataset.track));
      loadInPlayer(track);
    });
  });
}

function loadInPlayer(track) {
  currentTrack = track;
  playerName.textContent = track.title || "No title";
  playerArtist.textContent = track.artist || "—";

  playerThumb.innerHTML = track.imgUrl
    ? `<img src="${track.imgUrl}" alt="${track.title}">`
    : `<i class="fas fa-music"></i>`;

  playerFavBtn.className = isFavorite(track.id) ? "fav-btn-player active" : "fav-btn-player";

  if (track.preview) {
    audioPlayer.src = track.preview;
    audioPlayer.play();
    isPlaying = true;
    playBtn.innerHTML = `<i class="fas fa-pause"></i>`;
    showToast("Now playing: " + track.title);
  } else {
    showToast("No audio preview available for this track");
    isPlaying = false;
    playBtn.innerHTML = `<i class="fas fa-play"></i>`;
  }
}

playBtn.addEventListener("click", function () {
  if (!currentTrack) return;

  if (isPlaying) {
    audioPlayer.pause();
    isPlaying = false;
    playBtn.innerHTML = `<i class="fas fa-play"></i>`;
  } else {
    audioPlayer.play();
    isPlaying = true;
    playBtn.innerHTML = `<i class="fas fa-pause"></i>`;
  }
});

audioPlayer.addEventListener("ended", function () {
  isPlaying = false;
  playBtn.innerHTML = `<i class="fas fa-play"></i>`;
});

playerFavBtn.addEventListener("click", function () {
  if (!currentTrack) return;
  toggleFavorite(currentTrack);
  playerFavBtn.className = isFavorite(currentTrack.id) ? "fav-btn-player active" : "fav-btn-player";
});

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeIcon.className = theme === "dark" ? "fas fa-moon" : "fas fa-sun";
  localStorage.setItem("sw_theme", theme);
}

themeToggle.addEventListener("click", function () {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

applyTheme(localStorage.getItem("sw_theme") || "dark");

function debounce(fn, delay) {
  let timer;
  return function (arg) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(arg), delay);
  };
}

const debouncedSearch = debounce(function (query) {
  if (query.trim().length < 2) {
    searchResults.innerHTML = "";
    allResults = [];
    emptyMsg.textContent = "Type at least 2 characters to search.";
    searchEmptyState.classList.remove("hidden");
    loadMoreWrapper.classList.remove("visible");
    return;
  }
  searchItunes(query.trim());
}, 500);

searchInput.addEventListener("input", function (e) {
  const value = e.target.value;
  clearBtn.classList.toggle("visible", value.length > 0);
  debouncedSearch(value);
});

clearBtn.addEventListener("click", function () {
  searchInput.value = "";
  clearBtn.classList.remove("visible");
  searchResults.innerHTML = "";
  allResults = [];
  emptyMsg.textContent = "Type something to search for music!";
  searchEmptyState.classList.remove("hidden");
  loadMoreWrapper.classList.remove("visible");
  searchInput.focus();
});

typeFilter.addEventListener("change", function () {
  const query = searchInput.value.trim();
  if (query.length >= 2) searchItunes(query);
});

explicitFilter.addEventListener("change", function () {
  if (allResults.length > 0) filterAndSort();
});

sortSelect.addEventListener("change", function () {
  if (allResults.length > 0) filterAndSort();
});

loadMoreBtn.addEventListener("click", function () {
  currentPage++;
  renderCards();
  loadMoreWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
});

heroSearchBtn.addEventListener("click", function () {
  document.getElementById("search").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => searchInput.focus(), 500);
});

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", function (e) {
    e.preventDefault();

    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    link.classList.add("active");

    const target = document.getElementById(link.dataset.section);
    if (target) target.scrollIntoView({ behavior: "smooth" });

    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");
  });
});

hamburger.addEventListener("click", function () {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("open");
});

sidebarOverlay.addEventListener("click", function () {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
});

const pageSections = ["home", "search", "trending", "favorites"];

const scrollObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      document.querySelectorAll(".nav-link").forEach(function (link) {
        link.classList.toggle("active", link.dataset.section === id);
      });
    }
  });
}, { threshold: 0.35 });

pageSections.forEach(function (id) {
  const el = document.getElementById(id);
  if (el) scrollObserver.observe(el);
});

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("show"));
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function startApp() {
  renderFavorites();
  loadTrending();
  searchEmptyState.classList.remove("hidden");
}

startApp();