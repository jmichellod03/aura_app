# Ficha normativa: Conexión de diagonal a tracción (versión de prueba)

Conexión de una diagonal de tubo rectangular: una placa insertada en una ranura del extremo del tubo, soldada con cuatro filetes, se aperna (corte simple) a una placa nodal soldada a la columna, a la viga o a ambas. Tipología del Trabajo Práctico 3 del curso (carpeta `Acero/Conexiones`).

Sigue la AISC 360-16 LRFD, Capítulos D y J, con apoyo del Manual de Diseño ICHA 2000 (criterio anterior del bloque de corte). Es una **versión de prueba**: los resultados aún no se han validado contra ejemplos publicados.

Documentos: AISC 360-16 (español, archivo AISC360-16.pdf); Manual de Diseño ICHA 2000 (archivo icha_-_manual_de_diseno.pdf). El AISC Steel Construction Manual (15.ª ed.), con la sección de Whitmore, no está en el proyecto.

## Criterios y límites

- Solo tracción con la fuerza mayorada ingresada. No se verifica el pandeo de la diagonal ni de la placa nodal en compresión, ni el diseño por capacidad de arriostramientos sísmicos (AISC 341, NCh 2369).
- Tubo: área bruta con esquinas rectas, A<sub>g</sub> = 2t(B + H − 2t), sin radios de plegado. Área neta en la ranura: A<sub>g</sub> − 2t(t<sub>p</sub> + holgura). Rezago de cortante con el caso 6 de la Tabla D3.1 (una placa concéntrica): exige l ≥ H; con l < H la conexión no cumple.
- Soldadura placa–tubo: cuatro filetes de largo l (J2-4) y ruptura por corte del metal base del tubo (4·l·t) y de la placa (2·l·t<sub>p</sub>) con J4-4. La placa debe sobresalir del tubo al menos w por lado.
- Pernos a corte simple, conexión tipo aplastamiento, perforaciones estándar; cada perno resiste el menor valor entre su corte y el aplastamiento o desgarre en la placa (hacia su extremo del lado de la columna) y en la placa nodal (hacia su borde libre). Áreas netas con d<sub>h</sub> + 1.6 mm (B4.3b).
- Placa de conexión: J4-1, J4-2 con A<sub>n</sub> ≤ 0.85A<sub>g</sub>, y bloque de corte exterior (o lateral con una línea) y central, desde su extremo hasta la fila más alejada.
- Placa nodal: bloque de corte central (no se forman bloques exteriores porque la placa continúa a ambos lados) y fluencia en la sección de Whitmore, L<sub>w</sub> = (n<sub>l</sub> − 1)g + 2(n<sub>f</sub> − 1)s·tan 30° (criterio del Manual AISC, sin limitar por los bordes de la placa).
- Geometría: placa nodal rectangular L<sub>viga</sub> × L<sub>columna</sub> recortada por un borde perpendicular a la diagonal, con el eje de la diagonal por la esquina columna–viga; el borde se ubica tan afuera como permite dejar b<sub>p</sub>/2 + 15 mm a cada lado del eje.
- Soldadura de la placa nodal: cada borde soldado (dos filetes) se verifica para la fuerza completa P<sub>u</sub>, con el incremento direccional J2-5 opcional (θ = 90° − α en la columna, α en la viga). Es un criterio del lado seguro; no se usa el método de las fuerzas uniformes. No se verifican los efectos locales en el ala de la columna ni en la viga.
- Bloque de corte: por defecto la AISC 360-16 J4-5 con U<sub>bs</sub> = 1; como opción, el criterio anterior de la Especificación ICHA (13.4.3 y 13.4.4).

## Referencias usadas por el cálculo

| Parte del cálculo | Resultado en AURA | Referencia | Documento | Pág. PDF |
|---|---|---|---|---|
| Diagonal | Fluencia en la sección bruta | D2-1 | AISC 360-16 (español) | 77 |
| Diagonal | Ruptura en la sección neta efectiva | D2-2, D3-1 | AISC 360-16 (español) | 77, 78 |
| Diagonal | Factor U, tubo rectangular con una placa concéntrica | Tabla D3.1, caso 6 | AISC 360-16 (español) | 79 |
| Áreas netas | Perforación más 1.6 mm | B4.3b | AISC 360-16 (español) | — |
| Pernos | F<sub>nv</sub> por grado | Tabla J3.2 | AISC 360-16 (español) | 185 |
| Pernos | Perforación estándar | Tabla J3.3 | AISC 360-16 (español) | 186 |
| Pernos | Paso mínimo 2⅔ d (se prefiere 3d) | J3.3 | AISC 360-16 (español) | 185 |
| Pernos | Distancia mínima al borde | Tabla J3.4 | AISC 360-16 (español) | 187 |
| Pernos | Paso y borde máximos | J3.5 | AISC 360-16 (español) | 186 |
| Pernos | Corte de un perno | J3-1 | AISC 360-16 (español) | 188 |
| Pernos | Aplastamiento y desgarre | J3-6a, J3-6c | AISC 360-16 (español) | 191 |
| Placas | Fluencia y ruptura en tracción | J4-1, J4-2 | AISC 360-16 (español) | 192, 193 |
| Placas y tubo | Ruptura por corte del metal base | J4-4 | AISC 360-16 (español) | 193 |
| Placas | Bloque de corte | J4-5 | AISC 360-16 (español) | 193 |
| Placas | Bloque de corte (criterio anterior) | 13.4.3, 13.4.4 | Manual de Diseño ICHA 2000, Cap. 5 | 543 |
| Soldaduras | Resistencia del filete | J2-4 | AISC 360-16 (español) | 177 |
| Soldaduras | Incremento direccional | J2-5 | AISC 360-16 (español) | 177 |
| Soldaduras | Tamaño mínimo del filete | Tabla J2.4 | AISC 360-16 (español) | 174 |
| Placa nodal | Sección de Whitmore | Manual AISC, Parte 9 | No está en el proyecto | — |

## Comparación con el Trabajo Práctico 3 (sección 9)

Con los datos del TP (P<sub>u</sub> = 20.275 tf, 4 pernos A325 de 5/8", placas de 115 × 10 mm y nodal de 10 mm, bordes de 30 mm), AURA difiere en: F<sub>nv</sub> = 3800 kgf/cm² (el TP usa 3720), la perforación más 1.6 mm en las áreas netas, el bloque exterior además del central, la soldadura de la placa nodal con θ distinto en cada borde (el TP usa α en ambos) y la verificación del tubo, que el TP no hace.
