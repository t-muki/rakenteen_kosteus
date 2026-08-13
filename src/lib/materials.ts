/** Materiaalitietokannan ja esiasetusten lataus sekä omien materiaalien hallinta. */

import materiaaliData from '../data/materials.json';
import presetData from '../data/presets.json';
import type { Kategoria, Materiaali, Olosuhde, Rakenne, RakenneTyyppi } from './types';

const OMAT_AVAIN = 'seinarakenne.omatMateriaalit';

export const perusMateriaalit = materiaaliData as Materiaali[];

export interface RakennePreset {
  nimi: string;
  tyyppi: RakenneTyyppi;
  kerrokset: { materiaaliId: string; paksuus: number }[];
}

export interface OlosuhdePreset extends Olosuhde {
  nimi: string;
}

export const rakennePresetit = presetData.rakenteet as RakennePreset[];
export const sisaPresetit = presetData.sisaOlosuhteet as OlosuhdePreset[];
export const ulkoPresetit = presetData.ulkoOlosuhteet as OlosuhdePreset[];

export const KATEGORIA_NIMET: Record<Kategoria, string> = {
  eriste: 'Eristeet',
  massiivinen: 'Massiiviset',
  puu: 'Puu',
  levy: 'Levyt',
  kalvo: 'Kalvot ja sulut',
  laasti: 'Laastit ja pinnoitteet',
  ilmarako: 'Ilmaraot',
};

export const KATEGORIA_JARJESTYS: Kategoria[] = [
  'eriste',
  'massiivinen',
  'puu',
  'levy',
  'kalvo',
  'laasti',
  'ilmarako',
];

/** Käyttäjän itse lisäämät materiaalit selaimen muistista. */
export function lataaOmatMateriaalit(): Materiaali[] {
  try {
    const raaka = localStorage.getItem(OMAT_AVAIN);
    if (!raaka) return [];
    const arvot = JSON.parse(raaka);
    return Array.isArray(arvot) ? (arvot as Materiaali[]) : [];
  } catch {
    return [];
  }
}

export function tallennaOmatMateriaalit(materiaalit: Materiaali[]): void {
  try {
    localStorage.setItem(OMAT_AVAIN, JSON.stringify(materiaalit));
  } catch {
    // Yksityinen selaustila tms. — omat materiaalit jäävät vain istunnon ajaksi.
  }
}

/** Hakemisto id → materiaali. */
export function materiaaliHakemisto(materiaalit: Materiaali[]): Map<string, Materiaali> {
  return new Map(materiaalit.map((m) => [m.id, m]));
}

/** Muuntaa esiasetuksen käyttövalmiiksi rakenteeksi. */
export function presetRakenteeksi(
  preset: RakennePreset,
  sisa: Olosuhde,
  ulko: Olosuhde,
): Rakenne {
  return {
    nimi: preset.nimi,
    tyyppi: preset.tyyppi,
    sisa,
    ulko,
    kerrokset: preset.kerrokset.map((k, i) => ({
      id: `k${i}-${Math.random().toString(36).slice(2, 8)}`,
      materiaaliId: k.materiaaliId,
      paksuus: k.paksuus,
    })),
  };
}
