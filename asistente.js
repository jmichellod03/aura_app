// Asistente en línea de AURA: panel de preguntas sobre el funcionamiento y los cálculos del programa.
// Habla con la función de Supabase "asistente", que guarda la clave de la IA. No envía datos del cálculo:
// solo la página abierta y la conversación. Requiere sesión y conexión.
"use strict";
(() => {
  if (esPaginaAcceso || !sb) return;
  const MAX_TEXTO = 2000, MAX_MENSAJES = 12, MAX_ESPERA_MS = 120000;
  const pagina = location.pathname.split("/").pop() || "index.html";
  let conversacion = [], ocupado = false, claveHist = "";

  // Hormi, la probeta G25: versión simplificada para tamaños chicos. El logo completo está en icons/hormi.svg.
  const LENTES = `<g fill="#fff" stroke="#00008B" stroke-width="9"><circle cx="72" cy="94" r="24"/><circle cx="128" cy="94" r="24"/></g><path d="M96 92Q100 88 104 92" fill="none" stroke="#00008B" stroke-width="9" stroke-linecap="round"/>`;
  const PUPILAS = (x, y) => `<g fill="#141a26"><circle cx="${x}" cy="${y}" r="12"/><circle cx="${x + 56}" cy="${y}" r="12"/></g>`;
  const TRAZO = (d, ancho = 10) => `<path d="${d}" fill="none" stroke="#141a26" stroke-width="${ancho}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const CARAS = {
    normal: LENTES + PUPILAS(74, 96) + TRAZO("M76 140Q100 164 124 140"),
    fraguando: LENTES + TRAZO("M58 90Q72 106 86 90M114 90Q128 106 142 90", 9) + `<circle cx="100" cy="142" r="8" fill="#141a26"/>`,
    feliz: LENTES + TRAZO("M58 100Q72 80 86 100M114 100Q128 80 142 100", 9) + TRAZO("M72 134Q100 172 128 134"),
    triste: LENTES + PUPILAS(72, 104) + TRAZO("M76 158Q100 136 124 158") + TRAZO("M158 118 148 132 158 146 150 160", 6),
    duda: `<g fill="#fff" stroke="#00008B" stroke-width="9"><circle cx="72" cy="94" r="24"/><circle cx="128" cy="100" r="18"/></g><path d="M96 94 110 98" fill="none" stroke="#00008B" stroke-width="9" stroke-linecap="round"/>` + `<circle cx="74" cy="96" r="12" fill="#141a26"/><circle cx="130" cy="101" r="9" fill="#141a26"/>` + TRAZO("M108 72Q128 62 150 72") + TRAZO("M76 146Q88 134 100 146Q112 158 124 146"),
  };
  const hormi = (estado = "normal", t = 28) => `<svg viewBox="0 0 200 200" width="${t}" height="${t}" aria-hidden="true"><path d="M36 40V160A64 22 0 0 0 164 160V40Z" fill="#bcc2ca" stroke="#141a26" stroke-width="10" stroke-linejoin="round"/><ellipse cx="100" cy="40" rx="64" ry="22" fill="#d3d7dc" stroke="#141a26" stroke-width="10"/>${CARAS[estado]}</svg>`;
  // Cara del botón según el veredicto que muestra la página. NO CUMPLE manda sobre SIN VERIFICAR, y este sobre CUMPLE.
  const caraVeredicto = () => {
    const v = document.querySelector(".verdict");
    if (!v || v.closest(".hidden") || !v.textContent.trim()) return "normal";
    if (v.classList.contains("bad")) return "triste";
    if (/SIN VERIFICAR/i.test(v.textContent)) return "duda";
    return v.classList.contains("ok") ? "feliz" : "normal";
  };

  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Formato mínimo sobre texto ya escapado: negrita, código y listas con guiones
  const formato = (t) => esc(t).split(/\r?\n/).map(l => {
    const f = l.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/`([^`\n]+)`/g, "<code>$1</code>");
    return /^\s*[-•]\s+/.test(f) ? `<span class="as-item">• ${f.replace(/^\s*[-•]\s+/, "")}</span>` : f;
  }).join("<br>").replace(/<\/span><br>/g, "</span>");
  const guardar = () => { try { sessionStorage.setItem(claveHist, JSON.stringify(conversacion.slice(-(MAX_MENSAJES + MAX_MENSAJES % 2)))); } catch { /* sin almacenamiento */ } };
  const cargar = () => {
    try {
      const h = JSON.parse(sessionStorage.getItem(claveHist) || "[]");
      // Solo pares completos de pregunta y respuesta, que es lo que acepta la función
      conversacion = [];
      if (Array.isArray(h)) for (let i = 0; i + 1 < h.length; i += 2) {
        const [p, r] = [h[i], h[i + 1]];
        if (p?.rol !== "user" || r?.rol !== "model" || typeof p.texto !== "string" || typeof r.texto !== "string") break;
        conversacion.push(p, r);
      }
    } catch { conversacion = []; }
  };

  function construir() {
    const boton = document.createElement("button");
    boton.type = "button"; boton.className = "as-abrir"; boton.setAttribute("aria-expanded", "false"); boton.setAttribute("aria-controls", "asPanel");
    boton.title = "Hormi, asistente de AURA";
    boton.innerHTML = `<span class="as-cara-boton">${hormi("normal", 32)}</span><span>Hormi</span>`;
    const caraBoton = boton.firstElementChild;
    let caraActual = "normal";
    const actualizarCara = () => {
      const c = caraVeredicto();
      if (c !== caraActual) { caraActual = c; caraBoton.innerHTML = hormi(c, 32); }
    };
    const main = document.querySelector("main");
    if (main) { actualizarCara(); new MutationObserver(actualizarCara).observe(main, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] }); }
    const panel = document.createElement("section");
    panel.id = "asPanel"; panel.className = "as-panel"; panel.hidden = true; panel.setAttribute("aria-label", "Hormi, asistente de AURA");
    panel.innerHTML = `<header class="as-cab"><span class="as-cara-cab">${hormi("normal", 30)}</span><b>Hormi</b><button type="button" class="as-limpiar">Limpiar</button><button type="button" class="as-cerrar" aria-label="Cerrar a Hormi">×</button></header>
      <p class="as-aviso">Resuelve dudas de uso y de cálculo, pero puede equivocarse: compruebe sus respuestas. No ve los datos de su cálculo. <b>No escriba datos de clientes:</b> en el plan gratis, Google puede revisar lo que se envía y usarlo para mejorar sus productos.</p>
      <div class="as-chat" role="log" aria-live="polite"></div>
      <form class="as-form"><label class="as-oculto" for="asTexto">Su pregunta</label><textarea id="asTexto" rows="2" maxlength="${MAX_TEXTO}" placeholder="Escriba su pregunta"></textarea><button type="submit" class="as-enviar">Enviar</button></form>`;
    document.body.append(boton, panel);
    const chat = panel.querySelector(".as-chat"), texto = panel.querySelector("textarea"), form = panel.querySelector("form");
    const enviar = panel.querySelector(".as-enviar");

    const burbuja = (rol, t, clase = "") => {
      const d = document.createElement("div");
      d.className = `as-msg as-${rol} ${clase}`.trim(); d.innerHTML = formato(t);
      if (rol === "model") {
        const fila = document.createElement("div");
        fila.className = "as-fila";
        fila.innerHTML = `<span class="as-cara">${hormi(clase === "as-espera" ? "fraguando" : "normal")}</span>`;
        fila.append(d); chat.append(fila);
      } else chat.append(d);
      chat.scrollTop = chat.scrollHeight;
      return d;
    };
    const ponerCara = (msg, estado) => { msg.previousElementSibling.innerHTML = hormi(estado); };
    const pintar = () => {
      chat.innerHTML = "";
      if (!conversacion.length) chat.innerHTML = `<div class="as-bienvenida"><img src="icons/hormi.svg" width="104" height="104" alt=""><div class="as-msg as-model">Hola, soy Hormi. Pregúnteme cómo usar este programa o cómo calcula algún resultado.</div></div>`;
      conversacion.forEach(m => burbuja(m.rol, m.texto));
    };
    const abrir = (si) => {
      panel.hidden = !si; boton.hidden = si; boton.setAttribute("aria-expanded", String(si));
      if (si) { pintar(); texto.focus(); } else boton.focus();
    };
    boton.addEventListener("click", () => abrir(true));
    panel.querySelector(".as-cerrar").addEventListener("click", () => abrir(false));
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") abrir(false); });
    panel.querySelector(".as-limpiar").addEventListener("click", () => { if (ocupado) return; conversacion = []; guardar(); pintar(); texto.focus(); });
    texto.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pregunta = texto.value.trim();
      if (!pregunta || ocupado) return;
      ocupado = true; enviar.disabled = true; texto.value = "";
      conversacion.push({ rol: "user", texto: pregunta });
      if (chat.querySelector(".as-msg") && conversacion.length === 1) chat.innerHTML = "";
      burbuja("user", pregunta);
      const r = burbuja("model", "Fraguando la respuesta…", "as-espera");
      let acumulado = "";
      const fallar = (m) => {
        r.classList.remove("as-espera"); r.classList.add("as-error"); r.innerHTML = formato(m); ponerCara(r, "triste");
        conversacion.pop();                      // la pregunta sin respuesta no queda en la conversación
      };
      try {
        const { data } = await sb.auth.getSession();
        if (!data.session) throw Object.assign(new Error("Su sesión venció. Vuelva a iniciar sesión."), { visible: true });
        const historial = conversacion.slice(-MAX_MENSAJES);
        while (historial.length && historial[0].rol !== "user") historial.shift();
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/asistente`, {
          method: "POST",
          headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ pagina, mensajes: historial }),
          signal: AbortSignal.timeout(MAX_ESPERA_MS),
        });
        if (!resp.ok) {
          let m = "";
          try { m = (await resp.json()).error || ""; } catch { /* sin detalle */ }
          throw Object.assign(new Error(m || (resp.status === 404 ? "Hormi todavía no está activado." : "Hormi no pudo responder a tiempo. Intente en unos minutos.")), { visible: true });
        }
        const lector = resp.body.getReader(), dec = new TextDecoder();
        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;
          acumulado += dec.decode(value, { stream: true });
          if (acumulado) {
            if (r.classList.contains("as-espera")) { r.classList.remove("as-espera"); ponerCara(r, "normal"); }
            r.innerHTML = formato(acumulado); chat.scrollTop = chat.scrollHeight;
          }
        }
        if (!acumulado.trim()) throw Object.assign(new Error("Hormi no entregó una respuesta. Intente nuevamente."), { visible: true });
        conversacion.push({ rol: "model", texto: acumulado.slice(0, 8000) }); guardar();
      } catch (err) {
        const agotado = err.name === "TimeoutError" || err.name === "AbortError";
        fallar(err.visible ? err.message : agotado ? "Hormi no pudo responder a tiempo. Intente en unos minutos." : navigator.onLine ? "Hormi todavía no está activado o no responde." : "Sin conexión. Hormi requiere internet.");
      } finally {
        ocupado = false; enviar.disabled = false; texto.focus();
      }
    });
  }

  const iniciar = async () => {
    const u = await sesionLista;
    if (!u) return;
    claveHist = `auraAsistente:${u.id}`;
    cargar();
    construir();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
