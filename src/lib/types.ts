/** Sovelluksen tietotyypit. */

export type Kategoria =
  | 'eriste'
  | 'massiivinen'
  | 'puu'
  | 'levy'
  | 'kalvo'
  | 'laasti'
  | 'ilmarako';

/** Rakennusmateriaalin rakennusfysikaaliset ominaisuudet. */
export interface Materiaali {
  id: string;
  nimi: string;
  kategoria: Kategoria;
  /** Lämmönjohtavuus λ [W/(m·K)] */
  lambda: number;
  /** Vesihöyryn diffuusiovastuskerroin μ [-]. Käytännössä ääretön esim. metallille. */
  mu: number;
  /** Tiheys ρ [kg/m³] */
  rho: number;
  /** Ominaislämpökapasiteetti c [J/(kg·K)] */
  c: number;
  /**
   * Kiinteä vesihöyryn diffuusion ekvivalentti ilmakerrospaksuus s_d [m].
   * Annetaan ohutkalvoille (höyrynsulut, tuulensuojakalvot), joilla μ·d ei ole
   * mielekäs suure. Jos tämä on asetettu, se korvaa laskennan μ·d.
   */
  sd?: number;
  /**
   * Kiinteä lämpövastus R [m²·K/W]. Annetaan ilmaraoille, joiden lämmönsiirto ei
   * noudata johtumista. Jos tämä on asetettu, se korvaa laskennan d/λ.
   */
  rFixed?: number;
  /**
   * Voimakkaasti tuulettuva ilmarako. EN ISO 6946 mukaan raon ja sen ulkopuolisten
   * kerrosten lämpövastukset jätetään huomiotta, ja raon sisäpinnalla käytetään
   * ulkopinnan pintavastusta — rako on käytännössä ulkoilmaa.
   */
  tuulettuva?: boolean;
  /** Oletuspaksuus [mm] kerrosta lisättäessä. */
  oletusPaksuus: number;
  /** Väri leikkauskuvassa. */
  vari: string;
  /** Lähdeviite arvoille. */
  lahde: string;
}

/** Yksi kerros rakenteessa. Kerrokset luetellaan sisältä ulospäin. */
export interface Kerros {
  /** Uniikki tunniste tässä rakenteessa (React-avain, järjestely). */
  id: string;
  materiaaliId: string;
  /** Paksuus [mm] */
  paksuus: number;
}

/** Ilman tila (lämpötila + suhteellinen kosteus). */
export interface Olosuhde {
  /** Lämpötila [°C] */
  T: number;
  /** Suhteellinen kosteus [%] */
  RH: number;
}

/** Rakennetyyppi määrää pintavastukset. */
export type RakenneTyyppi = 'seina' | 'ylapohja' | 'alapohja';

/** Koko laskennan syöte. */
export interface Rakenne {
  nimi: string;
  tyyppi: RakenneTyyppi;
  kerrokset: Kerros[];
  sisa: Olosuhde;
  ulko: Olosuhde;
}

/** Laskettu kerros: syötteen kerros yhdistettynä materiaaliin ja johdettuihin arvoihin. */
export interface LaskettuKerros {
  kerros: Kerros;
  materiaali: Materiaali;
  /** Paksuus [m] */
  d: number;
  /** Lämpövastus R [m²·K/W] */
  R: number;
  /** Diffuusiovastus s_d [m] */
  sd: number;
  /** Kerroksen alkureunan etäisyys sisäpinnasta [m] */
  xAlku: number;
  /** Kerroksen loppureunan etäisyys sisäpinnasta [m] */
  xLoppu: number;
  /** Kumulatiivinen s_d kerroksen alkureunassa [m] */
  sdAlku: number;
  /** Kumulatiivinen s_d kerroksen loppureunassa [m] */
  sdLoppu: number;
  /**
   * Onko kerros mukana lämpö- ja kosteuslaskennassa. Tuulettuva ilmarako ja sen
   * ulkopuoliset kerrokset jäävät laskennan ulkopuolelle (EN ISO 6946).
   */
  mukanaLaskennassa: boolean;
}

/** Yksi solmupiste profiilissa (kerrosraja tai pinta). */
export interface Solmu {
  /** Etäisyys sisäpinnasta [m] */
  x: number;
  /** Kumulatiivinen diffuusiovastus [m] */
  sd: number;
  /** Lämpötila [°C] */
  T: number;
  /** Kyllästyspaine [Pa] */
  pSat: number;
  /** Todellinen vesihöyryn osapaine [Pa] */
  p: number;
  /** Kastepistelämpötila [°C] */
  Tdp: number;
  /** Suhteellinen kosteus [%] */
  RH: number;
  /** Selite, esim. kerrosraja tai pinta. */
  nimi: string;
}

/**
 * Kondenssitaso: kohta rakenteessa, jossa vesihöyry tiivistyy. Kun kyllästyskäyrä
 * on loivasti kaareva, tiivistyminen jakautuu vyöhykkeelle yhden pisteen sijaan —
 * vierekkäiset taitepisteet on koottu yhdeksi tasoksi, jonka laajuus on
 * `xAlku…xLoppu` ja `x` sen voimakkain kohta.
 */
export interface KondenssiTaso {
  /** Etäisyys sisäpinnasta, vyöhykkeen voimakkain kohta [m] */
  x: number;
  /** Vyöhykkeen alkureuna [m] */
  xAlku: number;
  /** Vyöhykkeen loppureuna [m] */
  xLoppu: number;
  /** Kumulatiivinen diffuusiovastus [m] */
  sd: number;
  /** Lämpötila kondenssitasolla [°C] */
  T: number;
  /** Kondenssivuo [kg/(m²·s)] */
  gc: number;
  /** Kondenssimäärä [g/(m²·vrk)] */
  gcVrk: number;
  /** Selite kerroksesta/rajapinnasta, jossa taso sijaitsee. */
  sijainti: string;
}

/** Yhtenäinen alue, jolla p > p_sat lineaarisella profiililla (piirtoa varten). */
export interface KondenssiAlue {
  xAlku: number;
  xLoppu: number;
  sdAlku: number;
  sdLoppu: number;
}

/**
 * Tiheän piirtoprofiilin yksittäinen piste. Kerrosrajojen lisäksi kerrosten
 * sisältä otetaan näytteitä, jotta kondenssi havaitaan myös kerroksen sisällä
 * eikä vain rajapinnoilla.
 */
export interface ProfiiliPiste {
  /** Etäisyys sisäpinnasta [m] */
  x: number;
  /** Kumulatiivinen diffuusiovastus [m] */
  sd: number;
  /** Lämpötila [°C] */
  T: number;
  /** Kyllästyspaine [Pa] */
  pSat: number;
  /** Höyryn osapaine ilman kondenssia, lineaarinen s_d:n suhteen [Pa] */
  pLin: number;
  /** Höyryn osapaine kondenssi huomioiden (Glaserin konveksi verhokäyrä) [Pa] */
  p: number;
  /** Kastepistelämpötila pLin:stä laskettuna [°C] */
  Tdp: number;
  /** Suhteellinen kosteus korjatusta osapaineesta [%] */
  RH: number;
}

/** Koko laskennan tulos. */
export interface Tulos {
  kerrokset: LaskettuKerros[];
  /** Sisäpinnan pintavastus [m²·K/W] */
  Rsi: number;
  /** Ulkopinnan pintavastus [m²·K/W] */
  Rse: number;
  /** Kokonaislämpövastus [m²·K/W] */
  Rtot: number;
  /** Lämmönläpäisykerroin U [W/(m²·K)] */
  U: number;
  /** Lämpövirran tiheys q [W/m²] */
  q: number;
  /** Kokonaisdiffuusiovastus [m] */
  sdTot: number;
  /** Rakenteen kokonaispaksuus [m] */
  paksuus: number;
  /** Sisäpinnan lämpötila [°C] */
  Tsi: number;
  /** Ulkopinnan lämpötila [°C] */
  Tse: number;
  /** Sisäilman höyryn osapaine [Pa] */
  pSisa: number;
  /** Ulkoilman höyryn osapaine [Pa] */
  pUlko: number;
  /** Solmupisteet sisältä ulos (pinnat mukaan lukien). */
  solmut: Solmu[];
  /** Tiheä profiili piirtoa varten. */
  profiili: ProfiiliPiste[];
  /** Löydetyt kondenssitasot. */
  kondenssiTasot: KondenssiTaso[];
  /** Alueet, joilla ilman kondenssia laskettu p ylittäisi p_sat:n. */
  kondenssiAlueet: KondenssiAlue[];
  /** Kokonaiskondenssimäärä [g/(m²·vrk)] */
  kondenssiYhteensa: number;
  /** Diffuusiovuo rakenteen läpi ilman kondenssia [g/(m²·vrk)] */
  diffuusioVuo: number;
  /** Sisäpinnan suhteellinen kosteus [%] — homeriskin arviointiin. */
  RHsi: number;
  /** Lämpötilaindeksi fRsi [-] */
  fRsi: number;
  /** Varoitukset käyttäjälle. */
  varoitukset: string[];
}
