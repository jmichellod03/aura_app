"use strict";
// Barra lateral de navegación común (inicio y páginas de cálculo). Solo pantalla: no toca cálculos ni memorias.
// Se carga en el <head>, después de aura.css, para reservar el espacio de la barra antes de pintar la página.
(() => {
  const html = document.documentElement;
  html.classList.add("con-lateral");
  // Tema claro u oscuro: la elección guardada o, si no hay, la del sistema (se fija antes de pintar la página)
  const CLAVE_TEMA = "auraTema", sistemaOscuro = matchMedia("(prefers-color-scheme: dark)");
  let temaGuardado = null;
  try { const v = localStorage.getItem(CLAVE_TEMA); if (v === "claro" || v === "oscuro") temaGuardado = v; } catch { /* sin almacenamiento */ }
  const temaActual = () => temaGuardado || (sistemaOscuro.matches ? "oscuro" : "claro");
  const aplicarTema = () => { html.dataset.tema = temaActual(); document.querySelector('meta[name="theme-color"]')?.setAttribute("content", html.dataset.tema === "oscuro" ? "#0b0d33" : "#00008B"); };
  aplicarTema();
  const CLAVE = "auraLateralCorta";
  // Preferencia guardada; entre 900 y 1280 px la barra va contraída para no angostar los resultados
  let prefCorta = null;
  try { const v = localStorage.getItem(CLAVE); if (v === "1" || v === "0") prefCorta = v === "1"; } catch { /* sin almacenamiento */ }
  const media = (q) => matchMedia(q);
  const angosta = media("(min-width: 900.02px) and (max-width: 1279.98px)");
  const movil = media("(max-width: 900px)");
  const enCambio = (mq, f) => (mq.addEventListener ? mq.addEventListener("change", f) : mq.addListener(f));
  let cortaTemporal = null;      // elección del usuario en pantalla angosta, sin guardarla
  const cortaEfectiva = () => (angosta.matches ? (cortaTemporal ?? true) : !!prefCorta);
  html.classList.toggle("lat-corta", cortaEfectiva());

  // Íconos de 24 × 24 con el color del texto
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICO = {
    inicio: svg('<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>'),
    proyectos: svg('<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>'),
    activo: svg('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>'),
    acero: svg('<path d="M5 4h14M5 20h14M12 4v16"/>'),
    reticulada: svg('<path d="M2 8h20M2 17h20M2 17l5-9 5 9 5-9 5 9"/>'),
    placa: svg('<path d="M2 9h20"/><path d="M2 15l2.5-4h3l2.5 4h3l2.5-4h3l2.5 4"/>'),
    hormigon: svg('<rect x="5" y="3" width="14" height="18" rx="1"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="12" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/>'),
    muro: svg('<path d="M9 3h3v13h8v4H4v-4h5z"/>'),
    madera: svg('<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M6 10c3 1.5 6-1.5 9 0s3 1.5 4 .5M6 14c3 1.5 6-1.5 9 0"/>'),
    mle: svg('<rect x="7" y="2" width="10" height="20" rx="1"/><path d="M7 6.5h10M7 11h10M7 15.5h10"/>'),
    espectros: svg('<path d="M3 3v18h18"/><path d="M3 16c2-8 4-10 6-9s5 8 12 10"/>'),
    vial: svg('<path d="M2 6h20M2 11h20M2 16h20"/><path d="M6 8.5h3M12 8.5h3M18 8.5h2"/>'),
    zapata: svg('<path d="M10 3h4v10h-4z"/><path d="M3 13h18v6H3z"/>'),
    rigido: svg('<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M9 8v8M15 8v8"/>'),
    plegar: svg('<path d="M15 6l-6 6 6 6"/>'),
    menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    luna: svg('<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>'),
    sol: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    cerrar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  };
  const GRUPOS = [
    ["", [["index.html", "Inicio", "inicio"], ["index.html#misProyectos", "Mis proyectos", "proyectos"]]],
    ["Acero", [["acero.html", "Vigas y columnas", "acero"], ["reticulada.html", "Vigas reticuladas", "reticulada"], ["placa.html", "Placa colaborante", "placa"]]],
    ["Hormigón", [["hormigon.html", "Hormigón armado", "hormigon"], ["muro.html", "Muros de contención", "muro"]]],
    ["Fundaciones", [["zapata.html", "Zapata aislada", "zapata"]]],
    ["Madera", [["madera.html", "Madera aserrada", "madera"], ["mle.html", "Madera laminada MLE", "mle"]]],
    ["Sísmico", [["espectros.html", "Espectros de diseño", "espectros"]]],
    ["Vial", [["vial.html", "Pavimento flexible", "vial"], ["rigido.html", "Pavimento rígido", "rigido"]]],
  ];

  function el(tag, attrs = {}, hijos = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "html") e.innerHTML = v; else if (k === "text") e.textContent = v; else e.setAttribute(k, v);
    }
    for (const h of hijos) e.append(h);
    return e;
  }

  function montar() {
    if (document.getElementById("lateral")) return;
    const pagina = location.pathname.split("/").pop() || "index.html";
    const enInicio = pagina === "index.html";

    const lat = el("aside", { id: "lateral", class: "lateral" });
    // Saltar la navegación con el teclado
    const main = document.querySelector("main");
    let saltar = null;
    if (main) {
      if (!main.id) main.id = "contenido";
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
      saltar = el("a", { class: "lat-saltar", href: "#" + main.id, text: "Saltar al contenido" });
    }
    const cab = el("div", { class: "lat-cab" });
    cab.append(el("a", { class: "lat-marca", href: "index.html", "aria-label": "MMP, inicio",
      html: '<span class="logo-tile"><span class="logo"><img src="icons/logo-mmp.webp" alt=""></span></span>' }));
    const btnCerrar = el("button", { type: "button", class: "lat-cerrar", "aria-label": "Cerrar menú", html: ICO.cerrar });
    cab.append(btnCerrar);
    lat.append(cab);

    const nav = el("nav", { class: "lat-nav", "aria-label": "Herramientas" });
    for (const [grupo, items] of GRUPOS) {
      if (grupo) nav.append(el("p", { class: "lat-grupo", text: grupo }));
      const ul = el("ul");
      for (const [href, texto, ico] of items) {
        const a = el("a", { href, title: texto, html: `${ICO[ico]}<span class="lat-tx"></span>` });
        a.querySelector(".lat-tx").textContent = texto;
        const destino = href.split("#")[0];
        if (destino === pagina && !(enInicio && href.includes("#"))) a.setAttribute("aria-current", "page");
        ul.append(el("li", {}, [a]));
      }
      nav.append(ul);
    }
    lat.append(nav);

    // Proyecto activo: abre el panel de proyectos.js cuando la página lo tiene
    const proy = el("button", { type: "button", class: "lat-proy", hidden: "", title: "Panel del proyecto", "aria-controls": "auraPanel",
      html: `${ICO.activo}<span class="lat-tx"><small>Proyecto</small><b>Sin proyecto activo</b></span>` });
    lat.append(proy);

    const pie = el("div", { class: "lat-pie" });
    const corta = el("button", { type: "button", class: "lat-corta-btn", "aria-label": "Contraer menú", title: "Contraer menú",
      html: `${ICO.plegar}<span class="lat-tx">Contraer menú</span>` });
    // Modo claro / oscuro: el botón muestra el modo al que cambia
    const tema = el("button", { type: "button", class: "lat-tema" });
    const rotularTema = () => {
      const oscuro = html.dataset.tema === "oscuro", txt = oscuro ? "Modo claro" : "Modo oscuro";
      tema.innerHTML = `${oscuro ? ICO.sol : ICO.luna}<span class="lat-tx"></span>`;
      tema.querySelector(".lat-tx").textContent = txt;
      tema.title = txt; tema.setAttribute("aria-label", txt);
    };
    tema.addEventListener("click", () => {
      temaGuardado = html.dataset.tema === "oscuro" ? "claro" : "oscuro";
      try { localStorage.setItem(CLAVE_TEMA, temaGuardado); } catch { /* sin almacenamiento */ }
      aplicarTema(); rotularTema();
    });
    enCambio(sistemaOscuro, () => { if (!temaGuardado) { aplicarTema(); rotularTema(); } });
    rotularTema();
    pie.append(tema, corta);
    lat.append(pie);

    const velo = el("div", { class: "lat-velo", hidden: "" });
    document.body.prepend(...(saltar ? [saltar] : []), lat, velo);

    // Botón de menú en la cabecera (pantallas angostas)
    const header = document.querySelector("body > header");
    const abrir = el("button", { type: "button", class: "lat-abrir", "aria-label": "Abrir menú", "aria-controls": "lateral", "aria-expanded": "false", html: ICO.menu });
    if (header) header.prepend(abrir);

    // En móvil el menú es modal: el resto de la página queda inerte mientras está abierto
    const fondo = () => [...document.body.children].filter(n => n !== lat && n !== velo && n !== saltar && n.tagName !== "SCRIPT");
    const ponerAbierta = (si) => {
      const modal = si && movil.matches;
      html.classList.toggle("lat-abierta", si);
      abrir.setAttribute("aria-expanded", si);
      velo.hidden = !si;
      if (modal) { lat.setAttribute("role", "dialog"); lat.setAttribute("aria-modal", "true"); lat.setAttribute("aria-label", "Menú"); }
      else { lat.removeAttribute("role"); lat.removeAttribute("aria-modal"); lat.removeAttribute("aria-label"); }
      for (const n of fondo()) { if (modal) n.setAttribute("inert", ""); else n.removeAttribute("inert"); }
      if (si) (lat.querySelector('[aria-current="page"]') || lat.querySelector("a")).focus();
      else if (movil.matches && (lat.contains(document.activeElement) || document.activeElement === document.body)) abrir.focus();
    };
    abrir.addEventListener("click", () => ponerAbierta(true));
    btnCerrar.addEventListener("click", () => ponerAbierta(false));
    velo.addEventListener("click", () => ponerAbierta(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && html.classList.contains("lat-abierta")) ponerAbierta(false); });
    nav.addEventListener("click", (e) => { if (e.target.closest("a") && movil.matches) ponerAbierta(false); });
    enCambio(movil, () => ponerAbierta(false));

    const rotular = () => {
      const si = html.classList.contains("lat-corta");
      corta.setAttribute("aria-label", si ? "Expandir menú" : "Contraer menú");
      corta.title = si ? "Expandir menú" : "Contraer menú";
      corta.querySelector(".lat-tx").textContent = si ? "Expandir menú" : "Contraer menú";
    };
    rotular();
    corta.addEventListener("click", () => {
      const si = !html.classList.contains("lat-corta");
      if (angosta.matches) cortaTemporal = si;
      else { prefCorta = si; try { localStorage.setItem(CLAVE, si ? "1" : "0"); } catch { /* sin almacenamiento */ } }
      html.classList.toggle("lat-corta", si); rotular();
    });
    enCambio(angosta, () => { cortaTemporal = null; html.classList.toggle("lat-corta", cortaEfectiva()); rotular(); });

    // proyectos.js agrega después la pestaña del panel y el usuario en la cabecera: se reflejan en la barra
    const sincronizar = () => {
      const tab = document.getElementById("auraPanelTab");
      if (tab) {
        proy.hidden = false;
        const abiertoP = document.body.classList.contains("ap-abierto");
        if (proy.getAttribute("aria-expanded") !== String(abiertoP)) {
          proy.setAttribute("aria-expanded", abiertoP);
          // Con el panel del proyecto abierto la barra se contrae, para no angostar los resultados
          html.classList.toggle("lat-corta", (abiertoP && !movil.matches) || cortaEfectiva()); rotular();
        }
        const t = tab.textContent.trim();
        const nombre = t.startsWith("Proyecto:") ? t.slice(9).trim() : "Sin proyecto activo";
        if (proy.querySelector("b").textContent !== nombre) proy.querySelector("b").textContent = nombre;
        proy.classList.toggle("con-proy", t.startsWith("Proyecto:"));
      }
      const u = document.getElementById("auraUsuario");
      if (u && u.parentElement !== pie) pie.prepend(u);
    };
    proy.addEventListener("click", () => {
      const tab = document.getElementById("auraPanelTab");
      if (tab) { if (movil.matches) ponerAbierta(false); tab.click(); }
    });
    new MutationObserver(sincronizar).observe(document.body, { childList: true, subtree: true, characterData: true });
    new MutationObserver(sincronizar).observe(document.body, { attributes: true, attributeFilter: ["class"] });   // panel abierto o cerrado
    sincronizar();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
})();
