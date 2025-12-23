## **Especificació de la Pàgina d’Administració de Publicat**

---

### **0\. Layout comú i comportament general**

La pàgina d’Administració comparteix el **layout persistent** de l’aplicació en mode editor:

* Barra superior fixa, comuna a tota l’aplicació.  
* Menú lateral esquerre fix.  
* Només el contingut central varia segons la secció.

**Visibilitat del menú**

* El botó **Administració** només és visible per a usuaris amb rol `admin_global`.  
* Usuaris `editor_profe`, `editor_alumne` i `display` no poden veure ni accedir a aquesta pàgina.

**Indicació de secció activa**

* La icona d’Administració del menú lateral es ressalta amb el color primari del projecte.  
* Opcionalment, es mostra un accent visual vertical a l’esquerra.

---

### **1\. Objectiu de la pàgina d’Administració**

La pàgina d’Administració és l’espai des d’on els usuaris amb rol **administrador global** poden:

* Gestionar **centres educatius** (alta, edició i baixa lògica).  
* Gestionar **usuaris del sistema** (tots els centres).  
* Gestionar el **catàleg de zones**.  
* Gestionar la **LandingPlaylist** (llista pública de la *landing page*).  
* Supervisar l’estat general de la plataforma.

Aquesta pàgina no forma part del flux habitual dels editors i està pensada com una eina de **governança i manteniment global del sistema**.

---

### **2\. Estructura general de la pàgina**

La pàgina es divideix en **cinc seccions principals**, accessibles mitjançant pestanyes o submenú intern:

1. Centres  
2. Usuaris  
3. Zones  
4. LandingPlaylist  
5. Supervisió

---

### **3\. Gestió de Centres**

#### **3.1 Llistat de centres**

Es mostra una taula amb tots els centres registrats al sistema.

**Columnes**:

* Nom del centre  
* Zona  
* Estat (Actiu / Inactiu)  
* Nombre d’usuaris associats  
* Accions

**Accions disponibles**:

* Editar centre  
* Activar / Desactivar centre

Desactivar un centre implica que cap usuari associat pot operar ni reproduir contingut.

#### **3.2 Creació i edició de centre**

Formulari amb els camps:

* Nom del centre  
* Zona (selector de catàleg controlat)  
* Logo del centre  
* Estat (Actiu / Inactiu)

Notes:

* El camp `zone` no és lliure; es selecciona d’un catàleg per evitar inconsistències.  
* La desactivació és lògica (no s’esborren dades).

---

### **4\. Gestió d’Usuaris**

#### **4.1 Llistat d’usuaris**

Taula amb tots els usuaris del sistema.

**Columnes**:

* Email  
* Nom  
* Telèfon  
* Rol (`admin_global` | `editor_profe` | `editor_alumne` | `display`)  
* Centre associat  
* Estat (Actiu / Inactiu)  
* **Estat d’invitació** (Pendent d’activació / Alta completada)  
* Accions

#### **4.2 Accions sobre usuaris**

* **Crear usuari** (envia invitació automàticament)  
* Editar usuari  
* Assignar o canviar rol  
* Assignar o canviar centre  
* Activar / Desactivar usuari  
* **Reenviar invitació** (només si l’alta no s’ha completat)

Notes:

* Els usuaris `admin_global` poden no tenir centre associat.  
* Desactivar un usuari impedeix qualsevol accés al sistema.

#### **4.3 Protocol d’invitació d’usuaris**

Quan l’`admin_global` crea un usuari:

* El sistema **envia una invitació per correu** perquè l’usuari completi l’alta.  
* A la taula s’indica l’**estat d’invitació** com a **Pendent d’activació**.

**Reenviar invitació**

* Si l’usuari encara està en estat **Pendent d’activació**, l’admin pot prémer **Reenviar invitació**.  
* Si l’alta ja està completada (**Alta completada**), l’acció **Reenviar invitació** no apareix o queda deshabilitada.

Recomanació d’UX: mostrar també la data/hora de l’última invitació enviada, si es disposa d’aquesta informació.

---

### **5\. Catàleg de Zones**

Aquesta secció permet a l’administrador global gestionar el **catàleg de zones** que s’utilitza al selector de zona del formulari de Centres.

**Objectiu**

* Evitar valors inconsistents (zones escrites de formes diferents).  
* Permetre afegir noves zones quan calgui, sense canvis de codi.

#### **5.1 Llistat de zones**

Taula amb totes les zones registrades.

**Columnes**:

* Nom de la zona  
* Estat (Activa / Inactiva)  
* Ordre (opcional)  
* Accions

**Accions disponibles**:

* Editar zona  
* Activar / Desactivar zona

Una zona inactiva no apareix als selectors. Si hi ha centres assignats a una zona que passa a inactiva, aquests centres mantenen el valor, però el selector la marca com a “inactiva” fins que es reassigni.

#### **5.2 Creació i edició de zona**

Formulari amb els camps:

* Nom de la zona (únic)  
* Estat (Activa / Inactiva)  
* Ordre (opcional)

Regles:

* No es permeten duplicats (mateix nom, ignorant majúscules/minúscules).  
* La desactivació és lògica (no s’esborren dades).

---

### **6\. LandingPlaylist de la *landing page***

Aquesta secció permet a l’`admin_global` gestionar la **llista de reproducció única** que es mostra a la **landing page pública** (accessible sense autenticació).

**Característiques clau**

* **N’hi ha només una** (LandingPlaylist).  
* **Només es pot editar des d’aquesta pàgina d’Administració**.  
* **No és visible** a les pàgines de Llistes/Reproducció ni a altres seccions de l’aplicació (només es renderitza a la landing pública).

#### **6.1 Contingut permès**

La LandingPlaylist pot incloure elements de dos tipus:

* `type = content`: vídeos provinents de qualsevol centre.  
* `type = announcement`: contingut d’anunci.

**Regla d’inclusió per a `content`**

* Només es poden afegir vídeos que tinguin `isSharedWithOtherCenters = true`.  
* Si un vídeo deixa de complir aquesta condició (`isSharedWithOtherCenters` passa a `false`), es **retira automàticament** de la LandingPlaylist.

#### **6.2 Afegir i retirar elements**

* L’admin pot **afegir** elements a la LandingPlaylist seleccionant-los d’un llistat/cercador.  
* L’admin pot **retirar** elements de la LandingPlaylist en qualsevol moment.

**Nota d’UX recomanada**

* Els elements no elegibles (per exemple, `content` amb `isSharedWithOtherCenters = false`) s’han de mostrar **deshabilitats** o directament **no aparèixer** als resultats.

#### **6.3 Ordre de reproducció**

* L’ordre és **manual** i es gestiona mitjançant **drag & drop**.  
* El reproductor de la landing reprodueix els elements segons l’ordre definit.

---

### **7\. Supervisió i estat del sistema**

Secció informativa pensada per al manteniment i diagnòstic.

Elements recomanats:

* Nombre total de centres actius.  
* Nombre total d’usuaris per rol.  
* Feeds RSS amb errors.  
* Data i hora de les últimes actualitzacions RSS.

Aquesta secció pot créixer en futures fases del projecte.

---

### **8\. Rols i permisos**

* **Administrador global (`admin_global`)**:  
  * Accés complet a la pàgina d’Administració.  
  * Pot gestionar centres, usuaris, el catàleg de zones i la **LandingPlaylist**.  
* **Altres rols** (`editor_profe`, `editor_alumne`, `display`):  
  * No poden accedir a la pàgina d’Administració.

---

### **9\. Resum funcional**

La pàgina d’Administració permet:

* Centralitzar la gestió de centres i usuaris a nivell global.  
* Mantenir el catàleg de zones per garantir consistència.  
* Gestionar la **LandingPlaylist pública** que es mostra a la *landing page*.  
* Garantir coherència i seguretat en un entorn multi-tenant.  
* Separar clarament les tasques d’administració global del flux editorial diari.

Aquest document defineix el comportament funcional de la pàgina d’Administració i és coherent amb el domain-model i la resta d’especificacions del projecte Publicat.

