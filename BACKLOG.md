# Backlog

Ideeën voor de site, verzameld op 17 oktober 2026. Niets hiervan is
toegezegd of ingepland; het staat hier zodat het niet in een gesprek
blijft hangen.

De inschatting "werk" is grof: **klein** is een avond, **middel** een
paar avonden, **groot** meer dan dat.

## Opkomst en communicatie

| # | Idee | Waarom | Werk |
|---|---|---|---|
| 1 | Agenda als ICS-feed (`/agenda.ics`) | Eén keer abonneren en elke rit staat in de telefoonagenda, ook de ritten die later bijkomen. De data is al gestructureerd | klein |
| 2 | Aanmelden per rit | Snert, BBQ en weekenden draaien op aantallen. Nu wijst `signupUrl` naar elders | middel |
| 3 | Herinneringsmail voor de eerstvolgende rit | Postmark hangt er al aan, Workers heeft cron-triggers. Verandert de agenda van ophalen in gebracht worden | middel |
| 11 | Ritstatus: gaat door, afgelast, verplaatst | Afgelastingen horen op de plek waar mensen kijken, niet alleen in de clubapp | klein |
| 16 | Nieuwsbrief via Postmark | De mailadapter is er al | middel |

## Inhoud

| # | Idee | Waarom | Werk |
|---|---|---|---|
| 4 | GPX per rit | Afstand, hoogtemeters, downloadlink. R2 doet al bestanden | middel |
| 5 | Ritverslagen met foto's | Nu verdwijnt een rit in "Geweest" en is het stil | middel |
| 9 | Spotlight laten groeien | Drie leden terwijl de club er veel meer heeft. Een "stel jezelf voor"-formulier dat een concept aanmaakt | klein |
| 14 | Routebibliotheek los van de agenda | Blijft het hele jaar relevant en trekt zoekverkeer | middel |
| 15 | "Nieuw? Start hier"-pagina | Verwachtingen voor je eerste rit: tempo, uitrusting, hoe het werkt | klein |
| 12 | Soort rit als veld, met filter | Clubrit, weekend, feest, ALV — nu één hoop | klein |

## Redactie en beheer

| # | Idee | Waarom | Werk |
|---|---|---|---|
| 8 | Lid worden als workflow | Nu wordt een inzending opgeslagen, gemaild en daarna overgetypt | groot |
| 13 | Terugkerende ritten als sjabloon | Twaalf keer hetzelfde overtypen is werk voor de computer | middel |
| 17 | Automatische redirect bij slug-wijziging | Een hernoemde pagina breekt nu stilzwijgend elke gedeelde link | klein |
| 18 | Deelbare previewlink voor concepten | Meelezen zonder adminaccount; de preview-route bestaat al | middel |
| 6 | Ledengedeelte achter Cloudflare Access | ALV-stukken, statuten, contributie. Access staat er al | middel |

## Vindbaarheid en presentatie

| # | Idee | Waarom | Werk |
|---|---|---|---|
| 7 | Open Graph-kaarten per rit | Een rit delen in de clubapp toont nu de generieke siteafbeelding | klein |
| 10 | Sponsorpagina | Het `logoStrip`-blok bestaat al maar doet weinig | klein |

## Risico

| # | Idee | Waarom | Werk |
|---|---|---|---|
| 19 | Geplande back-up van D1 en R2 | Hier maakt niemand een back-up van. Eén verkeerde klik en de content is weg | middel |
| 20 | Clubkleding bestellen | De Form Builder kan dit grotendeels al; scheelt een spreadsheet | middel |

## Bewust niet op deze lijst

**Zoeken.** Zes pagina's. Een zoekveld kost onderhoud en lost niets op.

**Weerbericht per rit.** Leuk één keer, daarna een dode widget die je moet
blijven onderhouden.

**Meertaligheid.** De club is Nederlandstalig; dit verdubbelt het
redactiewerk voor niemand.
