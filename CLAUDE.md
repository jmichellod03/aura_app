# AURA — Ingeniería estructural

App web (PWA) de verificación estructural según normas chilenas y AISC. HTML + JavaScript puro,
sin build ni dependencias de npm. Se publica con GitHub Pages desde la rama `main` (carpeta raíz).
Todo el texto de la interfaz, las memorias y los commits va en **español (Chile)**.

## Estructura

- `index.html`: inicio con buscador y filtros de herramientas, visor 3D y proyectos.
- `login.html`: acceso (Supabase) con visor 3D.
- `aura.css`: estilo común de pantalla (colores, cabecera, logo MMP, paneles y campos). Se carga después de los estilos de cada página (en `login.html`, antes) y solo aplica en `@media screen`, salvo el recorte del logo.
  - Colores: azul `#00008B` (barras y botones principales), gris acero `#e3e6ea` (fondo), blanco nieve `#fffafa` (paneles) y naranja `#bf4b00` (acciones críticas y máximos).
- `modelo3d.js`: visor WebGL propio, sin dependencias, para modelos `.glb` sin texturas. Lo usan el inicio y el acceso con `modelos/torre.glb`.
  - `Geo3D.Escena`: geometría paramétrica en mm (`caja`, `extruir` de un contorno con `aPunto(u, v, w)`, `tubo`, `barra` por polilínea, `dobleT` con acuerdos) con colores por material (`Geo3D.MAT`: acero, hormigón, armadura, madera, MLE, OSB, placa, capas de pavimento; `critico` = naranja) y grupos que se pueden ocultar.
  - `Zona2D3D.montar({ antes, fuente2D, construir, observar, capas })`: zona "Vista del elemento" con la copia del dibujo 2D de la página y el modelo 3D (2D, 3D o ambos; vistas iso/frente/lado/planta, zoom, capas). Se actualiza sola con un `MutationObserver` sobre los resultados: no hay que tocar las funciones de cálculo. La copia 2D lleva `data-sin-figura` para no alterar las figuras de la memoria. La usan todas las páginas de cálculo menos espectros; cada una arma su modelo desde los resultados ya guardados (`ultimoViga`, `ultimoLosa`, `ultimoMadera`, `ultimoMLE`, `ultimoR`, `ultimoRes`, `ultimoD`, `ultimoPav`).
  - Elementos verificados en naranja si no cumplen. Lo que la página no calcula se dibuja como referencial y se dice en el comentario (apoyos, placas base, cartelas, barras de traspaso a 300 mm, tramo de 1.5 m de la viga de hormigón y de 2 m del muro de contención).
  - `window.AURA_3D()` entrega el PNG de la vista 3D visible; `descargarZipMemoria` (memo.js, `figura3D`) lo agrega al final de la memoria como "Modelo 3D del elemento".
  - El modelo es «Skyscraper Tower» de VertaScan (Sketchfab), licencia CC BY 4.0: el crédito bajo el visor es obligatorio.
  - No está en `ARCHIVOS` de `sw.js` (4,6 MB): se guarda en caché la primera vez que se abre con conexión.
- `tablero.js`: presentación de resultados en las páginas de cálculo (solo pantalla; no toca cálculos, el texto del veredicto ni la memoria .tex). Reorganiza el DOM que ya dibuja cada página, observándolo:
  - botón "Plegar" en "Datos de entrada" (estado en `localStorage`);
  - tablero: medidor con el D/C máximo leído de "razón máxima = X" del veredicto (ámbar si dice SIN VERIFICAR), veredicto destacado y fijo y semáforo de las tarjetas del resumen tomado de su `.bar` (verde ≤ 0.9, ámbar ≤ 1, naranja > 1; tarjetas sin barra son informativas);
  - procedimiento (`.memo`) en tarjetas por `h3`, plegables, con estado según sus marcas `.tag` (toda `.tag.bad` es falla salvo las de `INFORMATIVAS`) e índice de chips fijo (se quita con la memoria vacía). El `h3` original encabeza la tarjeta y contiene su botón; al imprimir se ve como título. `prepararFiguras` (memo.js) despliega un instante las tarjetas plegadas para no perder figuras.
- `icons/logo-mmp.webp`: logo MMP (fondo transparente; `aura.css` lo recorta al dibujo).
- `dxf.js`: planos DXF compartidos (`PlanoDXF`, R12, mm, capas normalizadas `CAPAS_PLANO`). Lámina serie A (A3 a A0) con marco, margen de archivo y viñeta según NCh 13; escalas normalizadas elegidas por vista; la vista principal queda a tamaño real en el espacio modelo. La viñeta toma proyecto, mandante, calculista y oficina del proyecto activo. Lo usan acero, hormigón (viga y losa), madera (envigado, tabique, pilar y muro de corte), MLE, muro de contención (botón "Plano con lámina NCh 13") y espectros. Su clase se llama `DxfR12` para convivir con la clase `Dxf` propia de reticulada, placa y muro. **Pendiente:** muro.html tiene dos planos (`descargarDXF`, corte típico del equipo, y `descargarDXFLamina`, con lámina y viñeta); hay que elegir uno.
  - Designaciones chilenas en las notas: acero NCh 203 (A42-27ES), barras NCh 204 (A630-420H), hormigón por grado G (NCh 170), madera NCh 1207 / NCh 1198:2024, MLE NCh 2165, preservación NCh 819, ejecución de acero NCh 428. ø se escribe como `%%c` en el DXF.
  - Cada página guarda los resultados de su último cálculo (`ultimoViga`, `ultimoLosa`, `ultimoMadera`, `ultimoMLE`, `ultimoR`) o los recalcula sin memoria (acero, espectros); el plano no repite ni cambia el cálculo.
- Páginas de cálculo, cada una autónoma (HTML + CSS + JS en el mismo archivo):
  - `acero.html`: vigas y columnas laminadas, AISC 360-16 LRFD.
  - `reticulada.html`: vigas reticuladas (cordones, diagonales y montantes), AISC 360-16 LRFD.
    - Formulario en pasos: 1 geometría y acero, 2 cargas, 3 perfiles y longitudes, 4 origen de las solicitaciones.
    - Solicitaciones (`fuente`): por defecto las calcula AURA con `analizar()` (rigidez directa, pórtico plano, misma idealización que el `.s2k`, peso propio en D) y `solicitacionesAura()` (envolventes NCh 3171 por grupo con D, L, Lr, S y W —sin las combinaciones sísmicas, que se declaran en el alcance—, pares (P, M) por barra y combinación para los cordones, flecha en valor absoluto con D + L, D + Lr, D + S y D + W). Alternativa: ingresarlas desde un modelo externo. El `.s2k` sirve para comprobar en SAP2000.
    - Longitudes: L_y del cordón inferior = luz por defecto (`def.ly`); si se reduce y el cordón queda comprimido, el veredicto pide verificar los arriostramientos laterales.
    - Barras a tracción (Cap. D) y compresión (Cap. E, con E5 para ángulos y E6 para 2L).
    - Dos hipótesis de carga (`sModo`): costaneras **sobre los nudos** (barras articuladas, solo carga axial) o **entre nudos** (cordones continuos: ambos cordones a flexocompresión con B1 y H1-1; canales C con F2/F3 y G2, tubos rectangulares con F7 y G4; con otros perfiles quedan "sin verificar" y no dan CUMPLE).
    - Canales en los cordones (`cs_ori`, `ci_ori`): por defecto **alma perpendicular al plano, alas hacia el interior** (`orientarCanal`: x = eje débil del perfil en el plano, simetría fuera del plano, tracción por las alas, flexión F6 y corte G6, ejes locales girados 90° en SAP); opción alma en el plano (F2/F3, G2).
    - La memoria incluye una sección de alcance, hipótesis y limitaciones; no debe concluir "cumple" sobre algo que no se verificó.
    - Geometría en `geometria(tipo, n)`: en la Warren los nudos superiores van a media distancia, para que todos los nudos de los cordones reciban barras.
    - Plano DXF (`generarDXF()`, clase `Dxf`): R12 en Windows-1252, milímetros y por capas; elevación con ejes, contornos, numeración, apoyos y cotas; detalles de secciones ampliados a escala indicada; cuadro de barras con pesos; notas. No dibuja uniones.
    - Exporta el modelo a SAP2000 (`.s2k`, kgf-m, plano XZ, combinaciones NCh 3171 y envolvente ENV). Según la hipótesis, las cargas en kgf/m van como fuerzas en los nudos (todas las barras articuladas, dejando en cada nudo un solo extremo sin liberar para que sea estable) o distribuidas en el cordón superior. El encabezado sigue el formato de SAP2000 v26.
  - `placa.html`: losa con placa colaborante Instadeck 0,8 mm (Cintac).
    - Sigue el procedimiento del fabricante con sus tablas (SDI 1991): Tabla I sobrecarga admisible (columna de la primera luz tabulada ≥ L, sin interpolar), Tabla II deformaciones por número de tramos (más la flecha de servicio con 5qL⁴/384EI y límite L/240, L/300 o L/360: sin alzaprimas, el peso propio sobre la placa sola con E_s·I⁺ y q_D + q_L sobre la compuesta con E_c·I_c; con alzaprimas, todo sobre la compuesta), Tabla III alzaprimado temporal y Tabla IV peso propio y cubicación. Los valores no se recalculan.
    - Espesor `eh`: automático (el menor que cumple la losa) o fijo. La demanda es carga permanente adicional + sobrecarga de uso; el peso propio se suma solo si se marca `ppDem` (la Tabla I ya lo considera). Cargas puntuales: +30 % y aviso de punzonamiento.
    - Malla de retracción ≥ 1,8 cm²/m con s ≤ mín(5e_h ; 45 cm) (ACI 318-08 7.12.2.2); el área se calcula con el diámetro y el espaciamiento de la barra (`dMalla`, `sMalla`). Conectores en los apoyos: Q_n con AISC I8-1 (R_g, R_p) o dato del fabricante; resistencia ≥ 11,2 tf por metro de ancho (nota d de la Tabla I); altura ≥ 38 mm sobre la cresta y recubrimiento ≥ 13 mm (I8.2d); un conector más bajo que el nervio da D/C infinito. f'c ≥ 214 kgf/cm² (21 MPa, I1.3). Sin conectores la losa queda "sin verificar".
    - Viga de apoyo (`serieV`, `perfilV`): catálogo de acero.html (HEA, HEB, IPE, IPN) u "otro" con el área `Asv`. Con perfil del catálogo se verifica d ≤ 2,5 t_f (I8.1) y el ancho del ala para los conectores ((n−1)·4d + 1,6d, I8.2d); estas verificaciones y w_r ≥ 50 mm (I3.2c, con `DECK`) llevan `viga: true`, no cambian el espesor automático y el veredicto las informa como fallas de la viga. Los conectores van en todos los valles (nota d).
    - Plano DXF (`generarDXF()`, clases `Dxf` y `detalle` copiadas de reticulada.html): elevación entre vigas con alzaprimas, elevación de la viga con conectores (si se calcula la viga), cortes A-A y B-B a 5:1 y notas. La geometría de cresta y valle de la placa (`DECK`) es aproximada, medida del dibujo de la ficha.
    - Opcional: conectores de la viga de apoyo con acción compuesta completa (I3.1a, I3-1a/b, I3.2c); no se verifica la flexión de la viga compuesta ni la armadura negativa.
  - `hormigon.html`: ACI 318-08.
  - `muro.html`: muro de contención en voladizo de hormigón armado, por metro de muro. Sigue el procedimiento del curso Diseño de Proyectos de Ingeniería (pautas y ejemplo del profesor, planillas Blockpad del usuario).
    - Geometría: pantalla con trasdós vertical y talud hacia el pie (`ec` en el coronamiento, `eb` en la base), zapata (`Bp`, `Bt`, `Hf`) y dentellón opcional (`bd`, `hd`, `xd` desde la punta). Relleno horizontal (β = 0, ψ = 90°). Ejes: x desde la punta del pie, y desde la base de la zapata.
    - Estabilidad: Rankine (K_a, K_p) con H = H_f + H_m en el plano del talón; volcamiento, deslizamiento (μ = tan(2φ_s/3), c' = 0,5 c_s, pasivo solo en el dentellón, total o nulo según `pasivo`) y tensión de contacto (tercio central o 2N/3x); en sismo, largo comprimido 3x/B ≥ `pcMin` (80 % por defecto, pauta C4 del curso). El pasivo no entra en el momento resistente. `qEstab`: la sobrecarga sobre el talón suma peso estabilizante (como el ejemplo del curso).
    - Sismo: C_sh = 0,5 A_0, C_sv = 0,7 C_sh, K_as de Mononobe-Okabe con δ = 2φ_r/3; ΔDE_a a 2H/3 y ΔDE_q a H/2; fuerzas inerciales C_sh·W (relleno con R_i). FS mínimos editables (por defecto 1,5 / 1,5 / 3 y 1,265 / 1,1 / 2).
    - Diseño ACI 318-08: 1,6 H + 1,0 E; flexión con μ = M_u/(φ 0,85 f'c b d²) y cuantías del curso (0,0018 b d principal, 0,0015 b d cara opuesta, 0,001 b h por cara de repartición, ε_t ≥ 0,004 con φ según ε_t, ACI 318-08 10.3.5 y 9.3.2; horizontal de la pantalla 0,00125 por cara con barras > φ16, 14.3.3); espaciamiento propuesto en múltiplos de 2,5 cm con s ≤ mín(3h ; 45). Pantalla sísmica según `critPant` ("total", por defecto: 1,6 H estático y el sismo con la altura total H y todas las fuerzas, como la pauta C4; "curso": estático con H_m y sismo con H, como el ejemplo del profesor; "pantalla": solo H_m y la inercia de la pantalla). Pie: presión de servicio × 1,6 (o U ponderado en sismo) − 0,9 peso propio, corte a d de la cara (15.5.2). Talón: corte en la cara del trasdós (11.1.3.1: la reacción no comprime), sin reacción del suelo, 1,2 D + 1,6 L; en sismo según `talSis` ("csv", por defecto: (1,2 + C_sv) D + 1,0 L; "12": la misma combinación estática, como la pauta C4).
    - Plano DXF (`generarDXF()`, clase `Dxf` copiada de placa.html, con el tipo de línea DASHED): corte típico en mm por capas (MURO, ARMADURA, RELLENO, TERRENO, COTAS, TEXTOS) con el relleno achurado, el terreno, las armaduras dibujadas (`armD` de `verificar()`: barras verticales, mallas de la zapata con ganchos y barras de repartición como puntos), rótulos, cotas, cuadro de armaduras y notas. φ se escribe `%%c`. No detalla anclajes, empalmes ni el dentellón.
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
- Números con `fmt(x, d)`: **punto decimal y espacio duro de miles** (`5 963.9`), también en los números escritos a mano en textos y LaTeX. No usar coma decimal ni punto de miles. En LaTeX, `tn(x, d)` convierte el espacio en `\,`; en DXF se escribe como espacio normal.
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
- Si falta una verificación exigida que la página no calcula, el veredicto y la memoria dicen `SIN VERIFICAR`, no `CUMPLE`; `proyectos.js` lo guarda sin estado de cumple o no cumple. Un requisito que no entra en la razón D/C y falla se indica como motivo en el veredicto.

## Al agregar o cambiar una página de cálculo

1. **Página:** copiar la cabecera (con el logo MMP) y los estilos de `acero.html`, cargar `aura.css` al final del `<head>` y `tablero.js` después de `memo.js`, para mantener el aspecto y la presentación de resultados. Las marcas `.tag.bad` que no sean una falla (clasificaciones, recortes constructivos) deben agregarse a `INFORMATIVAS` en `tablero.js`.
2. **Plano y memoria:** botones "Descargar plano (.dxf)" (con `dxf.js`) y "Descargar memoria (.zip)" (`descargarZipMemoria` de `memo.js`).
3. **Integración con proyectos:** definir `window.AURA_MEMO = { tipo, elemento(), tex(), nombre(), recalcular(valores) }`. Todos los campos del formulario deben estar dentro de `<main>` y tener `id`, porque así se guardan y se restauran.
4. **Registro en la app:**
   - agregar la página a `PAGINAS_CALCULO` en `proyectos.js`;
   - agregar el enlace en `index.html`;
   - agregarla a `ARCHIVOS` en `sw.js`.
5. **Versiones y caché:** al publicar cambios, subir `VERSION` en `sw.js` para que los dispositivos actualicen la copia sin conexión. Si se modifica `memo.js`, `proyectos.js`, `aura.css`, `modelo3d.js`, `dxf.js` o `tablero.js`, subir también el `?v=N` con que lo cargan las páginas.
6. **Recursos externos:** solo KaTeX (cdnjs) y supabase-js (jsdelivr). No agregar otras dependencias externas.

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
