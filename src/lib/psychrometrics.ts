/**
 * Kostean ilman perussuureet.
 *
 * Kyllästyspaineen kaavat ovat standardin EN ISO 13788 liitteen E mukaiset
 * (Magnus-muotoinen approksimaatio, kaksi haaraa nollan molemmin puolin).
 */

/** Veden kyllästyshöyrynpaine 0 °C:ssa [Pa]. */
export const P_SAT_0 = 610.5;

/** Ilman vesihöyrynläpäisevyys δ₀ [kg/(m·s·Pa)] (EN ISO 13788). */
export const DELTA_0 = 2.0e-10;

/** Normaali ilmanpaine [Pa]. */
export const P_ILMAKEHA = 101325;

/**
 * Veden kyllästyshöyrynpaine lämpötilassa θ.
 * @param T lämpötila [°C]
 * @returns kyllästyspaine [Pa]
 */
export function pSat(T: number): number {
  if (T >= 0) {
    return P_SAT_0 * Math.exp((17.269 * T) / (237.3 + T));
  }
  return P_SAT_0 * Math.exp((21.875 * T) / (265.5 + T));
}

/**
 * Kastepistelämpötila vesihöyryn osapaineesta. Tämä on pSat:n käänteisfunktio,
 * eli lämpötila jossa annettu osapaine on kyllästyspaine.
 * @param p vesihöyryn osapaine [Pa]
 * @returns kastepistelämpötila [°C]
 */
export function kastepiste(p: number): number {
  if (p <= 0) return -273.15;
  const k = Math.log(p / P_SAT_0);
  if (p >= P_SAT_0) {
    return (237.3 * k) / (17.269 - k);
  }
  return (265.5 * k) / (21.875 - k);
}

/**
 * Vesihöyryn osapaine lämpötilan ja suhteellisen kosteuden perusteella.
 * @param T lämpötila [°C]
 * @param RH suhteellinen kosteus [%]
 * @returns osapaine [Pa]
 */
export function osapaine(T: number, RH: number): number {
  return (RH / 100) * pSat(T);
}

/**
 * Suhteellinen kosteus osapaineesta ja lämpötilasta.
 * @param p osapaine [Pa]
 * @param T lämpötila [°C]
 * @returns suhteellinen kosteus [%], rajattu välille 0…100
 */
export function suhteellinenKosteus(p: number, T: number): number {
  const ps = pSat(T);
  if (ps <= 0) return 0;
  return Math.min(100, Math.max(0, (p / ps) * 100));
}

/**
 * Absoluuttinen kosteus (kosteussisältö) x.
 * @param p vesihöyryn osapaine [Pa]
 * @param pTot kokonaisilmanpaine [Pa]
 * @returns kosteussisältö [g vettä / kg kuivaa ilmaa]
 */
export function absoluuttinenKosteus(p: number, pTot: number = P_ILMAKEHA): number {
  return (622 * p) / (pTot - p);
}

/**
 * Vesihöyryn tiheys ilmassa (ns. absoluuttinen kosteus tilavuutta kohti).
 * @param p vesihöyryn osapaine [Pa]
 * @param T lämpötila [°C]
 * @returns vesihöyryn määrä [g/m³]
 */
export function hoyrynTiheys(p: number, T: number): number {
  // Ideaalikaasulaki: ρ = p / (R_v · T), R_v = 461,5 J/(kg·K)
  return (p / (461.5 * (T + 273.15))) * 1000;
}
