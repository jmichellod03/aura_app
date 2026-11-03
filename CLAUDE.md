# AURA — Ingeniería estructural

App web (PWA) de verificación estructural según normas chilenas y AISC. HTML + JavaScript puro,
sin build ni dependencias de npm. Se publica con GitHub Pages desde la rama `main` (carpeta raíz).
Todo el texto de la interfaz, las memorias y los commits va en **español (Chile)**.

## Estructura

- `index.html`: inicio, proyectos y enlaces a cada herramienta.
- Páginas de cálculo, cada una autónoma (HTML + CSS + JS en el mismo archivo):
  - `acero.html`: vigas y columnas laminadas, AISC 360-16 LRFD.
  - `reticulada.html`: vigas reticuladas (cordones, diagonales y montantes), AISC 360-16 LRFD.
    - Formulario en pasos: 1 geometría y acero, 2 cargas, 3 perfiles y longitudes, 4 origen de las solicitaciones.
    - Solicitaciones (`fuente`): por defecto las calcula AURA con `analizar()` (rigidez directa, pórtico plano, misma idealización que el `.s2k`, peso propio en D) y `solicitacionesAura()` (envolventes NCh 3171 por grupo, pares (P, M) por barra y combinación para los cordones, flecha con S1/S2). Alternativa: ingresarlas desde un modelo externo. El `.s2k` sirve para comprobar en SAP2000.
    - Barras a tracción (Cap. D) y compresión (Cap. E, con E5 para ángulos y E6 para 2L).
    - Dos hipótesis de carga (`sModo`): costaneras **sobre los nudos** (barras articuladas, solo carga axial) o **entre nudos** (cordones continuos: ambos cordones a flexocompresión con B1 y H1-1; canales C con F2/F3 y G2, tubos rectangulares con F7 y G4; con otros perfiles quedan "sin verificar" y no dan CUMPLE).
    - La memoria incluye una sección de alcance, hipótesis y limitaciones; no debe concluir "cumple" sobre algo que no se verificó.
    - Geometría en `geometria(tipo, n)`: en la Warren los nudos superiores van a media distancia, para que todos los nudos de los cordones reciban barras.
    - Plano DXF (`generarDXF()`, clase `Dxf`): R12 en Windows-1252, milímetros y por capas; elevación con ejes, contornos, numeración, apoyos y cotas; detalles de secciones ampliados a escala indicada; cuadro de barras con pesos; notas. No dibuja uniones.
    - Exporta el modelo a SAP2000 (`.s2k`, kgf-m, plano XZ, combinaciones NCh 3171 y envolvente ENV). Según la hipótesis, las cargas en kgf/m van como fuerzas en los nudos (con R2 restringido en todos los nudos) o distribuidas en el cordón superior. El encabezado sigue el formato de SAP2000 v26.
  - `hormigon.html`: ACI 318-08.
  - `madera.html`: NCh 1198:2024.
  - `mle.html`: NCh 2165 y NCh 1198.
  - `espectros.html`: NCh 433, DS 117 y NCh 2369.
  - `vial.html` y `rigido.html`: Manual de Carreteras Vol. 3 / AASHTO 93.
- `memo.js`: memoria de cálculo compartida (pasos desplegables con KaTeX, `.tex`, `.zip` para Overleaf con figuras PNG).
- `proyectos.js`: proyectos y elementos guardados (IndexedDB local o Supabase si hay sesión).
- `nube.js`: cliente Supabase y sesión. La clave es la *publishable*, no la de servicio.
- `sw.js`: service worker para uso sin conexión.
- `supabase/`: esquema SQL de la base de datos.

## Convenciones de cálculo

- Unidades internas: **kgf y cm** (tensiones en kgf/cm², momentos en kgf·cm). Las entradas pueden venir en m, mm, kgf·m o tf; se convierten al leer los datos.
- Aceros chilenos: A37-24ES, A42-27ES y A52-34ES; E = 2.100.000 kgf/cm² y G = 810.000 kgf/cm².
- Números en pantalla con `fmt(x, d)` (formato es-CL: coma decimal, punto de miles).
- En LaTeX, usar `` L`...` `` (`String.raw`) y `tn(x, d)` para los números.
- Cada verificación muestra la razón demanda/capacidad (D/C) y la referencia a la ecuación o cláusula de la norma (por ejemplo `"E3-2"` o `"Tabla D3.1"`).
- Clase `Memo` (definida en cada página):
  - `h()`: sección; `sub()`: subsección.
  - `row(k, v, ref)`: fila de resultados.
  - `eq(tex, ref)`: ecuación con valores reemplazados.
  - `p(tex, soloTex)`: párrafo.
  - `note()`: advertencia.
  - `raw()`: LaTeX directo (tablas).
- Validar las entradas con `datosInvalidos(reglas)` de `memo.js`. Con datos inválidos no se calcula y `ultimoTex` queda vacío, para no mostrar un "CUMPLE" falso.
- El veredicto usa la clase `.verdict ok|bad`. Para que `proyectos.js` lea el resumen, el texto debe contener `razón máxima = X`.

## Al agregar o cambiar una página de cálculo

1. **Página:** copiar la cabecera y los estilos de `acero.html` para mantener el aspecto.
2. **Integración con proyectos:** definir `window.AURA_MEMO = { tipo, elemento(), tex(), nombre(), recalcular(valores) }`. Todos los campos del formulario deben estar dentro de `<main>` y tener `id`, porque así se guardan y se restauran.
3. **Registro en la app:**
   - agregar la página a `PAGINAS_CALCULO` en `proyectos.js`;
   - agregar el enlace en `index.html`;
   - agregarla a `ARCHIVOS` en `sw.js`.
4. **Versiones y caché:** al publicar cambios, subir `VERSION` en `sw.js` para que los dispositivos actualicen la copia sin conexión. Si se modifica `memo.js` o `proyectos.js`, subir también el `?v=N` con que lo cargan las páginas.
5. **Recursos externos:** solo KaTeX (cdnjs) y supabase-js (jsdelivr). No agregar otras dependencias externas.

## Catálogos de perfiles

- `acero.html`: catálogo Cintac de laminados HEA, HEB, IPE e IPN (A, I y W del catálogo; Z, J y Cw calculados).
- `reticulada.html`:
  - UPN laminados (A e I de Prodalam / Cintac);
  - canales C y ángulos L plegados Cintac. Las propiedades se calculan con la línea media y un radio interior igual al espesor, y reproducen el peso del catálogo.
  - tubos rectangulares y cuadrados Cintac (sección `R`): línea media con radio interior igual al espesor; para la verificación se usa el espesor de diseño 0,93e (B4.2) y para el modelo SAP el nominal.
- Fuentes: catálogo general Cintac 2020, catálogo Prodalam y catálogo de vigas laminadas Cintac.

## Probar

- Servir la carpeta con `python3 -m http.server` y abrir la página en el navegador. No abrir con `file://`, porque el service worker no funciona así.
- Revisar que no haya errores en la consola y que la memoria `.tex` compile en Overleaf.
- Comprobar a mano al menos un resultado contra la norma cuando se agregue una verificación nueva.
