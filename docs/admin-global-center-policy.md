# Política d'Assignació de Centre per a Administradors Globals

## Resum

A partir de la versió implementada el 7 de gener de 2026, tots els **administradors globals** del sistema PUBLI\*CAT es vinculen automàticament al **Centre Lacenet** per defecte.

## Motivació

### Problema Original
Els administradors globals, per disseny inicial, no tenien cap centre assignat (`center_id = NULL`). Això causava:

1. **Pàgina de contingut bloquejada**: La interfície de gestió de vídeos (`/contingut`) requeria un `center_id` vàlid, deixant els admins globals sense accés funcional.
2. **Limitació operativa**: Els administradors no podien pujar ni gestionar contingut propi del projecte PUBLI\*CAT o material corporatiu de Lacenet.
3. **Inconsistència**: Altres rols (`editor_profe`, `editor_alumne`, `display`) sempre tenien centre assignat, creant una excepció tècnica innecessària.

### Solució Implementada
Assignar automàticament el **Centre Lacenet** a tots els administradors globals, mantenint alhora la seva capacitat d'accedir i gestionar tots els centres del sistema.

## Política Aplicada

### 1. Centre per Defecte: Lacenet
- Lacenet és el centre que representa l'**associació que impulsa el projecte PUBLI\*CAT**.
- Aquest centre serveix com a espai de treball per a:
  - Material corporatiu del projecte
  - Contingut d'ús general compartible entre centres
  - Vídeos de formació o tutorials del sistema

### 2. Flexibilitat Mantinguda
- Els administradors globals **mantenen accés complet** a tots els centres del sistema.
- Poden visualitzar, editar i gestionar vídeos de qualsevol centre.
- El centre assignat només defineix on es guarden els vídeos que ells pugen.

### 3. Opcionalitat
- Si es crea un administrador global amb un centre específic (diferent de Lacenet), aquest centre s'utilitza.
- El mecanisme automàtic només actua quan **no s'especifica cap centre** (`center_id = NULL`).

## Implementació Tècnica

### 1. Modificació del Constraint de Base de Dades

**Abans:**
```sql
CONSTRAINT chk_user_center_role CHECK (
    (role = 'admin_global' AND center_id IS NULL) OR 
    (role <> 'admin_global' AND center_id IS NOT NULL)
)
```

**Després:**
```sql
CONSTRAINT chk_user_center_role CHECK (
    (role = 'admin_global') OR 
    (role <> 'admin_global' AND center_id IS NOT NULL)
)
```

Això permet que els `admin_global` tinguin un `center_id` assignat.

### 2. Migració d'Usuaris Existents

**Migració:** [`20250107000000_add_lacenet_center_and_fix_admin.sql`](../supabase/migrations/20250107000000_add_lacenet_center_and_fix_admin.sql)

Actualitza automàticament tots els administradors globals existents sense centre:

```sql
UPDATE users 
SET center_id = (SELECT id FROM centers WHERE LOWER(name) = 'lacenet' LIMIT 1),
    updated_at = now()
WHERE role = 'admin_global' AND center_id IS NULL;
```

### 3. Trigger per a Nous Usuaris

**Funció:** `assign_lacenet_to_admin_global()`

Quan es crea un nou usuari amb rol `admin_global` i sense `center_id`:
1. El trigger busca el centre Lacenet a la base de dades
2. Assigna automàticament aquest centre abans de la inserció
3. L'usuari es crea ja amb el centre configurat

```sql
CREATE TRIGGER tr_assign_lacenet_to_admin
BEFORE INSERT ON users
FOR EACH ROW EXECUTE FUNCTION assign_lacenet_to_admin_global();
```

### 4. Codi d'Aplicació

**API de creació d'usuaris:** [`/api/admin/users`](../app/api/admin/users/route.ts)

Quan es crea un administrador global:
```typescript
center_id: role === 'admin_global' ? null : center_id
```

Com que s'insereix amb `center_id = null`, el trigger detecta aquesta situació i assigna Lacenet automàticament.

## Beneficis

### Per als Administradors
- ✅ Accés complet a la pàgina de gestió de contingut
- ✅ Capacitat de pujar vídeos propis del projecte
- ✅ Espai de treball coherent i consistent
- ✅ Mantenen accés global a tots els centres

### Per al Sistema
- ✅ Elimina casos excepcionals en la gestió de permisos
- ✅ Simplifica la lògica d'interfície d'usuari
- ✅ Millora la consistència del model de dades
- ✅ Facilita futurs desenvolupaments

### Per al Projecte
- ✅ Centre corporatiu per a material oficial de PUBLI\*CAT
- ✅ Punt centralitzat per a recursos compartits
- ✅ Visibilitat de l'associació Lacenet

## Verificació

### Comprovar Assignació Automàtica

**1. Usuaris existents actualitzats:**
```sql
SELECT id, email, role, center_id 
FROM users 
WHERE role = 'admin_global';
```

Tots haurien de tenir `center_id` apuntant a Lacenet.

**2. Crear nou administrador global:**
```typescript
// Via API o SQL, crear usuari amb center_id = null
// Verificar que automàticament té assignat Lacenet
```

**3. Accés a contingut:**
- Login com a admin_global
- Navegar a `/contingut`
- Verificar que carrega correctament i mostra "Centre: Lacenet"

## Notes Finals

- **Data d'implementació:** 7 de gener de 2026
- **Migració aplicada:** `20250107000000_add_lacenet_center_and_fix_admin.sql`
- **Compatibilitat:** Totalment compatible amb versions anteriors
- **Reversibilitat:** Es pot modificar manualment el centre d'un admin_global a la base de dades si cal

---

**Documentació relacionada:**
- [Rols d'usuari](roles.md)
- [Esquema de base de dades](database.schema.md)
- [Configuració de Supabase](CONFIGURACIO_SUPABASE_URLS.md)
