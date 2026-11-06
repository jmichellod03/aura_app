# Ficha normativa: Placa base articulada (versión de prueba)

Base articulada de columna de acero de sección I sobre un pedestal de hormigón, con compresión y corte. La placa sigue la AISC Design Guide 1, el aplastamiento y la soldadura la AISC 360-16 y los pernos el Apéndice D del ACI 318-08. Es una **versión de prueba**: los resultados aún no se han validado contra ejemplos publicados.

Documentos: AISC 360-16 (español); ACI 318-08 (español); Manual de Diseño ICHA 2000 (Instituto Chileno del Acero). La AISC Design Guide 1 (2.ª ed.) no está en el proyecto.

## Criterios y límites

- No verifica momento en la base ni las armaduras del pedestal. La tracción T_u es concéntrica, se reparte por igual entre los 4 pernos y se supone concomitante con todo el corte; no se considera el efecto de palanca en la placa.
- Con levantamiento (T_u > 0) no se acepta el roce: el corte va por los pernos o por la llave.
- Sismo (opción): resistencias del hormigón por 0.75 (D.3.3.3) y, a elección, falla dúctil del acero (D.3.3.4: la resistencia del acero debe ser menor que la del menor modo del hormigón) o 0.4 × todas las resistencias (D.3.3.6).
- Armadura de anclaje a tracción (opción): reemplaza el cono de hormigón con 0.75 n A_b f_y (A630-420H); su desarrollo a ambos lados del plano de falla no se verifica.
- Extracción: tuerca hexagonal pesada con F = 1.5 d_a + 3 mm (A_brg = 0.866 F² − π d_a²/4) o gancho con 3 d_a ≤ e_h ≤ 4.5 d_a.
- Flexión de la placa por la tracción de los pernos: voladizo de brazo x hasta la cara del perfil más cercana (ala o alma) y ancho efectivo a 45°, hasta x por lado, limitado por la mitad de la separación al perno vecino y por el borde de la placa; t_req = √(4 N_ua x / (φ F_y b_ef)).
- En sismo el hormigón se supone fisurado (D.3.3.3): la página bloquea la opción "no fisurado".
- Desprendimiento lateral: D-17 con el coeficiente 13 de la versión métrica; en el grupo (D-18) N_sb va sin el factor de esquina; con s ≥ 6c_a1 los pernos se toman individuales, con ese factor.
- Llave de corte (AISC Design Guide 1, 2.ª ed., 3.5): aplastamiento φ 0.85 f'c b_L d_L con φ = 0.65 y d_L = H_L − grout; flexión con M_u = V_u (grout + d_L/2) y Z = b t²/4; soldadura con el momento como par de fuerzas de brazo t_L (criterio de AURA, conservador); arrancamiento del hormigón 0.33 φ √f'c A_V (MPa) con φ = 0.75 y A_V a 45° descontando el área de apoyo (criterio de ACI 349 que usa la DG1).
- Las expresiones del Apéndice D del ACI 318-08 se evalúan en N, mm y MPa y se convierten a tf.
- El arrancamiento por corte se revisa con dos casos: fila frontal con la mitad del corte y fila trasera con todo el corte (perforaciones sobredimensionadas).
- φc de aplastamiento: 0.65 (AISC 360-16 J8) o 0.60 (Especificación ICHA 13.9), a elección.
- La golilla (cuadrada, lado y espesor de la Tabla 2.3 de la AISC Design Guide 1 llevada a mm) debe quedar fuera del perfil y de su soldadura: la distancia libre debe ser al menos el tamaño del filete (criterio constructivo de AURA).
- Sin torque, la distancia mínima al borde (D.8.2) usa el recubrimiento de 7.7.1c (hormigón expuesto): 50 mm para pernos de más de 16 mm y 40 mm hasta 16 mm, medido a la superficie del perno.
- El aplastamiento en la perforación (J3.10) se verifica en la golilla soldada, porque la perforación de la placa está sobredimensionada. Con el corte por los pernos, la soldadura de cada golilla (filete en su contorno, 4 a_g) toma V_u/4 (J2-4), con mínimo de la Tabla J2.4 y máximo de J2.2b (el filete corre por el borde de la golilla).
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
| Tracción en los pernos | Tracción en el acero, por perno: φNsa | D-3 | ACI 318-08 (español) |  |
| Tracción en los pernos | Arrancamiento del cono por tracción: φNcbg | D-5 a D-11 | ACI 318-08 (español) |  |
| Tracción en los pernos | Armadura de anclaje a tracción | D.5.2.9 | ACI 318-08 (español) |  |
| Tracción en los pernos | Extracción: Np con tuerca o gancho, φNpn | D-14, D-15, D-16 | ACI 318-08 (español) |  |
| Tracción en los pernos | Desprendimiento lateral: Nsb, Nsbg | D-17, D-18, D.5.4.2 | ACI 318-08 (español) |  |
| Aplastamiento en la perforación de la golilla | Soldadura de las golillas: φRn y tamaños | J2-4, Tabla J2.4, J2.2b | AISC 360-16 (español) |  |
| Tracción en los pernos | Flexión de la placa por la tracción de los pernos | 3.4 | AISC Design Guide 1 (no está en el proyecto) |  |
| Interacción tracción – corte | Nua/φNn + Vua/φVn ≤ 1.2 | D.7, D-32 | ACI 318-08 (español) |  |
| Sismo | Hormigón fisurado; 0.75 en el hormigón; falla dúctil; 0.4 × resistencia | D.3.3.3, D.3.3.4, D.3.3.6 | ACI 318-08 (español) |  |
| Llave de corte | Procedimiento general | 3.5 | AISC Design Guide 1 (no está en el proyecto) |  |
| Llave de corte | Aplastamiento del hormigón | 10.14.1, 9.3.2.4 | ACI 318-08 (español) |  |
| Llave de corte | Flexión de la llave | F11-1 | AISC 360-16 (español) |  |
| Llave de corte | Fluencia por corte de la llave | J4-3 | AISC 360-16 (español) |  |
| Llave de corte | Soldadura de la llave y tamaño mínimo | J2-4, Tabla J2.4 | AISC 360-16 (español) |  |
| Desprendimiento por palanca | h'ef, Nb, Ncbg, φVcpg | D.5.2.3, D-7, D-8, D-31 | ACI 318-08 (español) |  |
| Factores de reducción | φ = 0.65 acero dúctil a corte; φ = 0.70 hormigón, condición B | D.4.4 | ACI 318-08 (español) |  |
| Pernos de anclaje (general) | Diseño según ACI o PCI | 13.10 | Manual de Diseño ICHA 2000, Cap. 5 | 547 |
| Soldadura columna – placa | Resistencia del filete: φrn | J2-4 | AISC 360-16 (español) |  |
| Soldadura columna – placa | Tamaño mínimo del filete: alma ; alas (parte más delgada de cada unión) | Tabla J2.4 | AISC 360-16 (español) |  |
| Soldadura columna – placa | Metal base del alma, fluencia por corte | J4-3 | AISC 360-16 (español) |  |
| Soldadura columna – placa | Compresión por contacto pleno | 13.1.4 | Manual de Diseño ICHA 2000, Cap. 5 | 511 |
| Soldadura columna – placa | Holgura máxima de 2 mm en el contacto | 16.4.4 | Manual de Diseño ICHA 2000, Cap. 5 | 579 |
