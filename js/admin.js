/* Avenue Building Corporation — website admin
   Edits data/site-data.js (projects, photos, retrospective, milestones) and
   saves straight into the website folder using the browser's File System
   Access API (Chrome / Edge). Other browsers can still edit and download
   the updated files to copy in by hand. */
(function () {
  "use strict";

  var SRC = window.AVENUE_DATA;
  if (!SRC) { document.body.innerHTML = "<p style='padding:24px'>Could not load data/site-data.js.</p>"; return; }
  var D = JSON.parse(JSON.stringify(SRC));
  D.projects = D.projects || []; D.retrospective = D.retrospective || []; D.timeline = D.timeline || [];
  D.office = D.office || { address: "", lat: null, lon: null };

  var CATS = {
    commercial: { title: "Commercial", page: "projects-commercial.html" },
    institutional: { title: "Institutional", page: "projects-institutional.html" },
    residential: { title: "Residential", page: "projects-residential.html" }
  };
  var PROV = { Ontario: "ON", Quebec: "QC", "British Columbia": "BC", Alberta: "AB", Manitoba: "MB", Saskatchewan: "SK", "Nova Scotia": "NS", "New Brunswick": "NB", "Newfoundland and Labrador": "NL", "Prince Edward Island": "PE" };

  /* ---------- Small helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var num = function (n) { return Number(n).toLocaleString("en-CA"); };
  var slug = function (s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "project";
  };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var byId = function (id) { return D.projects.find(function (p) { return p.id === id; }); };
  var linkedRows = function (id) { return D.retrospective.filter(function (r) { return r.projectId === id; }); };
  var sortRetro = function () {
    D.retrospective = D.retrospective.map(function (r, i) { return { r: r, i: i }; })
      .sort(function (a, b) { return (Number(b.r.year) || 0) - (Number(a.r.year) || 0) || a.i - b.i; })
      .map(function (x) { return x.r; });
  };
  var dirty = false;
  var markDirty = function () { dirty = true; };
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  var toastTimer = null;
  var toast = function (msg, isError) {
    var t = $("#toast");
    t.textContent = msg; t.hidden = false; t.classList.toggle("is-error", !!isError);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, isError ? 9000 : 5000);
  };
  var confirmBox = function (title, text, okLabel, extraLabel) {
    var dlg = $("#dialog");
    $("#dialog-title").textContent = title;
    $("#dialog-text").textContent = text;
    $("#dialog-ok").textContent = okLabel || "Delete";
    var extra = $("#dialog-extra");
    extra.hidden = !extraLabel;
    if (extraLabel) { extra.querySelector("span").textContent = extraLabel; $("#dialog-extra-box").checked = true; }
    return new Promise(function (resolve) {
      dlg.addEventListener("close", function onClose() {
        dlg.removeEventListener("close", onClose);
        resolve({ ok: dlg.returnValue === "ok", extra: $("#dialog-extra-box").checked });
      });
      dlg.showModal();
    });
  };

  /* ---------- Password (PBKDF2, stored as a hash in the data file) ---------- */
  var hex = function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join(""); };
  var hashPassword = function (pw, salt, iterations) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]).then(function (key) {
      return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: iterations }, key, 256);
    }).then(hex);
  };
  var newSalt = function () { var a = new Uint8Array(16); crypto.getRandomValues(a); return hex(a.buffer); };
  var SESSION = "avenue-admin-session";

  var setupMode = !D.admin || !D.admin.hash;
  if (setupMode) {
    $("#login-intro").textContent = "Create an admin password (at least 8 characters). You'll use it each time you sign in.";
    $("#login-confirm-wrap").hidden = false;
    $("#login-submit").textContent = "Create password";
    $("#login-password").setAttribute("autocomplete", "new-password");
  }
  var showApp = function () {
    $("#login").hidden = true; $("#app").hidden = false;
    initApp();
  };

  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("#login-error"); err.hidden = true;
    var pw = $("#login-password").value;
    if (!window.crypto || !crypto.subtle) { err.textContent = "This browser can't check passwords here. Please use Chrome or Edge."; err.hidden = false; return; }
    if (pw.length < 8) { err.textContent = "Use at least 8 characters."; err.hidden = false; return; }
    if (setupMode) {
      if (pw !== $("#login-confirm").value) { err.textContent = "The two passwords don't match."; err.hidden = false; return; }
      var salt = newSalt(), it = 210000;
      hashPassword(pw, salt, it).then(function (h) {
        D.admin = { salt: salt, hash: h, iterations: it };
        markDirty();
        try { sessionStorage.setItem(SESSION, h); } catch (e2) {}
        showApp();
        toast("Password created. Connect the website folder and save once to keep it.");
      });
    } else {
      hashPassword(pw, D.admin.salt, D.admin.iterations || 210000).then(function (h) {
        if (h !== D.admin.hash) { err.textContent = "That password isn't right."; err.hidden = false; return; }
        try { sessionStorage.setItem(SESSION, h); } catch (e2) {}
        showApp();
      });
    }
  });

  /* ---------- Website folder (File System Access API) ---------- */
  var dirHandle = null;
  var fsSupported = "showDirectoryPicker" in window;
  var idb = function () {
    return new Promise(function (res, rej) {
      var r = indexedDB.open("avenue-admin", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("handles"); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  };
  var idbGet = function (k) { return idb().then(function (db) { return new Promise(function (res) { var q = db.transaction("handles").objectStore("handles").get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { res(null); }; }); }); };
  var idbSet = function (k, v) { return idb().then(function (db) { return new Promise(function (res) { var tx = db.transaction("handles", "readwrite"); tx.objectStore("handles").put(v, k); tx.oncomplete = res; tx.onerror = res; }); }); };

  var setStatus = function () {
    var s = $("#folder-status"), b = $("#connect-folder");
    if (!fsSupported) {
      s.textContent = "This browser can't save into folders. Use Chrome or Edge, or download files after saving.";
      s.classList.remove("is-ok"); b.hidden = true; return;
    }
    if (dirHandle && dirHandle.__ok) {
      s.textContent = "Saving to: " + dirHandle.name; s.classList.add("is-ok"); b.textContent = "Change folder";
    } else {
      s.textContent = dirHandle ? "Click “Reconnect folder” to allow saving" : "Not connected — connect the website folder to save changes";
      s.classList.remove("is-ok"); b.textContent = dirHandle ? "Reconnect folder" : "Connect website folder";
    }
  };
  var verifyFolder = function (h) {
    return h.getFileHandle("index.html").then(function () { return h.getDirectoryHandle("data", { create: true }); }).then(function () { return true; }, function () { return false; });
  };
  var connectFolder = function () {
    if (dirHandle && !dirHandle.__ok) {
      return dirHandle.requestPermission({ mode: "readwrite" }).then(function (p) {
        if (p === "granted") { dirHandle.__ok = true; setStatus(); toast("Folder reconnected."); }
      });
    }
    return window.showDirectoryPicker({ id: "avenue-website", mode: "readwrite" }).then(function (h) {
      return verifyFolder(h).then(function (ok) {
        if (!ok) { toast("That folder doesn't contain the website (index.html wasn't found). Pick the Avenue website folder.", true); return; }
        dirHandle = h; dirHandle.__ok = true; idbSet("site", h); setStatus();
        toast("Connected to " + h.name + ". Changes will save there.");
        if (JSON.stringify(D.admin) !== JSON.stringify(SRC.admin)) saveData("Admin password");
      });
    }).catch(function (e) { if (e && e.name !== "AbortError") toast("Couldn't open the folder: " + e.message, true); });
  };
  var restoreFolder = function () {
    if (!fsSupported) return Promise.resolve();
    return idbGet("site").then(function (h) {
      if (!h) return;
      dirHandle = h;
      return h.queryPermission({ mode: "readwrite" }).then(function (p) { dirHandle.__ok = p === "granted"; });
    }).catch(function () {});
  };

  var getDir = function (parts, create) {
    return parts.reduce(function (pr, part) {
      return pr.then(function (d) { return d.getDirectoryHandle(part, { create: !!create }); });
    }, Promise.resolve(dirHandle));
  };
  var writeFile = function (path, data) {
    var parts = path.split("/"), name = parts.pop();
    return getDir(parts, true).then(function (d) { return d.getFileHandle(name, { create: true }); })
      .then(function (fh) { return fh.createWritable(); })
      .then(function (w) { return w.write(data).then(function () { return w.close(); }); });
  };
  var fileExists = function (path) {
    var parts = path.split("/"), name = parts.pop();
    return getDir(parts, false).then(function (d) { return d.getFileHandle(name); }).then(function () { return true; }, function () { return false; });
  };
  var readText = function (path) {
    var parts = path.split("/"), name = parts.pop();
    return getDir(parts, false).then(function (d) { return d.getFileHandle(name); }).then(function (fh) { return fh.getFile(); }).then(function (f) { return f.text(); });
  };
  var canWrite = function () { return !!(dirHandle && dirHandle.__ok); };

  var downloadBlob = function (blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  };

  /* ---------- Saving the data file ---------- */
  var dataFileText = function () {
    D.savedAt = new Date().toISOString().slice(0, 19);
    return "/* Avenue Building Corporation website data.\n   Edited through admin.html. Pages read this file to build the project gallery,\n   retrospective, milestones and all project totals. */\nwindow.AVENUE_DATA = " + JSON.stringify(D, null, 1) + ";\n";
  };
  var pendingDownloads = [];
  var saveData = function (what) {
    sortRetro();
    var text = dataFileText();
    if (!canWrite()) {
      pendingDownloads.push({ blob: new Blob([text], { type: "text/javascript" }), name: "site-data.js" });
      pendingDownloads.forEach(function (d) { downloadBlob(d.blob, d.name); });
      var n = pendingDownloads.length;
      pendingDownloads = [];
      dirty = false;
      toast((what || "Changes") + " ready: " + n + " file" + (n === 1 ? "" : "s") + " downloaded. Put site-data.js in the website's data folder (and any photos in images/gallery/…). Connect the folder in Chrome or Edge to save automatically.");
      return Promise.resolve(false);
    }
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
    return readText("data/site-data.js").then(function (old) {
      return writeFile("data/backups/site-data-" + stamp + ".js", old);
    }, function () { /* no previous file */ }).then(function () {
      return writeFile("data/site-data.js", text);
    }).then(function () {
      dirty = false;
      toast((what || "Changes") + " saved to the website folder. Refresh the website to see the changes.");
      return true;
    }).catch(function (e) {
      toast("Saving failed: " + e.message + ". Try “Reconnect folder”.", true);
      throw e;
    });
  };

  /* ---------- Photos: resize in the browser and save as JPEG ---------- */
  var loadImage = function (file) {
    if (window.createImageBitmap) return createImageBitmap(file);
    return new Promise(function (res, rej) {
      var img = new Image(); img.onload = function () { res(img); }; img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  };
  var toJpeg = function (img, maxW, maxH, quality) {
    var w = img.width, h = img.height, k = Math.min(1, maxW / w, maxH / h);
    var c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return new Promise(function (res) { c.toBlob(res, "image/jpeg", quality); });
  };
  var storePhoto = function (file, category, baseName) {
    return loadImage(file).then(function (img) {
      return Promise.all([toJpeg(img, 1600, 1600, 0.85), toJpeg(img, 320, 320, 0.8)]);
    }).then(function (blobs) {
      var dir = "images/gallery/" + category + "/";
      var pick = function (n) {
        var name = baseName + "-" + String(n).padStart(2, "0");
        if (!canWrite()) return Promise.resolve(name);
        return fileExists(dir + name + ".jpg").then(function (ex) { return ex ? pick(n + 1) : name; });
      };
      var used = D.projects.reduce(function (s, p) { (p.photos || []).forEach(function (ph) { s[ph.src] = 1; }); return s; }, {});
      var startAt = 1;
      while (used[dir + baseName + "-" + String(startAt).padStart(2, "0") + ".jpg"]) startAt++;
      return pick(startAt).then(function (name) {
        var full = dir + name + ".jpg", thumb = dir + name + "-t.jpg";
        used[full] = 1;
        if (canWrite()) {
          return writeFile(full, blobs[0]).then(function () { return writeFile(thumb, blobs[1]); }).then(function () { return { src: full, thumb: thumb }; });
        }
        pendingDownloads.push({ blob: blobs[0], name: name + ".jpg" }, { blob: blobs[1], name: name + "-t.jpg" });
        return { src: full, thumb: thumb };
      });
    });
  };

  /* ================= App ================= */
  var started = false;
  function initApp() {
    if (started) return; started = true;
    restoreFolder().then(setStatus);
    $("#connect-folder").addEventListener("click", connectFolder);
    $("#logout").addEventListener("click", function () {
      try { sessionStorage.removeItem(SESSION); } catch (e) {}
      location.reload();
    });
    initTabs();
    renderList();
    initEditor();
    renderRetro();
    renderTimeline();
    initSettings();
  }

  /* ---------- Tabs ---------- */
  var tabs;
  function selectTab(id) {
    tabs.forEach(function (t) {
      var on = t.id === id;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
    window.scrollTo(0, 0);
  }
  function initTabs() {
    tabs = $$(".tabs [role=tab]");
    tabs.forEach(function (t, i) {
      t.tabIndex = t.getAttribute("aria-selected") === "true" ? 0 : -1;
      t.addEventListener("click", function () {
        if (t.id === "tab-edit" && t.textContent === "Add project") openEditor(null);
        selectTab(t.id);
        if (t.id === "tab-retro") renderRetro();
        if (t.id === "tab-timeline") renderTimeline();
        if (t.id === "tab-settings") renderSettings();
      });
      t.addEventListener("keydown", function (e) {
        var k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!k) return;
        var n = tabs[(i + k + tabs.length) % tabs.length]; n.focus(); n.click();
      });
    });
  }

  /* ---------- Projects list ---------- */
  var catFilter = "all";
  function renderTotals() {
    var photos = D.projects.reduce(function (s, p) { return s + (p.photos || []).length; }, 0);
    var sq = D.retrospective.reduce(function (s, r) { return s + (Number(r.sqft) || 0); }, 0);
    var check = D.projects.filter(function (p) { return p.addressStatus !== "confirmed"; }).length;
    var pins = D.projects.filter(function (p) { return typeof p.lat === "number"; }).length;
    $("#totals").innerHTML =
      "<span><strong>" + D.projects.length + "</strong> gallery projects</span>" +
      "<span><strong>" + num(photos) + "</strong> photos</span>" +
      "<span><strong>" + D.retrospective.length + "</strong> retrospective rows</span>" +
      "<span><strong>" + num(sq) + "</strong> sq ft</span>" +
      "<span><strong>" + pins + "</strong> map pins</span>" +
      (check ? "<span><strong>" + check + "</strong> addresses to check</span>" : "");
  }
  function renderList() {
    renderTotals();
    var q = ($("#project-search").value || "").trim().toLowerCase();
    var onlyCheck = $("#needs-check").checked;
    var list = D.projects.filter(function (p) {
      return (catFilter === "all" || p.category === catFilter) &&
        (!q || (p.name + " " + (p.city || "") + " " + (p.address || "")).toLowerCase().indexOf(q) !== -1) &&
        (!onlyCheck || p.addressStatus !== "confirmed");
    });
    $("#project-list").innerHTML = list.length ? list.map(function (p) {
      var ph = (p.photos || [])[0];
      var warn = p.addressStatus !== "confirmed";
      return '<li><button class="pcard" type="button" data-edit="' + esc(p.id) + '">' +
        (ph ? '<img src="' + esc(ph.thumb || ph.src) + '" alt="" loading="lazy">' : "<img alt=\"\">") +
        "<span><h3>" + esc(p.name) + "</h3><p>" + esc(CATS[p.category] ? CATS[p.category].title : p.category) + " · " + esc(p.city || "") + " · " + (p.photos || []).length + " photos</p>" +
        (warn ? '<span class="chip-s chip-s--warn">Address to check</span>' : (typeof p.lat === "number" ? '<span class="chip-s">Pinned</span>' : '<span class="chip-s">Address saved</span>')) +
        "</span></button></li>";
    }).join("") : '<li class="muted">No projects match.</li>';
  }
  $("#project-search").addEventListener("input", renderList);
  $("#needs-check").addEventListener("change", renderList);
  $$("[data-cat-filter]").forEach(function (b) {
    b.addEventListener("click", function () {
      catFilter = b.getAttribute("data-cat-filter");
      $$("[data-cat-filter]").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
      renderList();
    });
  });
  $("#project-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-edit]");
    if (b) { openEditor(b.getAttribute("data-edit")); selectTab("tab-edit"); }
  });
  $("#new-project").addEventListener("click", function () { openEditor(null); selectTab("tab-edit"); });

  /* ---------- Add / edit project ---------- */
  var editingId = null, formPhotos = [], lookupState = null, lastSearch = 0;
  var F = function (n) { return $("#project-form").elements[n]; };

  function pinPreview() {
    var lat = parseFloat(F("lat").value), lon = parseFloat(F("lon").value);
    var box = $("#pin-preview");
    if (isFinite(lat) && isFinite(lon) && window.AvenueOSM) {
      box.innerHTML = '<iframe title="Map pin preview" loading="lazy" src="' + esc(window.AvenueOSM.embedUrl(lat, lon)) + '"></iframe>';
    } else box.innerHTML = "<p>No map pin yet</p>";
  }
  function renderPhotos() {
    var ol = $("#photo-list");
    ol.innerHTML = formPhotos.map(function (ph, i) {
      var src = ph.preview || ph.thumb || ph.src;
      return '<li class="photo" data-i="' + i + '"><img src="' + esc(src) + '" alt="">' +
        '<label class="field"><span>' + (i === 0 ? '<span class="photo__tag">Cover · </span>' : "") + "Caption for photo " + (i + 1) + "</span>" +
        '<input type="text" data-caption value="' + esc(ph.caption || "") + '" maxlength="80" placeholder="e.g. South Elevation"></label>' +
        '<div class="photo__btns">' +
        '<button class="icon-btn" type="button" data-move="-1" aria-label="Move photo ' + (i + 1) + ' up"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button class="icon-btn" type="button" data-move="1" aria-label="Move photo ' + (i + 1) + ' down"' + (i === formPhotos.length - 1 ? " disabled" : "") + ">↓</button>" +
        '<button class="icon-btn icon-btn--danger" type="button" data-remove aria-label="Remove photo ' + (i + 1) + '">✕</button></div></li>';
    }).join("");
  }
  function showLinked() {
    var box = $("#linked-rows");
    var rows = editingId ? linkedRows(editingId) : [];
    if (rows.length > 1) {
      box.hidden = false;
      box.innerHTML = "<p><strong>This project has " + rows.length + " retrospective rows:</strong></p>" +
        rows.map(function (r) { return "<p>" + esc(r.name) + " — " + esc(r.year) + " — " + (r.sqft ? num(r.sqft) + " sq ft" : "no area") + "</p>"; }).join("") +
        "<p>Edit these in the Retrospective tab.</p>";
    } else if (rows.length === 1) {
      box.hidden = false;
      box.innerHTML = "<p>In the retrospective as “" + esc(rows[0].name) + "” — " + esc(rows[0].year) + (rows[0].sqft ? " — " + num(rows[0].sqft) + " sq ft" : "") + ".</p><p>Leave the completion date empty to keep that year.</p>";
    } else box.hidden = true;
    var multi = rows.length > 1;
    F("sqft").disabled = multi; F("inRetro").disabled = multi;
  }
  function openEditor(id) {
    var form = $("#project-form");
    form.reset();
    $("#form-error").hidden = true;
    $("#address-results").innerHTML = "";
    $$("[aria-invalid]", form).forEach(function (el) { el.removeAttribute("aria-invalid"); });
    editingId = id;
    var p = id ? byId(id) : null;
    $("#edit-title").textContent = p ? "Edit: " + p.name : "Add project";
    $("#tab-edit").textContent = p ? "Edit project" : "Add project";
    $("#delete-project").hidden = !p;
    formPhotos = p ? (p.photos || []).map(function (ph) { return { src: ph.src, thumb: ph.thumb, caption: ph.caption }; }) : [];
    if (p) {
      var rows = linkedRows(p.id);
      $$("input[name=category]", form).forEach(function (r) { r.checked = r.value === p.category; });
      F("name").value = p.name;
      F("city").value = p.city || "";
      F("address").value = p.address || "";
      F("lat").value = typeof p.lat === "number" ? p.lat : "";
      F("lon").value = typeof p.lon === "number" ? p.lon : "";
      F("date").value = p.date || (rows.length === 1 && rows[0].year ? "" : "");
      F("sqft").value = rows.length === 1 && rows[0].sqft ? rows[0].sqft : "";
      F("inRetro").checked = rows.length > 0;
      $("#address-query").value = p.address || (p.name + ", " + (p.city || ""));
      F("date").placeholder = "";
      if (!p.date && rows.length === 1) F("date").title = "Retrospective year: " + rows[0].year;
    } else {
      F("inRetro").checked = true;
      $("#address-query").value = "";
    }
    $("#city-suggestions").innerHTML = "";
    lookupState = null;
    showLinked();
    renderPhotos();
    pinPreview();
  }
  function initEditor() {
    var form = $("#project-form");
    form.addEventListener("input", markDirty);
    ["lat", "lon"].forEach(function (n) { F(n).addEventListener("change", pinPreview); });

    /* photos */
    var addFiles = function (files) {
      Array.prototype.forEach.call(files, function (f) {
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast(f.name + " isn't a JPG, PNG or WebP photo.", true); return; }
        formPhotos.push({ file: f, preview: URL.createObjectURL(f), caption: "" });
      });
      markDirty(); renderPhotos();
    };
    $("#photo-input").addEventListener("change", function (e) { addFiles(e.target.files); e.target.value = ""; });
    var drop = $("#drop");
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove("is-over"); }); });
    drop.addEventListener("drop", function (e) { e.preventDefault(); addFiles(e.dataTransfer.files); });
    $("#photo-list").addEventListener("input", function (e) {
      if (!e.target.matches("[data-caption]")) return;
      formPhotos[+e.target.closest(".photo").getAttribute("data-i")].caption = e.target.value;
    });
    $("#photo-list").addEventListener("click", function (e) {
      var li = e.target.closest(".photo"); if (!li) return;
      var i = +li.getAttribute("data-i");
      if (e.target.closest("[data-remove]")) { formPhotos.splice(i, 1); markDirty(); renderPhotos(); return; }
      var mv = e.target.closest("[data-move]");
      if (mv) {
        var j = i + Number(mv.getAttribute("data-move"));
        if (j < 0 || j >= formPhotos.length) return;
        var t = formPhotos[i]; formPhotos[i] = formPhotos[j]; formPhotos[j] = t;
        markDirty(); renderPhotos();
        var btn = $('.photo[data-i="' + j + '"] [data-move="' + mv.getAttribute("data-move") + '"]');
        if (btn && !btn.disabled) btn.focus();
      }
    });

    /* address lookup (one search per click, at most one per second) */
    var doSearch = function () {
      var q = $("#address-query").value.trim();
      var out = $("#address-results");
      if (q.length < 4) { out.innerHTML = '<li class="muted">Type a fuller address first.</li>'; return; }
      var wait = Math.max(0, 1100 - (Date.now() - lastSearch));
      out.innerHTML = '<li class="muted">Searching OpenStreetMap…</li>';
      sleep(wait).then(function () {
        lastSearch = Date.now();
        return window.AvenueOSM.search(q);
      }).then(function (list) {
        lookupState = list;
        out.innerHTML = list.length ? list.map(function (r, i) {
          return '<li><button type="button" data-pick="' + i + '">' + esc(r.display_name) + "</button></li>";
        }).join("") + '<li class="muted">Data © OpenStreetMap contributors</li>' :
          '<li class="muted">No matches. Try adding the city, or type the address and city below yourself.</li>';
      }).catch(function () {
        out.innerHTML = '<li class="muted">The address search couldn\'t be reached. Type the address and city below yourself; the pin can be placed later from “Map pins &amp; settings”.</li>';
      });
    };
    $("#address-search").addEventListener("click", doSearch);
    $("#address-query").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doSearch(); } });
    $("#address-results").addEventListener("click", function (e) {
      var b = e.target.closest("[data-pick]"); if (!b || !lookupState) return;
      var r = lookupState[+b.getAttribute("data-pick")], a = r.address || {};
      var street = [a.house_number, a.road].filter(Boolean).join(" ");
      var city = a.city || a.town || a.village || a.municipality || a.hamlet || "";
      var prov = PROV[a.state] || a.state || "";
      F("address").value = [street || r.name, city, [prov, a.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      var places = [city, a.suburb, a.city_district, a.borough, a.town, a.village].filter(function (v, i, arr) { return v && arr.indexOf(v) === i; });
      $("#city-suggestions").innerHTML = places.map(function (v) { return '<option value="' + esc(v) + '">'; }).join("");
      if (!F("city").value || F("city").value === city || places.indexOf(F("city").value) === -1) F("city").value = city || F("city").value;
      F("lat").value = parseFloat(r.lat).toFixed(6);
      F("lon").value = parseFloat(r.lon).toFixed(6);
      pinPreview(); markDirty();
      $("#address-results").innerHTML = '<li class="muted">Saved: ' + esc(r.display_name) + (places.length > 1 ? " — other area names you can show: " + esc(places.join(", ")) : "") + "</li>";
    });

    /* save */
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = $("#form-error"); err.hidden = true;
      var cat = (form.querySelector("input[name=category]:checked") || {}).value;
      var name = F("name").value.trim(), city = F("city").value.trim();
      var problems = [];
      $$("[aria-invalid]", form).forEach(function (el) { el.removeAttribute("aria-invalid"); });
      if (!cat) problems.push("choose a category");
      if (!name) { problems.push("enter the project name"); F("name").setAttribute("aria-invalid", "true"); }
      if (!city) { problems.push("enter the city to show"); F("city").setAttribute("aria-invalid", "true"); }
      if (!formPhotos.length) problems.push("add at least one photo");
      var date = F("date").value, year = date ? Number(date.slice(0, 4)) : null;
      var p0 = editingId ? byId(editingId) : null;
      var rows0 = p0 ? linkedRows(p0.id) : [];
      var wantRetro = F("inRetro").checked && !F("inRetro").disabled;
      if (wantRetro && !year && rows0.length !== 1) { problems.push("add the completion date (the retrospective needs the year)"); F("date").setAttribute("aria-invalid", "true"); }
      if (problems.length) { err.textContent = "Before saving, please " + problems.join(", ") + "."; err.hidden = false; err.scrollIntoView({ block: "center" }); return; }

      var saveBtns = $$("#project-form button[type=submit]");
      saveBtns.forEach(function (b) { b.disabled = true; b.textContent = "Saving…"; });
      var id = p0 ? p0.id : (function () { var base = slug(name), s = base, n = 2; while (byId(s)) s = base + "-" + n++; return s; })();
      var photoCat = p0 ? p0.category : cat;
      var tasks = formPhotos.reduce(function (pr, ph) {
        return pr.then(function (acc) {
          if (!ph.file) { acc.push({ src: ph.src, thumb: ph.thumb || "", caption: (ph.caption || "").trim() }); return acc; }
          return storePhoto(ph.file, photoCat, id).then(function (stored) {
            acc.push({ src: stored.src, thumb: stored.thumb, caption: (ph.caption || "").trim() }); return acc;
          });
        });
      }, Promise.resolve([]));
      tasks.then(function (photos) {
        var lat = parseFloat(F("lat").value), lon = parseFloat(F("lon").value);
        var address = F("address").value.trim();
        var p = p0 || { id: id };
        var addressChanged = !p0 || p0.address !== address;
        p.name = name; p.category = cat; p.city = city; p.address = address;
        p.lat = isFinite(lat) ? lat : null; p.lon = isFinite(lon) ? lon : null;
        if (date) p.date = date; else delete p.date;
        if (addressChanged) { p.addressStatus = address ? "confirmed" : "check"; p.addressNote = address ? "Entered in admin" : ""; p.addressSource = ""; }
        p.photos = photos;
        if (!p0) D.projects.push(p);
        /* retrospective */
        var sq = F("sqft").value ? Math.round(Number(F("sqft").value)) : null;
        if (!F("inRetro").disabled) {
          if (wantRetro) {
            if (rows0.length === 1) {
              if (year) rows0[0].year = year;
              rows0[0].sqft = sq;
            } else if (!rows0.length) {
              D.retrospective.push({ id: "r" + Date.now().toString(36), name: name, year: year, sqft: sq, projectId: id });
            }
          } else if (rows0.length === 1) {
            D.retrospective.splice(D.retrospective.indexOf(rows0[0]), 1);
          }
        }
        return saveData(p0 ? "Project" : "New project").then(function () {
          editingId = id;
          formPhotos = photos.map(function (x) { return { src: x.src, thumb: x.thumb, caption: x.caption }; });
          renderList(); renderRetro();
          openEditor(id);
        });
      }).catch(function (e2) {
        err.textContent = "Couldn't save: " + (e2 && e2.message ? e2.message : e2); err.hidden = false;
      }).then(function () {
        saveBtns.forEach(function (b) { b.disabled = false; b.textContent = "Save project"; });
      });
    });

    /* delete */
    $("#delete-project").addEventListener("click", function () {
      var p = byId(editingId); if (!p) return;
      var rows = linkedRows(p.id);
      confirmBox("Delete " + p.name + "?", "This removes the project and its photos from the gallery. The photo files stay in the images folder.", "Delete project",
        rows.length ? "Also remove its " + rows.length + " retrospective row" + (rows.length > 1 ? "s" : "") : null).then(function (res) {
        if (!res.ok) return;
        D.projects.splice(D.projects.indexOf(p), 1);
        D.featured = (D.featured || []).filter(function (f) { return f !== p.id; });
        D.timeline.forEach(function (t) { if (t.link && t.link.split("#")[1] === p.id) t.link = ""; });
        if (res.extra) D.retrospective = D.retrospective.filter(function (r) { return r.projectId !== p.id; });
        else D.retrospective.forEach(function (r) { if (r.projectId === p.id) r.projectId = null; });
        saveData("Deletion").then(function () { renderList(); renderRetro(); selectTab("tab-projects"); });
      });
    });
  }

  /* ---------- Retrospective editor ---------- */
  function projectOptions(selected) {
    return '<option value="">No gallery link</option>' + Object.keys(CATS).map(function (c) {
      return '<optgroup label="' + CATS[c].title + '">' + D.projects.filter(function (p) { return p.category === c; }).map(function (p) {
        return '<option value="' + esc(p.id) + '"' + (p.id === selected ? " selected" : "") + ">" + esc(p.name) + "</option>";
      }).join("") + "</optgroup>";
    }).join("");
  }
  function renderRetro() {
    var q = ($("#retro-search").value || "").trim().toLowerCase();
    var rows = D.retrospective.filter(function (r) { return !q || (r.name + " " + r.year).toLowerCase().indexOf(q) !== -1; });
    $("#retro-count").textContent = rows.length + " of " + D.retrospective.length + " rows";
    $("#retro-table tbody").innerHTML = rows.map(function (r) {
      return '<tr data-id="' + esc(r.id) + '"' + (r.__new ? ' class="is-new"' : "") + ">" +
        '<td><input type="text" data-f="name" value="' + esc(r.name) + '" aria-label="Project name"></td>' +
        '<td><input type="number" data-f="year" value="' + esc(r.year) + '" min="1900" max="2100" aria-label="Year"></td>' +
        '<td><input type="number" data-f="sqft" value="' + (r.sqft || "") + '" min="0" placeholder="—" aria-label="Square feet"></td>' +
        '<td><select data-f="projectId" aria-label="Gallery link">' + projectOptions(r.projectId) + "</select></td>" +
        '<td><button class="icon-btn icon-btn--danger" type="button" data-del aria-label="Remove ' + esc(r.name) + '">✕</button></td></tr>';
    }).join("");
  }
  $("#retro-search").addEventListener("input", renderRetro);
  $("#retro-table").addEventListener("input", function (e) {
    var tr = e.target.closest("tr"), f = e.target.getAttribute("data-f"); if (!tr || !f) return;
    var r = D.retrospective.find(function (x) { return x.id === tr.getAttribute("data-id"); }); if (!r) return;
    var v = e.target.value;
    r[f] = f === "year" ? (v ? Number(v) : null) : f === "sqft" ? (v ? Math.round(Number(v)) : null) : f === "projectId" ? (v || null) : v;
    markDirty();
  });
  $("#retro-table").addEventListener("click", function (e) {
    var b = e.target.closest("[data-del]"); if (!b) return;
    var tr = b.closest("tr"), r = D.retrospective.find(function (x) { return x.id === tr.getAttribute("data-id"); });
    confirmBox("Remove “" + r.name + "”?", "It will no longer appear in the retrospective or count toward the totals.", "Remove row").then(function (res) {
      if (!res.ok) return;
      D.retrospective.splice(D.retrospective.indexOf(r), 1); markDirty(); renderRetro();
    });
  });
  $("#retro-add").addEventListener("click", function () {
    D.retrospective.unshift({ id: "r" + Date.now().toString(36), name: "", year: new Date().getFullYear(), sqft: null, projectId: null, __new: true });
    $("#retro-search").value = ""; renderRetro(); markDirty();
    var first = $("#retro-table tbody input"); if (first) first.focus();
  });
  $("#retro-save").addEventListener("click", function () {
    /* The year may be left blank when it isn't known; the website shows "—" */
    var bad = D.retrospective.filter(function (r) { return !String(r.name || "").trim(); });
    if (bad.length) { toast("Every row needs a project name (" + bad.length + " incomplete).", true); return; }
    D.retrospective.forEach(function (r) { r.name = String(r.name).trim(); delete r.__new; });
    saveData("Retrospective").then(renderRetro);
  });

  /* ---------- Milestones editor ---------- */
  function linkOptions(sel) {
    var opts = '<option value="">No link</option>';
    var known = false;
    opts += Object.keys(CATS).map(function (c) {
      return '<optgroup label="' + CATS[c].title + ' gallery">' + D.projects.filter(function (p) { return p.category === c; }).map(function (p) {
        var v = CATS[c].page + "#" + p.id; if (v === sel) known = true;
        return '<option value="' + esc(v) + '"' + (v === sel ? " selected" : "") + ">" + esc(p.name) + "</option>";
      }).join("") + "</optgroup>";
    }).join("");
    if (sel && !known) opts += '<option value="' + esc(sel) + '" selected>' + esc(sel) + "</option>";
    return opts;
  }
  function renderTimeline() {
    $("#tl-list").innerHTML = D.timeline.map(function (t, i) {
      return '<li class="tl-item" data-i="' + i + '">' +
        '<label class="field"><span>Year</span><input type="text" data-f="year" value="' + esc(t.year) + '" maxlength="9"></label>' +
        '<label class="field"><span>Title</span><input type="text" data-f="title" value="' + esc(t.title) + '" maxlength="100"></label>' +
        '<label class="field"><span>Links to</span><select data-f="link">' + linkOptions(t.link) + "</select></label>" +
        '<div class="photo__btns"><button class="icon-btn" type="button" data-move="-1" aria-label="Move up"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button class="icon-btn" type="button" data-move="1" aria-label="Move down"' + (i === D.timeline.length - 1 ? " disabled" : "") + ">↓</button>" +
        '<button class="icon-btn icon-btn--danger" type="button" data-del aria-label="Remove milestone">✕</button></div>' +
        '<label class="field tl-text"><span>Description</span><textarea data-f="text" rows="2" maxlength="300">' + esc(t.text) + "</textarea></label></li>";
    }).join("");
  }
  var tlInput = function (e) {
    var li = e.target.closest(".tl-item"), f = e.target.getAttribute("data-f"); if (!li || !f) return;
    D.timeline[+li.getAttribute("data-i")][f] = e.target.value; markDirty();
  };
  $("#tl-list").addEventListener("input", tlInput);
  $("#tl-list").addEventListener("change", tlInput);
  $("#tl-list").addEventListener("click", function (e) {
    var li = e.target.closest(".tl-item"); if (!li) return;
    var i = +li.getAttribute("data-i");
    if (e.target.closest("[data-del]")) {
      confirmBox("Remove this milestone?", D.timeline[i].year + " — " + D.timeline[i].title, "Remove").then(function (r) {
        if (r.ok) { D.timeline.splice(i, 1); markDirty(); renderTimeline(); }
      });
      return;
    }
    var mv = e.target.closest("[data-move]");
    if (mv) {
      var j = i + Number(mv.getAttribute("data-move"));
      var t = D.timeline[i]; D.timeline[i] = D.timeline[j]; D.timeline[j] = t; markDirty(); renderTimeline();
    }
  });
  $("#tl-add").addEventListener("click", function () {
    D.timeline.push({ year: String(new Date().getFullYear()), title: "", link: "", text: "" }); markDirty(); renderTimeline();
    var items = $$(".tl-item"); var last = items[items.length - 1]; if (last) last.querySelector("[data-f=title]").focus();
  });
  $("#tl-save").addEventListener("click", function () {
    var bad = D.timeline.filter(function (t) { return !String(t.year).trim() || !String(t.title).trim(); });
    if (bad.length) { toast("Every milestone needs a year and a title.", true); return; }
    saveData("Milestones");
  });

  /* ---------- Settings ---------- */
  function renderSettings() {
    var missing = D.projects.filter(function (p) { return p.address && typeof p.lat !== "number"; }).length;
    var officeMissing = D.office.address && typeof D.office.lat !== "number";
    $("#pin-summary").textContent = (missing + (officeMissing ? 1 : 0)) + " address" + (missing + (officeMissing ? 1 : 0) === 1 ? "" : "es") + " still need a pin. Projects without a saved address are skipped.";
    $("#office-address").value = D.office.address || "";
    $("#office-pin").textContent = typeof D.office.lat === "number" ? "Pin saved: " + D.office.lat.toFixed(5) + ", " + D.office.lon.toFixed(5) : "No pin saved yet (the Contact page looks it up automatically until one is saved).";
  }
  function initSettings() {
    renderSettings();
    var running = false;
    $("#pin-run").addEventListener("click", function () {
      if (running) return; running = true;
      var log = $("#pin-log"); log.innerHTML = "";
      var targets = D.projects.filter(function (p) { return p.address && typeof p.lat !== "number"; })
        .map(function (p) { return { label: p.name, q: p.address, set: function (lat, lon) { p.lat = lat; p.lon = lon; } }; });
      if (D.office.address && typeof D.office.lat !== "number") targets.unshift({ label: "Office", q: D.office.address, set: function (lat, lon) { D.office.lat = lat; D.office.lon = lon; } });
      if (!targets.length) { log.innerHTML = "<li>Every saved address already has a pin.</li>"; running = false; return; }
      $("#pin-run").disabled = true;
      var placed = 0, failed = 0;
      targets.reduce(function (pr, t, i) {
        return pr.then(function () { return i ? sleep(1100) : null; }).then(function () {
          return window.AvenueOSM.search(t.q).then(function (list) {
            var li = document.createElement("li");
            if (list && list.length) {
              t.set(parseFloat(parseFloat(list[0].lat).toFixed(6)), parseFloat(parseFloat(list[0].lon).toFixed(6)));
              placed++;
              li.className = "ok"; li.textContent = "✓ " + t.label + " → " + list[0].display_name;
            } else { failed++; li.className = "bad"; li.textContent = "✕ " + t.label + ": no match for “" + t.q + "”"; }
            log.appendChild(li); li.scrollIntoView({ block: "nearest" });
          }, function () {
            failed++;
            var li = document.createElement("li"); li.className = "bad"; li.textContent = "✕ " + t.label + ": search couldn't be reached";
            log.appendChild(li);
          });
        });
      }, Promise.resolve()).then(function () {
        var done = document.createElement("li");
        done.textContent = placed + " pin" + (placed === 1 ? "" : "s") + " placed" + (failed ? ", " + failed + " not found" : "") + ". Check the matches above.";
        log.appendChild(done);
        running = false; $("#pin-run").disabled = false;
        if (placed) { markDirty(); return saveData("Map pins").then(function () { renderSettings(); renderList(); }); }
        renderSettings();
      });
    });
    $("#office-save").addEventListener("click", function () {
      var v = $("#office-address").value.trim();
      if (!v) { toast("Enter the office address.", true); return; }
      if (v !== D.office.address) { D.office = { address: v, lat: null, lon: null }; }
      saveData("Office address").then(renderSettings);
    });
    $("#password-save").addEventListener("click", function () {
      var a = $("#new-password").value, b = $("#new-password2").value;
      if (a.length < 8) { toast("Use at least 8 characters.", true); return; }
      if (a !== b) { toast("The two passwords don't match.", true); return; }
      var salt = newSalt(), it = 210000;
      hashPassword(a, salt, it).then(function (h) {
        D.admin = { salt: salt, hash: h, iterations: it };
        try { sessionStorage.setItem(SESSION, h); } catch (e) {}
        $("#new-password").value = ""; $("#new-password2").value = "";
        return saveData("New password");
      });
    });
    $("#download-data").addEventListener("click", function () {
      downloadBlob(new Blob([dataFileText()], { type: "text/javascript" }), "site-data.js");
    });
  }

  /* Already signed in during this browser session? */
  try { if (D.admin && sessionStorage.getItem(SESSION) === D.admin.hash) showApp(); } catch (e) {}
})();
