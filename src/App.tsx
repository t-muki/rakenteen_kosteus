import { useEffect, useMemo, useRef, useState } from 'react';
import { ClimateControls } from './components/ClimateControls';
import { GlaserChart } from './components/GlaserChart';
import { LayerEditor } from './components/LayerEditor';
import { PrintDetails, PrintHeader } from './components/PrintReport';
import { ResultsPanel } from './components/ResultsPanel';
import { SectionChart } from './components/SectionChart';
import { laske } from './lib/calculate';
import {
  lataaOmatMateriaalit,
  materiaaliHakemisto,
  perusMateriaalit,
  presetRakenteeksi,
  rakennePresetit,
  sisaPresetit,
  tallennaOmatMateriaalit,
  ulkoPresetit,
} from './lib/materials';
import { jakoOsoite, lataaTila, lueOsoitteesta, tallennaTila, viePng } from './lib/share';
import type { Materiaali, Rakenne, RakenneTyyppi } from './lib/types';

type Nakyma = 'leikkaus' | 'glaser';

const RAKENNETYYPIT: { arvo: RakenneTyyppi; nimi: string }[] = [
  { arvo: 'seina', nimi: 'Ulkoseinä' },
  { arvo: 'ylapohja', nimi: 'Yläpohja' },
  { arvo: 'alapohja', nimi: 'Alapohja' },
];

function oletusRakenne(): Rakenne {
  return presetRakenteeksi(rakennePresetit[0], { T: 21, RH: 40 }, { T: -10, RH: 90 });
}

export default function App() {
  const [rakenne, setRakenne] = useState<Rakenne>(
    () => lueOsoitteesta() ?? lataaTila() ?? oletusRakenne(),
  );
  const [omatMateriaalit, setOmatMateriaalit] = useState<Materiaali[]>(() =>
    lataaOmatMateriaalit(),
  );
  const [nakyma, setNakyma] = useState<Nakyma>('leikkaus');
  const [glaserAkseli, setGlaserAkseli] = useState<'sd' | 'paksuus'>('sd');
  const [ilmoitus, setIlmoitus] = useState<string | null>(null);

  const leikkausRef = useRef<SVGSVGElement>(null);
  const glaserRef = useRef<SVGSVGElement>(null);

  const materiaalit = useMemo(
    () => [...perusMateriaalit, ...omatMateriaalit],
    [omatMateriaalit],
  );
  const hakemisto = useMemo(() => materiaaliHakemisto(materiaalit), [materiaalit]);
  const tulos = useMemo(() => laske(rakenne, hakemisto), [rakenne, hakemisto]);

  useEffect(() => {
    tallennaTila(rakenne);
  }, [rakenne]);

  useEffect(() => {
    if (!ilmoitus) return;
    const ajastin = setTimeout(() => setIlmoitus(null), 3000);
    return () => clearTimeout(ajastin);
  }, [ilmoitus]);

  const jaa = async () => {
    const osoite = jakoOsoite(rakenne);
    window.history.replaceState(null, '', osoite);
    try {
      await navigator.clipboard.writeText(osoite);
      setIlmoitus('Linkki kopioitu leikepöydälle.');
    } catch {
      setIlmoitus('Linkki on nyt osoiterivillä.');
    }
  };

  const viePngKuva = () => {
    const svg = nakyma === 'leikkaus' ? leikkausRef.current : glaserRef.current;
    if (!svg) return;
    viePng(svg, `${rakenne.nimi.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-${nakyma}`);
  };

  const lisaaOmaMateriaali = (materiaali: Materiaali) => {
    const paivitetyt = [...omatMateriaalit, materiaali];
    setOmatMateriaalit(paivitetyt);
    tallennaOmatMateriaalit(paivitetyt);
  };

  return (
    <div className="sovellus">
      <header className="ylatunniste">
        <div>
          <h1>Seinärakenteen kosteus- ja lämpöleikkaus</h1>
          <p>
            Lämpötila- ja kastepistekäyrä rakenteen läpi — näet suoraan, missä kohtaa kosteus
            voi tiivistyä. Laskenta Glaser-menetelmällä (EN ISO 13788).
          </p>
        </div>
        <div className="ylatunniste__napit">
          <button type="button" className="nappi" onClick={jaa}>
            Jaa linkkinä
          </button>
          <button type="button" className="nappi" onClick={viePngKuva}>
            Tallenna kuva (PNG)
          </button>
          <button
            type="button"
            className="nappi"
            onClick={() => window.print()}
            title="Avaa tulostus — valitse kohteeksi “Tallenna PDF-tiedostona”"
          >
            Tulosta / PDF
          </button>
        </div>
      </header>

      <PrintHeader
        rakenne={rakenne}
        tulos={tulos}
        nakyma={nakyma === 'leikkaus' ? 'Leikkauskuva (°C)' : 'Glaser-diagrammi (Pa)'}
      />

      {ilmoitus && <p className="ilmoitus">{ilmoitus}</p>}

      <main className="ruudukko">
        <section className="paneeli paneeli--syote">
          <div className="rakenneValinta">
            <label>
              <span>Valmis rakenne</span>
              <select
                value={rakenne.nimi}
                onChange={(e) => {
                  const preset = rakennePresetit.find((p) => p.nimi === e.target.value);
                  if (preset) setRakenne(presetRakenteeksi(preset, rakenne.sisa, rakenne.ulko));
                }}
              >
                {rakennePresetit.every((p) => p.nimi !== rakenne.nimi) && (
                  <option value={rakenne.nimi}>{rakenne.nimi}</option>
                )}
                {rakennePresetit.map((preset) => (
                  <option key={preset.nimi} value={preset.nimi}>
                    {preset.nimi}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Rakenneosa</span>
              <select
                value={rakenne.tyyppi}
                onChange={(e) =>
                  setRakenne({ ...rakenne, tyyppi: e.target.value as RakenneTyyppi })
                }
              >
                {RAKENNETYYPIT.map((tyyppi) => (
                  <option key={tyyppi.arvo} value={tyyppi.arvo}>
                    {tyyppi.nimi}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <LayerEditor
            kerrokset={rakenne.kerrokset}
            materiaalit={materiaalit}
            hakemisto={hakemisto}
            muuta={(kerrokset) => setRakenne({ ...rakenne, kerrokset })}
          />

          <OmaMateriaali lisaa={lisaaOmaMateriaali} />

          <div className="olosuhteet">
            <ClimateControls
              otsikko="Sisäilma"
              olosuhde={rakenne.sisa}
              muuta={(sisa) => setRakenne({ ...rakenne, sisa })}
              presetit={sisaPresetit}
              lampoRaja={[0, 40]}
            />
            <ClimateControls
              otsikko="Ulkoilma"
              olosuhde={rakenne.ulko}
              muuta={(ulko) => setRakenne({ ...rakenne, ulko })}
              presetit={ulkoPresetit}
              lampoRaja={[-40, 40]}
            />
          </div>
        </section>

        <section className="paneeli paneeli--kuvaaja">
          <div className="valilehdet" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={nakyma === 'leikkaus'}
              className={nakyma === 'leikkaus' ? 'valilehti valilehti--aktiivinen' : 'valilehti'}
              onClick={() => setNakyma('leikkaus')}
            >
              Leikkauskuva (°C)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={nakyma === 'glaser'}
              className={nakyma === 'glaser' ? 'valilehti valilehti--aktiivinen' : 'valilehti'}
              onClick={() => setNakyma('glaser')}
            >
              Glaser-diagrammi (Pa)
            </button>

            {nakyma === 'glaser' && (
              <div className="akselivalinta">
                <span>Vaaka-akseli:</span>
                <button
                  type="button"
                  className={glaserAkseli === 'sd' ? 'siru siru--valittu' : 'siru'}
                  onClick={() => setGlaserAkseli('sd')}
                  title="Diffuusiovastus — osapaine piirtyy suorana"
                >
                  s_d
                </button>
                <button
                  type="button"
                  className={glaserAkseli === 'paksuus' ? 'siru siru--valittu' : 'siru'}
                  onClick={() => setGlaserAkseli('paksuus')}
                  title="Todellinen paksuus — kerrokset oikeassa mittasuhteessa"
                >
                  Paksuus
                </button>
              </div>
            )}
          </div>

          <div className="kuvaajaKehys">
            {nakyma === 'leikkaus' ? (
              <SectionChart
                tulos={tulos}
                sisaT={rakenne.sisa.T}
                ulkoT={rakenne.ulko.T}
                svgRef={leikkausRef}
              />
            ) : (
              <GlaserChart tulos={tulos} akseli={glaserAkseli} svgRef={glaserRef} />
            )}
          </div>

          <p className="ohje ohje--kuvaaja">
            {nakyma === 'leikkaus'
              ? 'Kastepistekäyrä kertoo, mihin lämpötilaan kyseisessä kohdassa oleva vesihöyry voi jäähtyä ennen tiivistymistä; missä se kohtaa lämpötilakäyrän, vettä tiivistyy. Pisteviiva näyttää, mihin kastepiste nousisi ilman tiivistymistä — mitä korkeammalle se kohoaa lämpötilan yli, sitä ankarampi kosteusrasitus on. Vesi ei kuitenkaan erotu koko rasitusalueella: se tiivistyy joko yhteen tasoon, tyypillisesti materiaalien rajapintaan, tai kapeampaan vyöhykkeeseen kerroksen sisällä. Höyrynsulku näkyy kastepistekäyrän jyrkkänä pudotuksena.'
              : glaserAkseli === 'sd'
                ? 'Osapaine piirtyy suorana, koska vaaka-akselina on diffuusiovastus s_d. Jos suora leikkaisi kyllästyskäyrän, profiili taittuu sitä pitkin ja taitekohtaan tiivistyy vettä. Höyrytiivis kerros vie akselilta paljon tilaa — vaihda tarvittaessa paksuusakseliin.'
                : 'Vaaka-akselina on todellinen paksuus, joten kerrokset näkyvät oikeassa mittasuhteessa. Osapaine ei tällä akselilla ole suora; menetelmän oma esitys on s_d-akseli.'}
          </p>
        </section>

        <section className="paneeli paneeli--tulokset">
          <ResultsPanel tulos={tulos} />
        </section>
      </main>

      <PrintDetails rakenne={rakenne} tulos={tulos} />

      <footer className="alatunniste">
        <p>
          Laskenta: EN ISO 13788 (kyllästyspaine, Glaser-menetelmä) ja EN ISO 6946 (lämpövastukset).
          Materiaaliarvot ovat SFS-EN ISO 10456:n ja valmistajien taulukkoarvoja — tarkista
          suunnittelussa aina tuotekohtaiset arvot. Stationaarinen tarkastelu ei huomioi
          materiaalien kosteudensitomiskykyä eikä kuivumista, joten tulos on suuntaa antava.
        </p>
      </footer>
    </div>
  );
}

/** Oman materiaalin lisäyslomake. */
function OmaMateriaali({ lisaa }: { lisaa: (materiaali: Materiaali) => void }) {
  const [auki, setAuki] = useState(false);
  const [nimi, setNimi] = useState('');
  const [lambda, setLambda] = useState('0.040');
  const [mu, setMu] = useState('1');
  const [paksuus, setPaksuus] = useState('100');

  if (!auki) {
    return (
      <button type="button" className="nappi nappi--hillitty" onClick={() => setAuki(true)}>
        + Oma materiaali
      </button>
    );
  }

  const tallenna = () => {
    const puhdasNimi = nimi.trim();
    if (!puhdasNimi) return;
    lisaa({
      id: `oma-${Date.now().toString(36)}`,
      nimi: puhdasNimi,
      kategoria: 'eriste',
      lambda: Math.max(0.001, Number(lambda) || 0.04),
      mu: Math.max(0.1, Number(mu) || 1),
      rho: 100,
      c: 1000,
      oletusPaksuus: Math.max(1, Number(paksuus) || 100),
      vari: '#c9b8e8',
      lahde: 'Käyttäjän oma arvo',
    });
    setNimi('');
    setAuki(false);
  };

  return (
    <div className="omaMateriaali">
      <h3>Oma materiaali</h3>
      <label>
        <span>Nimi</span>
        <input value={nimi} onChange={(e) => setNimi(e.target.value)} autoFocus />
      </label>
      <div className="omaMateriaali__arvot">
        <label>
          <span>λ [W/mK]</span>
          <input type="number" step={0.001} value={lambda} onChange={(e) => setLambda(e.target.value)} />
        </label>
        <label>
          <span>μ [-]</span>
          <input type="number" step={1} value={mu} onChange={(e) => setMu(e.target.value)} />
        </label>
        <label>
          <span>Paksuus [mm]</span>
          <input type="number" step={1} value={paksuus} onChange={(e) => setPaksuus(e.target.value)} />
        </label>
      </div>
      <div className="omaMateriaali__napit">
        <button type="button" className="nappi" onClick={tallenna}>
          Tallenna
        </button>
        <button type="button" className="nappi nappi--hillitty" onClick={() => setAuki(false)}>
          Peruuta
        </button>
      </div>
    </div>
  );
}
