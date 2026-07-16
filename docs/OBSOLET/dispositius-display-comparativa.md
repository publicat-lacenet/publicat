# Comparativa de dispositius per a pantalles de display
**Data de consulta:** febrer 2026 | **Font de preus:** Amazon.es | **Pressupost objectiu: ~90 €**

## Context i requisits

L'aplicació PUBLI*CAT (`/pantalla`) reprodueix **dos streams de vídeo simultàniament** via iframes de Vimeo:
- Vídeo principal (70% pantalla) — 1080p
- Zona d'anuncis (30% pantalla) — **reduït a 360p** *(optimització decidida)*

Baixar els anuncis a 360p redueix el bitrate del segon stream aproximadament un **90%**, cosa que fa que dispositius de gamma mitja-baixa puguin gestionar la reproducció doble sense problemes.

### Requisits del dispositiu

| Requisit | Valor |
|----------|-------|
| **Navegador web** | Obligatori — Chrome o Chromium complet (no versió TV) |
| **Decodificació** | 1× 1080p H.264 + 1× 360p H.264 per hardware |
| **RAM** | Mínim 3 GB (recomanat 4 GB) |
| **Ethernet** | Molt recomanat (evita micro-talls en streams Vimeo) |
| **Ús continu** | 24/7 sense reinicis |

> ⚠️ **Limitació important:** Els dispositius de streaming purs (Google TV, Fire TV, Apple TV...)
> **no serveixen** per a PUBLI*CAT perquè no disposen de navegador web complet.
> Cal un dispositiu que pugui obrir una URL de Chrome/Chromium.

---

## Opcions a ~90 €

### Opció 1 — Raspberry Pi 4 Model B (4 GB) · Kit complet
**Preu Amazon.es: ~85–95 € (kit)**
[Placa sola ~65–70 €](https://www.amazon.es/Raspberry-Pi-4595-Modelo-GB/dp/B09TTNF8BT) · [Kit 64 GB ~85–95 €](https://www.amazon.es/Raspberry-Starter-Tarjeta-Precargada-Raspbian/dp/B09HGXYQ4S)

| Especificació | Valor |
|---------------|-------|
| Xip | BCM2711 — 4× Cortex-A72 @ 1.8 GHz |
| RAM | 4 GB LPDDR4 |
| Emmagatzematge | microSD (inclosa als kits, 32–64 GB) |
| Ethernet | ✅ Gigabit Ethernet integrat |
| WiFi | Wi-Fi 5 (802.11ac) + Bluetooth 5.0 |
| Sortida vídeo | 2× micro-HDMI (4K@60Hz) |
| Sistema operatiu | Raspberry Pi OS (Linux) |
| Navegador web | ✅ Chromium kiosk — idèntic a Chrome desktop |
| Decodificació HW | H.264, H.265 via VideoCore VI |

**Kit recomanat inclou:** placa + font 27W + caixa + targeta 64 GB + cable micro-HDMI (~90–100 €)
O bé: comprar placa sola (~65–70 €) + microSD 32 GB (~8 €) + font oficial (~10 €) + caixa bàsica (~5 €) = **~88–93 €**

**Veredicte:** ✅ **Millor opció al pressupost**
El Cortex-A72 és significativament més potent que els Cortex-A55 de les TVs barates. Chromium en mode kiosk és fiable, actualitzable i ben documentat. Ethernet Gigabit integrat. La configuració inicial requereix ~30 min però és estable indefinidament. Ideal per clonar la mateixa targeta SD per a múltiples pantalles.

---

### Opció 2 — MECOOL KM2 Plus Deluxe (4 GB / 32 GB)
**Preu Amazon.es: ~80–90 €**
[amazon.es/dp/B0CT3K468H](https://www.amazon.es/KM2-Android-Display-Certificado-Assistant/dp/B0CT3K468H)

| Especificació | Valor |
|---------------|-------|
| Xip | Amlogic S905X4 — 4× Cortex-A55 @ 2.0 GHz |
| RAM | 4 GB DDR4 |
| Emmagatzematge | 32 GB eMMC |
| Ethernet | ✅ Gigabit Ethernet integrat |
| WiFi | Wi-Fi 6 (802.11ax) + Bluetooth 5.0 |
| Sortida vídeo | HDMI 2.1, 4K HDR, Dolby Vision |
| Sistema operatiu | Android TV 11 (certificat Google) |
| Navegador web | ⚠️ Cal sideload de Chrome (veure nota) |
| Decodificació HW | H.264, H.265, AV1, VP9 |

> **Nota sobre el navegador:** Android TV **no inclou Chrome** al Play Store.
> Cal instal·lar el Chrome APK per ADB (via cable USB o xarxa):
> ```bash
> adb connect 192.168.x.x
> adb install chrome.apk
> ```
> Un cop instal·lat funciona bé, però les actualitzacions automàtiques no estan garantides.
> Alternativa: **TV Bro** (navegador lleuger per a Android TV, disponible al Play Store).

**Veredicte:** ⚠️ **Possible, però requereix configuració manual**
El Cortex-A55 és menys potent que el Cortex-A72 de la Pi 4, però amb els anuncis a 360p hauria de ser suficient. El punt feble és el navegador: sideloading funciona però és un pas tècnic addicional. Bones crítiques a Amazon per a ús de streaming; menys testat com a kiosk web.

---

### Opció descartada — MECOOL KM2 Plus (2 GB) · ~50–60 €

RAM insuficient per a dos iframes de Vimeo simultanis amb React/Next.js. Descartada.

---

### Opcions descartades per navegador

| Dispositiu | Preu aprox. | Motiu descart |
|------------|-------------|---------------|
| Google TV Streamer 4K | ~119 € | Sense Chrome/navegador web |
| Amazon Fire TV Stick 4K Max | ~60–70 € | Sense Chrome/navegador web |
| Google Chromecast HD | ~40 € | Sense Chrome/navegador web |
| Caixes Android TV genèriques (<60 €) | ~35–55 € | Xip Cortex-A53 molt feble, qualitat variable |

---

## Comparativa resum

| | Raspberry Pi 4 (4 GB) | MECOOL KM2 Plus Deluxe |
|--|--|--|
| **Preu (aprox. Amazon.es)** | ~88–95 € (kit) | ~80–90 € |
| **CPU** | 4× Cortex-A72 @ 1.8 GHz | 4× Cortex-A55 @ 2.0 GHz |
| **RAM** | 4 GB | 4 GB |
| **Ethernet** | ✅ Gigabit integrat | ✅ Gigabit integrat |
| **Chrome/Chromium** | ✅ Natiu, kiosk mode | ⚠️ Sideload manual |
| **Doble vídeo (1080p+360p)** | ✅ Suficient | ✅ Probablement suficient |
| **Setup inicial** | ~30 min (guia clara) | ~45 min (ADB + kiosk) |
| **Actualizacions** | ✅ Automàtiques via apt | ⚠️ Chrome manual |
| **Clonar per múltiples TVs** | ✅ Fàcil (copiar SD) | ⚠️ Repetir procés ADB |
| **Fiabilitat 24/7** | ✅ Provada | ⚠️ Menys documentada |

---

## Recomanació final

**Primera opció: Raspberry Pi 4 4GB** (~88–95 € kit complet a Amazon.es)

Malgrat ser lleugerament més car, la diferència és mínima i l'avantatge en fiabilitat i facilitat de manteniment és clara:
- Chromium kiosk és exactament el mateix motor que Chrome desktop
- Ethernet Gigabit integrat sense adaptadors
- Per desplegar 10 pantalles: es clona la SD una vegada i llestos
- Llarga vida útil: el Pi 4 rebrà suport oficial fins almenys 2030

**Alternativa si el pressupost és estricte: MECOOL KM2 Plus Deluxe** (~80–90 €)

Viable si qui fa la instal·lació està còmode amb ADB. Amb els anuncis a 360p, el Cortex-A55 hauria de gestionar la càrrega.

---

## Configuració kiosk recomanada (Raspberry Pi 4)

```bash
# Instal·lar Chromium kiosk al arrencada
# Afegir a /etc/xdg/autostart/kiosk.desktop:
[Desktop Entry]
Type=Application
Name=Kiosk
Exec=chromium-browser --kiosk --noerrdialogs --disable-infobars \
     --disable-session-crashed-bubble \
     "https://publicat-lovat.vercel.app/pantalla?center=ID_DEL_CENTRE"
```

---

## Impacte de la reducció a 360p als anuncis

Amb els anuncis a 360p en comptes de 1080p:
- **Bitrate estimat:** de ~4 Mbps → ~0.4 Mbps (reducció del ~90%)
- **Càrrega del decoder HW:** de 2× 1080p → 1× 1080p + 1× 360p (molt manejable)
- **Amplada de banda total:** de ~8 Mbps → ~4.4 Mbps (important per a connexions de centres)
- **Qualitat visual:** acceptable per a cartells d'anunci (text, imatges estàtiques, poc moviment)

> **Recomanació tècnica addicional:** Considerar implementar el mode de diapositives
> (thumbnails estàtics rotatius) com a alternativa als vídeos d'anunci per a centres
> amb TVs molt limitades. Eliminaria completament el segon decoder.
