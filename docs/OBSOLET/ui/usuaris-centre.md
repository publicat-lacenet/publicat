# **Especificació de la Pàgina Usuaris del Centre (rol Editor-profe) – Publicat**

## **0\. Context i objectiu**

Aquesta pàgina existeix per permetre que un **Editor-profe** gestioni els **usuaris del seu propi centre** (alta i manteniment operatiu), sense accés a l’Administració global del sistema.

Objectius principals:

* Donar d’alta nous usuaris del centre (Editor-profe, Editor-alumne, Display).  
* Mantenir un control segur dels accessos del centre **sense esborrats físics**.  
* Evitar errors crítics (p. ex. deixar el centre sense cap Editor-profe actiu).

Nota de model: la “baixa” d’usuaris es farà com a **baixa lògica** mitjançant `isActive=false`.

---

## **1\. Layout i navegació**

### **1.1 Layout comú**

La pàgina s’integra en el layout persistent del mode editor:

* Barra superior fixa.  
* Menú lateral esquerre fix.  
* Contingut central variable.

### **1.2 Accés al menú**

* Element de menú recomanat: **“Usuaris”**.  
* Visibilitat:  
  * **Editor-profe:** visible i accessible.  
  * **Administrador global:** pot accedir-hi (opcional) com a vista “dins del centre”.  
  * **Editor-alumne / Convidat / Display:** no visible.

### **1.3 Indicació de secció activa**

* La icona/entrada “Usuaris” es ressalta amb el color primari.  
* Opcional: accent vertical a l’esquerra.

---

## **2\. Abast (multi-tenant)**

* Aquesta pàgina només mostra **usuaris amb `centerId = centerId` de l’Editor-profe autenticat**.  
* No permet canviar el centre d’un usuari.  
* No permet veure ni cercar usuaris d’altres centres.

---

## **3\. Estructura general de la pàgina**

La pàgina es divideix en:

1. **Llistat d’usuaris** (taula)  
2. **Accions principals** (Crear usuari)  
3. **Detall / Edició** (modal o panell lateral)

---

## **4\. Llistat d’usuaris**

### **4.1 Presentació**

Taula paginada amb cerca.

### **4.2 Columnes recomanades**

* **Email**  
* **Rol** (Editor-profe / Editor-alumne / Display)  
* **Nom** (opcional)  
* **Estat** (Actiu / Inactiu)  
* **Estat d’alta** (Pendent d’activació / Alta completada)  
* **Data d’alta** (opcional)  
* **Últim accés** (opcional, si es disposa de la dada)  
* **Última invitació enviada** (opcional però recomanat)  
* **Accions**

### **4.3 Cerca i filtres**

* Cerca per email.  
* Filtre per rol.  
* Filtre per estat (actiu / inactiu).

---

## **5\. Accions disponibles**

### **5.1 Crear usuari**

Botó: **“Crear usuari”**

Formulari mínim:

* Email (obligatori)  
* Rol (selector: Editor-profe / Editor-alumne / Display)  
* Estat inicial: Actiu (per defecte)

Comportament:

* En crear un usuari, el sistema:  
  * Crea el registre de perfil (`User`) associat al centre.  
  * Inicia el procés d’alta d’autenticació (invitació) i marca l’usuari com a **“Pendent d’activació”**.  
  * (Recomanat) Registra `lastInvitationSentAt` en el moment de l’enviament.  
* Mostra confirmació i l’estat resultant (p. ex. “Invitació enviada”).

Validacions:

* Email amb format correcte.  
* Si l’email ja existeix al sistema:  
  * Si és del **mateix centre**: mostrar error “Usuari ja existent”.  
  * Si és d’**un altre centre**: bloquejar l’acció i mostrar missatge “Email ja associat a un altre centre”.

### **5.2 Editar usuari (manteniment)**

Acció: **“Editar”** (modal)

Camps editables (recomanació):

* Rol (amb restriccions, veure secció 7\)  
* Estat (Actiu / Inactiu)

Camps no editables:

* Email  
* Centre

### **5.3 Activar / Desactivar usuari (baixa lògica)**

Acció ràpida a la taula:

* Toggle o botó “Desactivar” / “Activar”.

Regles:

* Desactivar un usuari impedeix l’accés al sistema.  
* No hi ha esborrat físic des d’aquesta pàgina.

### **5.4 Gestió d’invitacions (reenviar invitació)**

Acció **no opcional**: la pàgina ha d’incloure el botó **“Reenviar invitació”** per resoldre casos habituals (email perdut, filtre de correu, alta no completada).

#### **5.4.1 Quan es mostra i quan es pot executar**

* **Només es mostra** si l’usuari està en estat d’alta **“Pendent d’activació”**.  
* **Només es pot executar** si:  
  * l’usuari està **Actiu** i  
  * està **Pendent d’activació**.

No es pot executar si:

* l’usuari està en estat d’alta **“Alta completada”**.  
* l’usuari està **Inactiu** (cal reactivar-lo abans).

#### **5.4.2 Ubicació de l’acció a la UI**

* A la taula (columna **Accions**) i/o al modal d’edició: botó **“Reenviar invitació”**.  
* El botó ha d’aparèixer **deshabilitat** quan la condició no es compleixi, amb tooltip: “No disponible: alta ja completada” o “Activa l’usuari per reenviar”.

#### **5.4.3 Anti-spam i traçabilitat**

* Mostrar (recomanat): **“Última invitació enviada: data/hora”**.  
* (Recomanat) Aplicar un **cooldown** per evitar reenviaments repetits (p. ex. no permetre reenviar fins passats 10–15 minuts des de `lastInvitationSentAt`).

---

## **6\. Fluxos d’ús**

### **6.1 Flux: crear un Editor-alumne**

1. Editor-profe prem “Crear usuari”.  
2. Introdueix email i tria rol “Editor-alumne”.  
3. Desa.  
4. El sistema envia invitació i mostra confirmació.

### **6.2 Flux: desactivar un Display antic**

1. Editor-profe localitza usuari (filtre rol=Display).  
2. Prem “Desactivar”.  
3. Confirmació (diàleg curt).  
4. L’usuari passa a estat Inactiu.

### **6.3 Flux: afegir un segon Editor-profe**

1. Editor-profe crea usuari amb rol “Editor-profe”.  
2. El sistema envia invitació.  
3. Quan l’usuari accepta, queda actiu i pot operar com a Editor-profe del centre.

### **6.4 Flux: reenviar invitació a un usuari pendent**

1. Editor-profe localitza un usuari amb estat d’alta “Pendent d’activació”.  
2. Prem “Reenviar invitació”.  
3. (Opcional) Confirmació (diàleg curt).  
4. El sistema reenvià la invitació i actualitza “Última invitació enviada: data/hora”.  
5. Missatge: “Invitació reenviada correctament”.

---

## **7\. Regles de seguretat i permisos**

### **7.1 Qui pot accedir**

* Només **Editor-profe** del centre (i opcionalment Admin global per supervisió).

### **7.2 Accions permeses a Editor-profe**

Pot fer:

* Veure el llistat d’usuaris del seu centre.  
* Crear usuaris del seu centre amb rols: Editor-profe, Editor-alumne, Display.  
* Activar / desactivar usuaris del centre.  
* Canviar rol **amb restriccions**.

No pot fer:

* Assignar usuaris a altres centres.  
* Convertir ningú en Administrador global.  
* Gestionar convidats (enllaços temporals).  
* Esborrar físicament usuaris.

### **7.3 Restriccions recomanades per evitar incidents**

Per evitar bloquejos o “cop d’estat” dins del centre:

* Un Editor-profe **no pot desactivar-se a si mateix**.  
* El sistema ha d’impedir deixar el centre amb **0 Editors-profe actius**.  
* (Recomanat) Un Editor-profe **no pot desactivar ni canviar el rol d’un altre Editor-profe**.  
  * Excepció: aquestes accions només les pot fer l’Administrador global.

### **7.4 UI per a permisos insuficients**

* Si un botó es mostra per coherència visual però l’acció no és permesa, ha d’aparèixer:  
  * deshabilitat (disabled)  
  * tooltip: “Permís insuficient”.

---

## **8\. Missatges i estats especials**

* Sense usuaris: “Encara no hi ha usuaris creats al centre.”  
* Error d’email duplicat (mateix centre): “Aquest email ja existeix al centre.”  
* Email associat a un altre centre: “Aquest email ja està associat a un altre centre. Contacta amb l’administrador global.”  
* Intent de desactivar l’últim Editor-profe: “No es pot desactivar l’últim Editor-profe actiu del centre.”  
* Invitació reenviada: “Invitació reenviada correctament.”  
* No es pot reenviar (alta completada): “No es pot reenviar perquè l’alta ja està completada.”  
* No es pot reenviar (usuari inactiu): “Activa l’usuari abans de reenviar la invitació.”  
* (Si hi ha cooldown) Reenviament massa aviat: “Es pot reenviar d’aquí a uns minuts. Revisa ‘Última invitació enviada’.”

---

## **9\. Notes d’implementació (orientatives, no normatives) (orientatives, no normatives)**

* Model de dades mínim:  
  * `User(id, email, role, centerId, isActive)`.  
* Recomanat per suportar invitacions i estat d’alta:  
  * `onboardingStatus` (valors: `PENDING_ACTIVATION` / `COMPLETED`) **o** un estat equivalent derivat del sistema d’Auth.  
  * `lastInvitationSentAt` (timestamp) per traçabilitat i cooldown.  
* Recomanat afegir traçabilitat:  
  * `createdByUserId` i `createdAt` a `User` (si es vol auditoria).  
* RLS:  
  * Editor-profe només pot `SELECT/INSERT/UPDATE` usuaris del seu `centerId`.  
  * Polítiques específiques per bloquejar canvis sobre rols elevats (Editor-profe) si es decideix.

---

## **10\. Resum funcional**

La pàgina **Usuaris del Centre** permet a l’**Editor-profe**:

* Donar d’alta usuaris del seu centre.  
* Gestionar l’estat (actiu/inactiu) com a mecanisme de baixa lògica.  
* Mantenir el control local sense exposar funcionalitats d’administració global.  
* Evitar errors crítics mitjançant restriccions (no desactivar-se, no deixar el centre sense Editor-profe, etc.).

