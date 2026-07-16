# **Especificació de la Pantalla Principal de Publicat**

Estructura de la pantalla principal:

Botó a la part dreta inferior per conmutar el menú esquerra i la barra superior.

## **1\. Context i rols d’usuari**

La definició completa dels rols d’usuari del projecte Publicat (tipus de rol, permisos i abast funcional) es recull al document específic **“Rols d’usuari – Publicat”**, que actua com a referència canònica.

En aquest document només es descriu **com aquests rols afecten el comportament de la Pantalla Principal**, especialment pel que fa als modes de visualització i interacció.

De manera resumida, la Pantalla Principal pot funcionar en dos **modes de visualització**, derivats del rol de l’usuari autenticat:

* **Mode editor**: disponible per a rols administrador, convidat, i editor-alumne i editor-profe. Permet accedir al menú lateral, controls del reproductor i opcions de configuració.  
* **Mode display**: disponible per a rol display. Mostra exclusivament el contingut final en pantalla completa, sense elements d’edició.

## **2\. Visió general de la pantalla principal**

Visió general de la pantalla principal

La pantalla principal simula exactament la composició que es veurà a la pantalla física del vestíbul del centre. La resolució objectiu de disseny és **1920x1080 (Full HD)**, amb una disposició de blocs visualment fixa semblant al wireframe de referència.

### **Estructura general**

En mode **editor**, la pantalla principal inclou:

* **Barra superior** (a dalt):  
  * Mostra el logotip del projecte Publicat o el logo institucional.  
  * Manté el mateix estil visual que la pàgina de landing (colors, tipografia, etc.).  
  * Inclou un botó de **Logout** a la dreta.  
* **Menú lateral esquerre**:  
  * Bloc superior amb el **logo del centre** (element decoratiu, no interactiu).  
  * Botó **Pantalla**: retorna a aquesta vista principal.  
  * Botó **Contingut**: accés al llistat de vídeos i filtres.  
  * Botó **Llistes**: gestió de llistes de reproducció (dia de la setmana, anuncis, llistes personalitzades).  
  * Botó **RSS**: configuració de feeds RSS.  
  * Botó “Administració” visible només per als rols administrador i editor-profe.  
  * L’ordre dels botons és **fix**.  
  * Cada botó mostra una **icona**; el text descriptiu apareix com a **tooltip flotant** quan l’usuari passa el cursor per sobre.  
* **Zona central** (gran, a l’esquerra):  
  * Reproductor principal de la llista de vídeos.  
  * És la zona de major mida i la de més rellevància visual.  
* **Zona dreta superior**:  
  * Bloc destinat a la llista d’**Anuncis** (vídeos o continguts visuals breus).  
* **Zona dreta inferior**:  
  * Bloc destinat al **feed RSS** seleccionat pel centre.

En mode **display**, només es veuen les tres zones de contingut (reproductor principal, anuncis i RSS) ocupant tota la pantalla. No hi ha barra superior, menú lateral ni controls d’edició, i aquests elements no formen part del DOM.

## **3\. Comportament del reproductor principal**

* Per defecte, en carregar la pantalla, el sistema selecciona la **llista de reproducció corresponent al dia de la setmana** (dilluns, dimarts, etc.), definida prèviament per l’usuari editor.  
* L’usuari editor pot **canviar manualment** la llista mitjançant un desplegable de selecció.  
  * Aquesta selecció manual té efecte **només mentre dura la sessió**.  
  * Quan es torna a obrir la pantalla, es torna a la llista per defecte segons el dia.  
* En fer *Play*, els vídeos de la llista es reprodueixen **un darrere l’altre de forma automàtica**, sense indicador de temps restant i sense efectes especials entre vídeos.  
* Els controls del reproductor en **mode editor** són **tipus YouTube**:  
  * Es mostren quan l’usuari mou el cursor per sobre de la zona de vídeo.  
  * Quan el cursor no es mou durant un temps, els controls s’amaguen.  
* En **mode display**, aquests controls **no existeixen** a nivell d’interfície: la televisió mostra únicament el vídeo, sense cap element interactiu sobreposat.

## **4\. Zona d’Anuncis**

* La zona d’Anuncis (dreta superior) reprodueix en bucle la **llista especial d’Anuncis** configurada per l’editor.  
* Es poden mostrar vídeos (i eventualment imatges) amb informació del centre: esdeveniments, recordatoris, avisos interns, etc.  
* La reproducció és automàtica i cíclica, sense necessitat d’interacció de l’usuari.  
* Si la llista d’anuncis està buida, es mostra un missatge neutre del tipus `No hi ha anuncis configurats actualment`.

## **5\. Zona RSS**

La zona RSS (dreta inferior) mostra contingut informatiu procedent d’un o diversos **feeds RSS** seleccionats per l’usuari editor. La seva funció és oferir una combinació de notícies, titulars i informacions rellevants que vagin canviant de manera fluida i variada. El model de funcionament recomanat combina dos mecanismes:

### **5.1 Presentació de titulars (Model B)**

* El sistema mostra **un titular cada vegada**, en format de targeta vertical, amb:  
  * Títol de la notícia.  
  * Descripció breu (si està disponible).  
  * Imatge associada (si el feed RSS la proporciona).  
* Cada titular es manté visible durant un interval breu i configurable (per exemple, **10 a 20 segons**).  
* En acabar aquest interval, es passa automàticament al següent titular del mateix feed.  
* Quan s’arriba al final dels titulars, el feed torna a començar.

Aquest model garanteix una presentació **nítida, llegible i visualment agradable**.

### **5.2 Rotació entre diversos RSS (Model C)**

* L’usuari editor pot seleccionar **més d’un feed RSS** entre els disponibles.  
* La zona RSS mostra titulars del **primer feed** durant un període determinat (per exemple, **1 a 3 minuts**).  
* Un cop transcorregut aquest període, el sistema passa automàticament al **segon feed**, després al tercer, i així successivament.  
* En acabar la llista de feeds seleccionats, el sistema torna al primer.

Aquesta rotació evita la sensació de bucle repetitiu i assegura **varietat de contingut informatiu**.

### **5.3 Actualització automàtica**

* Cada feed RSS s’actualitza periòdicament de manera automàtica (interval configurable, recomanació inicial: **cada 5 minuts**).  
* Quan hi ha noves notícies, es van incorporant al cicle de visualització.

### **5.4 Gestió d’errors**

* Si un feed RSS no respon o no té contingut disponible, el sistema mostra un missatge neutre del tipus:  
  * `Contingut no disponible temporalment.`  
* El sistema continua la rotació passant al següent feed seleccionat.

### **5.5 Comportament en mode display**

* La zona RSS funciona **totalment de forma automàtica**.  
* No hi ha controls visibles ni necessitat d’interacció.  
* La televisió del vestíbul reprodueix contínuament la seqüència de titulars i la rotació de feeds.  
* El contingut s’actualitza en segon pla sense interrompre la reproducció.

## **6\. Mode Pantalla Completa**

### **6.1 Pantalla completa manual (mode editor)**

* En mode editor hi ha un **botó de Pantalla Completa** (per exemple, a la barra superior o integrat a la zona central).  
* Quan l’usuari el prem:  
  * Es **desapareixen instantàniament** la barra superior i el menú lateral.  
  * Es mantenen visibles únicament les tres zones de contingut: reproductor principal, Anuncis i RSS.  
* En sortir del mode pantalla completa, reapareixen la barra superior i el menú lateral en el seu estat original.

### **6.2 Pantalla completa automàtica (mode display)**

* En mode display, la Pantalla Principal es mostra **sempre en pantalla completa**.  
* No existeix cap botó ni control per activar o desactivar aquest mode.  
* La pantalla completa s’activa automàticament en carregar la vista.

## **7\. Comportament específic de l’usuari display**

Comportament específic de l’usuari display

Quan un dispositiu (televisió del vestíbul) inicia sessió amb un **usuari de rol display**:

1. El sistema recorda la sessió i, habitualment, **no es fa logout**.  
2. En accedir de nou a la URL de Publicat:  
   * Es comprova si hi ha sessió display activa; si n’hi ha, **no es demana login**.  
   * Es carrega directament la **pantalla principal en mode pantalla completa**.  
   * Es carrega per defecte la llista de reproducció del **dia de la setmana** definida per l’editor.  
   * La reproducció del reproductor principal comença **automàticament** (‘autoplay’).  
   * Les zones d’Anuncis i RSS també es mostren i funcionen en mode automàtic.  
3. L’usuari display **no veu ni pot accedir al menú lateral ni a seccions d’edició**.  
4. El dispositiu pot romandre encès hores i dies; el sistema està pensat perquè la reproducció sigui **cíclica i contínua** sense intervenció manual.

## **8\. Resum funcional**

* La pantalla principal és una **vista prèvia editable** per a usuaris editor i una **vista 100% de display** per a usuaris display.  
* L’estructura visual (vídeo principal, anuncis, RSS) es manté **fixa**, amb proporcions similars al wireframe de referència en una resolució base de 1920x1080.  
* El contingut que es mostra depèn de les llistes i RSS configurats prèviament per l’usuari editor.  
* El rol display garanteix que la pantalla del vestíbul funcioni de forma **automàtica, estable i sense necessitat d’interaccions manuals**.

