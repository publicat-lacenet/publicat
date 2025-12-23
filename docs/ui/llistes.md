# **Especificació de la Pàgina de Llistes de Reproducció de Publicat**

## **0\. Layout comú i comportament del menú lateral**

Totes les pàgines amb interfície completa (rol **editor** i rol **Convidat**) comparteixen un layout persistent format per:

* **Barra superior fixa**, comuna a tota l'aplicació.  
* **Menú lateral esquerre fix**, amb icones representatives de cada secció.

Només el contingut central canvia segons la secció seleccionada (Pantalla, Contingut, Llistes, RSS...).

### **0.1 Indicació de la secció activa**

* La icona *Llistes* del menú lateral es ressalta amb el color primari del projecte.  
* Opcional: accent vertical a l'esquerra per reforçar la selecció.  
* La resta d'icones mantenen un color neutre.

### **0.2 Tooltips**

* Les icones no mostren text permanent.  
* En passar el cursor, apareix un tooltip amb el nom de la secció.

### **0.3 Rol Display**

* Els usuaris amb rol display **no** accedeixen a aquesta pàgina.  
* No hi ha menú lateral ni barra superior en aquest rol.

---

## **1\. Objectiu de la pàgina de Llistes**

La pàgina de Llistes permet gestionar les llistes de reproducció i la seva planificació.

Aquesta pàgina és accessible (totalment o parcialment) segons rol:

* **Editor-profe**: gestió completa de llistes del seu centre.  
* **Administrador global**: gestió completa, incloses llistes globals.  
* **Editor-alumne**: accés **limitat** (només accions autoritzades per configuració de llista).  
* **Convidat**: accés de **només lectura** (pot veure llistes i contingut, sense editar).  
* **Display**: no hi té accés.

Funcionalitats principals (segons permisos):

* Visualitzar totes les llistes disponibles del centre (predefinides, personalitzades i globals).  
* Editar el contingut de les llistes predefinides (dies de la setmana i Anuncis).  
* Crear, editar i eliminar llistes personalitzades.  
* Assignar una llista específica a dies concrets mitjançant el calendari de reproducció.

Aquesta pàgina **no** és accessible per al rol display.

---

## **2\. Tipus de llistes**

La plataforma distingeix entre tres tipus de llistes:

### **2.1 Llistes predefinides (no eliminables)**

Inclou:

* Dilluns  
* Dimarts  
* Dimecres  
* Dijous  
* Divendres  
* **Anuncis**

Característiques:

* No es poden eliminar.  
* Són editables.  
* Comencen buides.  
* La llista *Anuncis* només pot contenir vídeos del tipus **Anunci**.

### **2.2 Llistes personalitzades**

* Les pot crear **l'editor-profe** o l’**administrador global**.  
* Es poden editar i eliminar.  
* Només es poden utilitzar com a **llista principal** (no com a llista d'Anuncis).  
* Poden ser assignades al calendari.

### **2.3 Llistes globals (Administrador)**

* L’administrador global pot crear **llistes globals** disponibles per a tots els centres.  
* Quan un centre visualitza una llista global per primera vegada, el sistema crea una **còpia local** del contingut (punt de partida) perquè el centre la pugui adaptar.  
* Cada centre pot **afegir, treure i reordenar** vídeos de la seva còpia local sense afectar la resta de centres.  
* Els centres **no poden eliminar** una llista global ni canviar-ne el tipus (global).

Nota: si l’administrador global modifica una llista global, aquests canvis **no sobreescriuen** automàticament les còpies locals ja personalitzades (a menys que en fases futures s’afegeixi una opció explícita de “restaurar a versió global”).

---

## **3\. Visualització de la pàgina de Llistes**

La pàgina mostra totes les llistes disponibles organitzades en **files horitzontals** (Model B).

### **3.1 Cada fila de llista conté:**

* **Nom de la llista**  
* **Número de vídeos** que conté  
* **Tipus de llista** (Predefinida / Personalitzada / Global)  
* **Botó Editar** (obre la pantalla d'edició)  
* **Botó Eliminar** (només per a personalitzades)

Nota: segons rol, els botons d’edició poden aparèixer **deshabilitats** (disabled) mantenint la coherència visual.

* **Indicador d’assignació al calendari** (per exemple: *Assignada a X dies*)

### **3.2 Botó "Crear nova llista"**

En prémer, s'obre un formulari amb:

* Camp per al **títol** de la llista  
* Bloc per **triar vídeos** amb filtres per centre, zona, etiquetes i **hashtags del centre**  
* Botó **Crear** i botó **Cancel·lar**

---

## **4\. Edició de llista**

En editar una llista (predefinida, personalitzada o global) s'obre una pantalla amb:

### **4.1 Camps i elements visibles**

1. **Títol**  
   * **Editable** només en llistes **personalitzades**.  
   * **Fix** en llistes **predefinides** i **globals** (excepte per a l’**Administrador global**, si es permet canviar el títol global).  
2. **Llistat de vídeos actuals** en ordre seqüencial  
3. **Reordenació per drag & drop**  
4. **Botó per eliminar vídeos** individualment  
5. **Botó "Afegir vídeos"**, que obre un modal amb filtres  
6. **Botó Guardar canvis** (no hi ha auto-save)  
7. **Botó Cancel·lar**

### **4.2 Restriccions especials**

* La llista d'Anuncis només mostra vídeos classificats com *Anunci* i només deixa afegir aquests.  
* Les llistes per defecte dels dies de la setmana poden contenir qualsevol vídeo.

---

## **5\. Assignació de llistes al calendari**

L’**editor-profe** (i l’**administrador global**) pot substituir la llista que es mostraria per defecte segons el dia, configurant una planificació.

### **5.1 Funcionament**

* S'afegeix un botó o secció: **"Calendari de reproducció"**.  
* El calendari mostra dies del mes en format quadrícula.  
* En seleccionar un dia, l’**editor-profe** (o l’**administrador global**) pot assignar:  
  * Una llista predefinida (la pròpia del dia)  
  * Una llista personalitzada

### **5.2 Comportament del reproductor principal**

* Si un dia té assignada una llista via calendari, aquesta **substitueix la llista per defecte del dia**.  
* Si un dia no té cap assignació, s'utilitza la llista predefinida (Dilluns, Dimarts, etc.) segons el dia de la setmana.

### **5.3 Persistència**

* Les assignacions del calendari **no** es desen automàticament a cada clic.  
* L’usuari ha de confirmar explícitament els canvis mitjançant un botó **Guardar planificació** (o equivalent).  
* En desar, el sistema valida els canvis i mostra un missatge de confirmació.  
* Si una llista assignada s'elimina, el sistema avisa i restaura la llista per defecte d’aquell dia.

---

## **6\. Filtres per afegir vídeos a una llista**

En obrir l’opció "Afegir vídeos":

* El disseny és idèntic al de la pàgina Contingut.  
* Filtres disponibles:  
  * Centre  
  * Zona  
  * Etiquetes  
  * **Hashtags del centre**

Els hashtags són específics de cada centre. Només es mostren i es poden utilitzar els hashtags definits pel centre actiu de l’usuari editor.

Comportament quan es filtra per **Centre**:

* El filtre **Hashtags del centre** només aplica al **centre actiu**.  
* Si l’usuari selecciona un altre centre al filtre *Centre*, el filtre d’hashtags queda **desactivat/no aplicable** (no existeixen hashtags reutilitzables entre centres).

### **6.1 Restriccions**

* Si és la llista d'Anuncis, només es filtren i mostren vídeos de tipus **Anunci**.  
* En la resta de llistes, es poden afegir vídeos de qualsevol tipus.  
* El filtre per **hashtags** no permet seleccionar hashtags d’altres centres, encara que l’editor visualitzi vídeos globals.

---

## **7\. Controls i permisos**

Aquest apartat concreta els **permisos específics dins la pàgina de Llistes** segons els rols d’usuari definits al document *Rols d’usuari – Publicat*.

### **7.1 Editor-profe**

Rol editor principal del centre.

**Pot fer:**

* Veure totes les llistes del seu centre (predefinides, personalitzades i globals).  
* Crear, editar i eliminar llistes personalitzades del centre.  
* Editar el contingut de les llistes predefinides (dies de la setmana i Anuncis).  
* Afegir i eliminar vídeos de qualsevol llista del centre.  
* Reordenar vídeos mitjançant *drag & drop*.  
* Assignar llistes (predefinides o personalitzades) a dies concrets mitjançant el calendari.

**No pot fer:**

* Eliminar llistes predefinides.  
* Modificar l’existència de llistes globals (només el seu contingut local).

---

### **7.2 Editor-alumne**

Rol editor amb permisos limitats, pensat per a l’alumnat.

**Pot fer:**

* Veure les llistes del centre.  
* Afegir i reordenar vídeos a les  llistes (inclosa la llista d’Anuncis)  **quan el sistema ho permet explícitament** (segons configuració `isStudentEditable`).  
* Veure l’ordre dels vídeos dins les llistes.

**No pot fer:**

* Crear noves llistes.  
* Eliminar llistes.  
* Editar el títol d’una llista.  
* Assignar llistes al calendari.

---

### **7.2.1 Camp `isStudentEditable` (per llista)**

Per controlar l’accés de l’**Editor-alumne** dins d’aquesta pàgina, cada llista incorpora el flag:

* `isStudentEditable` (boolean)

Comportament:

* Per defecte: `false`.  
* En llistes **Globals**, aquest valor es considera **sempre `false`** (no hi ha edició per part d’Editor-alumne en aquests casos).  
* Quan `true`, permet a l’Editor-alumne realitzar **les accions limitades** descrites al rol: afegir vídeos **propis** a la llista i, opcionalment, **eliminar només els seus** vídeos d’aquella llista (sense reordenar).  
* Aquest flag només el poden modificar: **Editor-profe** i **administrador global**.

---

### **7.3 Administrador global**

Rol amb permisos totals sobre tots els centres.

**Pot fer:**

* Veure i gestionar llistes de tots els centres.  
* Crear llistes globals disponibles per a tots els centres.  
* Editar i eliminar llistes globals.  
* Editar qualsevol llista de qualsevol centre.  
* Assignar llistes globals o de centre al calendari.

**No pot fer:**

* No aplica (rol amb permisos complets en aquesta secció).

---

### **7.4 Convidat**

Rol de consulta (**només lectura**).

**Pot fer:**

* Accedir a la pàgina de Llistes.  
* Veure totes les llistes disponibles (predefinides, personalitzades i globals) del centre.  
* Obrir una llista i **visualitzar** el seu contingut (ordre i vídeos).  
* Veure la planificació del calendari (sense editar-la).

**No pot fer:**

* Crear noves llistes.  
* Eliminar llistes.  
* Editar el títol d’una llista.  
* Afegir o eliminar vídeos d’una llista.  
* Reordenar vídeos.  
* Assignar llistes al calendari ni desar planificacions.  
* Editar la llista d’Anuncis.

**Nota d’UI (Convidat):** els botons d’edició es **mostren** per mantenir la coherència visual, però apareixen **deshabilitats** (disabled) i, opcionalment, amb un tooltip del tipus: *“Permís insuficient (només lectura)”*.

---

### **7.5 Display**

Rol exclusiu de visualització.

**Pot fer:**

* No aplica (aquesta pàgina no és accessible).

**No pot fer:**

* Accedir a la pàgina de Llistes.  
* Veure, crear o modificar llistes.

---

## **8\. Resum funcional**

La pàgina de Llistes permet:

* Gestionar totes les llistes de reproducció del centre.  
* Editar contingut i ordre de vídeos per drag & drop.  
* Crear llistes personalitzades.  
* Gestionar la llista especial d’Anuncis.  
* Assignar llistes específiques a dies del calendari.  
* Mantenir una experiència coherent amb la resta del projecte Publicat.

Aquesta documentació estableix les bases per al comportament complet de la secció de Llistes, assegurant coherència amb la Pantalla Principal i la Pàgina de Contingut.

