const header = document.querySelector(".site-header");

window.addEventListener("scroll", () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}, { passive: true });

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
