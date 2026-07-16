# Milestone 1.0: Convencions & Contractes

Aquest document estableix les bases tècniques i les convencions de disseny per a tota la infraestructura de dades de **Publicat**. És el contracte que garanteix la consistència entre tots els sub-milestones de la fase Foundation.

---

## 1. Convencions de Naming

### 1.1 Base de Dades (PostgreSQL)
- **Taules:** Plural i `snake_case` (ex: `centers`, `playlist_items`).
- **Columnes:** `snake_case` (ex: `center_id`, `created_at`).
- **Claus Primàries (PK):** Sempre `id` de tipus `uuid`.
- **Claus Estrangeres (FK):** `<singular_table_name>_id` (ex: `center_id`).
- **Índexs:** `idx_<table_name>_<column_names>` (ex: `idx_videos_center_id`).
- **Constraints:** `chk_<table_name>_<description>` (ex: `chk_videos_duration_positive`).

### 1.2 Tipus de Dades Base
- **Identificadors:** `uuid` (default: `gen_random_uuid()`).
- **Dates/Hores:** `timestamptz` per a tot el que requereixi precisió temporal.
- **Dates simples:** `date` (ex: per a `schedule_overrides`).
- **Booleans:** `boolean` (default: `true` o `false` segons context).
- **Text:** `text` (evitar `varchar(n)` a menys que hi hagi una restricció de negoci estricta).
- **Emails:** `text` amb validació o `citext` si està disponible.

---

## 2. Camps Estàndard (Audit & Lifecycle)

Totes les taules (sempre que sigui possible) han d'incloure:
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- `is_active boolean NOT NULL DEFAULT true` (per a baixa lògica)

---

## 3. Contracte Multi-tenant

### 3.1 La columna `center_id`
- Tota entitat que pertanyi a un centre **ha de tenir** una columna `center_id uuid`.
- Aquesta columna és la base de l'aïllament de dades via RLS.
- **Excepció:** Entitats globals (com `zones` o `tags`) on `center_id` pot ser `NULL` o no existir.

### 3.2 Aïllament de Dades
- **Deny by Default:** Per defecte, cap usuari pot veure cap fila a menys que una política RLS ho permeti explícitament.
- **Isolation:** Un usuari amb `center_id` X mai ha de poder veure dades del centre Y, excepte en casos de compartició explícita (`is_shared_with_other_centers = true`).

---

## 4. Filosofia de Seguretat (RLS)

- **Polítiques Granulars:** Es crearan polítiques separades per a `SELECT`, `INSERT`, `UPDATE` i `DELETE`.
- **Basat en Rols:** Les polítiques utilitzaran el rol de l'usuari (`admin_global`, `editor_profe`, etc.) emmagatzemat a la taula `public.users`.
- **Security Definer:** Les funcions de trigger i automatismes s'executaran com a `SECURITY DEFINER` per garantir que funcionen independentment de les polítiques RLS de l'usuari que les dispara.

---

## 5. Gestió de l'Estat (Soft Delete)

- No s'utilitzarà `deleted_at` de forma generalitzada en aquesta fase inicial per evitar complexitat en les queries.
- S'utilitzarà `is_active = false` per a desactivar entitats (centres, usuaris, feeds).
- Per a entitats transaccionals (com vídeos rebutjats), s'aplicarà **Hard Delete** per mantenir la base de dades neta.

---

## 6. Què NO s'implementa en M1.0
- No es creen taules.
- No es defineixen RLS concretes.
- No es creen triggers.

---

## 7. Checklist de Validació
- [ ] Les convencions són coherents amb `database.schema.md`.
- [ ] El contracte multi-tenant cobreix tots els casos d'ús de `domain-model.md`.
- [ ] L'equip de desenvolupament ha validat el naming.

---
**Estat:** Definit
**Data:** 23 desembre 2025
