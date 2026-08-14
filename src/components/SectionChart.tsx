/**
 * Leikkauskuva: lämpötila ja kastepistelämpötila päällekkäin samalla
 * °C-asteikolla. Kastepiste kertoo, mihin lämpötilaan kyseisessä kohdassa oleva
 * vesihöyry voi jäähtyä ennen tiivistymistä. Missä käyrät kohtaavat, ilma on
 * kyllästystilassa ja vettä tiivistyy — se vyöhyke korostetaan.
 */

import { useMemo, useRef, useState } from 'react';
import type { LaskettuKerros, Tulos } from '../lib/types';
import {
  Akselit,
  ILMA_LEVEYS,
  KerrosVyohykkeet,
  MARGINAALI,
  jaotukset,
  luoSkaala,
  polku,
} from './chartPrimitives';

const LEVEYS = 940;
const KORKEUS = 580;
const NIMIPALKKI = 142;

interface Props {
  tulos: Tulos;
  sisaT: number;
  ulkoT: number;
  svgRef?: React.Ref<SVGSVGElement>;
}

export function SectionChart({ tulos, sisaT, ulkoT, svgRef }: Props) {
  const [kohdistin, setKohdistin] = useState<number | null>(null);
  const alueRef = useRef<SVGRectElement>(null);

  const piirtoYlä = MARGINAALI.ylä;
  const piirtoAla = KORKEUS - MARGINAALI.ala;
  const rakenneAlku = MARGINAALI.vasen + ILMA_LEVEYS;
  const rakenneLoppu = LEVEYS - MARGINAALI.oikea - ILMA_LEVEYS;

  const { xPix, yPix, yArvot, lampoPolku, kastepistePolku, kondenssiVyohykkeet } = useMemo(() => {
    const paksuus = tulos.paksuus || 0.001;
    const xPix = luoSkaala(0, paksuus, rakenneAlku, rakenneLoppu);

    const lampotilat = tulos.profiili.flatMap((p) => [p.T, p.Tdp]);
    const min = Math.min(ulkoT, sisaT, ...lampotilat);
    const max = Math.max(ulkoT, sisaT, ...lampotilat);
    const pehmuste = Math.max(2, (max - min) * 0.12);
    const yPix = luoSkaala(min - pehmuste, max + pehmuste, piirtoAla, piirtoYlä);

    const lampoPisteet = tulos.profiili.map((p) => ({ x: xPix(p.x), y: yPix(p.T) }));
    const kastePisteet = tulos.profiili.map((p) => ({ x: xPix(p.x), y: yPix(p.Tdp) }));

    // Tiivistymisvyöhykkeellä käyrät yhtyvät, joten vyöhyke korostetaan
    // pystysuorana alueena eikä käyrien välisenä täyttönä.
    const kondenssiVyohykkeet = tulos.kondenssiAlueet.map((alue) => {
      const vasen = xPix(alue.xAlku);
      const oikea = xPix(alue.xLoppu);
      return { x: vasen, leveys: Math.max(3, oikea - vasen) };
    });

    return {
      xPix,
      yPix,
      yArvot: jaotukset(yPix.min, yPix.max, 7),
      lampoPolku: polku(lampoPisteet),
      kastepistePolku: polku(kastePisteet),
      kondenssiVyohykkeet,
    };
  }, [tulos, sisaT, ulkoT, piirtoAla, piirtoYlä, rakenneAlku, rakenneLoppu]);

  const kerrosReuna = (k: LaskettuKerros, puoli: 'alku' | 'loppu') =>
    xPix(puoli === 'alku' ? k.xAlku : k.xLoppu);

  const osoitettu = useMemo(() => {
    if (kohdistin === null || tulos.profiili.length === 0) return null;
    const x = (kohdistin - rakenneAlku) / (rakenneLoppu - rakenneAlku) * (tulos.paksuus || 0);
    return tulos.profiili.reduce((paras, p) =>
      Math.abs(p.x - x) < Math.abs(paras.x - x) ? p : paras,
    );
  }, [kohdistin, tulos, rakenneAlku, rakenneLoppu]);

  const seuraaHiirta = (e: React.MouseEvent<SVGRectElement>) => {
    const laatikko = alueRef.current?.getBoundingClientRect();
    if (!laatikko) return;
    const suhde = LEVEYS / laatikko.width;
    const x = rakenneAlku + (e.clientX - laatikko.left) * suhde;
    setKohdistin(Math.min(rakenneLoppu, Math.max(rakenneAlku, x)));
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${LEVEYS} ${KORKEUS}`}
      className="kuvaaja"
      role="img"
      aria-label="Seinärakenteen lämpötila- ja kastepistekäyrä"
    >
      <rect x={0} y={0} width={LEVEYS} height={KORKEUS} className="kuvaajaTausta" />

      {/* Sisä- ja ulkoilman vyöhykkeet */}
      <rect
        x={MARGINAALI.vasen}
        y={piirtoYlä}
        width={ILMA_LEVEYS}
        height={piirtoAla - piirtoYlä + NIMIPALKKI}
        className="ilmavyohyke ilmavyohyke--sisa"
      />
      <rect
        x={rakenneLoppu}
        y={piirtoYlä}
        width={ILMA_LEVEYS}
        height={piirtoAla - piirtoYlä + NIMIPALKKI}
        className="ilmavyohyke ilmavyohyke--ulko"
      />
      <text x={MARGINAALI.vasen + ILMA_LEVEYS / 2} y={piirtoYlä - 10} className="vyohykeOtsikko">
        Sisä
      </text>
      <text x={rakenneLoppu + ILMA_LEVEYS / 2} y={piirtoYlä - 10} className="vyohykeOtsikko">
        Ulko
      </text>

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
        yOtsikko="Lämpötila [°C]"
        yMuotoilu={(v) => `${v.toFixed(0)}`}
        nollaviiva
      />

      {/* Tiivistymisvyöhykkeet */}
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

      {/* Pintavastusten yli tapahtuva lämpötilan muutos */}
      <path
        d={polku([
          { x: MARGINAALI.vasen, y: yPix(sisaT) },
          { x: rakenneAlku, y: yPix(tulos.Tsi) },
        ])}
        className="lampoKayra lampoKayra--pinta"
      />
      <path
        d={polku([
          { x: rakenneLoppu, y: yPix(tulos.Tse) },
          { x: LEVEYS - MARGINAALI.oikea, y: yPix(ulkoT) },
        ])}
        className="lampoKayra lampoKayra--pinta"
      />

      {/* Sisä- ja ulkoilman kastepiste vaakaviivoina ilmavyöhykkeissä */}
      <path
        d={polku([
          { x: MARGINAALI.vasen, y: yPix(tulos.profiili[0]?.Tdp ?? 0) },
          { x: rakenneAlku, y: yPix(tulos.profiili[0]?.Tdp ?? 0) },
        ])}
        className="kastepisteKayra kastepisteKayra--pinta"
      />

      <path d={lampoPolku} className="lampoKayra" />
      <path d={kastepistePolku} className="kastepisteKayra" />

      {/* Kondenssitasot: vyöhykkeen reunat ja voimakkain kohta */}
      {tulos.kondenssiTasot.map((taso, i) => (
        <g key={i}>
          <line
            x1={xPix(taso.x)}
            x2={xPix(taso.x)}
            y1={piirtoYlä}
            y2={piirtoAla}
            className="kondenssiTaso"
          />
          <circle cx={xPix(taso.x)} cy={yPix(taso.T)} r={5} className="kondenssiPiste" />
        </g>
      ))}

      {/* Hover-lukemat */}
      {osoitettu && (
        <g className="osoitin">
          <line
            x1={xPix(osoitettu.x)}
            x2={xPix(osoitettu.x)}
            y1={piirtoYlä}
            y2={piirtoAla}
            className="osoitinViiva"
          />
          <circle cx={xPix(osoitettu.x)} cy={yPix(osoitettu.T)} r={4} className="osoitinPiste osoitinPiste--lampo" />
          <circle
            cx={xPix(osoitettu.x)}
            cy={yPix(osoitettu.Tdp)}
            r={4}
            className="osoitinPiste osoitinPiste--kaste"
          />
          <LukemaLaatikko
            x={xPix(osoitettu.x)}
            y={piirtoYlä + 8}
            rajaOikea={rakenneLoppu}
            rivit={[
              `${(osoitettu.x * 1000).toFixed(0)} mm sisäpinnasta`,
              `Lämpötila ${osoitettu.T.toFixed(1)} °C`,
              `Kastepiste ${osoitettu.Tdp.toFixed(1)} °C`,
              `Suht. kosteus ${osoitettu.RH.toFixed(0)} %`,
            ]}
          />
        </g>
      )}

      <Legenda x={MARGINAALI.vasen} y={18} kondenssia={tulos.kondenssiAlueet.length > 0} />

      <text
        x={(rakenneAlku + rakenneLoppu) / 2}
        y={KORKEUS - 8}
        className="akseliotsikko akseliotsikko--x"
      >
        Etäisyys sisäpinnasta [mm] — rakenteen paksuus {(tulos.paksuus * 1000).toFixed(0)} mm
      </text>

      <rect
        ref={alueRef}
        x={rakenneAlku}
        y={piirtoYlä}
        width={Math.max(1, rakenneLoppu - rakenneAlku)}
        height={piirtoAla - piirtoYlä}
        fill="transparent"
        onMouseMove={seuraaHiirta}
        onMouseLeave={() => setKohdistin(null)}
      />
    </svg>
  );
}

export function LukemaLaatikko({
  x,
  y,
  rivit,
  rajaOikea,
}: {
  x: number;
  y: number;
  rivit: string[];
  rajaOikea: number;
}) {
  const leveys = 186;
  const korkeus = 18 * rivit.length + 14;
  const vasemmalle = x + leveys + 16 > rajaOikea;
  const laatikkoX = vasemmalle ? x - leveys - 12 : x + 12;

  return (
    <g className="lukemaLaatikko">
      <rect x={laatikkoX} y={y} width={leveys} height={korkeus} rx={6} />
      {rivit.map((rivi, i) => (
        <text key={rivi} x={laatikkoX + 10} y={y + 21 + i * 18}>
          {rivi}
        </text>
      ))}
    </g>
  );
}

function Legenda({ x, y, kondenssia }: { x: number; y: number; kondenssia: boolean }) {
  const kohdat = [
    { luokka: 'lampoKayra', teksti: 'Lämpötila' },
    { luokka: 'kastepisteKayra', teksti: 'Kastepistelämpötila' },
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
