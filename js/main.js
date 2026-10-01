(function () {
  "use strict";

  document.documentElement.classList.add("js");

  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  /* ---------- Nav: hidden over the opening section, appears after it ---------- */
  const heroSection = document.querySelector(".hero");
  const onScroll = () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
    const heroEnd = heroSection ? heroSection.offsetHeight - 120 : 0;
    const hide = window.scrollY < heroEnd && !links.classList.contains("open");
    nav.classList.toggle("nav-hidden", hide);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ---------- Mobile menu ---------- */
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    links.classList.toggle("open", open);
    nav.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Hero: scroll drift ----------
     As the page scrolls, the photo sinks and fades and the proverb lifts away. */
  const hero = document.querySelector(".hero");
  if (hero && !reduceMotion) {
    const onHeroScroll = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));
      hero.style.setProperty("--p", p.toFixed(3));
    };
    window.addEventListener("scroll", onHeroScroll, { passive: true });
    onHeroScroll();
  }

  /* ---------- Hero: begin once the photograph has loaded ---------- */
  const heroImg = document.getElementById("heroImg");
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    document.documentElement.classList.add("loaded");
  };
  if (heroImg && !heroImg.complete) {
    heroImg.addEventListener("load", start, { once: true });
    heroImg.addEventListener("error", start, { once: true });
    setTimeout(start, 2500);
  } else {
    requestAnimationFrame(start);
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // stagger siblings that enter together
        const siblings = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
        el.style.transitionDelay = Math.min(siblings.indexOf(el), 6) * 90 + "ms";
        el.classList.add("in");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Active nav link ---------- */
  const navAnchors = Array.from(links.querySelectorAll('a[href^="#"]'));
  const targets = navAnchors
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navAnchors.forEach((a) =>
          a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    targets.forEach((t) => spy.observe(t));
  }

  /* ---------- Gallery lightbox (also opens the certificates) ---------- */
  const gallery = Array.from(document.querySelectorAll("#galleryGrid figure"));
  const certDocs = Array.from(document.querySelectorAll("#certGrid .cert-doc"));
  let items = gallery;
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbCap = document.getElementById("lbCap");
  let current = 0;
  let lastFocus = null;

  const show = (i) => {
    current = (i + items.length) % items.length;
    const img = items[current].querySelector("img");
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = items[current].querySelector("figcaption").textContent;
  };
  const open = (set, i) => {
    items = set;
    lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("lbClose").focus();
  };
  const close = () => {
    lb.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };

  [gallery, certDocs].forEach((set) =>
    set.forEach((fig, i) => fig.querySelector("button").addEventListener("click", () => open(set, i))));
  document.getElementById("lbClose").addEventListener("click", close);
  document.getElementById("lbPrev").addEventListener("click", () => show(current - 1));
  document.getElementById("lbNext").addEventListener("click", () => show(current + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) {
      if (e.key === "Escape" && links.classList.contains("open")) setMenu(false);
      return;
    }
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });

  /* ---------- Contact: the envelope ----------
     One progress value p (0 sealed → 1 open) sets every piece:
     seal cracks → flap swings open → letter rises out → letter settles
     in front. The scene keeps its final (open) size the whole time and
     only transforms move, so nothing on the page shifts while it plays.
     The sealed envelope waits near the top of that space and glides down
     to its resting place as the letter comes out.                      */
  const scene = document.getElementById("envScene");
  if (scene && !reduceMotion) {
    const letter = scene.querySelector(".env-letter");
    const env = scene.querySelector(".envelope");
    const flap = scene.querySelector(".env-flap");
    const seal = scene.querySelector(".env-seal");
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const seg = (p, a, b) => clamp01((p - a) / (b - a));
    const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const lerp = (a, b, t) => a + (b - a) * t;
    let letterH = 0, envH = 0, sceneH = 0, p = 0, played = false;

    const measure = () => {
      letterH = letter.offsetHeight;
      envH = env.offsetHeight;
      sceneH = scene.offsetHeight;                          // the final, open layout
    };
    const render = () => {
      const crack = seg(p, 0, .14), open = ease(seg(p, .08, .36)),
            toMid = ease(seg(p, .18, .42)), rise = ease(seg(p, .4, .72)),
            settle = ease(seg(p, .72, 1));
      seal.style.setProperty("--crack", crack.toFixed(3));
      flap.style.transform = `perspective(1600px) rotateX(${(open * 180).toFixed(1)}deg)`;
      flap.style.zIndex = open > .5 ? 1 : 4;               // past upright: tuck behind the letter

      // where the envelope's top edge sits inside the scene: near the top while
      // sealed, a middle height while the letter rises (so all of it is in view),
      // then its resting place at the bottom as the letter settles in front;
      // always low enough that the raised flap stays inside the scene
      const restTop = sceneH - envH;
      const midTop = Math.min(restTop, envH * .72 + 16);
      const flapUp = Math.max(0, -Math.cos(open * Math.PI)) * envH * .6;
      let envTop = lerp(lerp(12, midTop, toMid), restTop, settle);
      envTop = Math.min(restTop, Math.max(envTop, flapUp + 8));
      env.style.setProperty("--lift", (envTop - restTop).toFixed(1) + "px");

      const rel = lerp(14, -envH * .72, rise);             // letter top relative to the envelope rim
      const ty = settle > 0 ? lerp(midTop - envH * .72, 0, settle) : envTop + rel;
      const shown = envTop + envH - 14 - ty;               // part of the letter above the envelope floor
      const clip = Math.max(0, letterH - shown) * (1 - settle);
      letter.style.transform = `translateY(${ty.toFixed(1)}px)`;
      letter.style.clipPath = `inset(0 0 ${clip.toFixed(1)}px 0)`;
      letter.style.zIndex = settle > 0 ? 5 : 2;            // inside the pocket until it comes forward
      env.style.setProperty("--drop", (settle * 18).toFixed(1) + "px");
    };
    const rest = () => {
      letter.style.transform = letter.style.clipPath = "";
      env.style.setProperty("--lift", "0px");
      // the letter is out: let the empty envelope fall away, then close up its space
      setTimeout(() => scene.classList.add("env-leaving"), 350);
      setTimeout(() => scene.classList.add("env-done"), 1000);
      setTimeout(() => {                                     // the whole card, down to the signature
        const r = letter.getBoundingClientRect(), top = navBottom() + 16;
        if (r.top < top || r.bottom > window.innerHeight - 16) frame(0, letterH);
      }, 1900);
    };

    const refresh = () => { measure(); if (!played || p < 1) render(); };
    refresh();
    window.addEventListener("resize", () => { if (p < 1) refresh(); });
    window.addEventListener("load", refresh);
    if (document.fonts) document.fonts.ready.then(refresh);   // the letter reflows once Merriweather arrives

    // ---- keep it framed: glide the page so the scene sits centred on screen ----
    // (below the fixed nav). If the visitor scrolls themselves, stop helping.
    let userTookOver = false;
    const takeOver = () => { userTookOver = true; };
    const navBottom = () => {
      const n = document.getElementById("nav");
      return n && !n.classList.contains("nav-hidden") ? n.getBoundingClientRect().bottom : 0;
    };
    // centre the band [from, from + h] of the scene in the visible area;
    // if it is taller than the screen, line its top up just under the nav
    const frame = (from, h) => {
      if (userTookOver) return;
      const top = navBottom() + 16, avail = window.innerHeight - top - 16;
      const bandTop = scene.getBoundingClientRect().top + window.scrollY + from;
      const y = h <= avail ? bandTop - top - (avail - h) / 2 : bandTop - top;
      if (Math.abs(y - window.scrollY) > 8) window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    };

    const play = () => {
      if (played) return;
      played = true;
      measure();
      const t0 = performance.now(), DUR = 3000;
      const tick = (now) => {
        p = clamp01((now - t0) / DUR);
        render();
        if (p < 1) requestAnimationFrame(tick); else rest();
      };
      requestAnimationFrame(tick);
    };
    // start as soon as the top of the scene is a third of the way up the screen,
    // so the letter is out by the time a visitor has scrolled to it
    new IntersectionObserver((entries, io) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      // wait until the visitor stops scrolling (their own scroll would cancel the glide),
      // then frame everything the animation uses: the space the letter rises into
      // and the envelope at its lowest point while the letter comes out
      let idle = 0;
      const begin = () => {
        window.removeEventListener("scroll", onScroll);
        ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, takeOver, { once: true, passive: true }));
        measure();
        const midTop = Math.min(sceneH - envH, envH * .72 + 16);
        frame(0, Math.max(letterH, midTop + envH));
        setTimeout(play, 520);                              // let the glide land first
      };
      const onScroll = () => { clearTimeout(idle); idle = setTimeout(begin, 220); };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }, { rootMargin: "0px 0px -33% 0px" }).observe(scene);
  } else if (scene) {
    scene.classList.add("env-done");                        // no animation: just the letter
  }

  /* ---------- Contact: copy the address ---------- */
  const copyBtn = document.getElementById("copyEmail");
  const copyNote = document.getElementById("copyNote");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const email = copyBtn.dataset.email;
      try {
        await navigator.clipboard.writeText(email);
        copyNote.textContent = "Address copied to your clipboard.";
      } catch {
        copyNote.textContent = email;             // clipboard blocked: show it to copy by hand
      }
      clearTimeout(copyBtn._t);
      copyBtn._t = setTimeout(() => { copyNote.textContent = ""; }, 3000);
    });
  }

  /* ---------- Theme picker ---------- */
  const themeBtn = document.getElementById("themeBtn");
  const themeMenu = document.getElementById("themeMenu");
  const themeOpts = Array.from(document.querySelectorAll(".theme-opt"));
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const root = document.documentElement;
  const markTheme = () => {
    const cur = root.dataset.theme || "ink-gold";
    themeOpts.forEach((o) => o.setAttribute("aria-checked", String(o.dataset.themeSet === cur)));
    if (metaTheme) metaTheme.content = getComputedStyle(root).getPropertyValue("--ink").trim();
  };
  const setTheme = (name) => {
    root.classList.add("theme-fade");
    if (name === "ink-gold") delete root.dataset.theme; else root.dataset.theme = name;
    try { localStorage.setItem("ap-theme", name); } catch (e) {}
    markTheme();
    clearTimeout(setTheme._t);
    setTheme._t = setTimeout(() => root.classList.remove("theme-fade"), 600);
  };
  const openThemes = (open) => {
    themeMenu.hidden = !open;
    themeBtn.setAttribute("aria-expanded", String(open));
    if (open) (themeOpts.find((o) => o.getAttribute("aria-checked") === "true") || themeOpts[0]).focus();
  };
  if (themeBtn) {
    markTheme();
    themeBtn.addEventListener("click", () => openThemes(themeMenu.hidden));
    themeOpts.forEach((o) => o.addEventListener("click", () => { setTheme(o.dataset.themeSet); openThemes(false); themeBtn.focus(); }));
    document.addEventListener("click", (e) => { if (!themeMenu.hidden && !e.target.closest("#themeDock")) openThemes(false); });
    themeMenu.addEventListener("keydown", (e) => {
      const i = themeOpts.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        themeOpts[(i + (e.key === "ArrowDown" ? 1 : -1) + themeOpts.length) % themeOpts.length].focus();
      }
      if (e.key === "Escape") { openThemes(false); themeBtn.focus(); }
    });
  }

  /* ---------- Footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
})();
