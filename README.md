# poesie.egenesio.com

Poesie di Elisa Genesio. Sito statico (HTML, CSS, JS, nessuna build), pubblicato con GitHub Pages.

```
© 2026 Elisa Genesio. Tutti i diritti riservati / All rights reserved.
The poems in this repository are original works protected by copyright.
No reproduction, distribution or adaptation without written permission.
```

Il codice del sito segue lo stesso avviso. Font: Syne e DM Mono, licenza SIL OFL (vedi `fonts/`).

## Aggiungere una poesia

1. Crea `poesie/titolo-della-poesia.md`. Il nome del file diventa l'indirizzo: `poesie.egenesio.com/?p=titolo-della-poesia`.

   ```
   ---
   titolo: Titolo della poesia
   scritta: 2025-07-20
   pubblicata: 2026-11-19
   ---
   Primo verso
   secondo verso

   Una riga vuota separa le strofe.
       Gli spazi a inizio riga restano.
   ```

   `scritta` è la data di stesura, `pubblicata` quella di uscita sul sito (`AAAA-MM-GG`, oppure `AAAA-MM` o `AAAA`). Compaiono entrambe sulla pagina e nei dati strutturati (`dateCreated`, `datePublished`), utili come prova d'autore.

2. Aggiungi il nome del file, senza `.md`, in `poesie.json`, nel punto dell'indice in cui deve comparire (dalla più vecchia alla più recente: la prima è la numero 01).

## Provare in locale

Le poesie si caricano con `fetch`, quindi serve un server (aprire `index.html` direttamente non basta):

```bash
python3 -m http.server 8123
```

## Dominio

- `CNAME` contiene `poesie.egenesio.com`.
- DNS: record CNAME `poesie` → `<utente>.github.io`.
- Su GitHub: Settings → Pages → attiva "Enforce HTTPS".
