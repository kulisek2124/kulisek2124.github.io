# Ondřej Mičaník — jedna ulice, sedm dveří

Osobní web. Nahoře je pixel-art ulice v Ostravě nakreslená na plátně 640 × 360, každý dům je jedna část portfolia: **Domek** (o mně), **Herna** (Roblox projekty), **Studio** (YouTube Shorts bot), **Web studio** (tvorba webů + ceník a poptávka), **Laboratoř** (nápady ve vývoji), **Škola** (studium a zkušenosti), **Kiosek** (kontakt). Postavička chodí šipkami nebo klikem, Enter vejde dovnitř a otevře panel se sekcí.

Živě: **https://kulisek2124.github.io/**

## Co v ulici žije

- okna se rozsvěcují a zhasínají, v některých se někdo hýbe; neony blikají, „OTEVŘENO“ nad web studiem občas vypadne
- tramvaj DPO, auta a cyklista na nextbike jezdí podle nálady
- kočka spí na parapetu Domku (dá se pohladit), měsíc se dá kliknout
- nebe se řídí skutečným časem v Ostravě (noc / svítání / den / soumrak); ☀ v hlavičce to přepne ručně, ☂ zapne déšť
- studio má obrazovku, na které se právě „stříhá short“; nad ním bliká maják
- Konami kód (↑↑↓↓←→←→BA) přepne déšť na sníh
- pozadí: silueta Ostravy — Bolt Tower s vysokou pecí, věž Nové radnice, těžní věž

## Soubory

| Soubor | K čemu |
|---|---|
| `index.html` | celý web: hlavička, ulice, panely, sedm sekcí, ceník, poptávkový formulář (otevře e-mail), kontakt |
| `street.js` | motor ulice — bez knihoven; statické vrstvy se kreslí jednou, živé věci každý snímek při 15 FPS |
| `favicon.svg`, `apple-touch-icon.png`, `og-image.png` | ikona a obrázek pro sdílení odkazu |
| `robots.txt`, `sitemap.xml`, `llms.txt` | vyhledávače a AI asistenti |
| `.nojekyll` | GitHub Pages servíruje soubory tak, jak jsou |

Ve stránce jsou strukturovaná data (schema.org `Person`, `WebSite`, `Service` s nabídkou webů), kanonická adresa a Open Graph.

## Úpravy

- **Texty a projekty**: přímo v `index.html`, sekce `#o-mne` … `#kontakt`. Panel, který se otevře po vstupu do domu, si obsah bere z těchto sekcí — stačí upravit na jednom místě.
- **Ceník**: `.plans` v sekci `#weby`; ceny jsou i ve strukturovaných datech v hlavičce.
- **Ulice**: `street.js`, pole `BUILDINGS` (pořadí, šířka, patra, nápis, barvy). Přidání domu = jeden řádek + `id` shodný se sekcí v HTML.
- **Barvy webu**: proměnné `--bg`, `--teal`, `--amber` … na začátku `<style>`.

## Lokální spuštění

Stačí otevřít `index.html` v prohlížeči (nebo Live Server ve VS Code). Žádný build, žádné závislosti.

## Zveřejnění

Repozitář `kulisek2124.github.io` je uživatelský GitHub Pages web: Settings → Pages → Source **Deploy from a branch**, Branch **main**, `/ (root)`. Běží pak na `https://kulisek2124.github.io/`. Ostatní projekty (`/WEB/`, `/bakasu-kennel/`) zůstávají na svých adresách.

Doporučeno: ověřit web v Google Search Console a odeslat `sitemap.xml`.
