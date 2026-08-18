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
  KERROSPALKKI,
  KerrosSelitelista,
  KerrosVyohykkeet,
  KuvioMaaritykset,
  MARGINAALI,
  SELITE_ALKU,
  X_OTSIKKO_Y,
  alaTila,
  aluePolku,
  jaotukset,
  lado,
  luoSkaala,
  polku,
  seliteRivit,
} from './chartPrimitives';

const LEVEYS = 940;
/** Piirtoalueen korkeus; SVG:n kokonaiskorkeus riippuu selitelistan riveistä. */
const PIIRTO_KORKEUS = 400;

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
  const piirtoAla = piirtoYlä + PIIRTO_KORKEUS;
  const rakenneAlku = MARGINAALI.vasen + ILMA_LEVEYS;
  const rakenneLoppu = LEVEYS - MARGINAALI.oikea - ILMA_LEVEYS;

  // Selitelistan rivimäärä määrää kuvaajan kokonaiskorkeuden.
  const seliteVasen = MARGINAALI.vasen;
  const seliteOikea = LEVEYS - MARGINAALI.oikea;
  const riveja = seliteRivit(tulos.kerrokset, seliteVasen, seliteOikea);
  const KORKEUS = piirtoAla + alaTila(riveja);

  const {
    xPix,
    yPix,
    yArvot,
    lampoPolku,
    kastepistePolku,
    rasitusPolku,
    rasitusAlueet,
    kondenssiVyohykkeet,
    rasitustaOn,
  } = useMemo(() => {
    const paksuus = tulos.paksuus || 0.001;
    const xPix = luoSkaala(0, paksuus, rakenneAlku, rakenneLoppu);

    const lampotilat = tulos.profiili.flatMap((p) => [p.T, p.Tdp, p.TdpLin]);
    const min = Math.min(ulkoT, sisaT, ...lampotilat);
    const max = Math.max(ulkoT, sisaT, ...lampotilat);
    const pehmuste = Math.max(2, (max - min) * 0.12);
    const yPix = luoSkaala(min - pehmuste, max + pehmuste, piirtoAla, piirtoYlä);

    const lampoPisteet = tulos.profiili.map((p) => ({ x: xPix(p.x), y: yPix(p.T) }));
    const kastePisteet = tulos.profiili.map((p) => ({ x: xPix(p.x), y: yPix(p.Tdp) }));
    const rasitusPisteet = tulos.profiili.map((p) => ({ x: xPix(p.x), y: yPix(p.TdpLin) }));

    // Kosteusrasituskäyrä kertoo, mihin kastepiste nousisi ilman tiivistymistä.
    // Sen ja lämpötilakäyrän välinen ala on rasituksen voimakkuuden mitta:
    // mitä korkeammalle se nousee lämpötilan yli, sitä ankarampi tilanne.
    const alueet: { ylä: { x: number; y: number }[]; ala: { x: number; y: number }[] }[] = [];
    let kaynnissa: { x: number; y: number }[] = [];
    let vastaavaLampo: { x: number; y: number }[] = [];

    for (const p of tulos.profiili) {
      if (p.TdpLin > p.T + 1e-9) {
        kaynnissa.push({ x: xPix(p.x), y: yPix(p.TdpLin) });
        vastaavaLampo.push({ x: xPix(p.x), y: yPix(p.T) });
      } else if (kaynnissa.length > 0) {
        alueet.push({ ylä: kaynnissa, ala: vastaavaLampo });
        kaynnissa = [];
        vastaavaLampo = [];
      }
    }
    if (kaynnissa.length > 0) alueet.push({ ylä: kaynnissa, ala: vastaavaLampo });

    // Tiivistymisvyöhykkeellä lämpötila- ja kastepistekäyrä yhtyvät, joten
    // vyöhyke merkitään pystysuorana korostuksena.
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
      rasitusPolku: polku(rasitusPisteet),
      rasitusAlueet: alueet.map((a) => aluePolku(a.ylä, a.ala)),
      kondenssiVyohykkeet,
      rasitustaOn: alueet.length > 0,
    };
  }, [tulos, sisaT, ulkoT, piirtoAla, piirtoYlä, rakenneAlku, rakenneLoppu]);

  const kerrosReuna = (k: LaskettuKerros, puoli: 'alku' | 'loppu') =>
    xPix(puoli === 'alku' ? k.xAlku : k.xLoppu);

  // Laskenta ulottuu vain tuulettuvaan ilmarakoon asti, joten osoitin rajataan
  // siihen osaan rakennetta, josta arvoja on olemassa.
  const dataLoppu =
    tulos.profiili.length > 0 ? xPix(tulos.profiili[tulos.profiili.length - 1].x) : rakenneAlku;

  const osoitettu = useMemo(() => {
    if (kohdistin === null || tulos.profiili.length === 0) return null;
    const x =
      ((kohdistin - rakenneAlku) / (rakenneLoppu - rakenneAlku)) * (tulos.paksuus || 0);
    return tulos.profiili.reduce((paras, p) =>
      Math.abs(p.x - x) < Math.abs(paras.x - x) ? p : paras,
    );
  }, [kohdistin, tulos, rakenneAlku, rakenneLoppu]);

  const seuraaHiirta = (e: React.MouseEvent<SVGRectElement>) => {
    const laatikko = alueRef.current?.getBoundingClientRect();
    if (!laatikko) return;
    // Laatikko kattaa vain piirtoalueen, joten skaalaus lasketaan sen
    // leveydestä — ei koko SVG:n leveydestä, joka veisi osoittimen harhaan.
    const suhde = (dataLoppu - rakenneAlku) / laatikko.width;
    const x = rakenneAlku + (e.clientX - laatikko.left) * suhde;
    setKohdistin(Math.min(dataLoppu, Math.max(rakenneAlku, x)));
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${LEVEYS} ${KORKEUS}`}
      className="kuvaaja"
      role="img"
      aria-label="Seinärakenteen lämpötila- ja kastepistekäyrä"
    >
      <KuvioMaaritykset />
      <rect x={0} y={0} width={LEVEYS} height={KORKEUS} className="kuvaajaTausta" />

      {/* Sisä- ja ulkoilman vyöhykkeet */}
      <rect
        x={MARGINAALI.vasen}
        y={piirtoYlä}
        width={ILMA_LEVEYS}
        height={piirtoAla - piirtoYlä + KERROSPALKKI}
        className="ilmavyohyke ilmavyohyke--sisa"
      />
      <rect
        x={rakenneLoppu}
        y={piirtoYlä}
        width={ILMA_LEVEYS}
        height={piirtoAla - piirtoYlä + KERROSPALKKI}
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
      />

      <Akselit
        leveys={LEVEYS}
        ylä={piirtoYlä}
        ala={piirtoAla}
        yArvot={yArvot}
        yPix={yPix}
        yOtsikko="Lämpötila [°C]"
        yMuotoilu={(v) => `${v.toFixed(0)}`}
        nollaviiva
      />

      {/* Kosteusrasitus: kuinka korkealle kastepiste nousisi ilman tiivistymistä */}
      {rasitusAlueet.map((d, i) => (
        <path key={i} d={d} className="rasitusAlue" />
      ))}

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

      {rasitustaOn && <path d={rasitusPolku} className="rasitusKayra" />}
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
          {osoitettu.TdpLin > osoitettu.T + 1e-9 && (
            <circle
              cx={xPix(osoitettu.x)}
              cy={yPix(osoitettu.TdpLin)}
              r={4}
              className="osoitinPiste osoitinPiste--rasitus"
            />
          )}
          <LukemaLaatikko
            x={xPix(osoitettu.x)}
            y={piirtoYlä + 8}
            rajaOikea={rakenneLoppu}
            rivit={[
              `${(osoitettu.x * 1000).toFixed(0)} mm sisäpinnasta`,
              `Lämpötila ${osoitettu.T.toFixed(1)} °C`,
              `Kastepiste ${osoitettu.Tdp.toFixed(1)} °C`,
              ...(osoitettu.TdpLin > osoitettu.T + 1e-9
                ? [
                    `Rasitus ${osoitettu.TdpLin.toFixed(1)} °C`,
                    `Ylitys ${(osoitettu.TdpLin - osoitettu.T).toFixed(1)} °C`,
                  ]
                : []),
              `Suht. kosteus ${osoitettu.RH.toFixed(0)} %`,
            ]}
          />
        </g>
      )}

      <Legenda
        x={MARGINAALI.vasen}
        y={18}
        kondenssia={tulos.kondenssiAlueet.length > 0}
        rasitusta={rasitustaOn}
      />

      <text
        x={(rakenneAlku + rakenneLoppu) / 2}
        y={piirtoAla + X_OTSIKKO_Y}
        className="akseliotsikko akseliotsikko--x"
      >
        Etäisyys sisäpinnasta [mm] — rakenteen paksuus {(tulos.paksuus * 1000).toFixed(0)} mm
      </text>

      <line
        x1={seliteVasen}
        x2={seliteOikea}
        y1={piirtoAla + SELITE_ALKU - 20}
        y2={piirtoAla + SELITE_ALKU - 20}
        className="seliteErotin"
      />

      <KerrosSelitelista
        kerrokset={tulos.kerrokset}
        alku={seliteVasen}
        loppu={seliteOikea}
        y={piirtoAla + SELITE_ALKU}
      />

      <rect
        ref={alueRef}
        x={rakenneAlku}
        y={piirtoYlä}
        width={Math.max(1, dataLoppu - rakenneAlku)}
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

function Legenda({
  x,
  y,
  kondenssia,
  rasitusta,
}: {
  x: number;
  y: number;
  kondenssia: boolean;
  rasitusta: boolean;
}) {
  const kohdat: { luokka: string; teksti: string; laatikko?: boolean }[] = [
    { luokka: 'lampoKayra', teksti: 'Lämpötila' },
    { luokka: 'kastepisteKayra', teksti: 'Kastepiste' },
    ...(rasitusta
      ? [
          { luokka: 'rasitusKayra', teksti: 'Kastepiste ilman tiivistymistä' },
          { luokka: 'rasitusAlue', teksti: 'Kosteusrasitus', laatikko: true },
        ]
      : []),
    ...(kondenssia
      ? [{ luokka: 'kondenssiAlue', teksti: 'Tiivistymisvyöhyke', laatikko: true }]
      : []),
  ];

  // Kohdat ladotaan tekstin pituuden mukaan, jotta ne mahtuvat riveille
  // silloinkin kun selitteitä on viisi.
  const { ladotut } = lado(kohdat, (k) => k.teksti, { alku: x, loppu: LEVEYS - MARGINAALI.oikea });

  return (
    <g className="legenda">
      {ladotut.map(({ kohta, x: kx, rivi }) => (
        <g key={kohta.teksti} transform={`translate(${kx},${y + rivi * 18})`}>
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
