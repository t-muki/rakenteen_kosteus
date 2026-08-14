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
  KerrosVyohykkeet,
  MARGINAALI,
  jaotukset,
  luoSkaala,
  polku,
} from './chartPrimitives';
import { LukemaLaatikko } from './SectionChart';

const LEVEYS = 940;
const KORKEUS = 580;
const NIMIPALKKI = 142;

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

  const piirtoYlä = MARGINAALI.ylä;
  const piirtoAla = KORKEUS - MARGINAALI.ala;
  const piirtoVasen = MARGINAALI.vasen;
  const piirtoOikea = LEVEYS - MARGINAALI.oikea;

  // s_d-akselilla osapaine on suora — se on menetelmän oma esitys. Paksuusakseli
  // on luettavampi silloin, kun yksi kerros hallitsee diffuusiovastusta.
  const koordinaatti = (p: { sd: number; x: number }) => (akseli === 'sd' ? p.sd : p.x);

  const { xPix, yPix, yArvot, pSatPolku, pPolku, pLinPolku, kondenssiVyohykkeet } = useMemo(() => {
    const loppu = (akseli === 'sd' ? tulos.sdTot : viimeinenX(tulos)) || 0.001;
    const xPix = luoSkaala(0, loppu, piirtoVasen, piirtoOikea);

    const paineet = tulos.profiili.flatMap((p) => [p.pSat, p.pLin, p.p]);
    const max = Math.max(1, ...paineet);
    const yPix = luoSkaala(0, max * 1.1, piirtoAla, piirtoYlä);

    const pisteet = (valitse: (p: (typeof tulos.profiili)[number]) => number) =>
      tulos.profiili.map((p) => ({ x: xPix(koordinaatti(p)), y: yPix(valitse(p)) }));

    // Tiivistymisvyöhyke: osapaine on saavuttanut kyllästyspaineen.
    const kondenssiVyohykkeet = tulos.kondenssiAlueet.map((alue) => {
      const vasen = xPix(akseli === 'sd' ? alue.sdAlku : alue.xAlku);
      const oikea = xPix(akseli === 'sd' ? alue.sdLoppu : alue.xLoppu);
      return { x: vasen, leveys: Math.max(3, oikea - vasen) };
    });

    return {
      xPix,
      yPix,
      yArvot: jaotukset(0, max * 1.1, 6),
      pSatPolku: polku(pisteet((p) => p.pSat)),
      pPolku: polku(pisteet((p) => p.p)),
      pLinPolku: polku(pisteet((p) => p.pLin)),
      kondenssiVyohykkeet,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tulos, akseli, piirtoAla, piirtoYlä, piirtoVasen, piirtoOikea]);

  const kondenssia = tulos.kondenssiTasot.length > 0;

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
    const suhde = LEVEYS / laatikko.width;
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
      <rect x={0} y={0} width={LEVEYS} height={KORKEUS} className="kuvaajaTausta" />

      <KerrosVyohykkeet
        kerrokset={tulos.kerrokset}
        reuna={kerrosReuna}
        ylä={piirtoYlä}
        ala={piirtoAla}
        nimiPalkki={NIMIPALKKI}
      />

      <Akselit
        leveys={LEVEYS}
        korkeus={KORKEUS}
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

      <path d={pSatPolku} className="pSatKayra" />
      {kondenssia && <path d={pLinPolku} className="pLinKayra" />}
      <path d={pPolku} className="pKayra" />

      {tulos.kondenssiTasot.map((taso, i) => {
        const kohta = xPix(akseli === 'sd' ? taso.sd : taso.x);
        return (
          <g key={i}>
            <line x1={kohta} x2={kohta} y1={piirtoYlä} y2={piirtoAla} className="kondenssiTaso" />
            <circle
              cx={kohta}
              cy={yPix(tulos.profiili.find((p) => p.sd >= taso.sd)?.p ?? 0)}
              r={5}
              className="kondenssiPiste"
            />
          </g>
        );
      })}

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

      <Legenda x={MARGINAALI.vasen} y={18} kondenssia={kondenssia} />

      <text
        x={(piirtoVasen + piirtoOikea) / 2}
        y={KORKEUS - 8}
        className="akseliotsikko akseliotsikko--x"
      >
        {akseli === 'sd'
          ? `Kumulatiivinen diffuusiovastus s_d [m] — yhteensä ${tulos.sdTot.toFixed(2)} m`
          : `Etäisyys sisäpinnasta [mm] — diffuusiovastus yhteensä ${tulos.sdTot.toFixed(2)} m`}
      </text>

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

function Legenda({ x, y, kondenssia }: { x: number; y: number; kondenssia: boolean }) {
  const kohdat = [
    { luokka: 'pSatKayra', teksti: 'Kyllästyspaine p_sat' },
    { luokka: 'pKayra', teksti: 'Osapaine p' },
    ...(kondenssia ? [{ luokka: 'pLinKayra', teksti: 'p ilman kondenssia' }] : []),
  ];

  return (
    <g className="legenda">
      {kohdat.map((kohta, i) => (
        <g key={kohta.teksti} transform={`translate(${x + i * 200},${y})`}>
          <line x1={0} x2={26} y1={0} y2={0} className={kohta.luokka} />
          <text x={34} y={4}>
            {kohta.teksti}
          </text>
        </g>
      ))}
      {kondenssia && (
        <g transform={`translate(${x + kohdat.length * 200},${y})`}>
          <rect x={0} y={-7} width={26} height={14} className="kondenssiAlue" />
          <text x={34} y={4}>
            Tiivistymisvyöhyke
          </text>
        </g>
      )}
    </g>
  );
}
