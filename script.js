const header = document.querySelector(".site-header");
const hero = document.querySelector(".hero");
const heroBg = document.querySelector(".hero-bg");
const heroInner = document.querySelector(".hero-inner");
const proofStrip = document.querySelector(".proof-strip");
const qrBox = document.querySelector(".qr-box");
const areaImage = document.querySelector(".area-inner img");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const updateHeader = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    if (!targetId || targetId === "#") return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    const headerHeight = header ? header.offsetHeight : 0;
    const position = target.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
    window.scrollTo({ top: position, behavior: "smooth" });
  });
});

const revealTargets = [
  ".section-head",
  ".proof-item",
  ".worry-item",
  ".reason-card",
  ".price-board",
  ".price-note",
  ".work-card",
  ".service-grid article",
  ".line-content > *",
  ".flow-list li",
  ".area-inner > *",
  ".faq-list details",
  ".company-table-wrap"
].join(",");

const targets = Array.from(document.querySelectorAll(revealTargets));

if (reduceMotion) {
  targets.forEach((target) => target.classList.add("is-visible"));
} else {
  targets.forEach((target, index) => {
    target.classList.add("reveal");
    target.style.setProperty("--reveal-delay", `${(index % 6) * 70}ms`);
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, {
    rootMargin: "0px 0px 40% 0px",
    threshold: 0.14
  });

  targets.forEach((target) => revealObserver.observe(target));
}

let ticking = false;

const updateParallax = () => {
  ticking = false;
  if (reduceMotion) return;

  const scrollY = window.scrollY;
  if (heroBg) heroBg.style.setProperty("--hero-bg-y", `${scrollY * 0.12}px`);
  if (heroInner) heroInner.style.setProperty("--hero-panel-y", `${Math.min(scrollY * -0.035, 0)}px`);
  if (proofStrip) proofStrip.style.setProperty("--proof-y", `${Math.max(-24, -scrollY * 0.045)}px`);

  [qrBox, areaImage].forEach((element) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const center = rect.top + rect.height / 2 - window.innerHeight / 2;
    const movement = Math.max(-28, Math.min(28, center * -0.045));
    const variable = element === qrBox ? "--qr-y" : "--area-img-y";
    element.style.setProperty(variable, `${movement}px`);
  });
};

const requestParallax = () => {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(updateParallax);
};

window.addEventListener("scroll", requestParallax, { passive: true });
window.addEventListener("resize", requestParallax);
requestParallax();

if (!reduceMotion) {
  document.querySelectorAll(".price-board").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--tilt-x", `${y * -5}deg`);
      card.style.setProperty("--tilt-y", `${x * 5}deg`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    });
  });
}
