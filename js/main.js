/* Avenue Building Corporation — site scripts (no dependencies) */
(function () {
  "use strict";

  var doc = document.documentElement;
  var body = document.body;

  /* Project data (gallery cards, retrospective rows, totals) is built by js/render.js */

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

  /* Reveal on scroll lives in the Motion section at the end of this file */

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

/* =====================================================================
   Motion: scroll reveals, counters, progress, parallax and small polish.
   Runs after the site scripts above. Respects "reduce motion".
   ===================================================================== */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var header = document.querySelector(".site-header");
  var toTop = document.querySelector(".to-top");
  var hero = document.querySelector(".hero, .page-hero");
  var timeline = document.querySelector(".timeline");
  var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };

  /* ---------- Small markup additions (purely decorative) ---------- */
  if (header) {
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    header.appendChild(bar);
  }
  if (toTop) {
    toTop.insertAdjacentHTML("beforeend", '<svg class="to-top__ring" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="26"/></svg>');
  }
  var homeHero = document.querySelector(".hero");
  if (homeHero && homeHero.nextElementSibling) {
    var next = homeHero.nextElementSibling;
    if (!next.id) next.id = "after-hero";
    var cue = document.createElement("a");
    cue.className = "scroll-cue";
    cue.href = "#" + next.id;
    cue.innerHTML = '<span class="scroll-cue__mouse" aria-hidden="true"></span><span>Scroll</span>';
    cue.setAttribute("aria-label", "Scroll to the next section");
    homeHero.appendChild(cue);
  }
  each(".sector__more", function (el) {
    el.innerHTML = el.innerHTML.replace(/\s*(&rarr;|→)\s*$/, ' <span class="sector__arrow" aria-hidden="true">&rarr;</span>');
  });

  /* ---------- Scroll-linked effects (one rAF-throttled handler) ---------- */
  var parallaxOn = !reduce && window.matchMedia("(min-width: 761px) and (pointer: fine)").matches;
  var ticking = false;
  var update = function () {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var max = Math.max(1, root.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, y / max));
    root.style.setProperty("--progress", p.toFixed(4));
    if (header) header.classList.toggle("is-scrolled", y > 10);
    if (hero && parallaxOn) {
      var h = hero.offsetHeight;
      if (y < h) hero.style.setProperty("--parallax", (y * 0.3).toFixed(1) + "px");
    }
    if (timeline) {
      var r = timeline.getBoundingClientRect();
      var t = (window.innerHeight * 0.75 - r.top) / r.height;
      timeline.style.setProperty("--tl", Math.min(1, Math.max(0, t)).toFixed(3));
    }
  };
  var onScroll = function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  if (reduce) return; /* everything below is decorative motion */

  /* ---------- Reveal on scroll ---------- */
  var mark = function (sel, variant) {
    each(sel, function (el) {
      if (el.closest(".hero, .page-hero, .lightbox, .nav")) return;
      el.classList.add("reveal");
      if (variant) el.classList.add("reveal--" + variant);
    });
  };
  mark(".section-head");
  mark(".split > div:first-child:not(.split__media)", "left");
  mark(".split__media", "mask");
  mark(".stats .stat", "zoom");
  mark(".sectors .sector");
  mark(".projects .project");
  mark(".features .feature");
  mark(".contact-cards .contact-card");
  mark(".timeline li");
  mark(".toolbar");
  mark(".table-wrap");
  mark(".quote", "left");
  mark(".cta", "zoom");
  mark(".map", "zoom");
  mark(".toc", "left");
  mark(".prose h2");
  mark(".note");
  mark(".footer__top > div");

  var finish = function (el) {
    /* Hand the element back to its normal styles so hover effects work */
    el.classList.remove("reveal", "is-in", "reveal--left", "reveal--right", "reveal--zoom", "reveal--mask");
    el.style.removeProperty("--d");
  };
  var pending = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var batch = 0, batchTimer = null;
  var show = function (el) {
    var i = pending.indexOf(el);
    if (i === -1) return;
    pending.splice(i, 1);
    var delay = Math.min(batch++, 6) * 90;
    clearTimeout(batchTimer);
    batchTimer = setTimeout(function () { batch = 0; }, 120);
    el.style.setProperty("--d", delay + "ms");
    el.classList.add("is-in");
    setTimeout(function () { finish(el); }, 1500 + delay);
  };
  /* Backup check on every scroll: anything already above the bottom of the
     screen is shown, so fast scrolling or jump links never leave gaps. */
  var sweep = function () {
    var limit = window.innerHeight * 0.95;
    pending.slice().forEach(function (el) {
      if (el.getBoundingClientRect().top < limit) show(el);
    });
  };
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); show(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
    pending.forEach(function (el) { io.observe(el); });
  }
  var sweepQueued = false;
  window.addEventListener("scroll", function () {
    if (sweepQueued || !pending.length) return;
    sweepQueued = true;
    setTimeout(function () { sweepQueued = false; sweep(); }, 150);
  }, { passive: true });
  window.addEventListener("load", sweep);
  sweep();

  /* ---------- Count-up numbers ---------- */
  var countUp = function (el) {
    var text = el.textContent.trim();
    var m = text.match(/^([^0-9]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/);
    if (!m) return;
    var prefix = m[1], numStr = m[2], suffix = m[3];
    if (/^[0-9]/.test(suffix.replace(/^[^0-9]*/, "")) && /[–-]/.test(suffix)) return; /* ranges like 1980–2024 */
    var target = parseFloat(numStr.replace(/,/g, ""));
    var decimals = (numStr.split(".")[1] || "").length;
    var isYear = !decimals && !suffix && target >= 1900 && target <= 2100;
    var from = isYear ? target - 60 : 0;
    var dur = 1600, start = null;
    el.setAttribute("aria-label", text);
    var step = function (ts) {
      if (start === null) start = ts;
      var k = Math.min(1, (ts - start) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      var v = from + (target - from) * e;
      el.textContent = prefix + (decimals ? v.toFixed(decimals) : Math.round(v).toString()) + suffix;
      if (k < 1) requestAnimationFrame(step); else el.textContent = text;
    };
    requestAnimationFrame(step);
  };
  var nums = document.querySelectorAll(".stat__num");
  if ("IntersectionObserver" in window && nums.length) {
    var no = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { no.unobserve(en.target); countUp(en.target); } });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(nums, function (n) { no.observe(n); });
  }

  /* ---------- Gallery filter: results fade in ---------- */
  var gSearch = document.querySelector("[data-project-search]");
  if (gSearch) {
    gSearch.addEventListener("input", function () {
      var i = 0;
      each(".project", function (c) {
        if (c.hidden || c.classList.contains("reveal")) return;
        c.classList.remove("is-pop");
        void c.offsetWidth;
        c.style.setProperty("--d", Math.min(i++, 8) * 40 + "ms");
        c.classList.add("is-pop");
      });
    });
  }

  /* ---------- Retrospective: rows fade in after filtering ---------- */
  var retroBody = document.querySelector(".retro tbody");
  if (retroBody) {
    var replay = function () { retroBody.classList.remove("is-pop"); void retroBody.offsetWidth; retroBody.classList.add("is-pop"); };
    var rs = document.querySelector("[data-retro-search]");
    if (rs) rs.addEventListener("input", replay);
    each("[data-decade], .retro th button", function (b) { b.addEventListener("click", replay); });
  }

  /* ---------- Photo viewer: each new photo eases in ---------- */
  var lbImg = document.querySelector(".lightbox__stage img");
  if (lbImg && "MutationObserver" in window) {
    new MutationObserver(function () {
      if (!lbImg.getAttribute("src")) return;
      lbImg.classList.remove("is-swapping");
      void lbImg.offsetWidth;
      lbImg.classList.add("is-swapping");
    }).observe(lbImg, { attributes: true, attributeFilter: ["src"] });
  }
})();

/* ---------- Accessibility policy: highlight the section you are reading ---------- */
(function () {
  "use strict";
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  if (!links.length) return;
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  var queued = false;
  var spy = function () {
    queued = false;
    var line = window.innerHeight * 0.3, current = -1;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= line) current = i; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = targets.length - 1;
    links.forEach(function (a, i) {
      a.classList.toggle("is-active", i === current);
      if (i === current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
  };
  window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(spy); } }, { passive: true });
  spy();
})();

/* ---------- Background timelapse video in the page banners ---------- */
(function () {
  "use strict";
  var video = document.querySelector(".hero__video");
  if (!video) return;
  var toggle = document.querySelector(".video-toggle");
  var label = toggle && toggle.querySelector(".video-toggle__label");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var conn = navigator.connection || {};
  /* Still frame only for people who asked for less motion or less data */
  if (reduce || conn.saveData) return;

  var KEY = "avenue-video-paused";
  var userPaused = false;
  try { userPaused = localStorage.getItem(KEY) === "1"; } catch (e) {}

  var small = window.matchMedia("(max-width: 900px)").matches;
  video.src = video.getAttribute(small ? "data-src-small" : "data-src-large");
  video.muted = true;
  video.setAttribute("muted", "");
  video.preload = "auto";

  var onScreen = true;
  var tryPlay = function () {
    if (userPaused || !onScreen || document.hidden) return;
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked: the still frame stays */ });
  };
  var setLabel = function () {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", userPaused ? "true" : "false");
    label.textContent = userPaused ? "Play background video" : "Pause background video";
    toggle.title = label.textContent;
  };

  video.addEventListener("playing", function () { video.classList.add("is-playing"); if (toggle) toggle.hidden = false; });
  video.addEventListener("loadeddata", function () { if (toggle) toggle.hidden = false; });

  /* Seamless loop: fade into the still frame (the video's first frame) just
     before the end, then fade back in once the video has restarted on it. */
  var seamCheck = function () {
    var d = video.duration;
    if (!d || isNaN(d)) return;
    if (d - video.currentTime < 0.9) video.classList.add("is-seam");
    else if (video.currentTime > 0.15 && video.currentTime < 1) video.classList.remove("is-seam");
  };
  if ("requestVideoFrameCallback" in video) {
    var onFrame = function () { seamCheck(); video.requestVideoFrameCallback(onFrame); };
    video.requestVideoFrameCallback(onFrame);
  } else {
    video.addEventListener("timeupdate", seamCheck);
  }

  /* Pause when the banner is scrolled away or the tab is hidden (saves battery) */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) tryPlay(); else video.pause();
    }).observe(video.parentElement);
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) video.pause(); else tryPlay(); });

  if (toggle) {
    toggle.addEventListener("click", function () {
      userPaused = !userPaused;
      try { localStorage.setItem(KEY, userPaused ? "1" : "0"); } catch (e) {}
      setLabel();
      if (userPaused) video.pause(); else tryPlay();
    });
    setLabel();
    if (userPaused) toggle.hidden = false;
  }
  tryPlay();
})();

/* ---------- Dark mode: follow the device, with a sun/moon override ---------- */
(function () {
  "use strict";
  var root = document.documentElement;
  var btn = document.querySelector(".theme-toggle");
  var KEY = "avenue-theme";
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var systemDark = function () { return !!(mq && mq.matches); };
  var stored = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var isDark = function () {
    var t = root.getAttribute("data-theme");
    return t ? t === "dark" : systemDark();
  };
  var fadeTimer = null;
  var render = function (fade) {
    if (fade) {
      root.classList.add("theme-fading");
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(function () { root.classList.remove("theme-fading"); }, 700);
    }
    var dark = isDark();
    root.classList.toggle("dark", dark);
    if (btn) {
      var label = dark ? "Switch to light mode" : "Switch to dark mode";
      btn.setAttribute("aria-label", label);
      btn.title = label;
      btn.setAttribute("aria-pressed", dark ? "true" : "false");
    }
  };
  if (btn) {
    btn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      /* Choosing the same mode as the device goes back to following the device */
      if ((next === "dark") === systemDark()) {
        root.removeAttribute("data-theme");
        try { localStorage.removeItem(KEY); } catch (e) {}
      } else {
        root.setAttribute("data-theme", next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
      }
      render(true);
    });
  }
  if (mq) {
    var onSystem = function () { if (!stored()) render(true); };
    if (mq.addEventListener) mq.addEventListener("change", onSystem); else if (mq.addListener) mq.addListener(onSystem);
  }
  render(false);
})();

/* ---------- Phones: measure the home numbers panel so the banner makes room for it ---------- */
(function () {
  "use strict";
  var stats = document.querySelector(".hero + .stats");
  if (!stats) return;
  var root = document.documentElement;
  var set = function () { root.style.setProperty("--stats-h", stats.offsetHeight + "px"); };
  set();
  if ("ResizeObserver" in window) new ResizeObserver(set).observe(stats);
  else window.addEventListener("resize", set);
})();
