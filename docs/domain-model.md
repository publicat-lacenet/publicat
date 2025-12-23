# **Domain Model — Publicat (revisat)**

Aquest document defineix el **model de domini conceptual** de Publicat: entitats, relacions i regles/invariants. Serveix de base per al disseny de la base de dades i per a la definició posterior de les pantalles i fluxos d’usuari.

---

## **1\. Entitats conceptuals**

### **1.1 Centre**

Representa un centre educatiu i actua com a *tenant* del sistema.

**Atributs conceptuals**

* id  
* name  
* zoneId  
* logo  
* isActive

**Notes**

* El centre està associat a una **zona geogràfica** mitjançant `zoneId`.  
* La zona s’utilitza per **agrupar centres** i com a **criteri de filtratge de contingut**.  
* Un centre pot tenir contingut propi i **visualitzar/usar contingut compartit** d’altres centres (quan existeixi permís de compartició).

---

### **1.2 Zone (Zona)**

Catàleg de zones geogràfiques utilitzades per agrupar centres.

**Atributs conceptuals**

* id  
* name *(únic)*  
* isActive

**Notes**

* Les zones són **gestionades exclusivament per l’Administrador global**.  
* Només les zones actives poden ser assignades a centres en altes/edicions.  
* Si una zona passa a inactiva, els centres poden mantenir-la assignada (valor existent), però no s’hauria de poder seleccionar en altes/edicions fins que es reassigni.

---

### **1.3 User (Usuari)**

Usuari autenticat del sistema.

**Atributs conceptuals**

* id *(provinent de **`auth.users.id`** — mateix id)*  
* email *(provinent de **`auth.users.email`**)*  
* role (`admin_global | editor_profe | editor_alumne | display`)  
* centerId *(nullable només en cas d’**`admin_global`**\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*)*  
* isActive  
* createdAt *(opcional / recomanat)*  
* createdByUserId *(opcional / recomanat)*  
* fullName *(nullable; informatiu)*  
* phone *(nullable; informatiu)*  
* onboardingStatus (`invited | active | disabled`)  
* invitedAt *(opcional / recomanat)*  
* lastInvitationSentAt *(opcional / recomanat)*  
* activatedAt *(opcional / recomanat)*

**Relació amb l’autenticació (Supabase Auth)**

* `User` està **vinculada 1:1** amb `auth.users`.  
* L’`id` de `User` és **exactament el mateix** que l’`id` de `auth.users`.  
* `User` actua com a **perfil d’aplicació** (rol, centre, permisos), mentre que `auth.users` gestiona credencials i autenticació.

**Alta i accés d’usuaris (procediment)**

* La creació d’usuaris es fa **per invitació**: `admin_global` i `editor_profe` creen l’usuari (segons permisos) i el sistema envia un **enllaç** perquè l’usuari **estableixi la seva contrasenya**.

**Notes**

* En el domini es considera que **un email no pot estar associat a més d’un centre** (si ja existeix en un altre centre, es bloqueja l’alta/assignació a un nou centre).  
* Un usuari només pot tenir **un únic rol**.

---

### **1.4 GuestAccessLink (Convidat temporal)**

Accés temporal **sense autenticació** per visualitzar contingut d’un centre.

**Atributs conceptuals**

* id  
* token *(únic; forma part de l’enllaç)*  
* centerId  
* expiresAt *(per defecte: \+7 dies)*  
* createdAt  
* createdByUserId *(ha de ser **`admin_global`**)*  
* revokedAt *(nullable)*  
* revokedByUserId *(nullable)*  
* fullName *(nullable; informatiu)*

**Notes**

* Només l’**Administrador global** pot crear i revocar aquests enllaços.  
* És un accés **només lectura** i limitat a **contingut publicat**.

---

### **1.5 Video**

Unitat bàsica de contingut audiovisual (habitualment allotjada a Vimeo).

**Atributs conceptuals**

* id  
* centerId *(centre propietari)*  
* title  
* description  
* type (`content | announcement`)  
* vimeoUrl *(fase 1\)*  
* vimeoID *(fase 2; opcional)*  
* duration  
* thumbnailUrl  
* createdAt / uploadedAt  
* zoneId *(derivada del centre)*  
* uploadedByUserId

**Moderació i estat**

* status (`pending_approval | published | rejected`)  
* approvedByUserId *(nullable)*  
* approvedAt *(nullable)*

**Compartició intercentres**

* isSharedWithOtherCenters *(boolean; per defecte: false)*  
* sharedByUserId *(nullable)*  
* sharedAt *(nullable)*

**Notes**

* El centre i la zona s’assignen automàticament i no són editables per l’usuari.  
* **Pujada per Editor-alumne**: el vídeo entra en estat `pending_approval` i, per defecte, **no és compartit**.  
* **Aprovació/compartició**: només `editor_profe` (i `admin_global`) poden:  
  * passar un vídeo a `published`  
  * gestionar el permís `isSharedWithOtherCenters`  
* Rebuig: rebutjar implica esborrat (immediat)

---

### **1.6 Tag (Etiqueta global)**

Sistema d’etiquetes **global** per classificar vídeos.

**Atributs conceptuals**

* id  
* name

**Notes**

* Catàleg tancat o controlat (nombre limitat d’etiquetes).  
* Cada vídeo ha de tenir com a mínim una etiqueta.

---

### **1.7 Hashtag (Etiqueta interna de centre)**

Sistema d’etiquetes **específic per centre** (classificació interna, opcional).

**Atributs conceptuals**

* id  
* centerId  
* name *(únic dins del centre)*  
* isActive

---

### **1.8 Playlist (Llista de reproducció)**

Col·lecció ordenada de vídeos.

**Atributs conceptuals**

* id  
* centerId *(nullable si és una definició global)*  
* name  
* kind (`weekday | announcements | custom | global | landing`)  
* isDeletable  
* createdByUserId  
* isStudentEditable *(boolean; per defecte: false)*  
* originPlaylistId *(nullable; referència a la llista global origen quan una llista global té còpia local)*

**Notes importants sobre llistes globals**

* `admin_global` pot crear **llistes globals** (definició global amb `centerId = null`).  
* Un centre pot “consumir” una llista global mitjançant una **còpia local** (playlist amb `centerId` del centre i `originPlaylistId` apuntant a la global).  
* Els centres poden modificar la seva còpia local sense afectar la resta.

**Restricció per editor-alumne**

* `isStudentEditable` només té efecte en llistes del centre i (com a regla de domini) es considera:  
  * sempre **false** en llistes `announcements`  
  * sempre **false** en llistes `global` (definició global i còpies locals)

**Landing playlist (global)**

* `landing` és una llista **global** utilitzada a la pàgina pública/landing.  
* Només pot contenir vídeos `published` i amb `isSharedWithOtherCenters = true`.

---

### **1.9 PlaylistItem**

Relació ordenada entre una llista i un vídeo.

**Atributs conceptuals**

* playlistId  
* videoId  
* position  
* addedAt  
* addedByUserId *(opcional / recomanat)*

---

### **1.10 ScheduleOverride (Calendari de reproducció)**

Assignació d’una llista concreta a una data específica.

**Atributs conceptuals**

* id  
* centerId  
* date  
* playlistId  
* createdByUserId

**Notes**

* El sistema guarda les assignacions **per dia** (camp `date`).  
* Quan l’usuari aplica un període (data inicial–final) des de la UI, el sistema **crea/actualitza una entrada per cada dia** del període (no existeixen camps `startDate/endDate`).  
* Substitueix la llista per defecte del dia de la setmana.  
* Caps de setmana: per defecte es reprodueix la llista del divendres anterior, excepte si hi ha una assignació explícita.  
* Només es poden assignar mitjançant el calendari llistes de tipus **`custom`** o **`global`** (còpies locals); les llistes `weekday` i `announcements` no són vàlides per a aquesta funcionalitat.

---

### **1.11 RSSFeed**

Definició d’un feed RSS utilitzable a la pantalla principal.

**Atributs conceptuals**

* id  
* centerId *(o global)*  
* name  
* url  
* isActive  
* lastFetchedAt  
* **lastError**

**Notes**

* `editor_profe` pot crear, editar i activar/desactivar RSS del seu centre.  
* `admin_global` pot crear RSS globals.  
* `editor_alumne` i `convidat` poden tenir accés **només lectura** a la configuració RSS.

---

### **1.12 RSSCenterSettings**

Configuració global del comportament dels RSS per a un centre.

**Atributs conceptuals**

* centerId  
* secondsPerItem  
* secondsPerFeed  
* refreshMinutes (60 minuts per defecte)  
* maxItemsPerFeed *(recomanat; p. ex. 20\)*

---

### **1.13 RSSRotationOrder**

Defineix **quins** feeds RSS estan en rotació per a un centre i **en quin ordre**.

**Atributs conceptuals**

* centerId  
* feedId  
* position

---

### **1.14 Taules d’unió (relacions N–M)**

Per coherència amb una BD relacional, el domini assumeix taules d’unió explícites:

* **VideoTag**: (`videoId`, `tagId`)  
* **VideoHashtag**: (`videoId`, `hashtagId`)

**Restriccions recomanades (per evitar duplicats)**

* `UNIQUE(videoId, tagId)` a **VideoTag**.  
* `UNIQUE(videoId, hashtagId)` a **VideoHashtag**.

**Índexs recomanats (per filtratge ràpid)**

* Índex per `videoId` (a ambdues taules).  
* Índex per `tagId` (a **VideoTag**).  
* Índex per `hashtagId` (a **VideoHashtag**).

**Regla de domini**

* *Cada vídeo ha de tenir almenys un Tag.*  
  * Aquesta regla no es pot garantir només amb una FK.  
  * Habitualment s’assegura amb **validació d’aplicació** i/o amb una **constraint/trigger** a BD si es vol reforçar.

---

## **2\. Relacions entre entitats**

### **2.1 Relacions de propietat (multi-tenant)**

* Zone 1 ⟶ N Centre  
* Centre 1 ⟶ N User *(excepte **`admin_global`**, que pot tenir **`centerId`** nul)*  
* Centre 1 ⟶ N GuestAccessLink  
* Centre 1 ⟶ N Video  
* Centre 1 ⟶ N Hashtag  
* Centre 1 ⟶ N Playlist *(llistes pròpies del centre; definicions globals amb **`centerId`** nul)*  
* Centre 1 ⟶ N RSSFeed *(feeds propis del centre; feeds globals amb **`centerId`** nul)*  
* Centre 1 ⟶ N ScheduleOverride  
* Centre 1 ⟶ 1 RSSCenterSettings

### **2.2 Relacions de contingut**

* Video N ⟷ M Tag *(via VideoTag)*  
* Video N ⟷ M Hashtag *(via VideoHashtag)*  
* Playlist 1 ⟶ N PlaylistItem  
* Video 1 ⟶ N PlaylistItem  
* Playlist (definició global) 1 ⟶ N Playlist (còpies locals) via `originPlaylistId`

### **2.3 Relacions RSS**

* Centre 1 ⟶ N RSSRotationOrder  
* RSSFeed 1 ⟶ N RSSRotationOrder

---

## **3\. Regles i invariants del domini**

### **3.1 Rols i abast**

* **Un usuari només pot tenir un rol**.  
* Els permisos sempre estan limitats al centre, **excepte l’Administrador global**.

**Administrador global (`admin_global`\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*)**

* Abast global: pot gestionar centres, usuaris de tots els centres, zones, i crear elements globals.  
* Pot crear i revocar enllaços temporals de convidat.  
* Pot crear/configurar llistes globals (incloent `landing`) i RSS globals.

**Editor-profe (`editor_profe`\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*)**

* Abast de centre: gestiona vídeos, llistes i RSS del seu centre.  
* Pot gestionar usuaris del seu centre (alta per invitació, desactivació lògica, assignació de rols dins del centre).  
* Pot **aprovar/rebutjar** vídeos pujats per `editor_alumne`.  
* Pot **definir/modificar** el permís de compartició d’un vídeo amb altres centres.

**Editor-alumne (`editor_alumne`\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*)**

* Pot pujar vídeos il·limitadament.  
* Els seus vídeos entren en estat **pendent d’aprovació**.  
* Pot modificar/eliminar només els seus vídeos mentre estan pendents.  
* Permisos limitats en llistes segons `isStudentEditable`.  
* No pot gestionar usuaris, no pot aprovar contingut, i no pot modificar el permís de compartició.

**Display (`display`\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*)**

* Accés exclusiu a la pantalla principal en mode passiu (pantalla completa), sense menús ni interacció.

**Convidat (via `GuestAccessLink`)**

* Accés temporal sense autenticació.  
* Mode només lectura: pot veure llistes i vídeos **publicats** d’un únic centre.

---

### **3.2 Usuaris**

* `User.isActive = false` implica que l’usuari no pot accedir al sistema.  
* El sistema ha d’evitar deixar un centre amb **0 `editor_profe` actius**.  
* L’email és identificador principal (no s’utilitza `username`).

---

### **3.3 Vídeos**

* Cada vídeo pertany exactament a un centre.  
* Cada vídeo ha de tenir almenys una etiqueta (Tag).  
* La zona del vídeo és sempre la del centre propietari (derivada via `zoneId`).  
* Els vídeos pujats per `editor_alumne` són `pending_approval` fins aprovació.  
* Només `editor_profe` (i `admin_global`) poden:  
  * passar un vídeo a `published`  
  * modificar `isSharedWithOtherCenters`  
* **Finalitat de `isSharedWithOtherCenters`**: indica si el vídeo, un cop `published`, pot ser **visible/seleccionable per altres centres** (p. ex. a la Pàgina de Contingut quan es filtra per centre/zona) i si pot ser inclòs en continguts **globals** com la `landing` playlist. Per defecte és `false`.

---

### **3.4 Llistes de reproducció**

* Les llistes `weekday` i `announcements` no es poden eliminar.  
* La llista d’anuncis només pot contenir vídeos de tipus `announcement`.  
* Les llistes `custom` només es poden utilitzar com a llista principal.  
* `isStudentEditable` per defecte és false i:  
  * sempre es considera false en llistes `announcements`.  
  * sempre es considera false en llistes `global`.  
* No hi ha autosave: els canvis s’han de confirmar explícitament.

**Landing playlist**

* `landing` només pot contenir vídeos `published` i compartits (`isSharedWithOtherCenters = true`).

---

### **3.5 Calendari**

* Si existeix un `ScheduleOverride` per una data, preval sobre la llista per defecte del dia.  
* No poden existir dues assignacions per al mateix `centerId` i `date` (a nivell de BD es recomana un `UNIQUE(centerId, date)`).  
* Si s’elimina una llista assignada al calendari, el sistema torna al comportament per defecte.

---

### **3.6 RSS**

* Només es mostren en pantalla els feeds amb `isActive = true` **i** que estiguin presents a `RSSRotationOrder`.  
* Si un feed falla, el sistema continua amb la resta.  
* Si no hi ha feeds en rotació, es mostra un missatge informatiu.

---

## **4\. Notes de disseny**

* El model és multi-tenant amb `Centre` com a arrel.  
* Els elements globals es modelen com a entitats sense `centerId` (o amb `centerId = null`).  
* El rol **Convidat** no és un usuari autenticat: és un accés temporal via token.  
* Aquest document defineix el **què** (domini), no el **com** (implementació física de la BD).

