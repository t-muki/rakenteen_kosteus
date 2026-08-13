/**
 * Glaser-menetelmän kosteustekninen osa (EN ISO 13788).
 *
 * Vesihöyry siirtyy rakenteen läpi osapaine-eron ajamana. Kun osapaine
 * piirretään diffuusiovastuksen s_d funktiona, se on suora — mutta vain
 * niin kauan kuin se pysyy kyllästyspaineen alapuolella. Jos suora leikkaisi
 * kyllästyskäyrän, vettä tiivistyy, ja todellinen osapaineprofiili on
 * kyllästyskäyrän alempi konveksi verhokäyrä.
 */

import { DELTA_0 } from './psychrometrics';

/** Piste (s_d, p) -tasossa. */
export interface Piste {
  sd: number;
  p: number;
}

/**
 * Alempi konveksi verhokäyrä x:n mukaan järjestetylle pistejoukolle
 * (monotoninen ketju). Tulos on suurin konveksi murtoviiva, joka kulkee
 * ensimmäisestä pisteestä viimeiseen eikä ylitä yhtäkään annettua pistettä.
 *
 * Tämä on täsmälleen Glaserin graafinen konstruktio: "kiristä naru
 * lähtöpisteestä päätepisteeseen kyllästyskäyrän alapuolelta".
 */
export function alempiKonveksiVerhokayra<T extends Piste>(pisteet: T[]): T[] {
  if (pisteet.length <= 2) return [...pisteet];

  const risti = (o: Piste, a: Piste, b: Piste): number =>
    (a.sd - o.sd) * (b.p - o.p) - (a.p - o.p) * (b.sd - o.sd);

  const kuori: T[] = [];
  for (const piste of pisteet) {
    // Pudota pisteet, jotka jäisivät verhokäyrän yläpuolelle.
    while (kuori.length >= 2 && risti(kuori[kuori.length - 2], kuori[kuori.length - 1], piste) <= 0) {
      kuori.pop();
    }
    kuori.push(piste);
  }
  return kuori;
}

/**
 * Osapaine kohdassa sd murtoviivalla, joka on annettu kulmapisteinä.
 * Pisteiden on oltava järjestyksessä kasvavan sd:n mukaan.
 */
export function paineMurtoviivalla(pisteet: Piste[], sd: number): number {
  if (pisteet.length === 0) return 0;
  if (sd <= pisteet[0].sd) return pisteet[0].p;

  for (let i = 1; i < pisteet.length; i++) {
    const a = pisteet[i - 1];
    const b = pisteet[i];
    if (sd <= b.sd) {
      const leveys = b.sd - a.sd;
      if (leveys <= 0) return b.p;
      return a.p + ((sd - a.sd) / leveys) * (b.p - a.p);
    }
  }
  return pisteet[pisteet.length - 1].p;
}

/**
 * Lineaarinen osapaine ilman kondenssia: paine muuttuu tasaisesti
 * kumulatiivisen diffuusiovastuksen suhteen.
 */
export function lineaarinenPaine(
  sd: number,
  sdTot: number,
  pSisa: number,
  pUlko: number,
): number {
  if (sdTot <= 0) return pUlko;
  return pSisa - ((pSisa - pUlko) * sd) / sdTot;
}

/** Diffuusiovuo murtoviivan segmentillä [kg/(m²·s)]. Positiivinen = sisältä ulos. */
export function segmentinVuo(a: Piste, b: Piste): number {
  const leveys = b.sd - a.sd;
  if (leveys <= 0) return 0;
  return (DELTA_0 * (a.p - b.p)) / leveys;
}

/**
 * Kondenssivuo kussakin verhokäyrän kulmapisteessä: kulmaan sisään tuleva
 * höyryvuo miinus siitä ulos lähtevä vuo. Positiivinen arvo tarkoittaa, että
 * kohtaan kertyy vettä.
 *
 * @returns taulukko, jonka pituus on `kuori.length`; päätepisteissä arvo on 0
 */
export function kondenssiVuot(kuori: Piste[]): number[] {
  const vuot = new Array<number>(kuori.length).fill(0);
  for (let i = 1; i < kuori.length - 1; i++) {
    const sisaan = segmentinVuo(kuori[i - 1], kuori[i]);
    const ulos = segmentinVuo(kuori[i], kuori[i + 1]);
    vuot[i] = sisaan - ulos;
  }
  return vuot;
}

/** Muuntaa vuon [kg/(m²·s)] muotoon [g/(m²·vrk)]. */
export function vuoVuorokaudessa(kgPerM2s: number): number {
  return kgPerM2s * 1000 * 86400;
}
