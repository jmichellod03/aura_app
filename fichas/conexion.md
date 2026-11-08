# Ficha normativa: Conexión viga–columna (versión de prueba)

Conexión de una viga de sección I al ala de una columna I. Dos programas en la misma página (`?tipo=corte` y `?tipo=momento`):

- **Corte:** placa de corte soldada a la columna y apernada al alma de la viga. Puede ser simple (a un lado del alma, pernos a corte simple) o doble (una placa a cada lado del alma, pernos a corte doble).
- **Corte y momento:** la misma placa de corte más placas de ala por fuera de las alas, apernadas a la viga y soldadas a la columna (el momento se transmite como el par M<sub>u</sub>/(d + t<sub>fp</sub>)).

Sigue la AISC 360-16 LRFD, Capítulo J, con apoyo del Manual de Diseño ICHA 2000 (distancias, perforaciones y el criterio anterior del bloque de corte). Es una **versión de prueba**: los resultados aún no se han validado contra ejemplos publicados.

Documentos: AISC 360-16 (español, archivo AISC360-16.pdf); Manual de Diseño ICHA 2000 (archivo Perfiles_icha_2010.pdf). El AISC Steel Construction Manual (15.ª ed.) y la AISC 358 no están en el proyecto.

## Criterios y límites

- Diseño por resistencia con las solicitaciones ingresadas. No es una conexión precalificada para marcos sísmicos (AISC 358, AISC 341, NCh 2369): no hay diseño por capacidad ni momento probable de la viga.
- Pernos en conexión tipo aplastamiento, perforaciones estándar (Tabla J3.3), deformación de la perforación como consideración de diseño (J3-6a y J3-6c). No se verifica el deslizamiento crítico.
- La resistencia de cada grupo de pernos es la suma, perno a perno, del menor valor entre el corte del perno y el aplastamiento o desgarre en cada parte conectada. Con excentricidad en el grupo de la placa de corte se usa el método elástico con la menor resistencia de un perno (conservador).
- En las áreas netas el ancho de la perforación se aumenta en 1.6 mm (B4.3b).
- Con doble placa de corte, cada perno tiene dos planos de corte (J3-1 con n<sub>s</sub> = 2) y apoya en las dos placas; la fluencia, la ruptura, el bloque de corte, la flexión y la soldadura de las placas se suman para las dos (cada una toma V<sub>u</sub>/2). Los filetes interiores quedan en una ranura de ancho t<sub>w</sub>: si 2w > t<sub>w</sub> se avisa (criterio de AURA, sin razón D/C), y su ejecución debe revisarse con el fabricante.
- Bloque de corte del alma de la viga: los pernos empujan el alma hacia arriba; el bloque va de la línea de pernos al extremo de la viga, con corte desde el perno inferior hasta la cara interior del ala superior y tracción hasta el extremo. Sin destaje, no cuenta el aporte del ala (criterio de AURA, conservador).
- Bloque de corte de la placa de corte por dos caminos: en L y 1-2-3 (solo corte por la línea de pernos en todo el alto, A<sub>gt</sub> = A<sub>nt</sub> = 0, como el Trabajo Práctico 3 del curso); rige el menor.
- Bloque de corte: por defecto la AISC 360-16 J4-5 con U<sub>bs</sub> = 1; como opción, el criterio anterior de la Especificación ICHA (13.4.3 y 13.4.4), que usan las planillas del curso.
- La flexión de la placa de corte con la excentricidad a (M<sub>u</sub> = V<sub>u</sub>·a, φM<sub>n</sub> = 0.90 F<sub>y</sub> t<sub>p</sub> L<sub>p</sub>²/4) y el filete ≥ ⅝ t<sub>p</sub> son criterios de AURA tomados de la práctica del Manual AISC; el segundo se informa y no entra en la razón D/C.
- La flexión de la viga revisa la compacidad (Tabla B4.1b): ala compacta con F2-1 y no compacta con F3-1; un ala esbelta, un perfil soldado no compacto o un alma no compacta dejan la flexión SIN VERIFICAR. Supone arriostramiento lateral suficiente.
- Columna: J10.1 (flexión local del ala), J10.2 (fluencia local del alma), J10.3 (aplastamiento del alma) y J10.6 (zona panel) con P<sub>r</sub> ≤ 0.4P<sub>c</sub>, despreciando el corte de la columna. No se diseñan atiesadores ni planchas de refuerzo; J10.5 no aplica (carga en una sola ala). En perfiles soldados ("otro") k = t<sub>f</sub>.
- La traducción al español de la AISC 360-16 (pág. 191 del PDF) escribe 2,1 y 2,5 en J3-6c y J3-6d; el original en inglés y la Especificación ICHA (13.3.4, pág. 540) usan 1.2 y 1.5. AURA usa 1.2.
- La Especificación ICHA usa φ = 0.90 para el corte de elementos de conexión (13.5.3, pág. 544); la AISC 360-16 J4-3 usa φ = 1.00.

## Referencias usadas por el cálculo

| Parte del cálculo | Resultado en AURA | Referencia | Documento | Pág. PDF |
|---|---|---|---|---|
| Pernos | F<sub>nv</sub> y F<sub>nt</sub> por grado | Tabla J3.2 | AISC 360-16 (español) | 185 |
| Pernos | Perforación estándar | Tabla J3.3 | AISC 360-16 (español) | 186 |
| Pernos | Perforaciones normales (mm) | Tabla 13.3.3 | Manual de Diseño ICHA 2000, Cap. 5 | 533 |
| Pernos | Paso mínimo 2⅔ d (se prefiere 3d) | J3.3 | AISC 360-16 (español) | 185 |
| Pernos | Distancia mínima al borde | Tabla J3.4 | AISC 360-16 (español) | 187 |
| Pernos | Distancias mínimas usuales | Tabla 3-1 | Manual de Diseño ICHA 2000, Cap. 3 | 207 |
| Pernos | Paso y borde máximos | J3.5 | AISC 360-16 (español) | 186 |
| Pernos | Corte de un perno: φr<sub>nv</sub> | J3-1 | AISC 360-16 (español) | 188 |
| Pernos | Aplastamiento y desgarre | J3-6a, J3-6c | AISC 360-16 (español) | 191 |
| Pernos | Aplastamiento (texto ICHA) | 13.3.4 | Manual de Diseño ICHA 2000, Cap. 5 | 540 |
| Placas | Fluencia y ruptura en tracción | J4-1, J4-2 | AISC 360-16 (español) | 192, 193 |
| Placas | A<sub>e</sub> ≤ 0.85A<sub>g</sub> en placas apernadas | J4.1(b) | AISC 360-16 (español) | 192 |
| Placas | Fluencia y ruptura en corte | J4-3, J4-4 | AISC 360-16 (español) | 193 |
| Placas | Bloque de corte | J4-5 | AISC 360-16 (español) | 193 |
| Placas | Bloque de corte (criterio anterior) | 13.4.3, 13.4.4 | Manual de Diseño ICHA 2000, Cap. 5 | 543 |
| Placas de ala | Compresión (KL/r ≤ 25 o Capítulo E) | J4.4, J4-6 | AISC 360-16 (español) | 194 |
| Soldaduras | Resistencia del filete | J2-4 | AISC 360-16 (español) | 177 |
| Soldaduras | Incremento direccional | J2-5 | AISC 360-16 (español) | 177 |
| Soldaduras | Tamaño mínimo del filete | Tabla J2.4 | AISC 360-16 (español) | 174 |
| Viga | Corte del alma | G2-1, G2.1 | AISC 360-16 (español) | 121 |
| Viga | Bloque de corte del alma (bajo la placa de corte) | J4-5 | AISC 360-16 (español) | 193 |
| Viga | Compacidad del ala (caso 10) y del alma | Tabla B4.1b | AISC 360-16 (español) | 67 |
| Viga | Flexión (plastificación) | F2-1 | AISC 360-16 (español) | 96 |
| Viga | Flexión con ala no compacta | F3-1 | AISC 360-16 (español) | 98 |
| Viga | Ruptura del ala traccionada perforada | F13-1 | AISC 360-16 (español) | 118 |
| Columna | Flexión local del ala | J10-1 | AISC 360-16 (español) | 198 |
| Columna | Fluencia local del alma | J10-2, J10-3 | AISC 360-16 (español) | 199 |
| Columna | Aplastamiento del alma | J10-4, J10-5a, J10-5b | AISC 360-16 (español) | 199, 200 |
| Columna | Corte en la zona panel | J10-9 | AISC 360-16 (español) | 202 |
