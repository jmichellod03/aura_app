// Asistente en línea de AURA: panel de preguntas sobre el funcionamiento y los cálculos del programa.
// Habla con la función de Supabase "asistente", que guarda la clave de la IA. No envía datos del cálculo:
// solo la página abierta y la conversación. Requiere sesión y conexión.
"use strict";
(() => {
  if (esPaginaAcceso || !sb) return;
  const MAX_TEXTO = 2000, MAX_MENSAJES = 12;
  const pagina = location.pathname.split("/").pop() || "index.html";
  let conversacion = [], ocupado = false, claveHist = "";

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
    boton.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg><span>Asistente</span>`;
    const panel = document.createElement("section");
    panel.id = "asPanel"; panel.className = "as-panel"; panel.hidden = true; panel.setAttribute("aria-label", "Asistente de AURA");
    panel.innerHTML = `<header class="as-cab"><b>Asistente</b><button type="button" class="as-limpiar">Limpiar</button><button type="button" class="as-cerrar" aria-label="Cerrar asistente">×</button></header>
      <p class="as-aviso">Resuelve dudas de uso y de cálculo, pero puede equivocarse: compruebe sus respuestas. No ve los datos de su cálculo. <b>No escriba datos de clientes:</b> en el plan gratis, Google puede revisar lo que se envía y usarlo para mejorar sus productos.</p>
      <div class="as-chat" role="log" aria-live="polite"></div>
      <form class="as-form"><label class="as-oculto" for="asTexto">Su pregunta</label><textarea id="asTexto" rows="2" maxlength="${MAX_TEXTO}" placeholder="Escriba su pregunta"></textarea><button type="submit" class="as-enviar">Enviar</button></form>`;
    document.body.append(boton, panel);
    const chat = panel.querySelector(".as-chat"), texto = panel.querySelector("textarea"), form = panel.querySelector("form");
    const enviar = panel.querySelector(".as-enviar");

    const burbuja = (rol, t, clase = "") => {
      const d = document.createElement("div");
      d.className = `as-msg as-${rol} ${clase}`.trim(); d.innerHTML = formato(t);
      chat.append(d); chat.scrollTop = chat.scrollHeight;
      return d;
    };
    const pintar = () => {
      chat.innerHTML = "";
      if (!conversacion.length) burbuja("model", "Hola. Pregúnteme cómo usar este programa o cómo calcula algún resultado.");
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
      const r = burbuja("model", "Pensando…", "as-espera");
      let acumulado = "";
      const fallar = (m) => {
        r.classList.remove("as-espera"); r.classList.add("as-error"); r.innerHTML = formato(m);
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
        });
        if (!resp.ok) {
          let m = "";
          try { m = (await resp.json()).error || ""; } catch { /* sin detalle */ }
          throw Object.assign(new Error(m || (resp.status === 404 ? "El asistente todavía no está activado." : "El asistente no respondió. Intente más tarde.")), { visible: true });
        }
        const lector = resp.body.getReader(), dec = new TextDecoder();
        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;
          acumulado += dec.decode(value, { stream: true });
          if (acumulado) { r.classList.remove("as-espera"); r.innerHTML = formato(acumulado); chat.scrollTop = chat.scrollHeight; }
        }
        if (!acumulado.trim()) throw Object.assign(new Error("El asistente no entregó una respuesta. Intente nuevamente."), { visible: true });
        conversacion.push({ rol: "model", texto: acumulado.slice(0, 8000) }); guardar();
      } catch (err) {
        fallar(err.visible ? err.message : navigator.onLine ? "El asistente todavía no está activado o no responde." : "Sin conexión. El asistente requiere internet.");
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
