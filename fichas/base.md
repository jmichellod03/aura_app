# Ficha normativa: Placa base articulada (versión de prueba)

Base articulada de columna de acero de sección I sobre un pedestal de hormigón, con compresión y corte. La placa sigue la AISC Design Guide 1, el aplastamiento y la soldadura la AISC 360-16 y los pernos el Apéndice D del ACI 318-08. Es una **versión de prueba**: los resultados aún no se han validado contra ejemplos publicados.

Documentos: AISC 360-16 (español); ACI 318-08 (español); Manual de Diseño ICHA 2000 (Instituto Chileno del Acero). La AISC Design Guide 1 (2.ª ed.) no está en el proyecto.

## Criterios y límites

- No verifica tracción en los pernos, interacción tracción–corte, momento en la base, llave de corte ni el pedestal (armaduras). Con la llave de corte el veredicto queda SIN VERIFICAR.
- Las expresiones del Apéndice D del ACI 318-08 se evalúan en N, mm y MPa y se convierten a tf.
- El arrancamiento por corte se revisa con dos casos: fila frontal con la mitad del corte y fila trasera con todo el corte (perforaciones sobredimensionadas).
- φc de aplastamiento: 0.65 (AISC 360-16 J8) o 0.60 (Especificación ICHA 13.9), a elección.
- La golilla (cuadrada, lado y espesor de la Tabla 2.3 de la AISC Design Guide 1 llevada a mm) debe quedar fuera del perfil y de su soldadura: la distancia libre debe ser al menos el tamaño del filete (criterio constructivo de AURA).
- Sin torque, la distancia mínima al borde (D.8.2) usa el recubrimiento de 7.7.1c (hormigón expuesto): 50 mm para pernos de más de 16 mm y 40 mm hasta 16 mm, medido a la superficie del perno.
- El aplastamiento en la perforación (J3.10) se verifica en la golilla soldada, porque la perforación de la placa está sobredimensionada. No se verifica la soldadura de la golilla.
- El tamaño máximo de J2.2b no se verifica: se refiere a uniones traslapadas, no a la unión en T columna–placa.
- Manual ICHA: la página del PDF es la del archivo Perfiles_icha_2010.pdf.

## Referencias usadas por el cálculo

| Parte del cálculo | Resultado en AURA | Referencia | Documento | Pág. PDF |
|---|---|---|---|---|
| Aplastamiento del hormigón | Resistencia al aplastamiento: φcPp | J8-2 | AISC 360-16 (español) |  |
| Aplastamiento del hormigón | Resistencia al aplastamiento: φcPp (φc = 0.60) | 13.9.2 | Manual de Diseño ICHA 2000, Cap. 5 | 546 |
| Espesor de la placa base | Voladizos m, n y λn' | 3.1 | AISC Design Guide 1 (no está en el proyecto) |  |
| Espesor de la placa base | Espesor requerido: treq | 3.3.14a | AISC Design Guide 1 (no está en el proyecto) |  |
| Espesor de la placa base | Placa sin cepillar hasta 50 mm | 16.2.8 | Manual de Diseño ICHA 2000, Cap. 5 | 578 |
| Pernos de anclaje: disposición | Perforación en la placa | Tabla 4-46 | Manual de Diseño ICHA 2000, Cap. 4 | 332 |
| Pernos de anclaje: disposición | Aceros para pernos | Tabla 4-45 | Manual de Diseño ICHA 2000, Cap. 4 | 332 |
| Pernos de anclaje: disposición | Golilla: lado × espesor | Tabla 2.3 | AISC Design Guide 1 (no está en el proyecto) |  |
| Pernos de anclaje: disposición | Separación mínima entre pernos (4da sin torque, 6da con torque) | D.8.1 | ACI 318-08 (español) |  |
| Pernos de anclaje: disposición | Distancia mínima al borde | D.8.2, 7.7.1 | ACI 318-08 (español) |  |
| Transferencia del corte | Resistencia por roce | 3.5 | AISC Design Guide 1 (no está en el proyecto) |  |
| Transferencia del corte | Placa de corte sobre unas 5 t (criterio de detallamiento) | 3.3 | Manual de Diseño ICHA 2000, Cap. 3 | 234 |
| Resistencia del acero del perno | Resistencia a corte del grupo: φVsa | D-20, D.6.1.3 | ACI 318-08 (español) |  |
| Arrancamiento del hormigón por corte | Vb, AVc, AVco, ψed,V, ψc,V, ψh,V | D-22 a D-29 | ACI 318-08 (español) |  |
| Arrancamiento del hormigón por corte | Miembro angosto: ca1 ≤ máx(ca2/1.5 ; ha/1.5 ; s/3) | D.6.2.4 | ACI 318-08 (español) | 432 |
| Aplastamiento en la perforación de la golilla | Aplastamiento del grupo: φRn | J3-6a | AISC 360-16 (español) |  |
| Desprendimiento por palanca | h'ef, Nb, Ncbg, φVcpg | D.5.2.3, D-7, D-8, D-31 | ACI 318-08 (español) |  |
| Factores de reducción | φ = 0.65 acero dúctil a corte; φ = 0.70 hormigón, condición B | D.4.4 | ACI 318-08 (español) |  |
| Pernos de anclaje (general) | Diseño según ACI o PCI | 13.10 | Manual de Diseño ICHA 2000, Cap. 5 | 547 |
| Soldadura columna – placa | Resistencia del filete: φrn | J2-4 | AISC 360-16 (español) |  |
| Soldadura columna – placa | Tamaño mínimo del filete: alma ; alas (parte más delgada de cada unión) | Tabla J2.4 | AISC 360-16 (español) |  |
| Soldadura columna – placa | Metal base del alma, fluencia por corte | J4-3 | AISC 360-16 (español) |  |
| Soldadura columna – placa | Compresión por contacto pleno | 13.1.4 | Manual de Diseño ICHA 2000, Cap. 5 | 511 |
| Soldadura columna – placa | Holgura máxima de 2 mm en el contacto | 16.4.4 | Manual de Diseño ICHA 2000, Cap. 5 | 579 |
