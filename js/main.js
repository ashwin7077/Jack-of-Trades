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
     in front. Plays once, when the envelope is well into view.        */
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
    let letterH = 0, envH = 0, baseTop = 0, p = 0;

    const measure = () => {
      letterH = letter.offsetHeight;
      envH = env.offsetHeight;
      scene.style.marginTop = "";
      baseTop = parseFloat(getComputedStyle(scene).marginTop) || 0;
    };
    const render = () => {
      const crack = seg(p, 0, .16), open = ease(seg(p, .1, .42)),
            rise = ease(seg(p, .4, .72)), settle = ease(seg(p, .72, 1)),
            grow = ease(seg(p, .38, 1));
      seal.style.setProperty("--crack", crack.toFixed(3));
      flap.style.transform = `perspective(1600px) rotateX(${(open * 180).toFixed(1)}deg)`;
      flap.style.zIndex = open > .5 ? 1 : 4;               // past upright: tuck behind the letter

      // the scene starts as just the envelope and grows to fit the letter,
      // so the envelope (pinned to its bottom) slides down as the letter comes out
      const sealedH = envH + 20, openH = letterH + envH / 2;
      const sceneH = lerp(sealedH, openH, grow);
      scene.style.height = sceneH.toFixed(1) + "px";
      const envTop = sceneH - envH;

      const rel = lerp(14, -envH * .72, rise);             // letter top relative to the envelope rim
      const ty = settle > 0 ? lerp(envTop - envH * .72, 0, settle) : envTop + rel;
      const shown = envTop + envH - 14 - ty;               // part of the letter above the envelope floor
      const clip = Math.max(0, letterH - shown) * (1 - settle);
      letter.style.transform = `translateY(${ty.toFixed(1)}px)`;
      letter.style.clipPath = `inset(0 0 ${clip.toFixed(1)}px 0)`;
      letter.style.zIndex = settle > 0 ? 5 : 2;            // inside the pocket until it comes forward
      env.style.setProperty("--drop", (settle * 18).toFixed(1) + "px");

      // keep the heading clear: add just enough room above for the raised flap and the rising letter
      const flapUp = Math.max(0, -Math.cos(open * Math.PI)) * envH * .6;
      const need = Math.max(0, flapUp - envTop + 16, -ty + 16 * (1 - settle));   // continuous, 0 at rest
      scene.style.marginTop = (baseTop + need).toFixed(1) + "px";
    };

    const refresh = () => { measure(); if (p < 1) render(); };
    refresh();
    window.addEventListener("resize", refresh);
    window.addEventListener("load", refresh);
    if (document.fonts) document.fonts.ready.then(refresh);   // the letter reflows once Merriweather arrives

    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      const t0 = performance.now(), DUR = 3400;
      const tick = (now) => {
        p = clamp01((now - t0) / DUR);
        render();
        if (p < 1) requestAnimationFrame(tick);
        else {                                           // rest in normal layout
          letter.style.transform = letter.style.clipPath = scene.style.height = scene.style.marginTop = "";
        }
      };
      requestAnimationFrame(tick);
    };
    new IntersectionObserver((entries, io) => {
      if (entries[0].isIntersecting) { io.disconnect(); setTimeout(play, 250); }
    }, { threshold: .75 }).observe(env);
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
