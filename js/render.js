/* Avenue Building Corporation — builds the data-driven parts of each page
   from data/site-data.js (edited through admin.html).
   Runs before js/main.js so the gallery filter, photo viewer, table sorting
   and animations work on the content it creates. */
(function () {
  "use strict";
  var D = window.AVENUE_DATA;
  if (!D) return;

  var CATS = {
    commercial: { title: "Commercial", page: "projects-commercial.html" },
    institutional: { title: "Institutional", page: "projects-institutional.html" },
    residential: { title: "Residential", page: "projects-residential.html" }
  };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var num = function (n) { return Number(n).toLocaleString("en-CA"); };
  var plural = function (n, one, many) { return num(n) + " " + (n === 1 ? one : many); };
  var PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>';
  var PHOTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';

  var projects = D.projects || [];
  var retro = D.retrospective || [];
  var byId = {};
  projects.forEach(function (p) { byId[p.id] = p; });

  /* Year and area for each gallery project come from its linked retrospective rows */
  /* Rows with the same name count once (the larger area), so a duplicated
     retrospective entry doesn't double a project's area. */
  var linked = {};
  retro.forEach(function (r) {
    if (!r.projectId || !byId[r.projectId]) return;
    var l = linked[r.projectId] || (linked[r.projectId] = { names: {}, year: 0 });
    var key = String(r.name).trim().toLowerCase();
    l.names[key] = Math.max(l.names[key] || 0, Number(r.sqft) || 0);
    l.year = Math.max(l.year, Number(r.year) || 0);
  });
  Object.keys(linked).forEach(function (id) {
    var l = linked[id], keys = Object.keys(l.names);
    l.rows = keys.length;
    l.sqft = keys.reduce(function (s, k) { return s + l.names[k]; }, 0);
  });

  /* ---------- Live totals ---------- */
  var totalSqft = retro.reduce(function (s, r) { return s + (Number(r.sqft) || 0); }, 0);
  var founded = (D.company && D.company.founded) || 1965;
  var S = {
    "founded": String(founded),
    "years": String(new Date().getFullYear() - founded),
    "retro.count": num(retro.length),
    "retro.countPlus": num(retro.length) + "+",
    "retro.projects": plural(retro.length, "project", "projects"),
    "retro.sqftRounded": Math.round(totalSqft / 1e6) + "M",
    "retro.sqftFloorPlus": Math.floor(totalSqft / 1e6) + "M+",
    "retro.sqftFloorMillion": num(Math.floor(totalSqft / 1e6)) + " million"
  };
  Object.keys(CATS).forEach(function (c) {
    var list = projects.filter(function (p) { return p.category === c; });
    var photos = list.reduce(function (s, p) { return s + (p.photos || []).length; }, 0);
    S["gallery." + c + ".projects"] = plural(list.length, "project", "projects");
    S["gallery." + c + ".photos"] = plural(photos, "photograph", "photographs");
  });
  document.querySelectorAll("[data-stat]").forEach(function (el) {
    var v = S[el.getAttribute("data-stat")];
    if (v != null) el.textContent = v;
  });

  /* ---------- Project gallery pages ---------- */
  var cardHTML = function (p) {
    var photos = p.photos || [];
    if (!photos.length) return "";
    var cover = photos[0];
    var area = linked[p.id];
    var areaHTML = area && area.sqft
      ? '<p class="project__sqft">' + (area.rows > 1 ? "Combined area: " : "") + num(area.sqft) + " sq ft</p>" : "";
    var search = (p.name + " " + (p.city || "")).toLowerCase();
    var list = photos.map(function (ph) {
      return '<li><a href="' + esc(ph.src) + '" data-thumb="' + esc(ph.thumb || ph.src) + '" data-caption="' + esc(ph.caption || "") + '">' + esc(ph.caption || p.name) + "</a></li>";
    }).join("");
    return '<article class="project" id="' + esc(p.id) + '" data-name="' + esc(p.name) + '" data-search="' + esc(search) + '">' +
      '<a class="project__cover" href="' + esc(cover.src) + '" aria-label="View ' + plural(photos.length, "photo", "photos") + " of " + esc(p.name) + '">' +
      '<img src="' + esc(cover.src) + '" alt="' + esc(p.name + (cover.caption ? " — " + cover.caption : "")) + '" loading="lazy" width="640" height="480">' +
      '<span class="project__badge">' + PHOTO + " " + plural(photos.length, "photo", "photos") + "</span></a>" +
      '<div class="project__body"><h3>' + esc(p.name) + '</h3><p class="project__loc">' + PIN + " " + esc(p.city || "") + "</p>" + areaHTML + "</div>" +
      '<ul class="project__photos">' + list + "</ul></article>";
  };
  document.querySelectorAll("[data-gallery]").forEach(function (box) {
    var cat = box.getAttribute("data-gallery");
    box.innerHTML = projects.filter(function (p) { return p.category === cat; }).map(cardHTML).join("");
  });

  /* ---------- Featured projects on the home page ---------- */
  document.querySelectorAll("[data-featured]").forEach(function (box) {
    box.innerHTML = (D.featured || []).map(function (id) {
      var p = byId[id];
      if (!p || !(p.photos || []).length) return "";
      var cat = CATS[p.category] || { title: "", page: "#" };
      var l = linked[id] || {};
      var meta = [p.city, l.year || "", l.sqft ? num(l.sqft) + " sq ft" : ""].filter(Boolean).join(" · ");
      return '<article class="project reveal">' +
        '<a class="project__cover" href="' + cat.page + "#" + esc(id) + '" style="cursor:pointer" aria-label="' + esc(p.name) + " — view in the " + cat.title.toLowerCase() + ' gallery">' +
        '<img src="' + esc(p.photos[0].src) + '" alt="' + esc(p.name) + '" loading="lazy" width="640" height="480">' +
        '<span class="project__badge">' + cat.title + "</span></a>" +
        '<div class="project__body"><h3>' + esc(p.name) + '</h3><p class="project__loc">' + PIN + " " + esc(meta) + "</p></div></article>";
    }).join("");
  });

  /* ---------- Retrospective table ---------- */
  document.querySelectorAll("tbody[data-retro]").forEach(function (tb) {
    tb.innerHTML = retro.map(function (r) {
      var p = r.projectId && byId[r.projectId];
      var name = p ? '<a href="' + CATS[p.category].page + "#" + esc(p.id) + '">' + esc(r.name) + "</a>" : esc(r.name);
      var sq = Number(r.sqft) || 0;
      return '<tr data-name="' + esc(r.name) + '" data-year="' + esc(r.year) + '" data-sqft="' + sq + '"><td>' + name + "</td><td>" + (r.year ? esc(r.year) : "—") + "</td><td>" + (sq ? num(sq) : "—") + "</td></tr>";
    }).join("");
  });

  /* ---------- Milestones timeline ---------- */
  document.querySelectorAll("ol[data-timeline]").forEach(function (ol) {
    ol.innerHTML = (D.timeline || []).map(function (t) {
      var title = t.link ? '<a href="' + esc(t.link) + '">' + esc(t.title) + "</a>" : esc(t.title);
      return '<li class="reveal"><div class="timeline__year">' + esc(t.year) + "</div><div><h3>" + title + "</h3><p>" + esc(t.text) + "</p></div></li>";
    }).join("");
  });

  /* ---------- OpenStreetMap helpers (used here and by admin.html) ---------- */
  var OSM = window.AvenueOSM = {
    embedUrl: function (lat, lon, zoom) {
      var d = zoom === "wide" ? 0.02 : 0.006, d2 = d * 0.6;
      return "https://www.openstreetmap.org/export/embed.html?bbox=" +
        (lon - d).toFixed(6) + "," + (lat - d2).toFixed(6) + "," + (lon + d).toFixed(6) + "," + (lat + d2).toFixed(6) +
        "&layer=mapnik&marker=" + lat.toFixed(6) + "," + lon.toFixed(6);
    },
    viewUrl: function (lat, lon) {
      return "https://www.openstreetmap.org/?mlat=" + lat.toFixed(6) + "&mlon=" + lon.toFixed(6) + "#map=17/" + lat.toFixed(6) + "/" + lon.toFixed(6);
    },
    /* One search per call (OpenStreetMap's rules: no search-as-you-type, max 1 request/second) */
    search: function (query) {
      var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=ca&accept-language=en&q=" + encodeURIComponent(query);
      return fetch(url).then(function (res) {
        if (!res.ok) throw new Error("Address search failed (" + res.status + ")");
        return res.json();
      });
    }
  };

  /* ---------- Contact page: office map ---------- */
  var officeBox = document.querySelector("[data-office-map]");
  if (officeBox) {
    var frame = officeBox.querySelector("iframe");
    var show = function (lat, lon) {
      frame.src = OSM.embedUrl(lat, lon);
      frame.hidden = false;
      officeBox.classList.add("has-map");
    };
    var office = D.office || {};
    var cacheKey = "avenue-office-pin";
    if (typeof office.lat === "number" && typeof office.lon === "number") {
      show(office.lat, office.lon);
    } else {
      var cached = null;
      try { cached = JSON.parse(localStorage.getItem(cacheKey) || "null"); } catch (e) {}
      if (cached && cached.address === office.address) show(cached.lat, cached.lon);
      else if (office.address && window.fetch) {
        OSM.search(office.address).then(function (list) {
          if (!list || !list.length) return;
          var lat = parseFloat(list[0].lat), lon = parseFloat(list[0].lon);
          try { localStorage.setItem(cacheKey, JSON.stringify({ address: office.address, lat: lat, lon: lon })); } catch (e) {}
          show(lat, lon);
        }).catch(function () { /* keep the "Open in OpenStreetMap" link */ });
      }
    }
  }
})();
