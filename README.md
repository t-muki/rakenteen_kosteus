# rakenteen_kosteus

Visuaalinen kuvaaja rakenteen lämpö- ja kosteuskäyristä ja mahdollisesta kosteuden
kondensoitumisen riskialueesta.

Selainsovellus, jolla kootaan seinärakenne kerros kerrokselta, säädetään sisä- ja ulko-olosuhteet
ja piirretään lämpötila- ja kastepistekäyrä rakenteen läpi. Kuvasta näkee suoraan, missä kohtaa
rakennetta kosteus voi tiivistyä.

Sovellus toimii kokonaan selaimessa — ei palvelinta, ei tiliä, ei verkkoyhteyttä käytön aikana.

**[Avaa sovellus →](https://t-muki.github.io/rakenteen_kosteus/)**

## Käyttö

```bash
npm install
npm run dev
```

Muut komennot:

```bash
npm test
```

```bash
npm run build
```

## Mitä sovellus laskee

### Lämpötilaprofiili (EN ISO 6946)

Kunkin kerroksen lämpövastus on `R = d/λ`. Kokonaisvastus on `R_tot = R_si + ΣR + R_se`, josta
saadaan `U = 1/R_tot` ja lämpövirran tiheys `q = U·(θ_sisä − θ_ulko)`. Lämpötila laskee lineaarisesti
kumulatiivisen lämpövastuksen suhteen, joten kerroksen sisällä käyrä on suora, jonka jyrkkyys on
kääntäen verrannollinen lämmönjohtavuuteen. Paksu eriste taittaa käyrää jyrkästi, betonilaatta tuskin
lainkaan.

Pintavastukset rakenneosittain: ulkoseinä 0,13 / 0,04, yläpohja 0,10 / 0,04, alapohja 0,17 / 0,04 m²·K/W.

Voimakkaasti tuulettuva ilmarako katkaisee tarkastelun: rako ja sen ulkopuoliset kerrokset jätetään
laskennan ulkopuolelle standardin mukaisesti, ja ne piirretään kuvaan haaleina.

### Kyllästyspaine ja kastepiste (EN ISO 13788)

```
θ ≥ 0:  p_sat = 610,5 · exp(17,269·θ / (237,3 + θ))
θ <  0:  p_sat = 610,5 · exp(21,875·θ / (265,5 + θ))
```

Kastepiste on tämän käänteisfunktio: lämpötila, jossa kyseisessä kohdassa oleva vesihöyry olisi
kyllästystilassa.

### Kosteusprofiili, Glaser-menetelmä (EN ISO 13788)

Vesihöyry siirtyy rakenteen läpi osapaine-eron ajamana. Kerroksen diffuusiovastus on `s_d = μ·d`
(ohutkalvoille annetaan `s_d` suoraan taulukkoarvona). Kun osapaine piirretään `s_d`:n funktiona,
se on suora — niin kauan kuin se pysyy kyllästyspaineen alapuolella.

Jos suora leikkaisi kyllästyskäyrän, vettä tiivistyy, ja todellinen osapaineprofiili on
kyllästyskäyrän **alempi konveksi verhokäyrä** (Glaserin graafinen konstruktio: kiristä naru
lähtöpisteestä päätepisteeseen kyllästyskäyrän alapuolelta). Verhokäyrän taitekohdat ovat
kondenssitasoja, ja kondenssivuo kussakin on siihen tuleva höyryvuo miinus siitä lähtevä:

```
g_c = δ₀ · [ (p_edellinen − p_taso)/s_d,vasen − (p_taso − p_seuraava)/s_d,oikea ]
```

missä `δ₀ = 2,0·10⁻¹⁰ kg/(m·s·Pa)`.

Kyllästyspaine näytteistetään myös kerrosten sisältä, ei pelkästään rajapinnoilta. Näin kondenssi
havaitaan myös silloin, kun se alkaa keskeltä paksua eristekerrosta.

## Kaksi näkymää samasta asiasta

**Leikkauskuva (°C)** — lämpötila ja kastepistelämpötila päällekkäin, x-akselina todellinen paksuus.
Kastepiste lasketaan todellisesta osapaineesta, eli kondenssi huomioiden. Mitä kauempana käyrät ovat
toisistaan, sitä kuivempi rakenne on siinä kohtaa; missä ne kohtaavat, ilma on kyllästystilassa ja
vettä tiivistyy. Höyrynsulku näkyy kastepistekäyrän jyrkkänä pudotuksena.

Kun tiivistymistä esiintyy, mukaan tulee kolmas käyrä: **kastepiste ilman tiivistymistä**. Se kertoo,
mihin kastepiste nousisi, jos vesi ei tiivistyisi matkalla — sen ja lämpötilakäyrän välinen ala on
kosteusrasituksen mitta. Mitä korkeammalle käyrä kohoaa lämpötilan yli, sitä ankarampi tilanne on.
Kuivassa rakenteessa käyrä yhtyy kastepistekäyrään eikä sitä piirretä erikseen.

**Glaser-diagrammi (Pa)** — osapaine ja kyllästyspaine, x-akselina diffuusiovastus `s_d`. Osapaine
piirtyy suorana, ja kondenssin vaikutus näkyy profiilin taittumisena. Sama ilmiö, tarkempi lukema.

**Kerrosten esitys.** Materiaalit piirretään rakennuspiirustusten tapaisilla rasterikuvioilla
(eriste vinoviivoitus, betoni pistekuvio, puu syykuvio), joten kerrostyypit erottuvat myös
mustavalkotulosteessa. Kerrokset on numeroitu ja nimetty kuvaajan alla olevassa selitelistassa.
Ohuet kalvot, kuten 0,2 mm höyrynsulku, piirretään vähimmäisleveydellä, jotta ne näkyvät —
käyrien koordinaatteihin tämä ei vaikuta.

Vaaka-akselin voi vaihtaa `s_d`:n ja todellisen paksuuden välillä. `s_d` on menetelmän oma esitys,
mutta kun rakenteessa on höyrytiivis kerros (esimerkiksi 200 mm betonia, `s_d` = 20 m), se vie
akselilta lähes kaiken tilan — silloin paksuusakseli on luettavampi.

## Materiaalitietokanta

`src/data/materials.json` sisältää noin 50 yleistä rakennusmateriaalia (λ, μ, ρ, c, sekä `s_d`
kalvoille). Arvot ovat SFS-EN ISO 10456:n taulukkoarvoja ja valmistajien tuotearvoja; jokaisella
rivillä on `lahde`-kenttä. Omia materiaaleja voi lisätä käyttöliittymästä, jolloin ne tallentuvat
selaimen muistiin.

**Tarkista suunnittelussa aina tuotekohtaiset arvot** — taulukkoarvot ovat suuntaa antavia.

## Rakenteen jakaminen

"Jaa linkkinä" pakkaa rakenteen ja olosuhteet osoiterivin hash-osaan. Linkki toimii sellaisenaan
myös GitHub Pagesissa. Viimeisin tila tallentuu automaattisesti selaimen muistiin. Kuvaajan voi
tallentaa PNG- tai SVG-tiedostona.

## Julkaisu GitHub Pagesiin

`.github/workflows/deploy.yml` ajaa testit, rakentaa tuotantoversion ja julkaisee sen `main`-haaraan
puskettaessa. Ota Pages käyttöön repositorion asetuksista (Settings → Pages → Source: GitHub Actions).
`vite.config.ts`:n `base: './'` tekee buildista polkuriippumattoman, joten se toimii myös
alihakemistossa `https://<käyttäjä>.github.io/<repo>/`.

## Rajoitukset

Laskenta on stationaarinen: se kuvaa tasapainotilan yhdessä olosuhdeparissa. Se ei huomioi

- materiaalien kosteudensitomiskykyä eikä kosteuden kapillaarista siirtymistä,
- rakenteen kuivumista kesällä eikä vuotuista kosteustasetta,
- ilmavuotoja, joiden kuljettama kosteusmäärä on käytännössä usein diffuusiota suurempi,
- kaksi- ja kolmiulotteisia kylmäsiltoja (runkotolpat, liitokset).

Tulos on suuntaa antava vertailutyökalu rakennevaihtoehtojen välillä, ei rakennusfysikaalinen
suunnitelma. Kriittisissä kohteissa käytä dynaamista simulointia (esim. WUFI) ja
rakennusfysiikan asiantuntijaa.

## Standardit

- **EN ISO 13788** — kyllästyshöyrynpaine, kastepiste ja Glaser-menetelmä
- **EN ISO 6946** — lämpövastukset, pintavastukset ja ilmarakojen käsittely
- **SFS-EN ISO 10456** — materiaalien lämpö- ja kosteustekniset taulukkoarvot
