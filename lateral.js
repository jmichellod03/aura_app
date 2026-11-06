"use strict";
// Barra lateral de navegación común (inicio y páginas de cálculo). Solo pantalla: no toca cálculos ni memorias.
// Se carga en el <head>, después de aura.css, para reservar el espacio de la barra antes de pintar la página.
(() => {
  const html = document.documentElement;
  html.classList.add("con-lateral");
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
    columna: svg('<path d="M8 3h8M8 18h8M12 3v15M5 21h14"/>'),
    reticulada: svg('<path d="M2 8h20M2 17h20M2 17l5-9 5 9 5-9 5 9"/>'),
    placa: svg('<path d="M2 9h20"/><path d="M2 15l2.5-4h3l2.5 4h3l2.5-4h3l2.5 4"/>'),
    hormigon: svg('<rect x="5" y="3" width="14" height="18" rx="1"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="12" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/>'),
    losa: svg('<path d="M2 10h20v5H2z"/><path d="M5 12.5h.01M9 12.5h.01M13 12.5h.01M17 12.5h.01"/>'),
    pier: svg('<path d="M8 3h8v18H8z"/><path d="M8 9h8M8 15h8"/>'),
    muro: svg('<path d="M9 3h3v13h8v4H4v-4h5z"/>'),
    madera: svg('<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M6 10c3 1.5 6-1.5 9 0s3 1.5 4 .5M6 14c3 1.5 6-1.5 9 0"/>'),
    mle: svg('<rect x="7" y="2" width="10" height="20" rx="1"/><path d="M7 6.5h10M7 11h10M7 15.5h10"/>'),
    espectros: svg('<path d="M3 3v18h18"/><path d="M3 16c2-8 4-10 6-9s5 8 12 10"/>'),
    vial: svg('<path d="M2 6h20M2 11h20M2 16h20"/><path d="M6 8.5h3M12 8.5h3M18 8.5h2"/>'),
    base: svg('<path d="M10 3h4v12h-4z"/><path d="M5 15h14v2H5z"/><path d="M3 17h18v4H3z"/><path d="M7 15v6M17 15v6"/>'),
    conexion: svg('<path d="M3 3v18M6 3v18"/><path d="M9 8h12M9 16h12"/><path d="M6 10h6v4H6z"/>'),
    zapata: svg('<path d="M10 3h4v10h-4z"/><path d="M3 13h18v6H3z"/>'),
    rigido: svg('<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M9 8v8M15 8v8"/>'),
    secAcero: svg('<path d="M5 4h14v3h-5v10h5v3H5v-3h5V7H5z"/>'),
    secHormigon: svg('<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
    secMadera: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'),
    secSismico: svg('<path d="M2 12h4l2-6 3 13 3-16 3 12 1.5-3H22"/>'),
    secVial: svg('<path d="M8 3L4 21M16 3l4 18M12 4v3M12 11v3M12 18v3"/>'),
    fundaciones: svg('<path d="M2 9h20"/><path d="M10 9v5H5v6h14v-6h-5V9"/>'),
    chevron: svg('<path d="M9 6l6 6-6 6"/>'),
    plegar: svg('<path d="M15 6l-6 6 6 6"/>'),
    menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    cerrar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  };
  // Árbol del menú. E: enlace; R: rama desplegable. `vista` es un programa dentro de una misma página:
  // su pestaña (tab) o el valor de su lista (sel, val). Se cambia sin recargar, para no perder los datos escritos.
  const E = (href, texto, ico, vista) => ({ href, texto, ico, vista });
  const R = (id, texto, ico, hijos) => ({ id, texto, ico, hijos });
  const norma = (val, texto) => E(`espectros.html?norma=${val}`, texto, null, { sel: "norma", val });
  const FIJOS = [E("index.html", "Inicio", "inicio"), E("index.html#misProyectos", "Mis proyectos", "proyectos")];
  const SECCIONES = [
    R("acero", "Acero", "secAcero", [
      E("acero.html?elemento=viga", "Vigas", "acero"),
      E("acero.html?elemento=columna", "Columnas", "columna"),
      E("reticulada.html", "Vigas reticuladas", "reticulada"),
      E("placa.html", "Placa colaborante", "placa"),
      E("base.html", "Placa base (prueba)", "base"),
      E("conexion.html?tipo=corte", "Conexión de corte (prueba)", "conexion", { sel: "tipo", val: "corte" }),
      E("conexion.html?tipo=momento", "Conexión de momento (prueba)", "conexion", { sel: "tipo", val: "momento" }),
    ]),
    R("hormigon", "Hormigón", "secHormigon", [
      E("hormigon.html?elemento=viga", "Vigas", "hormigon"),
      E("hormigon.html?elemento=losa", "Losas", "losa"),
      E("piers.html", "Muros de corte", "pier"),
      E("muro.html", "Muros de contención", "muro"),
      R("fundaciones", "Fundaciones", "fundaciones", [E("zapata.html", "Zapata aislada", "zapata")]),
    ]),
    R("madera", "Madera", "secMadera", [
      R("aserrada", "Madera aserrada", "madera", [
        E("madera.html?elemento=envigado", "Envigado", null, { tab: "tabEnv" }),
        E("madera.html?elemento=tabique", "Pie derecho (tabique)", null, { tab: "tabTab" }),
        E("madera.html?elemento=pilar", "Pilar", null, { tab: "tabPil" }),
        E("madera.html?elemento=muro", "Muro de corte", null, { tab: "tabMuro" }),
      ]),
      R("mle", "Laminada MLE", "mle", [
        E("mle.html?elemento=viga", "Viga", null, { tab: "tabViga" }),
        E("mle.html?elemento=columna", "Columna", null, { tab: "tabCol" }),
      ]),
    ]),
    R("sismico", "Sísmico", "secSismico", [
      R("espectros", "Espectros de diseño", "espectros", [
        norma("433-1996", "NCh 433 Of.1996"),
        norma("ds117", "DS 117 (2011)"),
        norma("433-2026", "NCh 433:2026"),
        norma("2369-2025", "NCh 2369:2025"),
      ]),
    ]),
    R("vial", "Vial", "secVial", [
      E("vial.html", "Pavimento flexible", "vial"),
      E("rigido.html", "Pavimento rígido", "rigido"),
    ]),
  ];
  const CLAVE_RAMAS = "auraLateralRamas";   // ramas abiertas, para que el menú no salte al cambiar de página
  let ramasAbiertas = new Set();
  try { ramasAbiertas = new Set(JSON.parse(localStorage.getItem(CLAVE_RAMAS)) || []); } catch { /* sin almacenamiento */ }
  const guardarRamas = () => { try { localStorage.setItem(CLAVE_RAMAS, JSON.stringify([...ramasAbiertas])); } catch { /* sin almacenamiento */ } };

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
    const paginaDe = (href) => href.split("#")[0].split("?")[0];
    // ¿Este enlace es lo que se ve ahora? Las vistas se leen de la página; lo demás, de la dirección.
    const esActual = ({ href, vista }) => {
      if (paginaDe(href) !== pagina || (enInicio && href.includes("#"))) return false;
      if (vista?.tab) return !!document.getElementById(vista.tab)?.classList.contains("on");
      if (vista?.sel) return document.getElementById(vista.sel)?.value === vista.val;
      // hormigon.html y acero.html tienen dos programas por ?elemento; sin él abren la viga
      const elItem = new URLSearchParams(href.split("?")[1]).get("elemento"), elPagina = new URLSearchParams(location.search).get("elemento");
      return !elItem || elItem === elPagina || (!elPagina && elItem === "viga");
    };

    const enlaces = [];     // { a, nodo, ramas: botones de las ramas que lo contienen }
    const ponerRama = (btn, ul, si) => {
      ul.hidden = !si;
      btn.setAttribute("aria-expanded", si);
      if (si) ramasAbiertas.add(btn.dataset.rama); else ramasAbiertas.delete(btn.dataset.rama);
    };
    const hacerEnlace = (nodo, ramas) => {
      const a = el("a", { href: nodo.href, title: nodo.texto, html: `${nodo.ico ? ICO[nodo.ico] : ""}<span class="lat-tx"></span>` });
      a.querySelector(".lat-tx").textContent = nodo.texto;
      enlaces.push({ a, nodo, ramas });
      return el("li", {}, [a]);
    };
    const hacerRama = (nodo, ramas, prefijo = "") => {
      const id = prefijo + nodo.id;
      const ulId = "latRama-" + id.replace("/", "-");
      const btn = el("button", { type: "button", class: "lat-rama", title: nodo.texto, "aria-controls": ulId, "data-rama": id,
        html: `${ICO[nodo.ico]}<span class="lat-tx"></span>${ICO.chevron.replace("<svg ", '<svg class="lat-chev" ')}` });
      btn.querySelector(".lat-tx").textContent = nodo.texto;
      const ul = el("ul", { id: ulId });
      const dentro = [...ramas, btn];
      for (const h of nodo.hijos) ul.append(h.hijos ? hacerRama(h, dentro, id + "/") : hacerEnlace(h, dentro));
      ponerRama(btn, ul, ramasAbiertas.has(id));
      btn.addEventListener("click", () => {
        // Contraída no se ven las listas: se expande la barra (sin guardar la preferencia) y se abre la sección
        if (html.classList.contains("lat-corta") && !movil.matches) {
          if (angosta.matches) cortaTemporal = false;
          html.classList.remove("lat-corta"); rotular();
          ponerRama(btn, ul, true);
        } else ponerRama(btn, ul, ul.hidden);
        guardarRamas();
      });
      return el("li", { class: "lat-seccion" }, [btn, ul]);
    };
    nav.append(el("ul", {}, FIJOS.map(n => hacerEnlace(n, []))));
    nav.append(el("ul", {}, SECCIONES.map(n => hacerRama(n, []))));
    lat.append(nav);

    // Marca el programa actual y deja a la vista su rama (también si cambia de pestaña o de norma dentro de la página)
    let actualPrevio = null;
    const marcarActual = () => {
      const actual = enlaces.find(({ nodo }) => esActual(nodo)) || null;
      for (const btn of nav.querySelectorAll(".lat-rama")) btn.classList.remove("tiene-actual");
      for (const { a } of enlaces) a.removeAttribute("aria-current");
      if (!actual) { actualPrevio = null; return; }
      actual.a.setAttribute("aria-current", "page");
      for (const btn of actual.ramas) {
        btn.classList.add("tiene-actual");
        if (actual !== actualPrevio) ponerRama(btn, btn.nextElementSibling, true);
      }
      actualPrevio = actual;
    };
    marcarActual();
    for (const { nodo } of enlaces) {
      const t = nodo.vista?.tab && document.getElementById(nodo.vista.tab);
      if (t) new MutationObserver(marcarActual).observe(t, { attributes: true, attributeFilter: ["class"] });
    }
    document.getElementById("norma")?.addEventListener("change", marcarActual);

    // Una vista de la página abierta se cambia ahí mismo; Ctrl o Mayús + clic siguen abriendo otra pestaña o ventana
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      const { nodo } = enlaces.find(x => x.a === a);
      if (!nodo.vista || paginaDe(nodo.href) !== pagina) return;
      const control = document.getElementById(nodo.vista.tab || nodo.vista.sel);
      if (!control) return;
      e.preventDefault();
      if (nodo.vista.tab) control.click();
      else if (control.value !== nodo.vista.val) { control.value = nodo.vista.val; control.dispatchEvent(new Event("change", { bubbles: true })); }
    });

    // Proyecto activo: abre el panel de proyectos.js cuando la página lo tiene
    const proy = el("button", { type: "button", class: "lat-proy", hidden: "", title: "Panel del proyecto", "aria-controls": "auraPanel",
      html: `${ICO.activo}<span class="lat-tx"><small>Proyecto</small><b>Sin proyecto activo</b></span>` });
    lat.append(proy);

    const pie = el("div", { class: "lat-pie" });
    const corta = el("button", { type: "button", class: "lat-corta-btn", "aria-label": "Contraer menú", title: "Contraer menú",
      html: `${ICO.plegar}<span class="lat-tx">Contraer menú</span>` });
    pie.append(corta);
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
      if (si) {
        const actual = lat.querySelector('[aria-current="page"]');
        (actual && actual.offsetParent ? actual : lat.querySelector("a")).focus();
      }
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
