// The AIM launch page: Play opens the film, the film ends, "Launch app" appears and opens the website.
// Plain JavaScript, no dependencies. Without it the page still shows its text and two links (see index.html).
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const root = $("root"), fg = $("fg"), stage = $("stage"), film = $("film");
  const playBtn = $("play"), launchBtn = $("launch"), againBtn = $("again"), closeBtn = $("close"), fullBtn = $("full");
  const glow = $("glow"), ripples = $("ripples"), status = $("status"), endLabel = $("end-label");
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const destination = launchBtn.href; // the one place the website address lives: the link in index.html

  let phase = "idle"; // idle -> playing -> ended -> leaving
  let failed = false;
  let touched = false; // don't move keyboard focus until the viewer has done something
  let warmedAt = 0;

  // Words rise in one after another.
  for (const el of document.querySelectorAll("[data-words]")) {
    const from = +el.dataset.from || 0;
    const step = +el.dataset.step || 150;
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((w, i) => {
      if (i) el.append(" ");
      const span = document.createElement("span");
      span.className = "word";
      span.style.animationDelay = `${from + i * step}ms`;
      span.textContent = w;
      el.append(span);
    });
    el.classList.add("ready");
  }

  function setPhase(next) {
    phase = next;
    root.dataset.phase = stage.dataset.phase = next;
    stage.inert = next === "idle";
    fg.inert = next !== "idle";
    endLabel.textContent = failed ? "The film could not be loaded" : "The AIM website is live";
    againBtn.textContent = failed ? "Try the film again" : "Watch again";
    status.textContent = next === "ended" ? `${failed ? "The film could not be loaded." : "The film has ended."} Launch app is available.` : "";
    if (!touched) return;
    if (next === "playing") film.focus();
    else if (next === "ended") launchBtn.focus();
    else if (next === "idle") playBtn.focus();
  }

  // The AIM website runs on a free server that sleeps when idle and can take most of a minute to wake.
  // Knocking on it now (and again when the film starts) means Launch app opens at once.
  function warmUp() {
    if (Date.now() - warmedAt < 60_000) return;
    warmedAt = Date.now();
    fetch(destination, { mode: "no-cors", cache: "no-store" }).catch(() => {});
  }
  setTimeout(warmUp, 1500);

  function play() {
    touched = true;
    failed = false;
    if (film.error) film.load(); // retry after a failed load
    film.currentTime = 0;
    setPhase("playing");
    film.play().catch(() => {
      // Blocked: the controls are on screen, the viewer can press play. Failed: don't leave them stuck.
      if (film.error) {
        failed = true;
        setPhase("ended");
      }
    });
    warmUp();
  }

  function close() {
    film.pause();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setPhase("idle");
  }

  playBtn.addEventListener("click", play);
  againBtn.addEventListener("click", play);
  closeBtn.addEventListener("click", close);

  film.addEventListener("ended", () => {
    // The browser's own full screen belongs to the <video> and would hide the Launch button.
    if (document.fullscreenElement === film) document.exitFullscreen().catch(() => {});
    setPhase("ended");
  });
  film.addEventListener("error", () => {
    if (phase !== "playing") return;
    failed = true;
    setPhase("ended"); // never leave the viewer stuck: Launch app still works
  });

  // Our own full-screen button fullscreens the stage (not the <video>), so the Launch button stays visible.
  fullBtn.hidden = !document.fullscreenEnabled;
  fullBtn.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else stage.requestFullscreen().catch(() => {});
  });
  document.addEventListener("fullscreenchange", () => {
    const on = Boolean(document.fullscreenElement);
    fullBtn.dataset.on = String(on);
    fullBtn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
  });

  launchBtn.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let "open in a new tab" work
    e.preventDefault();
    setPhase("leaving");
    setTimeout(() => location.assign(destination), reduced() ? 0 : 450);
  });

  // Escape closes the film. (In full screen the browser spends the first Escape on leaving it.)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && (phase === "playing" || phase === "ended")) close();
  });

  // Coming back from the website with the Back button restores this page as it was left (faded out); start fresh.
  addEventListener("pageshow", (e) => {
    if (e.persisted) {
      failed = false;
      setPhase("idle");
    }
  });

  // The glow follows a mouse; clicks leave a ripple.
  if (!reduced() && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("mousemove", (e) => {
      glow.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      glow.style.opacity = "1";
    });
    document.documentElement.addEventListener("mouseleave", () => {
      glow.style.opacity = "0";
    });
  }
  root.addEventListener("click", (e) => {
    if (phase !== "idle" || reduced()) return;
    const ripple = document.createElement("div");
    ripple.className = "ripple";
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    ripple.addEventListener("animationend", () => ripple.remove());
    ripples.append(ripple);
  });
})();
