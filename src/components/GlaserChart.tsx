/**
 * Glaser-diagrammi: vesihöyryn osapaine ja kyllästyspaine diffuusiovastuksen
 * s_d funktiona. Tällä akselilla todellinen osapaine on suora — ja jos suora
 * leikkaisi kyllästyskäyrän, vettä tiivistyy ja profiili taittuu
 * kyllästyskäyrän alempaan konveksiin verhokäyrään.
 */

import { useMemo, useRef, useState } from 'react';
import type { LaskettuKerros, Tulos } from '../lib/types';
import {
  Akselit,
  KerrosSelitelista,
  KerrosVyohykkeet,
  KuvioMaaritykset,
  MARGINAALI,
  SELITE_ALKU,
  X_OTSIKKO_Y,
  alaTila,
  jaotukset,
  lado,
  luoSkaala,
  onTiivistymisTaso,
  polku,
  seliteRivit,
} from './chartPrimitives';
import { LukemaLaatikko } from './SectionChart';

const LEVEYS = 940;
/** Piirtoalueen korkeus; SVG:n kokonaiskorkeus riippuu selitelistan riveistä. */
const PIIRTO_KORKEUS = 400;
/** Legendan rivikorkeus. */
const LEGENDA_RIVI = 18;

interface Props {
  tulos: Tulos;
  akseli: 'sd' | 'paksuus';
  svgRef?: React.Ref<SVGSVGElement>;
}

/** Laskennassa mukana olevan osuuden loppukohta [m]. */
function viimeinenX(tulos: Tulos): number {
  return tulos.profiili.length > 0 ? tulos.profiili[tulos.profiili.length - 1].x : 0;
}

/** Kumpaa suuretta käytetään vaaka-akselina. */
export type GlaserAkseli = 'sd' | 'paksuus';

export function GlaserChart({ tulos, akseli, svgRef }: Props) {
  const [kohdistin, setKohdistin] = useState<number | null>(null);
  const alueRef = useRef<SVGRectElement>(null);

  // Monirivinen legenda työntää piirtoaluetta alaspäin, jottei se peitä kehystä.
  const kondenssia = tulos.kondenssiTasot.length > 0;
  const tasojaKuvassa = tulos.kondenssiAlueet.some(onTiivistymisTaso);
  const vyohykkeitaKuvassa = tulos.kondenssiAlueet.some((a) => !onTiivistymisTaso(a));
  const legendaKohdat = legendanKohdat(kondenssia, tasojaKuvassa, vyohykkeitaKuvassa);
  const legendaRivit = lado(legendaKohdat, (k) => k.teksti, {
    alku: MARGINAALI.vasen,
    loppu: LEVEYS - MARGINAALI.oikea,
  }).rivit;

  const piirtoYlä = MARGINAALI.ylä + Math.max(0, legendaRivit - 1) * LEGENDA_RIVI;
  const piirtoAla = piirtoYlä + PIIRTO_KORKEUS;
  const piirtoVasen = MARGINAALI.vasen;
  const piirtoOikea = LEVEYS - MARGINAALI.oikea;

  // Selitelistassa näkyvät kaikki kerrokset, myös laskennan ulkopuoliset.
  const riveja = seliteRivit(tulos.kerrokset, piirtoVasen, piirtoOikea);
  const KORKEUS = piirtoAla + alaTila(riveja);

  // s_d-akselilla osapaine on suora — se on menetelmän oma esitys. Paksuusakseli
  // on luettavampi silloin, kun yksi kerros hallitsee diffuusiovastusta.
  const koordinaatti = (p: { sd: number; x: number }) => (akseli === 'sd' ? p.sd : p.x);

  const {
    xPix,
    yPix,
    yArvot,
    pSatPolku,
    pPolku,
    pLinPolku,
    kondenssiVyohykkeet,
    kondenssiTasoViivat,
  } = useMemo(() => {
    const loppu = (akseli === 'sd' ? tulos.sdTot : viimeinenX(tulos)) || 0.001;
    const xPix = luoSkaala(0, loppu, piirtoVasen, piirtoOikea);

    const paineet = tulos.profiili.flatMap((p) => [p.pSat, p.pLin, p.p]);
    const max = Math.max(1, ...paineet);
    const yPix = luoSkaala(0, max * 1.1, piirtoAla, piirtoYlä);

    const pisteet = (valitse: (p: (typeof tulos.profiili)[number]) => number) =>
      tulos.profiili.map((p) => ({ x: xPix(koordinaatti(p)), y: yPix(valitse(p)) }));

    // Tiivistyminen: rajapintaan keskittynyt esitetään tasona, kerroksen
    // sisälle jakautunut vyöhykkeenä.
    const kondenssiTasoViivat: number[] = [];
    const kondenssiVyohykkeet: { x: number; leveys: number }[] = [];
    for (const alue of tulos.kondenssiAlueet) {
      const vasen = xPix(akseli === 'sd' ? alue.sdAlku : alue.xAlku);
      const oikea = xPix(akseli === 'sd' ? alue.sdLoppu : alue.xLoppu);
      if (onTiivistymisTaso(alue)) kondenssiTasoViivat.push((vasen + oikea) / 2);
      else kondenssiVyohykkeet.push({ x: vasen, leveys: Math.max(3, oikea - vasen) });
    }

    return {
      xPix,
      yPix,
      yArvot: jaotukset(0, max * 1.1, 6),
      pSatPolku: polku(pisteet((p) => p.pSat)),
      pPolku: polku(pisteet((p) => p.p)),
      pLinPolku: polku(pisteet((p) => p.pLin)),
      kondenssiVyohykkeet,
      kondenssiTasoViivat,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tulos, akseli, piirtoAla, piirtoYlä, piirtoVasen, piirtoOikea]);

  const kerrosReuna = (k: LaskettuKerros, puoli: 'alku' | 'loppu') => {
    if (!k.mukanaLaskennassa) return null;
    if (akseli === 'sd') return xPix(puoli === 'alku' ? k.sdAlku : k.sdLoppu);
    return xPix(puoli === 'alku' ? k.xAlku : k.xLoppu);
  };

  const osoitettu = useMemo(() => {
    if (kohdistin === null || tulos.profiili.length === 0) return null;
    const loppu = akseli === 'sd' ? tulos.sdTot : viimeinenX(tulos);
    const arvo = ((kohdistin - piirtoVasen) / (piirtoOikea - piirtoVasen)) * (loppu || 0);
    return tulos.profiili.reduce((paras, p) =>
      Math.abs(koordinaatti(p) - arvo) < Math.abs(koordinaatti(paras) - arvo) ? p : paras,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kohdistin, tulos, akseli, piirtoVasen, piirtoOikea]);

  const seuraaHiirta = (e: React.MouseEvent<SVGRectElement>) => {
    const laatikko = alueRef.current?.getBoundingClientRect();
    if (!laatikko) return;
    // Laatikko kattaa vain piirtoalueen, joten skaalaus lasketaan sen
    // leveydestä — ei koko SVG:n leveydestä, joka veisi osoittimen harhaan.
    const suhde = (piirtoOikea - piirtoVasen) / laatikko.width;
    const x = piirtoVasen + (e.clientX - laatikko.left) * suhde;
    setKohdistin(Math.min(piirtoOikea, Math.max(piirtoVasen, x)));
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${LEVEYS} ${KORKEUS}`}
      className="kuvaaja"
      role="img"
      aria-label="Glaser-diagrammi: vesihöyryn osapaine ja kyllästyspaine"
    >
      <KuvioMaaritykset />
      <rect x={0} y={0} width={LEVEYS} height={KORKEUS} className="kuvaajaTausta" />

      <KerrosVyohykkeet
        kerrokset={tulos.kerrokset}
        reuna={kerrosReuna}
        ylä={piirtoYlä}
        ala={piirtoAla}
      />

      <Akselit
        leveys={LEVEYS}
        ylä={piirtoYlä}
        ala={piirtoAla}
        yArvot={yArvot}
        yPix={yPix}
        yOtsikko="Vesihöyryn paine [Pa]"
        yMuotoilu={(v) => v.toFixed(0)}
      />

      {kondenssiVyohykkeet.map((v, i) => (
        <rect
          key={i}
          x={v.x}
          y={piirtoYlä}
          width={v.leveys}
          height={piirtoAla - piirtoYlä}
          className="kondenssiAlue"
        />
      ))}
      {kondenssiTasoViivat.map((x, i) => (
        <line key={i} x1={x} x2={x} y1={piirtoYlä} y2={piirtoAla} className="tiivistymisTaso" />
      ))}

      <path d={pSatPolku} className="pSatKayra" />
      {kondenssia && <path d={pLinPolku} className="pLinKayra" />}
      <path d={pPolku} className="pKayra" />

      {tulos.kondenssiTasot.map((taso, i) => (
        <circle
          key={i}
          cx={xPix(akseli === 'sd' ? taso.sd : taso.x)}
          cy={yPix(tulos.profiili.find((p) => p.sd >= taso.sd)?.p ?? 0)}
          r={5}
          className="kondenssiPiste"
        />
      ))}

      {osoitettu && (
        <g className="osoitin">
          <line
            x1={xPix(koordinaatti(osoitettu))}
            x2={xPix(koordinaatti(osoitettu))}
            y1={piirtoYlä}
            y2={piirtoAla}
            className="osoitinViiva"
          />
          <circle
            cx={xPix(koordinaatti(osoitettu))}
            cy={yPix(osoitettu.p)}
            r={4}
            className="osoitinPiste osoitinPiste--lampo"
          />
          <circle
            cx={xPix(koordinaatti(osoitettu))}
            cy={yPix(osoitettu.pSat)}
            r={4}
            className="osoitinPiste osoitinPiste--kaste"
          />
          <LukemaLaatikko
            x={xPix(koordinaatti(osoitettu))}
            y={piirtoYlä + 8}
            rajaOikea={piirtoOikea}
            rivit={[
              `s_d ${osoitettu.sd.toFixed(2)} m (${(osoitettu.x * 1000).toFixed(0)} mm)`,
              `Osapaine ${osoitettu.p.toFixed(0)} Pa`,
              `Kyllästyspaine ${osoitettu.pSat.toFixed(0)} Pa`,
              `Suht. kosteus ${osoitettu.RH.toFixed(0)} %`,
            ]}
          />
        </g>
      )}

      <Legenda x={MARGINAALI.vasen} y={18} kohdat={legendaKohdat} />

      <text
        x={(piirtoVasen + piirtoOikea) / 2}
        y={piirtoAla + X_OTSIKKO_Y}
        className="akseliotsikko akseliotsikko--x"
      >
        {akseli === 'sd'
          ? `Kumulatiivinen diffuusiovastus s_d [m] — yhteensä ${tulos.sdTot.toFixed(2)} m`
          : `Etäisyys sisäpinnasta [mm] — diffuusiovastus yhteensä ${tulos.sdTot.toFixed(2)} m`}
      </text>

      <line
        x1={piirtoVasen}
        x2={piirtoOikea}
        y1={piirtoAla + SELITE_ALKU - 20}
        y2={piirtoAla + SELITE_ALKU - 20}
        className="seliteErotin"
      />

      <KerrosSelitelista
        kerrokset={tulos.kerrokset}
        alku={piirtoVasen}
        loppu={piirtoOikea}
        y={piirtoAla + SELITE_ALKU}
      />

      <rect
        ref={alueRef}
        x={piirtoVasen}
        y={piirtoYlä}
        width={Math.max(1, piirtoOikea - piirtoVasen)}
        height={piirtoAla - piirtoYlä}
        fill="transparent"
        onMouseMove={seuraaHiirta}
        onMouseLeave={() => setKohdistin(null)}
      />
    </svg>
  );
}

interface LegendaKohta {
  luokka: string;
  teksti: string;
  laatikko?: boolean;
}

/** Legendan sisältö riippuu siitä, mitä kuvassa on näkyvissä. */
function legendanKohdat(
  kondenssia: boolean,
  tasoja: boolean,
  vyohykkeita: boolean,
): LegendaKohta[] {
  return [
    { luokka: 'pSatKayra', teksti: 'Kyllästyspaine p_sat' },
    { luokka: 'pKayra', teksti: 'Osapaine p' },
    ...(kondenssia ? [{ luokka: 'pLinKayra', teksti: 'p ilman kondenssia' }] : []),
    ...(tasoja ? [{ luokka: 'tiivistymisTaso', teksti: 'Tiivistymistaso' }] : []),
    ...(vyohykkeita
      ? [{ luokka: 'kondenssiAlue', teksti: 'Tiivistymisvyöhyke', laatikko: true }]
      : []),
  ];
}

function Legenda({ x, y, kohdat }: { x: number; y: number; kohdat: LegendaKohta[] }) {
  const { ladotut } = lado(kohdat, (k) => k.teksti, { alku: x, loppu: LEVEYS - MARGINAALI.oikea });

  return (
    <g className="legenda">
      {ladotut.map(({ kohta, x: kx, rivi }) => (
        <g key={kohta.teksti} transform={`translate(${kx},${y + rivi * LEGENDA_RIVI})`}>
          {kohta.laatikko ? (
            <rect x={0} y={-7} width={26} height={14} className={kohta.luokka} />
          ) : (
            <line x1={0} x2={26} y1={0} y2={0} className={kohta.luokka} />
          )}
          <text x={34} y={4}>
            {kohta.teksti}
          </text>
        </g>
      ))}
    </g>
  );
}
