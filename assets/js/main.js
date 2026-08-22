/* ==========================================================================
   PACIFIC BLACK TRANSPORT — main.js
   Nav · IntersectionObserver reveals · shared form module · prefill · tabs
   No libraries required (flatpickr optional, loaded via CDN on /ride/).
   v2: mailto failure detection + "Open in Gmail" / "Copy message" fallback.
   v3: address autocomplete (Photon/OSM, free, no key) on pickup/destination
       fields + flatpickr date/time pickers (auto-skips if CDN not loaded;
       native pickers remain on mobile).
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     CONFIG — all form submissions open the visitor's email app via a
     pre-filled mailto: draft addressed to PBT. No backend, no keys.
     If no mail app opens (common on desktop), a fallback panel offers
     Gmail-in-browser compose and copy-to-clipboard.
  ------------------------------------------------------------------ */
  var PBT_EMAIL = "pacific.black.transport@gmail.com";

  /* ------------------------------------------------------------------
     1. Header: transparent → black after ~80px scroll
  ------------------------------------------------------------------ */
  var header = document.querySelector(".site-header");
  var motionOK = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

  /* Scroll progress line (injected so the 7 duplicated headers stay in sync) */
  var progress = null;
  if (header && motionOK) {
    progress = document.createElement("div");
    progress.className = "scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    header.appendChild(progress);
  }

  /* Parallax targets */
  var heroMedia = document.querySelector(".hero-media");
  var heroContent = document.querySelector(".hero .container");
  var heroEl = document.querySelector(".hero");

  var ticking = false;
  function paint() {
    ticking = false;
    var y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 80);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }
    if (motionOK) {
      var sp = document.querySelectorAll("[data-speed]");
      for (var i = 0; i < sp.length; i++) {
        sp[i].style.transform = "translate3d(0," + (y * parseFloat(sp[i].getAttribute("data-speed"))) + "px,0)";
      }
    }
    if (motionOK && heroEl && y < heroEl.offsetHeight) {
      /* Background drifts slower than scroll; content drifts up + fades */
      if (heroMedia) heroMedia.style.transform = "translate3d(0," + (y * 0.35) + "px,0)";
      if (heroContent) {
        heroContent.style.transform = "translate3d(0," + (y * -0.12) + "px,0)";
        heroContent.style.opacity = String(Math.max(0, 1 - y / (heroEl.offsetHeight * 0.9)));
      }
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(paint); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     2. Mobile menu (full-screen overlay)
  ------------------------------------------------------------------ */
  var toggle = document.querySelector(".menu-toggle");
  var mobileMenu = document.querySelector(".mobile-menu");
  if (toggle && mobileMenu) {
    toggle.addEventListener("click", function () {
      var open = mobileMenu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
      document.body.style.overflow = open ? "hidden" : "";
    });
    mobileMenu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        mobileMenu.classList.remove("open");
        document.body.style.overflow = "";
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileMenu.classList.contains("open")) {
        mobileMenu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
        document.body.style.overflow = "";
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------
     3. Reveal-on-scroll + signature accent-rule draw
  ------------------------------------------------------------------ */
  var observed = document.querySelectorAll(".reveal, .eyebrow");
  var headings = document.querySelectorAll("section h2");
  function makeObserver(options) {
    return new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        }
      });
    }, options);
  }
  if ("IntersectionObserver" in window) {
    var io = makeObserver({ threshold: 0.15 });
    observed.forEach(function (el) { io.observe(el); });
    /* Masked headings keep only a ~2% sliver visible pre-reveal, so they need a
       zero-threshold observer; -8% bottom rootMargin delays it slightly for rhythm. */
    var ioH2 = makeObserver({ threshold: 0, rootMargin: "0px 0px -8% 0px" });
    headings.forEach(function (el) { ioH2.observe(el); });
  } else {
    observed.forEach(function (el) { el.classList.add("in"); });
    headings.forEach(function (el) { el.classList.add("in"); });
  }

  /* ------------------------------------------------------------------
     4. Shared form module — one mailto-based submission system.
  ------------------------------------------------------------------ */
  function fieldWrap(input) { return input.closest(".field"); }

  var PHONE_RE = /^[+()\-.\s\d]*\d[+()\-.\s\d]*$/;

  function countDigits(v) { return (v.match(/\d/g) || []).length; }

  function validateInput(input) {
    var wrap = fieldWrap(input);
    if (!wrap) return true;
    var v = input.value.trim();
    var ok = input.checkValidity();
    /* extra checks the browser can't do from markup alone */
    if (ok && v) {
      if (input.type === "tel" && (!PHONE_RE.test(v) || countDigits(v) < 7)) ok = false;
      if (input.type === "number" && input.hasAttribute("max") &&
          Number(v) > Number(input.max)) ok = false;
    }
    wrap.classList.toggle("invalid", !ok);
    return ok;
  }

  /* name="vehicle_class" -> "Vehicle Class"; data-email-label wins if present */
  function labelFor(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    if (el && el.getAttribute("data-email-label")) return el.getAttribute("data-email-label");
    return name.replace(/[_-]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function resolveSubject(form) {
    var subject = form.getAttribute("data-email-subject") || "PBT Website Inquiry";
    var src = form.querySelector("select[data-subject-source]");
    if (src) {
      var opt = src.options[src.selectedIndex];
      if (opt && opt.getAttribute("data-subject")) subject = opt.getAttribute("data-subject");
    }
    return subject;
  }

  function buildEmailBody(form, subject) {
    var seen = [];   /* field names, in DOM order */
    var values = {}; /* name -> array of values */
    var kinds = {};  /* name -> "block" (textarea / checkbox group) or "line" */

    Array.prototype.forEach.call(form.elements, function (el) {
      var name = el.name;
      if (!name || name === "botcheck") return;
      if (el.tagName === "BUTTON" || el.type === "submit" || el.type === "hidden") return;
      if ((el.type === "radio" || el.type === "checkbox") && !el.checked) {
        if (seen.indexOf(name) === -1 && el.type === "checkbox") kinds[name] = "block";
        return;
      }
      var v = (el.value || "").trim();
      if (!v) return;
      if (seen.indexOf(name) === -1) seen.push(name);
      (values[name] = values[name] || []).push(v);
      if (el.tagName === "TEXTAREA" || el.type === "checkbox") kinds[name] = "block";
    });

    var lines = ["PACIFIC BLACK TRANSPORT", subject, ""];
    var lastWasBlock = false;
    seen.forEach(function (name) {
      if (!values[name]) return;
      var label = labelFor(form, name);
      var joined = values[name].join(", ");
      var block = kinds[name] === "block" || joined.length > 60;
      if (block) {
        if (lines[lines.length - 1] !== "") lines.push("");
        lines.push(label + ":");
        lines.push(joined);
        lines.push("");
        lastWasBlock = true;
      } else {
        if (lastWasBlock && lines[lines.length - 1] !== "") lines.push("");
        lines.push(label + ": " + joined);
        lastWasBlock = false;
      }
    });
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    lines.push("", "\u2014 Sent from the PBT website");
    return lines.join("\n");
  }

  function setStatus(form, msg) {
    var status = form.querySelector(".form-status");
    if (status) { status.textContent = msg; status.classList.add("visible"); }
  }

  /* ---- Gmail web-compose URL for the same draft ---------------------- */
  function buildGmailUrl(subject, body) {
    return "https://mail.google.com/mail/?view=cm&fs=1" +
      "&to=" + encodeURIComponent(PBT_EMAIL) +
      "&su=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  }

  /* ---- fallback panel, injected once per form ------------------------ */
  function getFallbackPanel(form) {
    var panel = form.querySelector(".email-fallback");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.className = "email-fallback";
    panel.hidden = true;

    var p = document.createElement("p");
    p.className = "email-fallback-lead";
    p.textContent = "No email app opened? Use one of these instead:";
    panel.appendChild(p);

    var actions = document.createElement("div");
    actions.className = "email-fallback-actions";

    var gmailLink = document.createElement("a");
    gmailLink.className = "btn btn-solid js-gmail";
    gmailLink.target = "_blank";
    gmailLink.rel = "noopener";
    gmailLink.textContent = "Open in Gmail";
    actions.appendChild(gmailLink);

    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn btn-outline js-copy";
    copyBtn.textContent = "Copy message";
    actions.appendChild(copyBtn);

    panel.appendChild(actions);

    var small = document.createElement("p");
    small.className = "email-fallback-small";
    small.textContent = "Or email us directly at " + PBT_EMAIL;
    panel.appendChild(small);

    var status = form.querySelector(".form-status");
    if (status && status.parentNode) {
      status.parentNode.insertBefore(panel, status.nextSibling);
    } else {
      form.appendChild(panel);
    }
    return panel;
  }

  function showEmailFallback(form, subject, body) {
    var panel = getFallbackPanel(form);
    panel.querySelector(".js-gmail").href = buildGmailUrl(subject, body);

    var copyBtn = panel.querySelector(".js-copy");
    copyBtn.onclick = function () {
      var text = "To: " + PBT_EMAIL + "\nSubject: " + subject + "\n\n" + body;
      function done() {
        copyBtn.textContent = "Copied";
        window.setTimeout(function () { copyBtn.textContent = "Copy message"; }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
      } else {
        fallbackCopy(text, done);
      }
    };

    panel.hidden = false;
    setStatus(form,
      "It looks like no email app is set up on this device. " +
      "Use \u201COpen in Gmail\u201D below, or copy the message and send it from any email account.");
    panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  /* Legacy copy path for older browsers / non-clipboard contexts */
  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (err) { /* no-op */ }
    document.body.removeChild(ta);
    done();
  }

  /* ---- open mailto and detect whether anything handled it ------------ */
  function openEmailDraft(form, subject, body) {
    var mailto = "mailto:" + PBT_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    var handled = false;
    function markHandled() {
      if (document.visibilityState === "hidden" || !document.hasFocus()) {
        handled = true;
        cleanup();
      }
    }
    function cleanup() {
      document.removeEventListener("visibilitychange", markHandled);
      window.removeEventListener("blur", markHandled);
    }
    document.addEventListener("visibilitychange", markHandled);
    window.addEventListener("blur", markHandled);

    var a = document.createElement("a");
    a.href = mailto;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    /* If the tab never lost focus/visibility, no mail app took the URL. */
    window.setTimeout(function () {
      cleanup();
      if (!handled) {
        showEmailFallback(form, subject, body);
      } else {
        setStatus(form,
          "Your email app is opening. Please review and send your request. " +
          "If nothing opened, email us directly at " + PBT_EMAIL + ".");
      }
    }, 1500);
  }

  document.querySelectorAll("form[data-pbt-form]").forEach(function (form) {
    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      input.addEventListener("blur", function () { validateInput(input); });
      input.addEventListener("input", function () {
        var w = fieldWrap(input);
        if (w && w.classList.contains("invalid")) validateInput(input);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      /* Honeypot: silently drop bot submissions */
      var hp = form.querySelector('input[name="botcheck"]');
      if (hp && (hp.checked || (hp.value && hp.type !== "checkbox"))) return;

      var firstInvalid = null;
      form.querySelectorAll("input, select, textarea").forEach(function (input) {
        if (!validateInput(input) && !firstInvalid) firstInvalid = input;
      });

      var btn = form.querySelector('button[type="submit"]');

      if (firstInvalid) {
        setStatus(form, "Please complete the highlighted fields.");
        firstInvalid.scrollIntoView({ block: "center", behavior: "smooth" });
        firstInvalid.focus({ preventScroll: true });
        return;
      }

      var subject = resolveSubject(form);
      var body = buildEmailBody(form, subject);

      if (btn) { btn.disabled = true; btn.textContent = "Preparing your email\u2026"; }
      setStatus(form, "Preparing your email\u2026");

      window.setTimeout(function () {
        openEmailDraft(form, subject, body);
        if (btn) {
          btn.textContent = "Open email again";
          btn.disabled = false;
        }
      }, 350);
    });
  });

  /* ------------------------------------------------------------------
     5. Date/time inputs
        · If flatpickr is loaded (CDN on /ride/), it upgrades the pickers:
          full dark calendar + scrollable time. flatpickr automatically
          keeps NATIVE pickers on phones (better UX there).
        · If flatpickr is NOT loaded, native inputs keep working and the
          date min=today rule still applies.
  ------------------------------------------------------------------ */
  var todayISO = (function () {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  })();

  document.querySelectorAll('input[type="date"][data-min-today]').forEach(function (input) {
    input.min = todayISO;
  });

  if (window.flatpickr) {
    document.querySelectorAll('form[data-pbt-form] input[type="date"]').forEach(function (el) {
      window.flatpickr(el, {
        minDate: el.hasAttribute("data-min-today") ? "today" : null,
        altInput: true,          /* shows "Aug 23, 2026", submits "2026-08-23" */
        altFormat: "M j, Y",
        dateFormat: "Y-m-d"
      });
    });
    document.querySelectorAll('form[data-pbt-form] input[type="time"]').forEach(function (el) {
      window.flatpickr(el, {
        enableTime: true,
        noCalendar: true,
        altInput: true,          /* shows "7:30 PM", submits "19:30" */
        altFormat: "h:i K",
        dateFormat: "H:i",
        minuteIncrement: 5
      });
    });
  }

  /* ------------------------------------------------------------------
     6. Address autocomplete — pickup / destination fields.
        Photon (photon.komoot.io): free OpenStreetMap geocoder, no API
        key required, autocomplete permitted. Results biased toward LA.
        Applies to any input whose name contains pickup / destination /
        dropoff inside a PBT form. If the service is unreachable, the
        field silently keeps working as a normal text input.
  ------------------------------------------------------------------ */
  (function initAddressAutocomplete() {
    var addrInputs = document.querySelectorAll(
      'form[data-pbt-form] input[name*="pickup"], ' +
      'form[data-pbt-form] input[name*="destination"], ' +
      'form[data-pbt-form] input[name*="dropoff"]'
    );
    if (!addrInputs.length || !window.fetch) return;

    var LA_LAT = 34.0522, LA_LON = -118.2437;

    function formatPlace(props) {
      var main = props.name ||
        [props.housenumber, props.street].filter(Boolean).join(" ") ||
        props.street || props.city || "";
      var subParts = [];
      if (props.name && (props.housenumber || props.street)) {
        subParts.push([props.housenumber, props.street].filter(Boolean).join(" "));
      }
      if (props.city && props.city !== main) subParts.push(props.city);
      if (props.state) subParts.push(props.state);
      return {
        main: main,
        sub: subParts.join(", "),
        full: [main, subParts.join(", ")].filter(Boolean).join(", ")
      };
    }

    addrInputs.forEach(function (input) {
      var wrap = fieldWrap(input);
      if (!wrap) return;

      input.setAttribute("autocomplete", "off");
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-expanded", "false");

      var list = document.createElement("div");
      list.className = "ac-list";
      list.setAttribute("role", "listbox");
      wrap.appendChild(list);

      var items = [];
      var activeIndex = -1;
      var debounceTimer = null;
      var controller = null;

      function close() {
        list.classList.remove("open");
        list.innerHTML = "";
        items = [];
        activeIndex = -1;
        input.setAttribute("aria-expanded", "false");
      }

      function select(i) {
        if (!items[i]) return;
        input.value = items[i].full;
        close();
        validateInput(input);
      }

      function highlight(i) {
        items.forEach(function (it, idx) {
          it.el.classList.toggle("active", idx === i);
        });
        activeIndex = i;
        if (items[i]) items[i].el.scrollIntoView({ block: "nearest" });
      }

      function render(features) {
        list.innerHTML = "";
        items = [];
        activeIndex = -1;
        var seen = {};
        features.forEach(function (f) {
          var place = formatPlace(f.properties || {});
          if (!place.full || seen[place.full]) return;
          seen[place.full] = true;

          var el = document.createElement("div");
          el.className = "ac-item";
          el.setAttribute("role", "option");

          var mainEl = document.createElement("span");
          mainEl.className = "ac-main";
          mainEl.textContent = place.main;
          el.appendChild(mainEl);

          if (place.sub) {
            var subEl = document.createElement("span");
            subEl.className = "ac-sub";
            subEl.textContent = place.sub;
            el.appendChild(subEl);
          }

          var item = { el: el, full: place.full };

          /* mousedown (not click) so it fires before the input's blur */
          el.addEventListener("mousedown", function (e) {
            e.preventDefault();
            select(items.indexOf(item));
          });

          items.push(item);
          list.appendChild(el);
        });

        if (items.length) {
          list.classList.add("open");
          input.setAttribute("aria-expanded", "true");
        } else {
          close();
        }
      }

      function search(q) {
        if (controller) controller.abort();
        controller = ("AbortController" in window) ? new AbortController() : null;
        var url = "https://photon.komoot.io/api/?q=" + encodeURIComponent(q) +
          "&limit=6&lang=en&lat=" + LA_LAT + "&lon=" + LA_LON;
        fetch(url, controller ? { signal: controller.signal } : undefined)
          .then(function (r) { return r.json(); })
          .then(function (data) { render((data && data.features) || []); })
          .catch(function () { /* aborted or offline — field still works manually */ });
      }

      input.addEventListener("input", function () {
        var q = input.value.trim();
        window.clearTimeout(debounceTimer);
        if (q.length < 3) { close(); return; }
        debounceTimer = window.setTimeout(function () { search(q); }, 250);
      });

      input.addEventListener("keydown", function (e) {
        if (!items.length) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          highlight(Math.min(activeIndex + 1, items.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          highlight(Math.max(activeIndex - 1, 0));
        } else if (e.key === "Enter") {
          if (activeIndex > -1) { e.preventDefault(); select(activeIndex); }
        } else if (e.key === "Escape") {
          close();
        }
      });

      input.addEventListener("blur", function () {
        /* slight delay so a mousedown selection can complete first */
        window.setTimeout(close, 150);
      });
    });
  })();

  /* ------------------------------------------------------------------
     7. Query-param prefill
        /ride/?class=…   → preselect vehicle-class radio card
        /contact/?subject=… → preselect subject option
  ------------------------------------------------------------------ */
  var params = new URLSearchParams(window.location.search);

  var cls = params.get("class");
  if (cls) {
    var radio = document.querySelector('input[name="vehicle_class"][value="' + CSS.escape(cls) + '"]');
    if (radio) radio.checked = true;
  }

  var subj = params.get("subject");
  if (subj) {
    var sel = document.querySelector('select[name="topic"]');
    if (sel) {
      Array.prototype.forEach.call(sel.options, function (opt) {
        if (opt.value === subj) sel.value = subj;
      });
    }
  }

  /* ------------------------------------------------------------------
     8. Drive pathways: accessible tab pattern, deep-linkable
        (#pbt-vehicle / #own-vehicle)
  ------------------------------------------------------------------ */
  var tabs = document.querySelectorAll(".tab-btn");
  var panels = document.querySelectorAll(".tab-panel");
  function activateTab(id, pushHash) {
    tabs.forEach(function (t) {
      t.setAttribute("aria-selected", String(t.getAttribute("aria-controls") === id));
    });
    panels.forEach(function (p) { p.classList.toggle("active", p.id === id); });
    if (pushHash && history.replaceState) history.replaceState(null, "", "#" + id);
  }
  if (tabs.length) {
    tabs.forEach(function (t) {
      t.addEventListener("click", function () {
        activateTab(t.getAttribute("aria-controls"), true);
      });
    });
    var hash = window.location.hash.replace("#", "");
    var target = hash && document.getElementById(hash);
    if (target && target.classList.contains("tab-panel")) {
      activateTab(hash, false);
      target.scrollIntoView();
    } else {
      activateTab("pbt-vehicle", false);
    }
  }

  /* ------------------------------------------------------------------
     9. Sticky mobile CTA on /ride/ and /drive/ — appears after 60% scroll
  ------------------------------------------------------------------ */
  var sticky = document.querySelector(".sticky-cta");
  if (sticky) {
    function onStickyScroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? window.scrollY / max : 0;
      sticky.classList.toggle("visible", progress > 0.6);
    }
    window.addEventListener("scroll", onStickyScroll, { passive: true });
    onStickyScroll();
  }

     /* ------------------------------------------------------------------
     Floating call button: appears after the hero, hides while the
     visitor is actively scrolling, returns ~700ms after they stop.
  ------------------------------------------------------------------ */
  var fab = document.querySelector(".call-fab");
  if (fab) {
    var fabTimer = null;
    function fabUpdate() {
      var pastHero = window.scrollY > window.innerHeight * 0.5;
      if (!pastHero) { fab.classList.remove("visible"); return; }
      fab.classList.remove("visible");          /* hide while scrolling */
      window.clearTimeout(fabTimer);
      fabTimer = window.setTimeout(function () {
        fab.classList.add("visible");           /* return once settled */
      }, 700);
    }
    window.addEventListener("scroll", fabUpdate, { passive: true });
    fabUpdate();
  }
})();
