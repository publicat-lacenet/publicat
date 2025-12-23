# **Rols d’usuari – Publicat**

Aquest document defineix de manera clara i exhaustiva els **rols d’usuari** del sistema Publicat, els seus objectius i els permisos associats. El model està pensat per ser **simple, segur i escalable**, i per facilitar tant la implementació tècnica (RLS, UI) com l’ús real per part dels centres.

---

## **1\. Administrador global**

### **Objectiu**

Usuari amb control total sobre el sistema, independent dels centres. És l’únic rol amb abast global.

### **Permisos**

* Accés a la **pantalla d’Administració global**.  
* Crear, editar i eliminar **tots els tipus d’usuaris** de tots els centres:  
  * Administrador global  
  * Editor-profe  
  * Editor-alumne  
  * Display  
* Assignar usuaris a centres.  
* Crear i revocar **enllaços temporals de convidat**.  
* Revocar accessos abans del termini.  
* Accés complet a tots els centres i continguts.

### **Restriccions**

* No en té a nivell funcional.

---

## **2\. Editor-profe**

### **Objectiu**

Responsable editorial d’un centre. Gestiona contingut, llistes i usuaris del seu centre.

### **Permisos**

* Accés complet a totes les pàgines del seu centre (excepte administració global).  
* Pujar, editar i eliminar vídeos del centre.  
* Crear, editar i eliminar llistes de reproducció.  
* Editar metadades de vídeos.  
* Aprovar o rebutjar vídeos pujats per alumnes.  
* Crear usuaris del seu centre amb els rols:  
  * Editor-profe  
  * Editor-alumne  
  * Display

### **Restriccions**

* No pot crear ni gestionar convidats.  
* No pot accedir a les pàgines d'altres centres.

---

## **3\. Editor-alumne**

### **Objectiu**

Permetre la participació de l’alumnat en la pujada de contingut, sota supervisió del professorat.

### **Permisos**

#### **Vídeos**

* Pot pujar vídeos il·limitadament.  
* Els vídeos pujats queden en estat **pendent d’aprovació**.  
* Pot eliminar o modificar **només els seus vídeos** mentre estiguin pendents.

#### **Llistes de reproducció**

* Pot editar llistes existents **només si** `isStudentEditable = true`.  
* Pot afegir, treure o reordenar **només vídeos aprovats**.

### **Restriccions**

* No pot crear ni eliminar llistes.  
* No pot canviar el nom ni les propietats de les llistes.  
* No pot editar vídeos un cop aprovats.  
* No pot veure vídeos pendents d’altres alumnes.  
* No pot aprovar contingut.  
* No pot gestionar usuaris.

---

## **4\. Display**

### **Objectiu**

Mostrar contingut en una pantalla física (TV, projector, monitor) en mode passiu.

### **Permisos**

* Accés exclusiu a la **pantalla de reproducció**.  
* Reproducció automàtica.  
* Visualització en **pantalla completa**.

### **Restriccions**

* No veu menús ni cap altra pàgina.  
* No pot navegar, editar ni interactuar amb el sistema.

---

## **5\. Convidat (temporal)**

### **Objectiu**

Permetre la visualització del contingut d’un centre sense autenticació.

### **Característiques generals**

* Accés mitjançant **enllaç temporal**.  
* Caducitat per defecte: **7 dies**.  
* Només l’**administrador global** pot crear i revocar aquests enllaços.  
* No requereix autenticació.

### **Permisos**

* Veure vídeos **publicats** d’un únic centre.  
* Veure llistes de reproducció del centre.

### **Restriccions**

* Mode **només lectura**.  
* No pot pujar vídeos.  
* No pot editar contingut ni llistes.  
* No pot veure contingut pendent o no publicat.

---

## **6\. Principis generals del model de rols**

* Un usuari **només pot tenir un rol**.  
* Els permisos sempre estan **limitats al centre**, excepte l’administrador global.  
* Els fluxos crítics (aprovació, convidats, usuaris) estan centralitzats per garantir control.  
* Els rols estan pensats per tenir una correspondència clara amb:  
  * UI (què veu cada rol)  
  * Backend (RLS)

---

Aquest document és la base per definir, en una fase posterior, **quins rols poden accedir a cada pantalla** del sistema.

