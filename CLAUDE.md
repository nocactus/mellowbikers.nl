# Afspraken voor dit project

Kort, en bewust beperkt tot dingen die niet uit de code zelf blijken. De
uitgebreide uitleg staat in `payload/README.md`; de redenering achter
elke beslissing staat in de commit-berichten.

## Eén project

Alles staat in `payload/`: Payload CMS op Next.js, draaiend op Cloudflare
Workers met D1 en R2. De repo-root bevat alleen documentatie.

Tot 21 september 2026 stond hier daarnaast een Astro-site, die op
Cloudflare Pages draaide en bij elke push naar `main` uitrolde. Die is
verwijderd; het Pages-project is opgeheven. Heb je de oude bron nodig, dan
staat hij in de geschiedenis: `git checkout d56b8b8 -- src public`.

**Een push naar `main` bouwt en deployt**, via Workers Builds. De
`NEXT_PUBLIC_*`-variabelen staan daar als **build**-variabelen, niet als
runtime: Next bakt ze in tijdens `next build`, dus runtime toevoegen doet
niets. `PAYLOAD_SECRET` staat er óók als buildwaarde, omdat
`payload.init()` weigert te starten met een lege secret terwijl Next de
routes inventariseert; die waarde is wegwerp, want de Worker-secret
overschrijft hem.

**Het build command begint met `cd payload &&`, en dat moet zo blijven.**

```
Build command:                    cd payload && npm ci && npm run build:worker
Deploy command:                   cd payload && npx wrangler deploy
Non-production branch deploy:     cd payload && npx wrangler versions upload
Root directory:                   leeg
```

Die derde regel is een aparte instelling voor elke branch behalve `main`,
en staat standaard op `npx wrangler versions upload` zonder `cd`. Dan
slaagt de build en faalt de upload op `Missing entry-point to Worker
script`, omdat er in de repo-root geen `wrangler.jsonc` staat.

Dat ziet eruit als iets dat je opruimt door de root directory op `payload`
te zetten en die `cd` weg te halen. Dat is geprobeerd, drie keer, ook met
verse commits in plaats van "Retry build": de instelling werd niet
toegepast en elke build faalde op
`ENOENT: /opt/buildhome/repo/package.json`. Zolang dat zo is, is het build
command de enige plek waar de map te sturen valt.

`npm ci` staat er expliciet omdat Cloudflare's autodetectie een lockfile in
de repo-root zoekt en die er niet is; zonder deze regel wordt de install
volledig overgeslagen en draait `postinstall` niet — en dan deployt er een
build waarop niemand kan inloggen. Deployen kan altijd nog handmatig met
`npx opennextjs-cloudflare deploy` vanuit `payload/`.

## Niet zomaar veranderen

Deze keuzes zien eruit als achterstallig onderhoud maar zijn het niet.
Elk van deze is ontstaan doordat het misging.

**De build draait op webpack, niet op Turbopack.** `next build --webpack`
in `payload/package.json`. Turbopack herschrijft de drizzle-kit-import van
de SQLite-adapter naar een naam die esbuild niet kan vinden, waardoor
`opennextjs-cloudflare build` afbreekt — payloadcms/payload#16470, open.
Terug naar Turbopack kan pas als die issue gesloten is; test dat met
`npm run build:worker`, niet met `npm run build`.

**`experimental.cpus: 1` in `next.config.ts` blijft staan.** Next verzamelt
route-configuratie normaal in parallelle processen, en `payload.config.ts`
haalt zijn bindings via `getPlatformProxy()` — dus elk proces start een
eigen miniflare op hetzelfde lokale sqlite-bestand. Die deadlocken, en de
build faalt op elke route met `SQLITE_BUSY_RECOVERY`. Op een schone
checkout zonder database faalt hij met `SQLITE_READONLY`. Serieel kost
hier vrijwel niets: zes routes, waarvan drie statisch.

**`blocksAsJSON: true` op de D1-adapter blijft aan.** Zonder die vlag krijgt
elk blokveld een eigen kolom en overschrijdt een UPDATE op een pagina met
veel blokken de SQLite-limiet op bound parameters (payloadcms/payload#14766).
Uitzetten vereist bovendien een datamigratie. Bijeffect om te kennen: een
nieuw bloktype verandert het schema niet, dus daar is geen migratie voor
nodig.

**Beide bindings in `wrangler.jsonc` hebben `"remote": true`.** Remote
bindings worden per binding aangevraagd. Stond het alleen op D1, dan
schreef `migrate:content:remote` de media-*records* naar de echte database
en de *bestanden* naar de lokale miniflare-R2. Dat ziet eruit als een
geslaagde migratie — 33 afbeeldingen gemeld, 33 rijen in D1 — en elke foto
gaf een 404.

**`postinstall` patcht Payload's PBKDF2-iteraties.** Payload hasht op
600.000 iteraties; workerd staat er bewust maximaal 100.000 toe
(cloudflare/workerd#1346). Zonder patch werkt niet alleen registreren
niet, maar ook inloggen niet — de admin is dan onbruikbaar. Er is geen
configuratie-optie, dus `scripts/patch-payload-pbkdf2.mjs` past de
constante aan. Dat script stopt met exitcode 1 als het de verwachte regel
niet vindt, waardoor `npm install` klapt bij een Payload-upgrade die deze
code raakt. Dat is opzet.

**`npm run deploy` draait géén migraties.** Schemawijzigingen horen niet
mee te liften op een deploy. Migreren doe je bewust met `deploy:database`.

**Remote bindings hangen aan `CLOUDFLARE_API_TOKEN`.** Zonder token werkt
alles tegen de lokale database in `.wrangler/`. Dat is expres, zodat builds
en typechecks draaien zonder Cloudflare-toegang. `deploy:database` weigert
zonder token te starten, want stil de verkeerde database migreren is erger
dan een foutmelding.

Let op: die token moet in `~/.zshenv` staan, niet in `~/.zshrc`. Zsh leest
`.zshrc` alleen voor interactieve shells, dus een script of agent ziet hem
daar niet.

## Beeld

`sharp` draait niet op Workers, dus Payload genereert geen formaten en
crop en focal point staan uit. Formaten komen van Cloudflare Image
Transformations (`src/lib/cfImage.ts`); de uitsnede regelen redacteuren met
de velden Focus X/Y op de afbeelding. Alt-tekst is verplicht in de
media-collection — houd dat zo.

De bron van een transformatie is `cdn.mellowbikers.nl`, het custom domain
op de R2-bucket, en niet de `/api/media/file/`-route van de Worker. Zo
leest Cloudflare rechtstreeks uit R2 in plaats van elke thumbnail door de
Worker te trekken; Worker-CPU is de reden dat dit project een betaald plan
nodig heeft.

Twee vallen die we al gehad hebben:

- Tussen de opties en de bron hoort **exact één** slash. Met twee ziet
  Cloudflare een protocol-relatieve URL (`//api/media/...` → host `api`) en
  krijg je 404 op elke afbeelding.
- Bied nooit een breedte aan die groter is dan de bron. 25 van de 33
  gemigreerde afbeeldingen zijn smaller dan 1920px; opschalen leverde
  bestanden op die groter waren dan het origineel.

**De huidige quality van 80 en de bovengrens van 1920px zijn een bewuste
keuze**, geen instelling die niemand nagelopen heeft. Bij bijna volle
resolutie is AVIF op quality 80 groter dan de al geoptimaliseerde
originelen — op drie pagina's tot +74%. Verlagen naar quality 65 en een
bovengrens van 1440px maakt elke pagina lichter, maar kost scherpte op
grote schermen. Die afweging is aan Timo en is bewust niet doorgevoerd.

## Structuur

De blok-renderer zorgt dat elke pagina precies één `h1` heeft: een hero
pakt hem, en heeft de pagina er geen, dan het eerste blok met een
bovenkopje. De oude site miste een h1 op drie pagina's; dat moet niet
terugkomen.

`robots.txt` en `sitemap.xml` zijn route handlers met `force-dynamic`, geen
`app/robots.ts` en `app/sitemap.ts`. Die laatste zijn metadata-bestanden
die Next tijdens de build uitvoert, en dan zouden ze D1 bevragen terwijl er
alleen een lokale database is — dezelfde reden dat pagina's per request
gerenderd worden in plaats van voorgebouwd.

`robots.txt` weigert alles zodra de hostname niet die uit
`NEXT_PUBLIC_SERVER_URL` is. Een Worker is altijd óók bereikbaar op
`<naam>.<subdomein>.workers.dev`, en dezelfde site op twee hostnames is
duplicate content.

## Fouten moeten zichtbaar zijn

De logger in `payload.config.ts` serialiseert `Error`-objecten expliciet.
Spreid je een `Error` met `{...err}`, dan houd je `{}` over, want een Error
heeft geen enumerable eigen properties. Daardoor logde elke serverfout in
deze app als `{"level":"error","err":{}}`.

Gooi in hooks een `APIError` met een status buiten de 500, geen gewone
`Error`. Payload verbergt de melding van een gewone Error achter
"Something went wrong." (zie `utilities/isErrorPublic.js`), waardoor een
bezoeker met een kapot formulier geen enkele aanwijzing krijgt.

## Taal

Code, commentaar en documentatie in het Nederlands, zoals de rest van dit
project. Commit-berichten in het Engels.
