"use strict";
// Guía paso a paso de las páginas de cálculo (solo pantalla). El botón «Guía» oscurece la página y destaca, una a una,
// las zonas que hay que completar o revisar, con los pasos de diseño de cada herramienta.
// Cada paso: { en, hasta?, titulo, texto }. "en" es un selector CSS o "t:Texto", que busca una leyenda o título (legend, h2,
// h3) visible que contenga ese texto y destaca su grupo (fieldset o panel). Los pasos cuyo destino no existe o no se ve
// (por ejemplo, los de la columna cuando se calcula una viga) se omiten.
const Guia = (() => {
  const COMUNES = [
    { en: ".tablero-cab, #verdict", titulo: "Resultado", texto: "El veredicto resume todas las verificaciones con la razón demanda/capacidad máxima (D/C). El medidor y las tarjetas se colorean en verde (D/C ≤ 0.9), ámbar (≤ 1) o naranja (> 1). «SIN VERIFICAR» indica que falta una verificación exigida que la herramienta no calcula." },
    { en: ".zona23", titulo: "Vista del elemento", texto: "Revise el dibujo 2D y el modelo 3D a escala real. Gírelo con el mouse, use las vistas iso, frente, lado y planta, y oculte capas para ver la armadura o las conexiones. En naranja, lo que no cumple." },
    { en: ".mindice", titulo: "Procedimiento por pestañas", texto: "«Todo» muestra la memoria completa; cada pestaña numerada, una sección con su estado (punto verde o naranja). Pinche una fila con ▸ para ver la ecuación con los valores reemplazados." },
    { en: ".mtab.refs", titulo: "Referencias", texto: "Normas usadas en el cálculo, con las cláusulas, ecuaciones y tablas que se aplican y la sección donde aparece cada una." },
    { en: ".toolbar", titulo: "Plano y memoria", texto: "Descargue el plano DXF en lámina NCh 13 y la memoria de cálculo (.zip para Overleaf, con figuras y bibliografía). Con un proyecto activo, agregue el elemento desde la barra lateral para generar una memoria única del proyecto." },
  ];
  const TIPO = (txt) => ({ en: "#inputs .tabs", titulo: "Tipo de elemento", texto: txt });
  const PAGINAS = {
    "acero.html": [
      TIPO("Elija viga (flexión y corte, AISC 360-16 capítulos F y G) o columna (flexocompresión con la interacción H1)."),
      { en: "#serie", hasta: "#unidad", titulo: "Perfil y acero", texto: "Elija la serie (HEA, HEB, IPE o IPN) y el perfil del catálogo Cintac, la calidad del acero (Fy) y las unidades en que ingresará las solicitaciones." },
      { en: "t:Viga — flexión", titulo: "Solicitaciones de la viga", texto: "Ingrese la longitud no arriostrada Lb, los momentos y el corte últimos (LRFD). Con los momentos del tramo no arriostrado se calcula Cb (F1-1) para el pandeo lateral-torsional." },
      { en: "t:Columna — flexo", titulo: "Solicitaciones de la columna", texto: "Ingrese las longitudes efectivas KL en cada eje, la carga axial y los momentos últimos. La verificación combina compresión (capítulo E) y flexión con H1-1." },
    ],
    "reticulada.html": [
      { en: "t:1. Geometría", titulo: "1 · Geometría", texto: "Defina el tipo de reticulada (Pratt, Howe, Warren…), la luz, la altura, el número de paneles y el acero." },
      { en: "t:2. Cargas", titulo: "2 · Cargas", texto: "Ingrese las cargas de servicio sobre el cordón superior (D, L, Lr, S y W) y si las costaneras caen sobre los nudos (barras articuladas) o entre nudos (cordones a flexocompresión)." },
      { en: "t:3. Perfiles", titulo: "3 · Perfiles y longitudes", texto: "Asigne un perfil a cada grupo de barras (cordones, diagonales y montantes) y sus longitudes de pandeo. Si reduce Ly del cordón inferior, debe arriostrarlo lateralmente." },
      { en: "t:4. Solicitaciones", titulo: "4 · Solicitaciones", texto: "Por defecto AURA analiza el modelo plano y arma las envolventes NCh 3171. También puede ingresarlas desde un modelo externo y comprobar el .s2k en SAP2000." },
    ],
    "placa.html": [
      { en: "t:1. Geometría", titulo: "1 · Geometría", texto: "Ingrese la separación entre las vigas de apoyo, los tramos continuos de placa y el espesor de hormigón sobre la cresta, automático (el menor que cumple) o fijo." },
      { en: "t:2. Cargas", titulo: "2 · Cargas de servicio", texto: "Carga permanente adicional y sobrecarga de uso: es la demanda que se compara con la Tabla I del fabricante. Las cargas puntuales se aumentan un 30 % y piden revisar punzonamiento." },
      { en: "t:3. Malla", titulo: "3 · Malla de retracción", texto: "Elija el diámetro y la separación de la malla: debe dar al menos 1.8 cm²/m con s ≤ mín(5 eh ; 45 cm)." },
      { en: "t:4. Conectores", titulo: "4 · Conectores de corte", texto: "Defina los conectores (AISC I8) y, si quiere, la viga de apoyo del catálogo para verificar su ala y la acción compuesta." },
    ],
    "hormigon.html": [
      TIPO("Elija el elemento: viga, losa o muro de hormigón armado (ACI 318-08)."),
      { en: "t:Geometría", titulo: "Geometría", texto: "Dimensiones de la sección o del paño. En la losa, además, las condiciones de borde definen los coeficientes de momento." },
      { en: "t:Condiciones de borde", titulo: "Condiciones de borde", texto: "Indique qué bordes de la losa son continuos o simplemente apoyados." },
      { en: "t:Materiales", titulo: "Materiales", texto: "Resistencia del hormigón f'c y fluencia del acero fy; el recubrimiento define la altura útil d." },
      { en: "t:Solicitaciones", titulo: "Solicitaciones", texto: "Ingrese los momentos, cortes y cargas últimos. El cálculo propone la armadura y verifica flexión, corte y cuantías." },
      { en: "t:Armadura", titulo: "Armadura", texto: "Diámetros de las barras principales y de los estribos o de la repartición; la herramienta propone las cantidades y separaciones." },
    ],
    "muro.html": [
      { en: "t:1. Geometría", titulo: "1 · Geometría", texto: "Altura de la pantalla, espesores en el coronamiento y en la base, pie, talón, espesor de la zapata, profundidad de fundación y dentellón opcional." },
      { en: "t:2. Relleno", titulo: "2 · Relleno y suelo", texto: "Ángulo de fricción y peso del relleno y del suelo de fundación, cohesión y capacidad última. El empuje pasivo se considera según la opción elegida." },
      { en: "t:3. Cargas", titulo: "3 · Cargas y sismo", texto: "Sobrecarga sobre el relleno y zona sísmica (Mononobe-Okabe). Defina cómo se toman las solicitaciones sísmicas de la pantalla y del talón." },
      { en: "t:4. Factores", titulo: "4 · Factores de seguridad", texto: "Mínimos al volcamiento, al deslizamiento y a la tensión de contacto, estáticos y sísmicos, y la zona comprimida mínima en sismo." },
      { en: "t:5. Materiales", titulo: "5 · Materiales y armaduras", texto: "Hormigón, acero, recubrimiento y diámetros de cada armadura. Con la estabilidad verificada, se diseñan la pantalla, el pie y el talón." },
    ],
    "madera.html": [
      TIPO("Elija el elemento de madera aserrada: envigado, pie derecho (tabique), pilar o muro de corte (NCh 1198:2024)."),
      { en: "t:Material y sección", titulo: "Material y sección", texto: "Grado del pino radiata, contenido de humedad y escuadría cepillada: definen las tensiones admisibles y los factores de modificación." },
      { en: "t:Geometría", titulo: "Geometría", texto: "Luz o altura, apoyo lateral y longitudes de pandeo del elemento." },
      { en: "t:Cargas de servicio", titulo: "Cargas de servicio", texto: "Cargas permanentes y sobrecargas en servicio; con ellas se arman las combinaciones." },
      { en: "t:Carga de viento", titulo: "Carga de viento", texto: "Presión de viento sobre el elemento, que se combina con las cargas gravitacionales." },
      { en: "t:Duración", titulo: "Duración de la carga", texto: "El factor de duración KD depende de la carga de menor duración de la combinación." },
      { en: "t:Combinación", titulo: "Combinación", texto: "Elija la combinación crítica automática o una en particular para revisarla." },
      { en: "t:Apoyos", titulo: "Apoyos", texto: "Largo de apoyo para verificar el cizalle y la compresión normal a la fibra." },
      { en: "t:Deformación", titulo: "Deformación y vibraciones", texto: "Límites de flecha y la verificación de vibraciones del envigado." },
      { en: "t:Pie derecho de borde", titulo: "Pie derecho de borde", texto: "Escuadría del pie derecho de borde, que recibe la tracción y la compresión del volcamiento del muro." },
    ],
    "mle.html": [
      TIPO("Elija viga o columna de madera laminada encolada (NCh 2165:2023 y NCh 1198:2024, cláusula 11)."),
      { en: "t:Material — NCh 2165", titulo: "Material", texto: "Grado de la madera laminada según la NCh 2165: define las tensiones admisibles y el módulo de elasticidad." },
      { en: "t:Sección transversal", titulo: "Sección transversal", texto: "Ancho, número y espesor de las láminas." },
      { en: "t:Viga — geometría", titulo: "Viga · geometría", texto: "Luz y apoyo lateral (pandeo lateral-torsional)." },
      { en: "t:Viga — cargas", titulo: "Viga · cargas", texto: "Cargas de servicio sobre la viga." },
      { en: "t:Viga — apoyos", titulo: "Viga · apoyos y deformación", texto: "Largo de apoyo y límites de flecha." },
      { en: "t:Columna — geometría", titulo: "Columna · pandeo", texto: "Altura y longitudes de pandeo en cada eje." },
      { en: "t:Columna — cargas", titulo: "Columna · cargas", texto: "Carga axial y cargas laterales de servicio." },
      { en: "t:Columna — KD", titulo: "Columna · KD y apoyo", texto: "Factor de duración de la carga, apoyo y deformación." },
      { en: "t:Columna — combinación", titulo: "Columna · combinación", texto: "Combinación crítica automática o una en particular." },
    ],
    "espectros.html": [
      { en: "#norma", titulo: "Norma", texto: "Elija la norma: NCh 433 Of.1996, DS 117, NCh 433:2026 o NCh 2369:2025 (industrial)." },
      { en: "t:Parámetros sísmicos", titulo: "Parámetros sísmicos", texto: "Categoría de ocupación, zona sísmica, tipo de suelo y razón de amortiguamiento, según la norma elegida." },
      { en: "t:Factores de reducción", titulo: "Factores de reducción", texto: "Datos del factor de reducción R* de la respuesta (T*, R y k, según la norma)." },
      { en: "t:Discretización", titulo: "Discretización", texto: "Paso y periodo máximo del espectro que se exporta." },
      { en: "#graf", titulo: "Espectro", texto: "Curva de pseudo-aceleración elástica Sa [g]. Pase el cursor para leer los valores." },
      { en: ".toolbar", titulo: "Exportar", texto: "Descargue el espectro .txt para ETABS, el plano DXF o la memoria .zip." },
    ],
    "vial.html": [
      { en: "t:Solicitaciones", titulo: "1 · Solicitaciones", texto: "Ejes equivalentes EE de diseño, ingresados o calculados con el tránsito (3.603.202)." },
      { en: "t:Serviciabilidad", titulo: "2 · Serviciabilidad y confiabilidad", texto: "Índices de serviciabilidad inicial y final, confiabilidad R y desviación estándar S0." },
      { en: "t:Subrasante", titulo: "3 · Subrasante", texto: "Módulo resiliente de la subrasante, desde el CBR u otro ensayo (3.604.105)." },
      { en: "t:Clima", titulo: "4 · Clima", texto: "Temperatura media anual ponderada del aire (TMAPA), que corrige el coeficiente de la capa asfáltica." },
      { en: "t:Drenaje", titulo: "5 · Drenaje", texto: "Coeficientes de drenaje mi de las capas granulares (Tabla 3.604.106.B)." },
      { en: "t:Estructuración", titulo: "6 · Capas", texto: "Capa de rodadura y espesores de cada capa; se verifica que el número estructural cubra el requerido y los espesores mínimos." },
    ],
    "rigido.html": [
      { en: "t:Solicitaciones", titulo: "1 · Solicitaciones", texto: "Ejes equivalentes EE de diseño en la pista de diseño." },
      { en: "t:Serviciabilidad", titulo: "2 · Serviciabilidad y confiabilidad", texto: "Índices de serviciabilidad, confiabilidad R y desviación estándar S0." },
      { en: "t:Subrasante", titulo: "3 · Subrasante", texto: "Módulo de reacción k, desde el CBR o ingresado (3.604.206)." },
      { en: "t:Hormigón", titulo: "4 · Hormigón", texto: "Tipo de vía, resistencia media a la flexotracción S′c, módulo de elasticidad E y coeficiente de Poisson μ del hormigón (3.604.207)." },
      { en: "t:Base", titulo: "5 · Base", texto: "Espesor y módulo de la base granular." },
      { en: "t:Berma", titulo: "6 · Berma, juntas y clima", texto: "Tipo de berma, largo de losa, esviaje de las juntas y clima." },
      { en: "t:Transferencia", titulo: "7 · Transferencia de carga", texto: "Con o sin barras de traspaso: define el coeficiente J y la verificación de escalonamiento." },
    ],
    "zapata.html": [
      { en: "t:1. Geometría", titulo: "1 · Geometría", texto: "Elija si calcula el ancho B con el largo L fijo (como el ejercicio del curso) o verifica B y L dados. Ingrese la altura hc, el sello Df, la altura ht de la carga sobre el terreno y la columna a × b con la barra que se ancla." },
      { en: "t:2. Suelo", titulo: "2 · Suelo", texto: "Tensión admisible y pesos específicos del suelo y del hormigón. Con γ = 0 se desprecian los pesos, como en el curso." },
      { en: "t:3. Cargas", titulo: "3 · Cargas", texto: "Cargas D y L en la base de la columna (P en compresión, H y momentos). Si activa el sismo, ingrese E a nivel de servicio: esa parte es un procedimiento por verificar." },
      { en: "t:4. Materiales", titulo: "4 · Materiales y armaduras", texto: "f'c, fy, recubrimiento y diámetros de la parrilla inferior. Elija la tercera expresión del punzonamiento (pauta del curso o ACI 318-08)." },
    ],
  };

  let pasos = [], i = 0, capa = null, foco = null, tip = null, origen = null;
  const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  function destino(en) {
    if (en.startsWith("t:")) {
      const t = en.slice(2).toLowerCase();
      const el = [...document.querySelectorAll("main legend, main h2, main h3")].find(x => visible(x) && x.textContent.toLowerCase().includes(t));
      return el ? (el.closest("fieldset") || el.closest(".panel") || el.parentElement) : null;
    }
    const el = [...document.querySelectorAll(en)].find(visible);
    if (!el) return null;
    // Un campo suelto se destaca con su fila
    return el.matches("select, input") ? (el.closest(".row2, .row3, .row4") || el.parentElement) : el;
  }

  function construir() {
    capa = document.createElement("div"); capa.className = "guia-capa";
    foco = document.createElement("div"); foco.className = "guia-foco";
    tip = document.createElement("div"); tip.className = "guia-tip";
    tip.setAttribute("role", "dialog"); tip.setAttribute("aria-modal", "true"); tip.setAttribute("aria-labelledby", "guiaTit"); tip.setAttribute("aria-describedby", "guiaTxt");
    tip.innerHTML = `<h2 id="guiaTit"></h2><p id="guiaTxt"></p><div class="guia-pie"><span class="guia-n"></span>
      <div class="guia-acc"><button type="button" class="guia-ant">← Anterior</button><button type="button" class="guia-sig"></button></div></div>
      <button type="button" class="guia-x" aria-label="Cerrar la guía">×</button>`;
    tip.querySelector(".guia-ant").addEventListener("click", () => ir(i - 1));
    tip.querySelector(".guia-sig").addEventListener("click", () => (i < pasos.length - 1 ? ir(i + 1) : cerrar()));
    tip.querySelector(".guia-x").addEventListener("click", cerrar);
    capa.addEventListener("click", cerrar);
    document.body.append(capa, foco, tip);
  }
  function teclas(e) {
    if (e.key === "Escape") { e.preventDefault(); cerrar(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); if (i < pasos.length - 1) ir(i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); if (i > 0) ir(i - 1); }
    else if (e.key === "Tab") {             // el foco no sale del recuadro
      const f = [...tip.querySelectorAll("button:not([disabled])")];
      if (!f.length) return;
      const a = f.indexOf(document.activeElement);
      if (e.shiftKey && a <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && a === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }
  function ubicar() {
    if (!tip || !pasos[i]) return;
    // Zona destacada: el destino o, con "hasta", desde el destino hasta ese otro elemento
    const a = pasos[i].el.getBoundingClientRect(), b = pasos[i].el2 ? pasos[i].el2.getBoundingClientRect() : a, m = 6;
    const r = { top: Math.min(a.top, b.top), left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) };
    r.width = r.right - r.left; r.height = r.bottom - r.top;
    Object.assign(foco.style, { top: `${r.top - m}px`, left: `${r.left - m}px`, width: `${r.width + 2 * m}px`, height: `${r.height + 2 * m}px` });
    const W = innerWidth, H = innerHeight, tw = tip.offsetWidth, th = tip.offsetHeight, s = 14;
    let x, y;
    if (W < 640) { x = (W - tw) / 2; y = H - th - 12; }                                    // celular: abajo
    else if (r.right + s + tw <= W - 8) { x = r.right + s; y = r.top; }                    // a la derecha
    else if (r.left - s - tw >= 8) { x = r.left - s - tw; y = r.top; }                     // a la izquierda
    else if (r.bottom + s + th <= H - 8) { x = r.left; y = r.bottom + s; }                 // abajo
    else { x = r.left; y = Math.max(8, r.top - s - th); }                                  // arriba
    tip.style.left = `${Math.max(8, Math.min(x, W - tw - 8))}px`;
    tip.style.top = `${Math.max(8, Math.min(y, H - th - 8))}px`;
  }
  function ir(n) {
    i = Math.max(0, Math.min(n, pasos.length - 1));
    const p = pasos[i];
    p.el.scrollIntoView({ block: p.el.offsetHeight > innerHeight * 0.7 ? "start" : "center" });
    tip.querySelector("#guiaTit").textContent = p.titulo;
    tip.querySelector("#guiaTxt").textContent = p.texto;
    tip.querySelector(".guia-n").textContent = `Paso ${i + 1} de ${pasos.length} · ← → · Esc para salir`;
    const ant = tip.querySelector(".guia-ant"), sig = tip.querySelector(".guia-sig");
    ant.hidden = i === 0;
    sig.textContent = i < pasos.length - 1 ? "Siguiente →" : "Terminar ✓";
    ubicar();
    sig.focus();
  }
  function abrir(pag) {
    if (capa) return;
    // Los datos plegados (tablero.js) se despliegan para poder recorrerlos
    const pleg = document.querySelector("main.datos-plegados .plegar");
    if (pleg) pleg.click();
    const pagina = (typeof pag === "string" && pag) || location.pathname.split("/").pop() || "index.html";
    const vistos = new Set();
    pasos = [...(PAGINAS[pagina] || []), ...(pagina === "espectros.html" ? [] : COMUNES)]
      .map(p => ({ ...p, el: destino(p.en), el2: p.hasta ? [...document.querySelectorAll(p.hasta)].find(visible) || null : null }))
      .filter(p => p.el && !vistos.has(p.el) && vistos.add(p.el));
    if (!pasos.length) return;
    origen = document.activeElement;
    construir();
    document.documentElement.classList.add("guia-activa");
    addEventListener("keydown", teclas, true);
    addEventListener("resize", ubicar); addEventListener("scroll", ubicar, true);
    ir(0);
  }
  function cerrar() {
    if (!capa) return;
    removeEventListener("keydown", teclas, true);
    removeEventListener("resize", ubicar); removeEventListener("scroll", ubicar, true);
    capa.remove(); foco.remove(); tip.remove(); capa = foco = tip = null;
    document.documentElement.classList.remove("guia-activa");
    (origen && document.contains(origen) ? origen : document.querySelector(".guia-btn"))?.focus();
  }
  function iniciar() {
    if (!document.querySelector("main") || document.querySelector(".guia-btn")) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "guia-btn"; b.textContent = "Guía";
    b.title = "Pasos de diseño de esta herramienta";
    b.setAttribute("aria-haspopup", "dialog");
    b.addEventListener("click", () => abrir());
    document.body.append(b);
  }
  return { iniciar, abrir, cerrar };
})();
window.Guia = Guia;
try { Guia.iniciar(); } catch (e) { console.error(e); }
