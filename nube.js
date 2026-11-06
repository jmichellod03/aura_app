// Conexión con Supabase (usuarios y proyectos en la nube). Se carga en el <head> de todas las páginas,
// después de la librería supabase-js. Sin sesión, las páginas redirigen a login.html; con una cuenta de Google cuyo correo
// no está en public.correos_autorizados, a login.html?sinacceso=1.
// La clave publicable es pública por diseño: la protección la dan las reglas por fila (RLS) del esquema.
"use strict";
const SUPABASE_URL = "https://olrrwjwmcrezpnigybwo.supabase.co";
const SUPABASE_KEY = "sb_publishable_Zr1WEb3QFTx9TCr8hZALPg_-F9VX-l6";
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;
let usuarioActual = null;
const esPaginaAcceso = /login\.html$/.test(location.pathname);
const baseApp = location.href.replace(/[?#].*$/, "").replace(/[^/]*$/, "");

// La página queda oculta hasta confirmar la sesión (evita mostrar el programa sin acceso)
if (sb && !esPaginaAcceso) document.documentElement.style.visibility = "hidden";

// Usuario de la última sesión guardada en este navegador (para trabajar sin conexión con el token vencido)
function usuarioGuardado() {
  try {
    const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
    const s = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`) || "null");
    return s && s.user ? s.user : null;
  } catch { return null; }
}
let sinConexion = false;
// Promesa con el usuario de la sesión. Sin librería (primera visita sin conexión) se trabaja en modo local.
const sesionLista = (async () => {
  if (!sb) return null;
  try {
    // Tiempo máximo: sin red, el refresco del token podría quedar colgado y la página oculta
    const r = await Promise.race([sb.auth.getSession(), new Promise((_, mal) => setTimeout(() => mal(new Error("tiempo agotado")), 6000))]);
    usuarioActual = r.data.session?.user || null;
  } catch { usuarioActual = null; }
  // Sin conexión no se puede refrescar un token vencido: se mantiene el acceso con la sesión guardada (las calculadoras funcionan;
  // los proyectos en la nube quedan disponibles al volver la conexión)
  if (!usuarioActual && !navigator.onLine) { usuarioActual = usuarioGuardado(); sinConexion = !!usuarioActual; }
  const volver = encodeURIComponent(location.pathname.split("/").pop() + location.search);
  if (!usuarioActual && !esPaginaAcceso) {
    location.replace(`login.html?volver=${volver}`);
    return new Promise(() => {});        // se detiene mientras redirige
  }
  // Con sesión pero con un correo que no está en la lista: pantalla "sin acceso" (los datos los protege además la RLS)
  if (usuarioActual && !esPaginaAcceso && !(await accesoAutorizado(usuarioActual))) {
    location.replace(`login.html?sinacceso=1&volver=${volver}`);
    return new Promise(() => {});
  }
  document.documentElement.style.visibility = "";
  return usuarioActual;
})();

// ¿El correo de la sesión está en public.correos_autorizados? (supabase/actualizacion_3.sql)
// La respuesta se guarda en el navegador para poder trabajar sin conexión.
async function accesoAutorizado(u) {
  if (!sb || !u) return false;
  const clave = `auraAcceso_${u.id}`;
  const guardado = () => { try { return localStorage.getItem(clave) === "1"; } catch { return false; } };
  if (sinConexion || !navigator.onLine) return guardado();
  try {
    const r = await Promise.race([sb.rpc("acceso_autorizado"), new Promise((_, mal) => setTimeout(() => mal(new Error("tiempo agotado")), 6000))]);
    if (r.error) {
      // La función aún no existe en la base (falta ejecutar actualizacion_3.sql): no se bloquea a nadie
      if (r.error.code === "PGRST202" || /could not find the function/i.test(r.error.message || "")) { console.warn("AURA: falta supabase/actualizacion_3.sql"); return true; }
      throw r.error;
    }
    try { localStorage.setItem(clave, r.data === true ? "1" : "0"); } catch { /* sin almacenamiento */ }
    return r.data === true;
  } catch { return guardado(); }           // red caída a medio camino: lo último que se supo
}

async function cerrarSesion() {
  try { if (sb) await sb.auth.signOut(); } catch { /* sin conexión: igual se borra la sesión local */ }
  // Datos de la sesión en este navegador (equipos compartidos)
  for (const k of ["auraProyectoActivo", "auraPanelAbierto", "auraCalculista", "auraOficina"]) { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } }
  location.replace("login.html");
}
// Mensajes de error de Supabase en español
function errorEnEspanol(e) {
  const m = (e && (e.message || e.error_description || String(e))) || "";
  if (/correo no autorizado|not authorized|no está autorizado/i.test(m)) return "Este correo no está autorizado para usar AURA. Pídale al administrador que lo agregue.";
  if (/Invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos.";
  if (/Email not confirmed/i.test(m)) return "Debe confirmar su correo antes de iniciar sesión. Revise su bandeja de entrada.";
  if (/already registered|already been registered/i.test(m)) return "Ya existe una cuenta con ese correo.";
  if (/Password should be at least (\d+)/i.test(m)) return `La contraseña debe tener al menos ${m.match(/at least (\d+)/i)[1]} caracteres.`;
  if (/rate limit|too many/i.test(m)) return "Demasiados intentos. Espere unos minutos e intente nuevamente.";
  if (/Unable to validate email|invalid format/i.test(m)) return "El correo no es válido.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "No hay conexión con el servidor. Revise su conexión a internet.";
  return m || "Ocurrió un error inesperado.";
}
