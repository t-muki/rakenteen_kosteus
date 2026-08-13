/**
 * Lämpöteknisen osan laskenta: kerrosten lämpövastukset, U-arvo ja
 * lämpötilajakauma rakenteen läpi (EN ISO 6946).
 */

import type { Kerros, LaskettuKerros, Materiaali, RakenneTyyppi } from './types';

/**
 * Pintavastukset rakennetyypeittäin [m²·K/W] (EN ISO 6946, taulukko 1).
 * Yläpohjassa lämpövirta on ylöspäin, alapohjassa alaspäin.
 */
export const PINTAVASTUKSET: Record<RakenneTyyppi, { Rsi: number; Rse: number }> = {
  seina: { Rsi: 0.13, Rse: 0.04 },
  ylapohja: { Rsi: 0.1, Rse: 0.04 },
  alapohja: { Rsi: 0.17, Rse: 0.04 },
};

/** Kerroksen lämpövastus R = d/λ [m²·K/W], tai materiaalin kiinteä arvo (ilmaraot). */
export function kerroksenR(materiaali: Materiaali, paksuusMm: number): number {
  if (materiaali.rFixed !== undefined) return materiaali.rFixed;
  if (materiaali.lambda <= 0) return 0;
  return paksuusMm / 1000 / materiaali.lambda;
}

/**
 * Kerroksen vesihöyryn diffuusion ekvivalentti ilmakerrospaksuus s_d = μ·d [m],
 * tai materiaalin kiinteä arvo (ohutkalvot).
 */
export function kerroksenSd(materiaali: Materiaali, paksuusMm: number): number {
  if (materiaali.sd !== undefined) return materiaali.sd;
  return materiaali.mu * (paksuusMm / 1000);
}

/**
 * Yhdistää kerrokset materiaaleihin ja laskee kumulatiiviset x- ja s_d-koordinaatit.
 * Tuntematon materiaali ohitetaan.
 */
export function laskeKerrokset(
  kerrokset: Kerros[],
  materiaalit: Map<string, Materiaali>,
): LaskettuKerros[] {
  const tulos: LaskettuKerros[] = [];
  let x = 0;
  let sd = 0;
  let tuulettuvanTakana = false;

  for (const kerros of kerrokset) {
    const materiaali = materiaalit.get(kerros.materiaaliId);
    if (!materiaali) continue;

    const d = kerros.paksuus / 1000;
    const mukana = !tuulettuvanTakana && !materiaali.tuulettuva;
    const R = mukana ? kerroksenR(materiaali, kerros.paksuus) : 0;
    const kerrosSd = mukana ? kerroksenSd(materiaali, kerros.paksuus) : 0;

    tulos.push({
      kerros,
      materiaali,
      d,
      R,
      sd: kerrosSd,
      xAlku: x,
      xLoppu: x + d,
      sdAlku: sd,
      sdLoppu: sd + kerrosSd,
      mukanaLaskennassa: mukana,
    });

    if (materiaali.tuulettuva) tuulettuvanTakana = true;
    x += d;
    sd += kerrosSd;
  }

  return tulos;
}

/** Laskennassa mukana olevat kerrokset (tuulettuvaan rakoon asti). */
export function laskennanKerrokset(kerrokset: LaskettuKerros[]): LaskettuKerros[] {
  return kerrokset.filter((k) => k.mukanaLaskennassa);
}

/** Kokonaislämpövastus pintavastuksineen [m²·K/W]. */
export function kokonaisR(kerrokset: LaskettuKerros[], Rsi: number, Rse: number): number {
  return Rsi + Rse + kerrokset.reduce((summa, k) => summa + k.R, 0);
}

/** Lämmönläpäisykerroin U = 1/R_tot [W/(m²·K)]. */
export function uArvo(Rtot: number): number {
  return Rtot > 0 ? 1 / Rtot : Infinity;
}

/**
 * Lämpötila etäisyydellä x sisäpinnasta. Lämpötila laskee lineaarisesti
 * kumulatiivisen lämpövastuksen mukaan, joten kerroksen sisällä käyrä on suora,
 * jonka jyrkkyys on kääntäen verrannollinen lämmönjohtavuuteen.
 *
 * @param x etäisyys rakenteen sisäpinnasta [m]
 * @param kerrokset lasketut kerrokset
 * @param Tsi sisäpinnan lämpötila [°C]
 * @param q lämpövirran tiheys [W/m²]
 */
export function lampotilaKohdassa(
  x: number,
  kerrokset: LaskettuKerros[],
  Tsi: number,
  q: number,
): number {
  let kumulatiivinenR = 0;

  for (const k of kerrokset) {
    if (x <= k.xLoppu || k === kerrokset[kerrokset.length - 1]) {
      const osuus = k.d > 0 ? Math.min(1, Math.max(0, (x - k.xAlku) / k.d)) : 1;
      return Tsi - q * (kumulatiivinenR + osuus * k.R);
    }
    kumulatiivinenR += k.R;
  }

  return Tsi - q * kumulatiivinenR;
}
