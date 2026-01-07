# Configuració URLs de Supabase per a Producció

## Problema
Quan fas logout a Vercel, intenta redirigir a `http://localhost:3000/login` en lloc de la URL de producció.

## Solució
Configura les URLs de redirect al dashboard de Supabase:

### 1. Accedeix al Dashboard de Supabase
https://app.supabase.com/project/tvsafusrasfzubiujavk

### 2. Configura les URLs de Redirect

**Authentication → URL Configuration:**

#### Site URL
```
https://app-videos-lacenet.vercel.app
```
(o la URL de producció que tinguis a Vercel)

#### Redirect URLs (afegeix totes aquestes):
```
http://localhost:3000/**
https://app-videos-lacenet.vercel.app/**
https://*.vercel.app/**
```

### 3. Variables d'entorn a Vercel

Assegura't que a Vercel tens configurada:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tvsafusrasfzubiujavk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<la_teva_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<la_teva_service_role_key>
```

**NO configuris** `NEXT_PUBLIC_SITE_URL` ja que el codi ara detecta automàticament l'origen.

### 4. Canvis al codi (ja implementats)

✅ [app/auth/signout/route.ts](../app/auth/signout/route.ts) - Detecta l'origen dinàmicament
✅ [app/pantalla/sign-out-button.tsx](../app/pantalla/sign-out-button.tsx) - Usa `window.location.href` per forçar navegació

### 5. Verificació

Després de configurar:
1. Desplega els canvis a Vercel: `git push`
2. Espera que es completi el deployment
3. Prova fer logout a la URL de producció
4. Hauria de redirigir correctament a `/login` de la mateixa URL

## Notes adicionals

- Les URLs amb `**` permeten qualsevol subruta
- El wildcard `*.vercel.app` permet preview deployments
- Si canvies el domini personalitzat, actualitza les URLs

---

**Data:** 7 de gener de 2026
**Versió:** 1.0
