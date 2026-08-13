/** Kuvaajien yhteiset piirtoapurit: skaalaus, akselit ja kerrosvyöhykkeet. */

import type { LaskettuKerros } from '../lib/types';

export const MARGINAALI = { ylä: 46, oikea: 64, ala: 158, vasen: 62 };

/** Ilmavyöhykkeen leveys pikseleinä kuvaajan molemmin puolin. */
export const ILMA_LEVEYS = 52;

/** Lineaarinen skaalaus arvoalueelta pikseleiksi. */
export interface Skaala {
  (arvo: number): number;
  min: number;
  max: number;
}

export function luoSkaala(min: number, max: number, pixMin: number, pixMax: number): Skaala {
  const väli = max - min || 1;
  const f = ((arvo: number) => pixMin + ((arvo - min) / väli) * (pixMax - pixMin)) as Skaala;
  f.min = min;
  f.max = max;
  return f;
}

/** Valitsee luettavat akselijaotukset annetulle arvovälille. */
export function jaotukset(min: number, max: number, tavoite = 6): number[] {
  const väli = max - min;
  if (väli <= 0) return [min];

  const karkea = väli / tavoite;
  const kertaluokka = Math.pow(10, Math.floor(Math.log10(karkea)));
  const normalisoitu = karkea / kertaluokka;
  const askel =
    (normalisoitu <= 1 ? 1 : normalisoitu <= 2 ? 2 : normalisoitu <= 5 ? 5 : 10) * kertaluokka;

  const arvot: number[] = [];
  for (let v = Math.ceil(min / askel) * askel; v <= max + askel * 1e-9; v += askel) {
    arvot.push(Math.abs(v) < askel * 1e-9 ? 0 : v);
  }
  return arvot;
}

/** Muodostaa SVG-polun pistejonosta. */
export function polku(pisteet: { x: number; y: number }[]): string {
  if (pisteet.length === 0) return '';
  return pisteet
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
}

/** Muodostaa suljetun alueen kahden pistejonon väliin. */
export function aluePolku(
  ylä: { x: number; y: number }[],
  ala: { x: number; y: number }[],
): string {
  if (ylä.length === 0 || ala.length === 0) return '';
  const alas = [...ala].reverse();
  return `${polku(ylä)} L${alas[0].x.toFixed(2)},${alas[0].y.toFixed(2)} ${alas
    .slice(1)
    .map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ')} Z`;
}

interface AkselitProps {
  leveys: number;
  korkeus: number;
  yArvot: number[];
  yPix: (arvo: number) => number;
  yOtsikko: string;
  yMuotoilu?: (arvo: number) => string;
  nollaviiva?: boolean;
}

/** Vaakaruudukko, y-akselin lukemat ja akseliotsikko. */
export function Akselit({
  leveys,
  korkeus,
  yArvot,
  yPix,
  yOtsikko,
  yMuotoilu = (v) => `${v}`,
  nollaviiva = false,
}: AkselitProps) {
  const x0 = MARGINAALI.vasen;
  const x1 = leveys - MARGINAALI.oikea;

  return (
    <g className="akselit">
      {yArvot.map((arvo) => {
        const y = yPix(arvo);
        const onNolla = nollaviiva && Math.abs(arvo) < 1e-9;
        return (
          <g key={arvo}>
            <line
              x1={x0}
              x2={x1}
              y1={y}
              y2={y}
              className={onNolla ? 'ruudukkoviiva ruudukkoviiva--nolla' : 'ruudukkoviiva'}
            />
            <text x={x0 - 8} y={y + 4} className="akseliteksti akseliteksti--y">
              {yMuotoilu(arvo)}
            </text>
          </g>
        );
      })}

      <line x1={x0} x2={x0} y1={MARGINAALI.ylä} y2={korkeus - MARGINAALI.ala} className="akseliviiva" />
      <line
        x1={x0}
        x2={x1}
        y1={korkeus - MARGINAALI.ala}
        y2={korkeus - MARGINAALI.ala}
        className="akseliviiva"
      />

      <text
        className="akseliotsikko"
        transform={`translate(${16},${(MARGINAALI.ylä + korkeus - MARGINAALI.ala) / 2}) rotate(-90)`}
      >
        {yOtsikko}
      </text>
    </g>
  );
}

/** Katkaisee tekstin annettuun merkkimäärään ja lisää kolme pistettä. */
function katkaise(teksti: string, maxMerkkeja: number): string {
  if (teksti.length <= maxMerkkeja) return teksti;
  return `${teksti.slice(0, Math.max(1, maxMerkkeja - 1)).trimEnd()}…`;
}

interface KerrosVyohykkeetProps {
  kerrokset: LaskettuKerros[];
  /** Muuntaa kerroksen reunan piirtokoordinaatiksi; null jos kerros ei ole akselilla. */
  reuna: (kerros: LaskettuKerros, puoli: 'alku' | 'loppu') => number | null;
  ylä: number;
  ala: number;
  /** Kerrosnimien palkin korkeus kuvaajan alapuolella. */
  nimiPalkki: number;
}

/** Materiaalikerrokset värillisinä vyöhykkeinä ja nimilappuina. */
export function KerrosVyohykkeet({
  kerrokset,
  reuna,
  ylä,
  ala,
  nimiPalkki,
}: KerrosVyohykkeetProps) {
  return (
    <g className="kerrokset">
      {kerrokset.map((k) => {
        const x0 = reuna(k, 'alku');
        const x1 = reuna(k, 'loppu');
        if (x0 === null || x1 === null) return null;

        const leveys = Math.max(0, x1 - x0);
        const nimiMahtuu = leveys > 22;
        // Nimi kirjoitetaan pystyyn nimipalkkiin, joten sen pituus rajautuu
        // palkin korkeuteen — pidempi teksti katkaistaan.
        const teksti = katkaise(
          `${k.materiaali.nimi} ${k.kerros.paksuus} mm`,
          Math.floor((nimiPalkki - 10) / 5.9),
        );

        return (
          <g key={k.kerros.id} className={k.mukanaLaskennassa ? '' : 'kerros--passiivinen'}>
            <rect
              x={x0}
              y={ylä}
              width={leveys}
              height={ala - ylä}
              fill={k.materiaali.vari}
              className="kerrosvyohyke"
            />
            <rect
              x={x0}
              y={ala}
              width={leveys}
              height={nimiPalkki}
              fill={k.materiaali.vari}
              className="kerrospalkki"
            />
            {nimiMahtuu && (
              <text
                className="kerrosnimi"
                transform={`translate(${x0 + leveys / 2},${ala + nimiPalkki - 5}) rotate(-90)`}
              >
                <title>
                  {k.materiaali.nimi} {k.kerros.paksuus} mm
                </title>
                {teksti}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
