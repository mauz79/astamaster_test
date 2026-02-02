# AstaMasterPro – TEST build (v1.2 badge per stagione)

Questa è una repo di test per provare:
- badge ranking **FM** e **MV** per **una stagione selezionabile**
- selettore in **Opzioni → Ranking**: `Badge ranking – stagione` (default = ultima stagione; `Nessuna` per disattivare)

## Struttura
- `index.html`, `styles.css`, `app.js`
- `data/` → file stagionali JSON (accetta `YYYY_YYYY+1.json`, `YYYY.json`, `YYYY-YYYY+1.json`)
- `img/` → `placeholder.svg` + eventuali foto `COD.{jpg|png|webp}`
- `img/ico/` → icone opzionali
- `.nojekyll` → file vuoto

## Avvio locale (facoltativo)
Apri `index.html` con un server statico (es. VS Code Live Server) per evitare problemi di CORS su `fetch` dei JSON.

# AstaMasterPro v9c2 — **Main (ROOT)**

> Web app **static** per analisi rapida dei giocatori di Serie A.
> **Ricerca istantanea**, schede **Stagione Corrente / Precedente / Storico**, badge e **Ranking di ruolo** (Percentile + Z‑score).

---

## 📁 Struttura della webapp (root del repo)

```text
/
├─ index.html               # Entry point (root)
├─ styles.css               # Stili
├─ app.js                   # Logica: ricerca, pannelli, ranking
├─ .nojekyll                # Disattiva build Jekyll su GitHub Pages
├─ README.md                # Questo file
├─ /img/
│  ├─ placeholder.svg       # Segnaposto immagine giocatore
│  ├─ /ico/                 # (opz.) icone SVG per le statistiche
│  └─ <COD>.{jpg|png|webp}  # Foto giocatore (nome file = COD)
└─ /data/
   ├─ 2024_2025.json        # Stagione 2024/25 (formato supportato 1)
   ├─ 2024.json             # Stagione 2024/25 (formato supportato 2)
   └─ 2024-2025.json        # Stagione 2024/25 (formato supportato 3)
```

**Note**
- Le foto dei giocatori vanno in `img/` e devono chiamarsi **`<COD>.<estensione>`**, dove `COD` è l’ID univoco del giocatore nei dati. Le estensioni provate in ordine sono: `jpg`, `png`, `webp`.
- I file stagione devono risiedere in `data/` e possono chiamarsi **`YYYY_YYYY+1.json`**, **`YYYY.json`** oppure **`YYYY-YYYY+1.json`**. La webapp scandisce automaticamente gli ultimi **8 anni** fino a **+1** in avanti.

---

## 🧭 Flusso dati

- La webapp utilizza gli **output di FantaCalcio Manager 8.6.0** (`.xls`) **convertiti in JSON** tramite **FCM_Excel_2_JSON** di *mauz79*:
  - Tool: https://github.com/mauz79/FCM_Excel_2_JSON
- Per le **foto dei calciatori** si consiglia il **FotoPack di AlfaAlfa per AstaManager** (AstaManager / AstaMaster compatibile). Le immagini vanno rinominate secondo il `COD` e collocate in `img/`:
  - FotoPack: https://www.legafantacalciosanremo.it/forum/viewtopic.php?t=3935

> Il formato JSON supporta sia **array di oggetti** `[{...}, ...]` sia **tabellare** `{ columns:[], players:[] }` (con `players` come array di righe e `columns` per mappare i campi).

**Colonne riconosciute** (case‑insensitive): `COD`, `Nome`, `R/ruolo`, `Sq/squadra`, `P`, `Aff%`, `MVT`, `FMT`, `MVC/MVF/FMC/FMF`, `MVDSt/MVDlt/FMDSt/FMDlt`, `GF/GFR/RS/AS/AG/A/E` e per i portieri `GS/GSR/RP`.

---

## 🧮 Ranking di ruolo (in Corrente e Precedente)
Per ogni ruolo (*P/D/C/A*) e metrica (MV/FM), filtrando per **min presenze**:
- **Percentile** = quota di giocatori del ruolo con metrica ≤ al valore.
- **Z‑score** = (valore − media) / deviazione standard.

> La **nota esplicativa** è sempre visibile in entrambi i pannelli.

---

## 🎛️ Opzioni (pannello "Opzioni")
- Visualizzazione: **Δ squadra (σ)**, **Dettagli** (Casa/Fuori, Dev.Std), **Indicatori testuali**.
- Ranking: **Min presenze** separate per Corrente/Precedente.
- Storico: selezione stagioni, **Bonus/Malus**, **Statistiche per presenza**.

---

## 🖼️ Legenda icone (cartella `img/ico/`)
Questi nomi (senza spazi, minuscoli) sono supportati da `app.js`. Aggiungi in `img/ico/` i relativi **SVG**:

```text
assist.svg              # 🎯 Assist
autogol.svg             # 🔴⚽ Autogol
ammonizioni.svg         # 🟡 Ammonizioni
espulsioni.svg          # 🟥 Espulsioni

gol.svg                 # ⚽ Gol (giocatori di movimento)
gol_rigore.svg          # 🅁⚽ Gol su rigore
rigori_sbagliati.svg    # 🅁🔴⚽ Rigori sbagliati

# per Portieri
gol_subiti.svg          # 🔴🧠 Gol subiti
gol_subiti_rigore.svg   # 🅁🔴🧠 Gol subiti su rigore
rigori_parati.svg       # 🅁🟢🧠 Rigori parati
```

> Se non presenti, la webapp può mostrare **indicatori testuali** (emoji) al posto delle icone.

---

## 🚀 Deploy (GitHub Pages — ROOT)
1. Metti nella **root**: `index.html`, `styles.css`, `app.js`, `.nojekyll`, cartella `img/`.
2. Inserisci i JSON in `data/` con uno dei nomi supportati.
3. **Settings → Pages** → *Deploy from branch* → branch `main` → folder **/** (root) → *Save*.
4. Premi `Ctrl/Cmd + Q` per la ricerca e inizia a digitare.

### Troubleshooting
- "Nessun file stagione trovato": controlla **nomi file** e **percorso** `data/`. Apri la **Console (F12)** per i path caricati.
- Test locale: avvia un server (`python -m http.server`) e apri `http://localhost:8000`.

---

**AstaMasterPro ©2025 mauz79** — v9c2
