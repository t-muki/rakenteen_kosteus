/** Kuvaajien yhteiset piirtoapurit: skaalaus, akselit ja kerrosvyöhykkeet. */

import type { ReactNode } from 'react';

import type { KondenssiAlue, LaskettuKerros } from '../lib/types';

/**
 * Alaindeksi SVG-tekstissä, esimerkiksi s_d → s alaindeksillä d.
 *
 * baseline-shift koskee vain tämän tspanin sisältöä, joten perusviiva palautuu
 * itsestään eikä sitä tarvitse siirtää erikseen takaisin. Unicodesta ei löydy
 * alaindeksiä kaikille kirjaimille (d puuttuu), joten merkkitason ratkaisu ei
 * kelpaa.
 */
export function Alaindeksi({ children }: { children: ReactNode }) {
  return (
    <tspan baselineShift="sub" fontSize="0.72em">
      {children}
    </tspan>
  );
}

/**
 * Tätä kapeampi tiivistyminen esitetään tasona eikä vyöhykkeenä [m].
 *
 * Glaserin verhokäyrä koskettaa kyllästyskäyrää siellä missä se on konveksi.
 * Materiaalien rajapinnassa kosketus on yksi piste, jolloin vettä erottuu
 * yhteen tasoon; yhtenäisen paksun kerroksen sisällä kosketus jatkuu pitkän
 * matkaa ja syntyy todellinen vyöhyke. Nämä kaksi ansaitsevat oman merkintänsä:
 * nollan levyinen vyöhyke ei erotu kuvasta, vaikka legenda lupaisi sellaisen.
 */
export const TIIVISTYMIS_TASO_RAJA = 0.002;

/** Onko tiivistyminen keskittynyt yhteen tasoon vyöhykkeen sijaan. */
export function onTiivistymisTaso(alue: KondenssiAlue): boolean {
  return alue.xLoppu - alue.xAlku < TIIVISTYMIS_TASO_RAJA;
}

export const MARGINAALI = { ylä: 46, oikea: 64, vasen: 62 };

/** Kerrospalkin korkeus heti piirtoalueen alapuolella. */
export const KERROSPALKKI = 26;
/** Selitelistan rivikorkeus. */
export const SELITE_RIVI = 21;
/** Kerroksen vähimmäisleveys, jotta ohut kalvo erottuu kuvasta. */
export const KERROS_MIN_LEVEYS = 3.5;

/**
 * Piirtoalueen alapuolinen tila: kerrospalkki, x-akselin otsikko, erotin ja
 * selitelista. Riippuu selitelistan rivimäärästä.
 */
export function alaTila(seliteRivit: number): number {
  return X_OTSIKKO_Y + 20 + 12 + seliteRivit * SELITE_RIVI + 14;
}

/**
 * x-akselin otsikon y-koordinaatti piirtoalueen alareunasta. Kapean kerroksen
 * numero piirretään johtoviivan päähän palkin alle, joten otsikko jää sen
 * alapuolelle.
 */
export const X_OTSIKKO_Y = KERROSPALKKI + 40;
/** Selitelistan ensimmäisen rivin y-koordinaatti piirtoalueen alareunasta. */
export const SELITE_ALKU = X_OTSIKKO_Y + 20 + 12;

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
  /** Piirtoalueen ylä- ja alareuna. */
  ylä: number;
  ala: number;
  yArvot: number[];
  yPix: (arvo: number) => number;
  yOtsikko: string;
  yMuotoilu?: (arvo: number) => string;
  nollaviiva?: boolean;
}

/** Vaakaruudukko, y-akselin lukemat, kehys ja akseliotsikko. */
export function Akselit({
  leveys,
  ylä,
  ala,
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

      {/* Kehys rajaa piirtoalueen selvästi kerrospalkista ja selitteistä */}
      <rect x={x0} y={ylä} width={x1 - x0} height={ala - ylä} className="piirtokehys" />

      <text
        className="akseliotsikko"
        transform={`translate(${16},${(ylä + ala) / 2}) rotate(-90)`}
      >
        {yOtsikko}
      </text>
    </g>
  );
}

/**
 * Latoo kohdat peräkkäin riveille tekstin pituuden mukaan. Samaa käytetään sekä
 * legendaan että kerrosten selitelistaan, jotta molemmat rivittyvät samalla
 * tavalla eivätkä valu piirtoalueen ulkopuolelle.
 */
export interface LadottuKohta<T> {
  kohta: T;
  x: number;
  rivi: number;
}

export function lado<T>(
  kohdat: T[],
  teksti: (kohta: T) => string,
  asetukset: { alku: number; loppu: number; merkkiLeveys?: number; kuvakeTila?: number; vali?: number },
): { ladotut: LadottuKohta<T>[]; rivit: number } {
  const { alku, loppu, merkkiLeveys = 6.4, kuvakeTila = 34, vali = 22 } = asetukset;
  const ladotut: LadottuKohta<T>[] = [];
  let x = alku;
  let rivi = 0;

  for (const kohta of kohdat) {
    const leveys = kuvakeTila + teksti(kohta).length * merkkiLeveys + vali;
    if (x > alku && x + leveys - vali > loppu) {
      rivi += 1;
      x = alku;
    }
    ladotut.push({ kohta, x, rivi });
    x += leveys;
  }

  return { ladotut, rivit: ladotut.length > 0 ? rivi + 1 : 0 };
}

/**
 * Rakennuspiirustusten tapaiset rasterikuviot materiaalikategorioittain.
 * Kuvio piirretään materiaalin värin päälle neutraalilla harmaalla, joten
 * materiaalityypit erottuvat toisistaan myös mustavalkotulosteessa.
 */
export function KuvioMaaritykset() {
  return (
    <defs>
      {/* Eriste: vino viivoitus */}
      <pattern id="kuvio-eriste" width={8} height={8} patternUnits="userSpaceOnUse">
        <path d="M0,8 L8,0 M-2,2 L2,-2 M6,10 L10,6" className="kuvioViiva" />
      </pattern>

      {/* Massiivinen (betoni, tiili): pistekuvio */}
      <pattern id="kuvio-massiivinen" width={9} height={9} patternUnits="userSpaceOnUse">
        <circle cx={2} cy={2} r={1.1} className="kuvioTaytto" />
        <circle cx={6.5} cy={6} r={1.1} className="kuvioTaytto" />
      </pattern>

      {/* Puu: vaakasuorat syyviivat */}
      <pattern id="kuvio-puu" width={14} height={7} patternUnits="userSpaceOnUse">
        <path d="M0,2 H14 M0,5.5 H9" className="kuvioViiva" />
      </pattern>

      {/* Levy: harva ristiviivoitus */}
      <pattern id="kuvio-levy" width={10} height={10} patternUnits="userSpaceOnUse">
        <path d="M0,10 L10,0 M0,0 L10,10" className="kuvioViiva kuvioViiva--ohut" />
      </pattern>

      {/* Laasti ja pinnoitteet: tiheä pistekuvio */}
      <pattern id="kuvio-laasti" width={5} height={5} patternUnits="userSpaceOnUse">
        <circle cx={1.5} cy={1.5} r={0.8} className="kuvioTaytto" />
        <circle cx={3.8} cy={3.8} r={0.8} className="kuvioTaytto" />
      </pattern>

      {/* Ilmarako: harva pystyviivoitus */}
      <pattern id="kuvio-ilmarako" width={9} height={9} patternUnits="userSpaceOnUse">
        <path d="M4.5,0 V9" className="kuvioViiva kuvioViiva--ohut" />
      </pattern>
    </defs>
  );
}

/** Kalvot jätetään kuvioimatta: kaista on liian kapea, jotta kuvio erottuisi. */
const KUVIOTTOMAT = new Set(['kalvo']);

function kuvioTayte(kategoria: string): string | undefined {
  return KUVIOTTOMAT.has(kategoria) ? undefined : `url(#kuvio-${kategoria})`;
}

/** Kerroksen piirtoreunat; ohut kerros levennetään näkyväksi. */
function piirtoReunat(x0: number, x1: number): { x: number; leveys: number } {
  const todellinen = Math.max(0, x1 - x0);
  if (todellinen >= KERROS_MIN_LEVEYS) return { x: x0, leveys: todellinen };
  // Ohut kalvo keskitetään todelliseen kohtaansa. Vinouma on alle puoli
  // prosenttia kuvan leveydestä, eikä se koske käyrien koordinaatteja.
  const keski = (x0 + x1) / 2;
  return { x: keski - KERROS_MIN_LEVEYS / 2, leveys: KERROS_MIN_LEVEYS };
}

interface KerrosVyohykkeetProps {
  kerrokset: LaskettuKerros[];
  /** Muuntaa kerroksen reunan piirtokoordinaatiksi; null jos kerros ei ole akselilla. */
  reuna: (kerros: LaskettuKerros, puoli: 'alku' | 'loppu') => number | null;
  ylä: number;
  ala: number;
}

/** Materiaalikerrokset kuvioituina vyöhykkeinä ja numeroituna kerrospalkkina. */
export function KerrosVyohykkeet({ kerrokset, reuna, ylä, ala }: KerrosVyohykkeetProps) {
  return (
    <g className="kerrokset">
      {kerrokset.map((k, i) => {
        const x0 = reuna(k, 'alku');
        const x1 = reuna(k, 'loppu');
        if (x0 === null || x1 === null) return null;

        const { x, leveys } = piirtoReunat(x0, x1);
        const kuvio = kuvioTayte(k.materiaali.kategoria);
        const numeroMahtuu = leveys > 13;
        const nimi = `${i + 1}. ${seliteTeksti(k)}`;

        return (
          <g key={k.kerros.id} className={k.mukanaLaskennassa ? '' : 'kerros--passiivinen'}>
            <title>{nimi}</title>

            {/* Vyöhyke: materiaalin väri, sen päällä kategorian kuvio */}
            <rect
              x={x}
              y={ylä}
              width={leveys}
              height={ala - ylä}
              fill={k.materiaali.vari}
              className="kerrosvyohyke"
            />
            {kuvio && (
              <rect x={x} y={ylä} width={leveys} height={ala - ylä} fill={kuvio} />
            )}
            <rect
              x={x}
              y={ylä}
              width={leveys}
              height={ala - ylä}
              className="kerrosreuna"
            />

            {/* Kerrospalkki numeroineen */}
            <rect
              x={x}
              y={ala}
              width={leveys}
              height={KERROSPALKKI}
              fill={k.materiaali.vari}
              className="kerrospalkki"
            />
            {numeroMahtuu ? (
              <text x={x + leveys / 2} y={ala + KERROSPALKKI / 2 + 4} className="kerrosnumero">
                {i + 1}
              </text>
            ) : (
              // Kapea kalvo: numero johtoviivan päähän palkin alapuolelle.
              <g className="kerrosnumero--ohut">
                <line
                  x1={x + leveys / 2}
                  x2={x + leveys / 2}
                  y1={ala + KERROSPALKKI}
                  y2={ala + KERROSPALKKI + 9}
                  className="kerrosJohto"
                />
                <text
                  x={x + leveys / 2}
                  y={ala + KERROSPALKKI + 18}
                  className="kerrosnumero kerrosnumero--irrallinen"
                >
                  {i + 1}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

interface KerrosSeliteProps {
  kerrokset: LaskettuKerros[];
  /** Selitelistan vasen reuna. */
  alku: number;
  /** Selitelistan oikea reuna. */
  loppu: number;
  /** Ensimmäisen rivin y-koordinaatti. */
  y: number;
}

/** Kerrosten selite: numero, värilaatikko ja koko nimi vaakatekstinä. */
export function KerrosSelitelista({ kerrokset, alku, loppu, y }: KerrosSeliteProps) {
  const { ladotut } = lado(kerrokset, seliteTeksti, { alku, loppu, kuvakeTila: 30, vali: 20 });

  return (
    <g className="kerrosselite">
      {ladotut.map(({ kohta, x, rivi }, i) => {
        const rivinY = y + rivi * SELITE_RIVI;
        return (
          <g
            key={kohta.kerros.id}
            className={kohta.mukanaLaskennassa ? '' : 'kerros--passiivinen'}
          >
            <rect x={x} y={rivinY - 8} width={11} height={11} fill={kohta.materiaali.vari} />
            <rect x={x} y={rivinY - 8} width={11} height={11} className="kerrosreuna" />
            <text x={x + 16} y={rivinY + 1} className="kerrosselite__numero">
              {i + 1}
            </text>
            <text x={x + 30} y={rivinY + 1} className="kerrosselite__teksti">
              {seliteTeksti(kohta)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Selitelistan rivimäärä ennakolta, jotta kuvaajan korkeus voidaan mitoittaa. */
export function seliteRivit(kerrokset: LaskettuKerros[], alku: number, loppu: number): number {
  return lado(kerrokset, seliteTeksti, { alku, loppu, kuvakeTila: 30, vali: 20 }).rivit;
}

function seliteTeksti(k: LaskettuKerros): string {
  // Suomalainen desimaalierotin: 0,2 mm eikä 0.2 mm.
  const paksuus = String(k.kerros.paksuus).replace('.', ',');
  const perus = `${k.materiaali.nimi} ${paksuus} mm`;
  return k.mukanaLaskennassa ? perus : `${perus} (ei laskennassa)`;
}
