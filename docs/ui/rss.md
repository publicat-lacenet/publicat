### **Especificació de la Pàgina RSS de Publicat**

---

#### **0\. Layout comú i comportament del menú lateral**

Totes les pàgines accessibles en **mode editor** comparteixen un layout persistent format per:

*(Mode editor disponible per als rols: administrador global, editor-profe, editor-alumne i convidat.)*

* **Barra superior fixa**, comuna a tota l’aplicació.  
* **Menú lateral esquerre fix**, amb icones representatives de cada secció (Pantalla, Contingut, Llistes, RSS...).  
* **Botó “Administració”** (si existeix), visible només per als rols **administrador global** i **editor-profe**.

Només el contingut central canvia segons la secció seleccionada.

##### **0.1 Indicació de la secció activa**

* Quan l’usuari es troba a la pàgina RSS, la icona **RSS** del menú lateral es ressalta amb el **color primari del projecte**.  
* Opcionalment, la icona activa pot tenir un **accent vertical** a l’esquerra per reforçar la selecció.  
* La resta d’icones mantenen un color neutre.

##### **0.2 Tooltips**

* Les icones del menú lateral no mostren text permanent.  
* En passar el cursor per sobre, apareix un **tooltip** amb el nom de la secció.

##### **0.3 Mode Pantalla Completa**

* La funcionalitat de **Pantalla Completa** només està disponible a la pàgina **Pantalla**.  
* La pàgina RSS **no inclou** cap botó de pantalla completa i sempre mostra barra superior i menú lateral.

##### **0.4 Mode Display**

* Els usuaris amb rol **display** no veuen la pàgina RSS ni el menú lateral ni la barra superior.  
* El rol display només visualitza la composició de la pantalla principal (vídeos, anuncis, RSS) en mode pantalla completa.

---

### **1\. Objectiu de la pàgina RSS**

La pàgina RSS permet als rols **administrador global** i **editor-profe**:

* Gestionar tots els **feeds RSS** associats al seu centre.  
* Decidir quins feeds es mostraran a la **zona RSS** de la pantalla principal.  
* Configurar el **comportament de rotació** entre diversos feeds.  
* Definir els **intervals de visualització**:  
  * Durada de cada titular.  
  * Temps que cada feed roman actiu abans de passar al següent.  
  * Freqüència d’actualització automàtica.

Aquesta pàgina **no** és accessible per al rol **display**.

Els rols **editor-alumne** i **convidat** hi poden accedir en **mode només lectura** (sense capacitat de modificar feeds ni configuració).

---

### **2\. Visualització principal de la pàgina RSS**

La pàgina es divideix en tres blocs principals:

1. **Llista de feeds RSS** (taula/llistat principal).  
2. **Configuració de rotació i intervals** (paràmetres globals per centre).  
3. **Previsualització de la zona RSS** (simulació del que es veurà a la pantalla principal).

---

### **3\. Llista de feeds RSS**

La secció principal de la pàgina mostra una **taula** amb tots els feeds RSS configurats.

#### **3.1 Columnes de la taula de feeds**

Per cada feed es mostra:

* **Nom del feed** (editable).  
* **URL del feed**.  
* **Estat**: Actiu / Inactiu.  
* **Inclòs a la rotació**: Sí / No.  
* **Última actualització**.  
* **Titulars disponibles**.  
* **Estat d’error** (si escau).

#### **3.2 Accions per feed**

* **Editar**  
* **Activar / Desactivar**  
* **Incloure / Excloure de la rotació**  
* **Eliminar** (amb confirmació)

Nota: segons rol, els botons d’acció poden aparèixer **deshabilitats (disabled)** per mantenir la coherència visual, i opcionalment amb un tooltip del tipus: “Permís insuficient (només lectura)”.

#### **3.3 Creació i edició de feeds**

El formulari d’afegir/editar inclou:

* Nom del feed  
* URL RSS  
* Actiu (checkbox)  
* Incloure a la rotació (checkbox)

En desar, el sistema fa una lectura immediata del feed.

---

### **4\. Configuració de rotació i intervals**

#### **4.1 Durada per titular**

* Temps de visualització de cada titular.  
* Valor recomanat per defecte: **15 segons**.

#### **4.2 Durada per feed**

* Temps que un feed roman actiu abans de passar al següent.  
* Valor recomanat per defecte: **2 minuts**.

#### **4.3 Ordre de rotació**

* Llista reordenable amb drag & drop.  
* Inclou només els feeds actius i inclosos a rotació.

#### **4.4 Freqüència d’actualització automàtica**

* Interval en minuts.  
* Valor per defecte: **60 minuts**.

#### **4.5 Límit d’ítems per feed**

* Nombre màxim de titulars a mostrar (p. ex. 20).

---

### **5\. Previsualització de la zona RSS**

#### **5.1 Format de presentació**

Cada notícia es mostra en una **targeta vertical** amb:

* Títol  
* Descripció breu  
* Imatge (si existeix)

#### **5.2 Controls**

* Selector de feed  
* Botó “Reproduir demostració”  
* Botó “Següent titular”

---

### **6\. Gestió d’errors i estats especials**

#### **6.1 Feed no disponible**

* Es mostra un avís a la taula.  
* A la pantalla principal, un missatge: *"Contingut no disponible temporalment"*.  
* El sistema continua la rotació.

#### **6.2 Cap feed actiu**

* Missatge a la pantalla principal: *"No hi ha RSS configurats actualment."*  
* Banner informatiu a la pàgina RSS.

---

### **7\. Rols i permisos**

Aquest apartat concreta els permisos específics dins la pàgina RSS segons els rols definits al document **“Rols d’usuari – Publicat”**.

#### **7.1 Administrador global**

Pot fer:

* Accés complet a la pàgina RSS de qualsevol centre.  
* Crear, editar, activar/desactivar i eliminar feeds RSS.  
* Modificar intervals, rotació i ordre dels feeds.  
* Diagnosticar incidències (feeds amb errors) i intervenir quan calgui.

No pot fer:

* No aplica (és el rol amb abast global).

#### **7.2 Editor-profe**

Pot fer:

* Accedir a la pàgina RSS del seu centre.  
* Crear, editar, activar/desactivar i eliminar feeds RSS del seu centre.  
* Definir intervals, rotació i ordre dels feeds.  
* Utilitzar la previsualització per validar el resultat.

No pot fer:

* Accedir o modificar la configuració d’RSS d’altres centres.

#### **7.3 Editor-alumne**

Pot fer:

* Accedir a la pàgina RSS del seu centre en mode consulta.  
* Visualitzar la configuració actual i utilitzar la previsualització.

No pot fer:

* Crear/editar/eliminar feeds RSS.  
* Activar/desactivar feeds.  
* Modificar intervals, rotació o ordre de feeds.

#### **7.4 Convidat (temporal)**

Pot fer:

* Accedir a la pàgina RSS del centre en mode **només lectura**.  
* Veure la configuració i el resultat a la previsualització.

No pot fer:

* Crear/editar/eliminar feeds RSS.  
* Activar/desactivar feeds.  
* Modificar intervals, rotació o ordre.

Nota d’UI (Convidat): els botons d’edició i acció es poden mostrar per coherència visual, però han d’aparèixer **deshabilitats (disabled)** i, opcionalment, amb un tooltip del tipus: “Permís insuficient (només lectura)”.

#### **7.5 Display**

* No té accés a la pàgina RSS.  
* Mostra automàticament el resultat configurat (zona RSS de la Pantalla Principal) en mode passiu.

---

### **8\. Resum funcional**

La pàgina RSS permet:

* Gestionar i configurar feeds RSS.  
* Definir intervals, rotació i ordre de feeds.  
* Previsualitzar el comportament de la zona RSS.  
* Mantenir una experiència coherent amb la resta del projecte Publicat.

