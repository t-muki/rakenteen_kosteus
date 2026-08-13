/**
 * Kokoava laskenta: yhdistää lämpötilaprofiilin ja Glaser-menetelmän
 * kosteustarkastelun yhdeksi tulokseksi, jota käyttöliittymä piirtää.
 */

import {
  alempiKonveksiVerhokayra,
  kondenssiVuot,
  lineaarinenPaine,
  paineMurtoviivalla,
  segmentinVuo,
  vuoVuorokaudessa,
} from './glaser';
import { kastepiste, osapaine, pSat, suhteellinenKosteus } from './psychrometrics';
import {
  PINTAVASTUKSET,
  kokonaisR,
  laskeKerrokset,
  laskennanKerrokset,
  uArvo,
} from './thermal';
import type {
  KondenssiAlue,
  KondenssiTaso,
  LaskettuKerros,
  Materiaali,
  ProfiiliPiste,
  Rakenne,
  Solmu,
  Tulos,
} from './types';

/** Näytteenottoväli kerroksen sisällä [mm]. */
const NAYTEVALI_MM = 4;
/** Enimmäismäärä näytteitä yhtä kerrosta kohti. */
const NAYTTEITA_MAX = 60;
/** Kondenssivuo tämän alle tulkitaan nollaksi [kg/(m²·s)]. */
const VUO_EPSILON = 1e-14;

/** Näytepiste laskennan sisäisessä muodossa (kuljettaa x:n kuoren läpi). */
interface Nayte {
  sd: number;
  p: number;
  x: number;
  T: number;
}

/** Laskee kaiken, mitä käyttöliittymä tarvitsee. */
export function laske(rakenne: Rakenne, materiaalit: Map<string, Materiaali>): Tulos {
  const varoitukset: string[] = [];
  const { Rsi, Rse } = PINTAVASTUKSET[rakenne.tyyppi];

  const kerrokset = laskeKerrokset(rakenne.kerrokset, materiaalit);
  // Tuulettuva ilmarako katkaisee tarkastelun: sen ulkopuoliset kerrokset ovat
  // ulkoilman puolella eivätkä osallistu lämmön- tai kosteudensiirtoon.
  const laskennassa = laskennanKerrokset(kerrokset);
  const Rtot = kokonaisR(laskennassa, Rsi, Rse);
  const U = uArvo(Rtot);
  const paksuus = kerrokset.length > 0 ? kerrokset[kerrokset.length - 1].xLoppu : 0;
  const sdTot = laskennassa.reduce((summa, k) => summa + k.sd, 0);

  const Ti = rakenne.sisa.T;
  const Te = rakenne.ulko.T;
  const q = U * (Ti - Te);

  const Tsi = Ti - q * Rsi;
  const Tse = Te + q * Rse;

  const pSisa = osapaine(Ti, rakenne.sisa.RH);
  const pUlko = osapaine(Te, rakenne.ulko.RH);

  // --- Näytteistys: kerrosrajat + kerrosten sisäiset pisteet ---
  const naytteet: Nayte[] = [];
  const lisaa = (x: number, sd: number, T: number) => {
    const edellinen = naytteet[naytteet.length - 1];
    if (edellinen && Math.abs(edellinen.x - x) < 1e-12 && Math.abs(edellinen.sd - sd) < 1e-12) {
      // Sama piste kuin edellinen: säilytä alempi kyllästyspaine (kalvot, ilmaraot).
      if (pSat(T) < pSat(edellinen.T)) {
        edellinen.T = T;
        edellinen.p = pSat(T);
      }
      return;
    }
    naytteet.push({ x, sd, T, p: pSat(T) });
  };

  lisaa(0, 0, Tsi);
  let TkerroksenAlku = Tsi;
  for (const k of laskennassa) {
    const n = Math.max(
      1,
      Math.min(NAYTTEITA_MAX, Math.ceil((k.d * 1000) / NAYTEVALI_MM)),
    );
    for (let j = 1; j <= n; j++) {
      const osuus = j / n;
      lisaa(
        k.xAlku + osuus * k.d,
        k.sdAlku + osuus * k.sd,
        TkerroksenAlku - q * osuus * k.R,
      );
    }
    TkerroksenAlku -= q * k.R;
  }

  // --- Höyrynpaineprofiili ---
  // Lähtö- ja päätepaine rajataan kyllästyspaineeseen: jos sisäilman osapaine
  // ylittää pinnan kyllästyspaineen, kyseessä on pintakondenssi eikä rakenteen
  // sisäinen kondenssi, ja diffuusio lähtee kyllästystilasta.
  const pSatSisapinta = pSat(Tsi);
  const pSatUlkopinta = pSat(Tse);
  const pAlku = Math.min(pSisa, pSatSisapinta);
  const pLoppu = Math.min(pUlko, pSatUlkopinta);

  let kondenssiTasot: KondenssiTaso[] = [];
  let kuori: Nayte[] = [];

  if (sdTot > 0 && naytteet.length >= 2) {
    const kuoriSyote: Nayte[] = naytteet.map((n) => ({ ...n }));
    kuoriSyote[0] = { ...naytteet[0], p: Math.min(pAlku, naytteet[0].p) };
    kuoriSyote[kuoriSyote.length - 1] = {
      ...naytteet[naytteet.length - 1],
      p: Math.min(pLoppu, naytteet[naytteet.length - 1].p),
    };
    kuori = alempiKonveksiVerhokayra(kuoriSyote);

    const vuot = kondenssiVuot(kuori);
    const raa_at: { nayte: Nayte; gc: number }[] = [];
    for (let i = 1; i < kuori.length - 1; i++) {
      if (vuot[i] > VUO_EPSILON) {
        raa_at.push({ nayte: kuori[i], gc: vuot[i] });
      }
    }
    kondenssiTasot = yhdistaTasot(raa_at, laskennassa);
  }

  // --- Profiili piirtoa varten ---
  const profiili: ProfiiliPiste[] = naytteet.map((n) => {
    const pLin = lineaarinenPaine(n.sd, sdTot, pAlku, pLoppu);
    const pKorj = kuori.length >= 2 ? paineMurtoviivalla(kuori, n.sd) : pLin;
    return {
      x: n.x,
      sd: n.sd,
      T: n.T,
      pSat: n.p,
      pLin,
      p: Math.min(pKorj, n.p),
      Tdp: kastepiste(pLin),
      RH: suhteellinenKosteus(Math.min(pKorj, n.p), n.T),
    };
  });

  // --- Kondenssiriskialueet: missä lineaarinen paine ylittäisi kyllästyspaineen ---
  const kondenssiAlueet = etsiKondenssiAlueet(profiili);

  // --- Solmut (kerrosrajat) tulostaulukkoa varten ---
  const solmut = kokoaSolmut(laskennassa, profiili, Tsi, Tse);

  const diffuusioVuo =
    sdTot > 0
      ? vuoVuorokaudessa(
          segmentinVuo({ sd: 0, p: pAlku }, { sd: sdTot, p: pLoppu }),
        )
      : 0;

  const kondenssiYhteensa = kondenssiTasot.reduce((summa, t) => summa + t.gcVrk, 0);
  const RHsi = suhteellinenKosteus(pSisa, Tsi);
  const fRsi = Ti - Te !== 0 ? (Tsi - Te) / (Ti - Te) : 1;

  // --- Varoitukset ---
  if (kerrokset.length === 0) {
    varoitukset.push('Rakenteessa ei ole yhtään kerrosta.');
  }
  if (kerrokset.length > laskennassa.length) {
    varoitukset.push(
      'Tuulettuvan ilmaraon ulkopuoliset kerrokset on jätetty laskennasta pois (EN ISO 6946); ne näkyvät kuvassa haaleina.',
    );
  }
  if (sdTot <= 0 && kerrokset.length > 0) {
    varoitukset.push(
      'Rakenteella ei ole lainkaan vesihöyryn diffuusiovastusta, joten kosteustarkastelua ei voi tehdä.',
    );
  }
  if (pSisa > pSatSisapinta) {
    varoitukset.push(
      `Sisäpinnalle tiivistyy vettä: pinnan lämpötila ${Tsi.toFixed(1)} °C on sisäilman kastepisteen ${kastepiste(pSisa).toFixed(1)} °C alapuolella.`,
    );
  } else if (RHsi >= 80) {
    varoitukset.push(
      `Sisäpinnan suhteellinen kosteus on ${RHsi.toFixed(0)} % — pitkäaikaisena homeen kasvun raja-arvo (80 %) ylittyy.`,
    );
  }
  if (kondenssiTasot.length > 0) {
    varoitukset.push(
      `Rakenteen sisään tiivistyy vettä ${kondenssiYhteensa.toFixed(2)} g/(m²·vrk) ${kondenssiTasot.length === 1 ? 'yhdessä kohdassa' : `${kondenssiTasot.length} kohdassa`}.`,
    );
  }
  if (Ti <= Te) {
    varoitukset.push(
      'Ulkoilma on vähintään yhtä lämmintä kuin sisäilma: talvitilanteen tarkastelu ei ole voimassa.',
    );
  }

  return {
    kerrokset,
    Rsi,
    Rse,
    Rtot,
    U,
    q,
    sdTot,
    paksuus,
    Tsi,
    Tse,
    pSisa,
    pUlko,
    solmut,
    profiili,
    kondenssiTasot,
    kondenssiAlueet,
    kondenssiYhteensa,
    diffuusioVuo,
    RHsi,
    fRsi,
    varoitukset,
  };
}

/**
 * Kokoaa lähekkäiset taitepisteet yhdeksi kondenssitasoksi.
 *
 * Kyllästyskäyrä on kaareva, joten sen alempi konveksi verhokäyrä koskettaa sitä
 * usealla peräkkäisellä näytepisteellä. Fysikaalisesti kyse on yhdestä
 * tiivistymisvyöhykkeestä, ei kymmenestä erillisestä tasosta.
 */
function yhdistaTasot(
  tasot: { nayte: Nayte; gc: number }[],
  kerrokset: LaskettuKerros[],
): KondenssiTaso[] {
  if (tasot.length === 0) return [];

  // Erillisiksi tulkitaan tasot, joiden väliin jää vähintään muutaman
  // näytevälin verran kondensoitumatonta rakennetta.
  const RAKO = (3 * NAYTEVALI_MM) / 1000;

  const ryhmat: { nayte: Nayte; gc: number }[][] = [[tasot[0]]];
  for (let i = 1; i < tasot.length; i++) {
    const edellinen = ryhmat[ryhmat.length - 1];
    const etaisyys = tasot[i].nayte.x - edellinen[edellinen.length - 1].nayte.x;
    if (etaisyys <= RAKO) edellinen.push(tasot[i]);
    else ryhmat.push([tasot[i]]);
  }

  return ryhmat.map((ryhma) => {
    const gc = ryhma.reduce((summa, t) => summa + t.gc, 0);
    const voimakkain = ryhma.reduce((paras, t) => (t.gc > paras.gc ? t : paras));
    const xAlku = ryhma[0].nayte.x;
    const xLoppu = ryhma[ryhma.length - 1].nayte.x;
    const perusSelite = sijaintiSelite(voimakkain.nayte.x, kerrokset);
    const leveys = xLoppu - xAlku;

    return {
      x: voimakkain.nayte.x,
      xAlku,
      xLoppu,
      sd: voimakkain.nayte.sd,
      T: voimakkain.nayte.T,
      gc,
      gcVrk: vuoVuorokaudessa(gc),
      sijainti:
        leveys > 0.002
          ? `${perusSelite} (vyöhyke ${(xAlku * 1000).toFixed(0)}–${(xLoppu * 1000).toFixed(0)} mm sisäpinnasta)`
          : perusSelite,
    };
  });
}

/** Etsii välit, joilla lineaarinen höyrynpaine ylittää kyllästyspaineen. */
function etsiKondenssiAlueet(profiili: ProfiiliPiste[]): KondenssiAlue[] {
  const alueet: KondenssiAlue[] = [];
  let alku: ProfiiliPiste | null = null;

  const leikkaus = (a: ProfiiliPiste, b: ProfiiliPiste) => {
    const ero1 = a.pLin - a.pSat;
    const ero2 = b.pLin - b.pSat;
    const nimittaja = ero1 - ero2;
    const t = Math.abs(nimittaja) < 1e-12 ? 0 : ero1 / nimittaja;
    return {
      x: a.x + t * (b.x - a.x),
      sd: a.sd + t * (b.sd - a.sd),
    };
  };

  for (let i = 0; i < profiili.length; i++) {
    const piste = profiili[i];
    const yli = piste.pLin > piste.pSat;

    if (yli && !alku) {
      const raja = i > 0 ? leikkaus(profiili[i - 1], piste) : { x: piste.x, sd: piste.sd };
      alku = { ...piste, x: raja.x, sd: raja.sd };
    } else if (!yli && alku) {
      const raja = leikkaus(profiili[i - 1], piste);
      alueet.push({ xAlku: alku.x, xLoppu: raja.x, sdAlku: alku.sd, sdLoppu: raja.sd });
      alku = null;
    }
  }

  if (alku) {
    const viimeinen = profiili[profiili.length - 1];
    alueet.push({
      xAlku: alku.x,
      xLoppu: viimeinen.x,
      sdAlku: alku.sd,
      sdLoppu: viimeinen.sd,
    });
  }

  return alueet;
}

/** Poimii profiilista kerrosrajoja vastaavat solmupisteet. */
function kokoaSolmut(
  kerrokset: LaskettuKerros[],
  profiili: ProfiiliPiste[],
  Tsi: number,
  Tse: number,
): Solmu[] {
  if (profiili.length === 0) return [];

  const solmuPisteesta = (piste: ProfiiliPiste, nimi: string): Solmu => ({
    x: piste.x,
    sd: piste.sd,
    T: piste.T,
    pSat: piste.pSat,
    p: piste.p,
    Tdp: piste.Tdp,
    RH: piste.RH,
    nimi,
  });

  const lahin = (x: number): ProfiiliPiste =>
    profiili.reduce((paras, piste) =>
      Math.abs(piste.x - x) < Math.abs(paras.x - x) ? piste : paras,
    );

  const solmut: Solmu[] = [solmuPisteesta(profiili[0], `Sisäpinta (${Tsi.toFixed(1)} °C)`)];

  for (let i = 0; i < kerrokset.length; i++) {
    const k = kerrokset[i];
    const seuraava = kerrokset[i + 1];
    const nimi = seuraava
      ? `${k.materiaali.nimi} / ${seuraava.materiaali.nimi}`
      : `Ulkopinta (${Tse.toFixed(1)} °C)`;
    solmut.push(solmuPisteesta(lahin(k.xLoppu), nimi));
  }

  return solmut;
}

/** Sanallinen selite sille, missä kohtaa rakennetta annettu x sijaitsee. */
function sijaintiSelite(x: number, kerrokset: LaskettuKerros[]): string {
  const TOLERANSSI = 1e-6;

  for (let i = 0; i < kerrokset.length; i++) {
    const k = kerrokset[i];
    if (Math.abs(x - k.xAlku) < TOLERANSSI) {
      const edellinen = kerrokset[i - 1];
      return edellinen
        ? `${edellinen.materiaali.nimi} / ${k.materiaali.nimi} -rajapinta`
        : `sisäpinta (${k.materiaali.nimi})`;
    }
    if (Math.abs(x - k.xLoppu) < TOLERANSSI) {
      const seuraava = kerrokset[i + 1];
      return seuraava
        ? `${k.materiaali.nimi} / ${seuraava.materiaali.nimi} -rajapinta`
        : `ulkopinta (${k.materiaali.nimi})`;
    }
    if (x > k.xAlku && x < k.xLoppu) {
      const kohta = ((x - k.xAlku) * 1000).toFixed(0);
      return `${k.materiaali.nimi}, ${kohta} mm kerroksen sisäreunasta`;
    }
  }

  return `${(x * 1000).toFixed(0)} mm sisäpinnasta`;
}
