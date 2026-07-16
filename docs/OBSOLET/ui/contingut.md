# **Especificació de la Pàgina de Contingut de Publicat**

## **0\. Layout comú i comportament del menú lateral**

Totes les pàgines del rol **editor, administrador i convidat** comparteixen un **layout persistent** format per:

* **Barra superior fixa**, comuna a tota l'aplicació.  
* **Menú lateral esquerre fix**, amb icones representatives de cada secció. el rol d’administrador i editor-profe pot veure un botó al menú lateral que els altres usuaris no veuen “Administració”.

Només el **contingut central** canvia segons la secció seleccionada (Pantalla, Contingut, Llistes, RSS...).

### **0.1 Indicació de la secció activa**

Per facilitar la navegació i mantenir coherència visual:

* La **icona activa** del menú lateral es ressalta amb un **color destacat** (color primari del projecte).  
* Opcionalment, la icona activa pot incorporar un **accent visual vertical** al costat esquerre, reforçant el ressalt.  
* La resta d’icones mantenen un color neutre.

### **0.2 Tooltips**

* Les icones del menú lateral no mostren text permanent.  
* En passar el cursor per sobre, apareix un **tooltip** amb el nom de la secció.

### **0.3 Mode Pantalla Completa**

* Només la pàgina **Pantalla** inclou el botó de pantalla completa.  
* Aquest mode amaga temporalment la barra superior i el menú esquerre.  
* La resta de pàgines **no** poden activar la pantalla completa.

### **0.4 Mode Display**

* Els usuaris amb rol **display** no veuen ni el menú lateral ni la barra superior.  
* No hi ha secció activa a destacar.

## **1\. Objectiu de la pàgina de Contingut**

La pàgina de **Contingut** és l'espai on els usuaris amb rol **editor** poden visualitzar, filtrar, gestionar i pujar vídeos associats al seu centre, així com consultar vídeos d'altres centres educatius. Aquesta pàgina té com a finalitat oferir una visió global del catàleg de vídeos disponibles i permetre'n la gestió de forma eficient.

Aquesta pàgina no és accessible per a l'usuari **display**, que només visualitza contingut des de la pantalla principal.

---

## **2\. Visualització dels vídeos**

### **2.1 Format de presentació**

Els vídeos es mostren en una **graella de targetes** (cards), organitzada per pàgines de **24 vídeos per pàgina**.

Cada targeta inclou:

* Imatge de previsualització (*thumbnail*).  
* Títol del video.  
* Centre i Zona automàtics.  
* Etiquetes globals (mínim una, màxim diverses).  
* **Hashtags del centre** (opcionals).  
* Indicador de tipus (**Anunci** / **Contingut**).  
* **Estat de compartició** (Només centre / Compartit amb altres centres).  
* Durada del vídeo.  
* Data de pujada.  
* Accions disponibles:  
  * **Editar metadades**.  
  * **Esborrar video**.  
  * **Afegir el vídeo a una llista**.

### **2.2 Thumbnail del vídeo**

La imatge de previsualització provindrà de **Vimeo** quan s'integri la connexió via API.

* **Primera fase del projecte:** abans de la integració amb l'API de Vimeo, tots els vídeos mostraran un **thumbnail estàndard** (imatge per defecte).  
* **Segona fase:** en pujar o registrar un vídeo, el sistema recuperarà el *thumbnail* des de Vimeo.

---

## **3\. Filtres**

La pàgina disposa d'un panell de filtres per facilitar la consulta del catàleg.

### **3.1 Filtre per Centre**

* Per defecte, el filtre mostra **només els vídeos del centre de l'usuari**.  
* L'usuari pot eliminar aquest filtre o seleccionar qualsevol altre centre.  
* Quan es selecciona un centre diferent del propi, **només es mostren els vídeos que aquell centre ha marcat explícitament com a compartits**.

### **3.2 Filtre per Zona**

* Zones derivades automàticament de la taula de centres.  
* Es pot combinar amb el filtre per centre o utilitzar de manera independent.

### **3.3 Filtre per Tipus**

Opcions:

* Tots  
* Només **Anuncis**  
* Només **Contingut**

### **3.4 Filtre per Etiquetes (globals)**

Els vídeos disposen d’un conjunt predefinit de 12 etiquetes globals:

* World  
* Espanya  
* Catalunya  
* Esports  
* Meteorologia  
* Stems-TECH  
* Efemèrides  
* Dites i refranys  
* Curiositats  
* Música  
* Arts  
* **Vida al centre**

Característiques del sistema d’etiquetes globals:

* Cada vídeo ha de tenir **com a mínim una etiqueta global**.  
* Els vídeos poden tenir **múltiples etiquetes globals**.  
* El filtre permet **selecció múltiple**.

### **3.5 Filtre per Hashtags del centre**

Els **hashtags** són una capa de classificació **complementària i opcional**, definida lliurement per cada centre.

Característiques dels hashtags:

* Cada centre pot crear els seus propis hashtags.  
* Els hashtags **només són visibles i filtrables dins del mateix centre**.  
* Altres centres **no veuen ni poden filtrar** pels hashtags d’un centre diferent.  
* Un vídeo **pot tenir zero, un o diversos hashtags**.  
* L’ús de hashtags **no és obligatori**.

Ús en la interfície:

* En crear o editar un vídeo, l’editor pot:  
  * Seleccionar hashtags existents del centre.  
  * Crear nous hashtags de manera implícita en escriure’ls.  
* A la pàgina de Contingut, el filtre per hashtags:  
  * Només apareix quan s’estan visualitzant vídeos del **centre de l’usuari**.  
  * Permet localitzar ràpidament vídeos relacionats amb projectes, cursos o temàtiques internes.

Exemples d’ús:

* \#batx2  
* \#tr25  
* \#viatgeRoma  
* \#república

### **3.6 Ordenació**

### **3.6 Ordenació**

Ordenació per defecte: **Data de pujada (més recents primer)**.

Es preveu que en futures versions es puguin afegir opcions addicionals d’ordenació (alfabètic, antiguitat, etc.).

---

## **4\. Metadades del vídeo**

### **4.1 Camps automàtics**

S’assignen automàticament segons el perfil i configuració del centre:

* **Centre**  
* **Zona**

L’usuari no pot modificar aquests valors.

### **4.2 Camps editables**

Quan es crea o edita un vídeo, l’editor pot gestionar:

* Títol  
* Descripció  
* Tipus: **Anunci** / **Contingut**  
* Etiquetes globals  
* **Hashtags del centre (opcionals)**  
* **Permís de compartició amb altres centres** *(només editor-profe)*  
* URL de Vimeo (en la primera fase)  
* Durada (si no s'obté automàticament)

### **4.3 Requisits especials**

* En la primera fase, els vídeos es pugen manualment a Vimeo i al formulari només s’inclou la **URL**.  
* En fases posteriors, el formulari permetrà **pujar el fitxer directament**, i el backend l’enviarà automàticament a Vimeo.

---

## **5\. Accions disponibles**

### **5.1 Edició de metadades**

El rol **profe-editor** pot modificar les metadades **de qualsevol vídeo del seu centre**.

### **5.2 Eliminació de vídeos**

Pot eliminar vídeos del seu centre. L’administrador tindrà permisos ampliats (definició en document addicional).

### **5.3 Afegir vídeos a llistes**

Des de la targeta d’un vídeo o des d’una selecció múltiple, l’usuari pot afegir vídeos a qualsevol de les llistes del seu centre.

### **5.4 Pujar nou contingut**

En prémer **Pujar contingut**, s’obre un formulari amb les metadades necessàries i la URL del vídeo de Vimeo.

Un cop creat:

* Apareix un **missatge de confirmació**.  
* L’usuari pot afegir immediatament el vídeo a una llista.

---

## **6\. Rols i permisos**

### **6.1 Editor-profe**

* Pot veure vídeos de tots els centres (modificant els filtres).  
* Pot gestionar (editar/esborrar) vídeos del seu centre.  
* Pot editar totes les metadades dels vídeos del centre.  
* Ha d’aprovar els vídeos pujats pels editor-alumne perquè siguin públics, sino els aprova s’eliminen.  
* **És l’únic rol que pot definir o modificar el permís de compartició d’un vídeo amb altres centres**.

### **6.2 Editor-alumne**

* Pot pujar vídeos al sistema que no seran publicats inmediatament sino que hauran de ser aprovats per un editor-profe.  
* Els vídeos pujats queden per defecte amb **permís de compartició desactivat**.  
* No pot editar metadades un cop el vídeo ha estat aprovat.  
* No pot modificar el permís de compartició.

### **6.3 Administrador (rol superior)**

* Pot donar d’alta o baixa centres.  
* Pot crear llistes globals per a tots els centres.  
* Pot tenir permisos ampliats per gestionar vídeos de tots els centres (es definirà més endavant).

### **6.4 Display**

* No accedeix a la pàgina de Contingut.  
* Només visualitza la pantalla principal.

---

## **7\. Paginació**

Els vídeos es mostren en blocs de **24 vídeos per pàgina**, amb controls de navegació:

* Anterior  
* Pàgines numerades  
* Següent

---

## **8\. Flux de creació d’un vídeo**

1. L’usuari prem **Pujar contingut**.  
2. S’obre el formulari amb els camps editables.  
3. En desar:  
   * Es crea el vídeo amb Centre i Zona automàtics.  
   * Es genera un missatge de confirmació.  
   * Es dona l’opció d’**afegir el vídeo a una llista**.

---

## **9\. Resum funcional**

La pàgina de Contingut permet:

* Visualitzar i filtrar vídeos del propi centre i **vídeos compartits d’altres centres**.  
* Garantir que **només els vídeos marcats com a compartits** siguin visibles intercentres.  
* Editar i gestionar els vídeos del centre de l’editor.  
* Utilitzar **etiquetes globals obligatòries** per a la classificació comuna.  
* Utilitzar **hashtags opcionals per centre** com a eina flexible de classificació interna.  
* Controlar explícitament la **compartició de vídeos** segons criteris pedagògics i legals.  
* Integrar thumbnails i metadades provinents de Vimeo.  
* Mantenir una experiència clara i ordenada amb graella de 24 vídeos per pàgina.  
* Centralitzar la gestió de contingut audiovisual dels centres educatius.

