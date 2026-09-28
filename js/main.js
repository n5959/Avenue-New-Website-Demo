/* Avenue Building Corporation — site scripts (no dependencies) */
(function () {
  "use strict";

  var doc = document.documentElement;
  var body = document.body;

  var normalizeProjectName = function (name) {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  };
  var retrospectiveProjects = {
    "kinglibertyofficeretailbuilding": { page: "projects-commercial.html", id: "king-liberty-office-retail-building", sqft: 366000 },
    "rbccentre": { page: "projects-commercial.html", id: "rbc-centre", sqft: 2854000 },
    "windsorcasinoexpansion": { page: "projects-commercial.html", id: "windsor-casino-expansion", sqft: 1472000 },
    "kolterofficebuilding": { page: "projects-commercial.html", id: "kolter-office-building", sqft: 720000 },
    "canoncanada": { page: "projects-commercial.html", id: "canon-canada-head-office", sqft: 486000 },
    "audicanada": { page: "projects-commercial.html", id: "audi-head-office", sqft: 300000 },
    "simcoeplacewsibheadquarters": { page: "projects-commercial.html", id: "wsib-building", sqft: 2800000 },
    "yorkuniversityttcstation": { page: "projects-institutional.html", id: "york-university-ttc-station", sqft: 430000 },
    "humberriverregionalhospital": { page: "projects-institutional.html", id: "humber-river-regional-hospital", sqft: 3104000 },
    "torontorehabcentre": { page: "projects-institutional.html", id: "toronto-rehab-centre", sqft: 360000 },
    "theroyalconservatoryofmusic": { page: "projects-institutional.html", id: "the-royal-conservatory-of-music", sqft: 400000 },
    "canadianbroadcastingcentreheadquarters": { page: "projects-institutional.html", id: "the-canadian-broadcasting-centre", sqft: 3000000 },
    "unionstationrevitilization": { page: "projects-institutional.html", id: "union-station-expansion", sqft: 325000 },
    "kitchenerlibrary": { page: "projects-institutional.html", id: "kitchener-public-library", sqft: 500000 },
    "sheppardwestttc": { page: "projects-institutional.html", id: "sheppard-west-subway-station", sqft: 718000 },
    "sickkidsresearchcentre": { page: "projects-institutional.html", id: "hospital-for-sick-children-research-centre", sqft: 1671000 },
    "universityofwaterloonanotechnologycentre": { page: "projects-institutional.html", id: "university-of-waterloo-nanotechnology-building", sqft: 478000 },
    "torontowesternhospitalstagetwo": { page: "projects-institutional.html", id: "toronto-western-hospital-krembil-discovery-centre", sqft: 305000 },
    "nationalballetschool": { page: "projects-institutional.html", id: "canada-s-national-ballet-school-celia-franca-centre", sqft: 350000 },
    "williamoslerhealthcentre": { page: "projects-institutional.html", id: "william-osler-health-centre-brampton-civic-hospital", sqft: 1180000 },
    "stockyardscondo": { page: "projects-residential.html", id: "stockyards-condo", sqft: 700000 },
    "theorycondos": { page: "projects-residential.html", id: "theory-condos", sqft: 600000 },
    "viabloorcondo": { page: "projects-residential.html", id: "via-bloor-condo", sqft: 2300000 },
    "artshoppecondo": { page: "projects-residential.html", id: "art-shoppe-condo", sqft: 1600000 },
    "101erskinecondo": { page: "projects-residential.html", id: "101-erskine-condo", sqft: 1170000 },
    "hamptonhouse": { page: "projects-residential.html", id: "hampton-house", sqft: 594000 },
    "themercercondos": { page: "projects-residential.html", id: "the-mercer-condos", sqft: 1100000 },
    "300frontstreetwestcondos": { page: "projects-residential.html", id: "300-front-street-west-condos", sqft: 2000000 },
    "10chichesterplaceapartments": { page: "projects-residential.html", id: "10-chichester-place-apartments", sqft: 700000 },
    "trumptower": { page: "projects-residential.html", id: "trump-tower", sqft: 1904000 },
    "onyxcondominiums": { page: "projects-residential.html", id: "onyx-condominiums", sqft: 1152000 },
    "mapleleafsquare": { page: "projects-residential.html", id: "maple-leaf-square", sqft: 3785000 },
    "casadelsolresidences": { page: "projects-residential.html", id: "casa-del-sol-residences", sqft: 1122000 },
    "purespiritcondominiums": { page: "projects-residential.html", id: "pure-spirit-condominiums", sqft: 1242000 },
    "homeontheparkcondominiums": { page: "projects-residential.html", id: "home-on-the-park-condominiums", sqft: 340000 },
    "loggiacondominiums": { page: "projects-residential.html", id: "loggia-condominiums", sqft: 1050000 },
    "thespirecondominiums": { page: "projects-residential.html", id: "the-spire-condominiums", sqft: 1147000 },
    "481university": { page: "projects-residential.html", id: "481-university-ave-condo", sqft: 2300000 },
    "galleriaphase2": { page: "projects-residential.html", id: "1245-dupont-st-galleria-phase-2-condos", sqft: 1250000 },
    "artistry": { page: "projects-residential.html", id: "298-dundas-st-w-artistry-condo", sqft: 700000 },
    "199churchstreet": { page: "projects-residential.html", id: "199-church-street-condo", sqft: 950000 },
    "squareonedistrictblock8": { page: "projects-residential.html", id: "square-one-block-8-condo", sqft: 2700000 },
    "maverickcondos": { page: "projects-residential.html", id: "321-king-street-maverick-condo", sqft: 900000 },
    "nobucondos": { page: "projects-residential.html", id: "15-35-mercer-condo", sqft: 2000000 },
    "89avenueroad": { page: "projects-residential.html", id: "89-avenue-road-condo", sqft: 400000 },
    "55charlesstreet": { page: "projects-residential.html", id: "55-charles-street-condo", sqft: 1500000 },
    "55mercer": { page: "projects-residential.html", id: "55-mercer-condo", sqft: 1100000 },
    "thewellbuildingsabcdefavenueverdijointventure": { page: "projects-residential.html", id: "the-well", sqft: 8000000 },
    "emeraldcitycondominiums": { page: "projects-residential.html", id: "emerald-city-condos-block-a", sqft: 2500000 },
    "emeraldcityb": { page: "projects-residential.html", id: "emerald-city-condos-block-b", sqft: 800000 },
    "emeraldcityc3": { page: "projects-residential.html", id: "emerald-city-condos-block-c", sqft: 1200000 },
    "maxcondos": { page: "projects-residential.html", id: "the-max-condo", sqft: 700000 },
    "dundassquaregardens": { page: "projects-residential.html", id: "dundas-square-gardens-condo", sqft: 1900000 },
    "rivercityphase3": { page: "projects-residential.html", id: "river-city-condos-phase-3", sqft: 550000 },
    "rivercityphase4": { page: "projects-residential.html", id: "river-city-condos-phase-4", sqft: 400000 },
    "themuseecondo": { page: "projects-residential.html", id: "the-mus-e-condo", sqft: 700000 },
    "thecarlaw": { page: "projects-residential.html", id: "the-carlaw-plus-1220-dundas-street-east", sqft: 840000 },
    "1220dundas": { page: "projects-residential.html", id: "the-carlaw-plus-1220-dundas-street-east", sqft: 305000 },
    "66isabellastreet": { page: "projects-residential.html", id: "66-isabella-condos", sqft: 496000 },
    "210simcoe": { page: "projects-residential.html", id: "210-simcoe-street-condos", sqft: 760000 },
    "thunderbirdvalhalla2": { page: "projects-residential.html", id: "thunderbird-condominiums", sqft: 1100000 },
    "aristoatavonshirecondostownhomes": { page: "projects-residential.html", id: "aristo-at-avonshire-condominiums", sqft: 1000000 },
    "rivercitycondos": { page: "projects-residential.html", id: "river-city-condominiums", sqft: 750000 },
    "themilan": { page: "projects-residential.html", id: "the-milan-condominiums", sqft: 1200000 },
    "oceanclubresidences": { page: "projects-residential.html", id: "ocean-club-waterfront-condominiums", sqft: 1450000 },
    "royalcanadianmilitaryinstitutercmi": { page: "projects-residential.html", id: "royal-canadian-military-institute", sqft: 1100000 },
    "themuseumhouse": { page: "projects-residential.html", id: "the-museum-house-condominiums", sqft: 335000 },
    "1717avenueroadcondos": { page: "projects-residential.html", id: "1717-avenue-road-condominiums", sqft: 620000 },
    "theritzcarlton": { page: "projects-residential.html", id: "ritz-carlton", sqft: 2500000 },
    "onestthomascondominiums": { page: "projects-residential.html", id: "one-st-thomas-residences", sqft: 955000 },
    "sunriseseniorlivingonsteeles": { page: "projects-residential.html", id: "sunrise-senior-living", sqft: 679000 },
    "horizonlegacycondominiums": { page: "projects-residential.html", id: "horizon-legacy-apartment-building", sqft: 375000 }
  };
  var galleryAreas = Object.create(null);
  Object.keys(retrospectiveProjects).forEach(function (name) {
    var project = retrospectiveProjects[name];
    var key = project.page + "#" + project.id;
    if (!galleryAreas[key]) galleryAreas[key] = { sqft: 0, count: 0 };
    galleryAreas[key].sqft += project.sqft;
    galleryAreas[key].count++;
  });

  var currentPage = location.pathname.split("/").pop();
  document.querySelectorAll(".project[id]").forEach(function (card) {
    var area = galleryAreas[currentPage + "#" + card.id];
    var projectBody = card.querySelector(".project__body");
    if (!area || !projectBody) return;
    var areaLabel = document.createElement("p");
    areaLabel.className = "project__sqft";
    areaLabel.textContent = (area.count > 1 ? "Combined area: " : "") + area.sqft.toLocaleString("en-CA") + " sq ft";
    projectBody.appendChild(areaLabel);
  });

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && body.classList.contains("nav-open")) {
        body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* Dropdown: click to open (touch + keyboard), hover handled in CSS on desktop */
  document.querySelectorAll(".has-dropdown > .nav__link").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var li = btn.parentElement;
      var open = li.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("click", function (e) {
    document.querySelectorAll(".has-dropdown.is-open").forEach(function (li) {
      if (!li.contains(e.target)) {
        li.classList.remove("is-open");
        li.querySelector(".nav__link").setAttribute("aria-expanded", "false");
      }
    });
  });

  /* ---------- Back to top ---------- */
  var toTop = document.querySelector(".to-top");
  if (toTop) {
    var onScroll = function () { toTop.classList.toggle("is-visible", window.scrollY > 600); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    toTop.addEventListener("click", function () { window.scrollTo({ top: 0 }); });
  }

  /* ---------- Current year in footer ---------- */
  document.querySelectorAll("[data-current-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Project gallery filter ---------- */
  var gSearch = document.querySelector("[data-project-search]");
  if (gSearch) {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".project"));
    var gCount = document.querySelector("[data-project-count]");
    var gEmpty = document.querySelector("[data-project-empty]");
    var runFilter = function () {
      var q = gSearch.value.trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (c) {
        var hit = !q || c.getAttribute("data-search").indexOf(q) !== -1;
        c.hidden = !hit;
        if (hit) shown++;
      });
      if (gCount) gCount.textContent = shown + (shown === 1 ? " project" : " projects");
      if (gEmpty) gEmpty.classList.toggle("is-visible", shown === 0);
    };
    gSearch.addEventListener("input", runFilter);
    runFilter();
  }

  /* ---------- Lightbox ---------- */
  var lb = document.querySelector(".lightbox");
  if (lb) {
    var lbImg = lb.querySelector(".lightbox__stage img");
    var lbTitle = lb.querySelector(".lightbox__title");
    var lbMeta = lb.querySelector(".lightbox__meta");
    var lbCap = lb.querySelector(".lightbox__caption");
    var lbStrip = lb.querySelector(".lightbox__strip");
    var items = [], index = 0, lastFocus = null, title = "";

    var render = function () {
      var it = items[index];
      lbImg.src = it.full;
      lbImg.alt = title + (it.cap ? " — " + it.cap : "");
      lbCap.textContent = it.cap || "";
      lbMeta.textContent = (index + 1) + " / " + items.length;
      Array.prototype.forEach.call(lbStrip.children, function (b, i) {
        b.setAttribute("aria-current", i === index ? "true" : "false");
        if (i === index) b.scrollIntoView({ block: "nearest", inline: "center" });
      });
      // preload neighbours
      [index - 1, index + 1].forEach(function (i) {
        if (items[i]) { var p = new Image(); p.src = items[i].full; }
      });
    };
    var go = function (d) { index = (index + d + items.length) % items.length; render(); };
    var open = function (project, start) {
      title = project.getAttribute("data-name");
      items = Array.prototype.map.call(project.querySelectorAll(".project__photos a"), function (a) {
        return { full: a.getAttribute("href"), thumb: a.getAttribute("data-thumb"), cap: a.getAttribute("data-caption") };
      });
      if (!items.length) return;
      index = start || 0;
      lbTitle.textContent = title;
      lbStrip.innerHTML = "";
      items.forEach(function (it, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Photo " + (i + 1) + (it.cap ? ": " + it.cap : ""));
        var im = document.createElement("img");
        im.src = it.thumb; im.alt = ""; im.loading = "lazy";
        im.onerror = function () { im.onerror = null; im.src = it.full; };
        b.appendChild(im);
        b.addEventListener("click", function () { index = i; render(); });
        lbStrip.appendChild(b);
      });
      lastFocus = document.activeElement;
      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");
      body.style.overflow = "hidden";
      render();
      lb.querySelector(".lb-close").focus();
    };
    var close = function () {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      body.style.overflow = "";
      lbImg.removeAttribute("src");
      if (lastFocus) lastFocus.focus();
    };

    document.querySelectorAll(".project__cover").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        open(btn.closest(".project"), 0);
      });
    });
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", function () { go(-1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { go(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lightbox__stage")) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Tab") {
        var f = lb.querySelectorAll("button");
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var sx = null;
    lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      sx = null;
    });

    // Open a project directly from a link like projects-residential.html#the-well
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target && target.classList.contains("project")) {
        target.scrollIntoView();
      }
    }
  }

  /* ---------- Retrospective table ---------- */
  var retro = document.querySelector(".retro");
  if (retro) {
    var tbody = retro.tBodies[0];
    var rows = Array.prototype.slice.call(tbody.rows);
    var rSearch = document.querySelector("[data-retro-search]");
    var rCount = document.querySelector("[data-retro-count]");
    var rEmpty = document.querySelector("[data-retro-empty]");
    var chips = document.querySelectorAll("[data-decade]");
    var decade = "all";

    rows.forEach(function (row) {
      var project = retrospectiveProjects[normalizeProjectName(row.getAttribute("data-name"))];
      if (!project) return;
      var link = document.createElement("a");
      link.href = project.page + "#" + project.id;
      link.textContent = row.cells[0].textContent;
      row.cells[0].textContent = "";
      row.cells[0].appendChild(link);
    });

    var apply = function () {
      var q = rSearch ? rSearch.value.trim().toLowerCase() : "";
      var shown = 0;
      rows.forEach(function (r) {
        var y = r.getAttribute("data-year");
        var okD = decade === "all" || y.slice(0, 3) === decade.slice(0, 3);
        var okQ = !q || r.cells[0].textContent.toLowerCase().indexOf(q) !== -1 || y.indexOf(q) !== -1;
        r.hidden = !(okD && okQ);
        if (!r.hidden) shown++;
      });
      if (rCount) rCount.textContent = shown + (shown === 1 ? " project" : " projects");
      if (rEmpty) rEmpty.classList.toggle("is-visible", shown === 0);
    };
    if (rSearch) rSearch.addEventListener("input", apply);
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        decade = c.getAttribute("data-decade");
        chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c ? "true" : "false"); });
        apply();
      });
    });

    retro.querySelectorAll("th button").forEach(function (btn, col) {
      btn.addEventListener("click", function () {
        var th = btn.parentElement;
        var dir = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
        retro.querySelectorAll("th").forEach(function (h) { h.removeAttribute("aria-sort"); });
        th.setAttribute("aria-sort", dir);
        var key = ["name", "year", "sqft"][col];
        rows.sort(function (a, b) {
          var va = a.getAttribute("data-" + key), vb = b.getAttribute("data-" + key), res;
          if (key === "name") res = va.localeCompare(vb, undefined, { numeric: true, sensitivity: "base" });
          else res = (parseFloat(va) || 0) - (parseFloat(vb) || 0);
          return dir === "ascending" ? res : -res;
        });
        rows.forEach(function (r) { tbody.appendChild(r); });
      });
    });
    apply();
  }
})();
