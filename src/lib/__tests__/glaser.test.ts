import { describe, expect, it } from 'vitest';
import { laske } from '../calculate';
import {
  alempiKonveksiVerhokayra,
  kondenssiVuot,
  lineaarinenPaine,
  paineMurtoviivalla,
} from '../glaser';
import { osapaine, pSat } from '../psychrometrics';
import type { Kerros, Materiaali, Rakenne } from '../types';

describe('alempi konveksi verhokäyrä', () => {
  it('pudottaa yläpuolelle jäävän pisteen', () => {
    const kuori = alempiKonveksiVerhokayra([
      { sd: 0, p: 0 },
      { sd: 1, p: 10 },
      { sd: 2, p: 0 },
    ]);
    expect(kuori).toEqual([
      { sd: 0, p: 0 },
      { sd: 2, p: 0 },
    ]);
  });

  it('säilyttää alapuolelle painuvan pisteen', () => {
    const kuori = alempiKonveksiVerhokayra([
      { sd: 0, p: 10 },
      { sd: 1, p: 2 },
      { sd: 2, p: 8 },
    ]);
    expect(kuori).toHaveLength(3);
  });

  it('jättää suoralla olevat välipisteet pois', () => {
    const kuori = alempiKonveksiVerhokayra([
      { sd: 0, p: 10 },
      { sd: 1, p: 5 },
      { sd: 2, p: 0 },
    ]);
    expect(kuori).toHaveLength(2);
  });

  it('säilyttää lisäkentät kulmapisteissä', () => {
    const kuori = alempiKonveksiVerhokayra([
      { sd: 0, p: 10, nimi: 'a' },
      { sd: 1, p: 2, nimi: 'b' },
      { sd: 2, p: 8, nimi: 'c' },
    ]);
    expect(kuori[1].nimi).toBe('b');
  });
});

describe('paine murtoviivalla', () => {
  it('interpoloi lineaarisesti segmentin sisällä', () => {
    const viiva = [
      { sd: 0, p: 1000 },
      { sd: 2, p: 200 },
    ];
    expect(paineMurtoviivalla(viiva, 1)).toBeCloseTo(600, 10);
    expect(paineMurtoviivalla(viiva, 0)).toBe(1000);
    expect(paineMurtoviivalla(viiva, 2)).toBeCloseTo(200, 10);
  });

  it('rajautuu päätearvoihin alueen ulkopuolella', () => {
    const viiva = [
      { sd: 1, p: 900 },
      { sd: 2, p: 100 },
    ];
    expect(paineMurtoviivalla(viiva, 0)).toBe(900);
    expect(paineMurtoviivalla(viiva, 5)).toBe(100);
  });
});

describe('lineaarinen paine', () => {
  it('jakautuu tasaisesti diffuusiovastuksen suhteen', () => {
    expect(lineaarinenPaine(0, 10, 1200, 200)).toBeCloseTo(1200, 10);
    expect(lineaarinenPaine(5, 10, 1200, 200)).toBeCloseTo(700, 10);
    expect(lineaarinenPaine(10, 10, 1200, 200)).toBeCloseTo(200, 10);
  });
});

describe('kondenssivuot', () => {
  it('ovat nollia suoralla viivalla', () => {
    const vuot = kondenssiVuot([
      { sd: 0, p: 1000 },
      { sd: 1, p: 600 },
      { sd: 2, p: 200 },
    ]);
    expect(vuot[1]).toBeCloseTo(0, 20);
  });

  it('ovat positiivisia taitepisteessä, jossa vuo hidastuu', () => {
    // Jyrkkä lasku sisään, loiva ulos → kohtaan kertyy vettä.
    const vuot = kondenssiVuot([
      { sd: 0, p: 1000 },
      { sd: 1, p: 300 },
      { sd: 2, p: 200 },
    ]);
    expect(vuot[1]).toBeGreaterThan(0);
  });
});

// --- Koko laskennan tarkastelu realistisilla rakenteilla ---

const materiaalit: Materiaali[] = [
  {
    id: 'kipsi',
    nimi: 'Kipsilevy',
    kategoria: 'levy',
    lambda: 0.25,
    mu: 10,
    rho: 900,
    c: 1000,
    oletusPaksuus: 13,
    vari: '#eee',
    lahde: 'testi',
  },
  {
    id: 'villa',
    nimi: 'Mineraalivilla',
    kategoria: 'eriste',
    lambda: 0.036,
    mu: 1,
    rho: 30,
    c: 1030,
    oletusPaksuus: 100,
    vari: '#fd0',
    lahde: 'testi',
  },
  {
    id: 'hoyrynsulku',
    nimi: 'Höyrynsulku',
    kategoria: 'kalvo',
    lambda: 0.33,
    mu: 100000,
    rho: 980,
    c: 1800,
    sd: 100,
    oletusPaksuus: 0.2,
    vari: '#00f',
    lahde: 'testi',
  },
  {
    id: 'hirsi',
    nimi: 'Hirsi',
    kategoria: 'puu',
    lambda: 0.12,
    mu: 40,
    rho: 500,
    c: 1600,
    oletusPaksuus: 200,
    vari: '#d3a05e',
    lahde: 'testi',
  },
  {
    id: 'teraslevy',
    nimi: 'Teräsohutlevy',
    kategoria: 'kalvo',
    lambda: 50,
    mu: 1000000,
    rho: 7800,
    c: 450,
    sd: 1500,
    oletusPaksuus: 0.6,
    vari: '#999',
    lahde: 'testi',
  },
  {
    id: 'tuulensuoja',
    nimi: 'Tuulensuojalevy',
    kategoria: 'levy',
    lambda: 0.05,
    mu: 5,
    rho: 250,
    c: 1700,
    oletusPaksuus: 12,
    vari: '#cb9',
    lahde: 'testi',
  },
];

const hakemisto = new Map(materiaalit.map((m) => [m.id, m]));

const kerros = (materiaaliId: string, paksuus: number): Kerros => ({
  id: `${materiaaliId}-${paksuus}`,
  materiaaliId,
  paksuus,
});

const talviRakenne = (kerrokset: Kerros[]): Rakenne => ({
  nimi: 'testi',
  tyyppi: 'seina',
  kerrokset,
  sisa: { T: 21, RH: 50 },
  ulko: { T: -10, RH: 90 },
});

describe('laske — talvitilanne', () => {
  it('ei tuota kondenssia kun sisäpuolella on höyrynsulku', () => {
    const tulos = laske(
      talviRakenne([
        kerros('kipsi', 13),
        kerros('hoyrynsulku', 0.2),
        kerros('villa', 200),
        kerros('tuulensuoja', 12),
      ]),
      hakemisto,
    );

    expect(tulos.kondenssiTasot).toHaveLength(0);
    expect(tulos.kondenssiAlueet).toHaveLength(0);
    expect(tulos.kondenssiYhteensa).toBe(0);
  });

  it('tuottaa kondenssia eristeen ulko-osassa ilman höyrynsulkua', () => {
    const tulos = laske(
      talviRakenne([kerros('kipsi', 13), kerros('villa', 200), kerros('tuulensuoja', 12)]),
      hakemisto,
    );

    expect(tulos.kondenssiTasot.length).toBeGreaterThan(0);
    expect(tulos.kondenssiYhteensa).toBeGreaterThan(0);

    // Kondenssi osuu rakenteen kylmään ulko-osaan, ei sisäpintaan.
    const taso = tulos.kondenssiTasot[0];
    expect(taso.x / tulos.paksuus).toBeGreaterThan(0.5);
    expect(taso.T).toBeLessThan(tulos.Tsi);
  });

  it('löytää kondenssialueen kerroksen sisältä, ei vain rajapinnoilta', () => {
    // Yhtenäinen 250 mm villakerros: kondenssi alkaa keskeltä kerrosta, joten
    // pelkkien rajapintojen tarkastelu ei riittäisi sen havaitsemiseen.
    const tulos = laske(
      {
        nimi: 'testi',
        tyyppi: 'seina',
        kerrokset: [kerros('villa', 250)],
        sisa: { T: 21, RH: 60 },
        ulko: { T: -10, RH: 90 },
      },
      hakemisto,
    );

    expect(tulos.kondenssiAlueet.length).toBeGreaterThan(0);
    const alue = tulos.kondenssiAlueet[0];
    expect(alue.xLoppu).toBeGreaterThan(alue.xAlku);
    // Alue alkaa selvästi kerroksen sisältä, ei sisäpinnasta.
    expect(alue.xAlku).toBeGreaterThan(0.05);
    expect(alue.xAlku).toBeLessThan(0.25);
  });
});

describe('laske — kondenssitasojen yhdistäminen', () => {
  it('kokoaa yhtenäisen tiivistymisvyöhykkeen yhdeksi tasoksi', () => {
    // Kaareva kyllästyskäyrä tuottaa verhokäyrään useita peräkkäisiä
    // taitepisteitä; ne kuuluvat samaan vyöhykkeeseen eivätkä ole erillisiä.
    const tulos = laske(
      {
        nimi: 'testi',
        tyyppi: 'seina',
        kerrokset: [kerros('kipsi', 13), kerros('villa', 100), kerros('tuulensuoja', 200)],
        sisa: { T: 21, RH: 50 },
        ulko: { T: -26, RH: 90 },
      },
      hakemisto,
    );

    expect(tulos.kondenssiTasot.length).toBeGreaterThan(0);
    expect(tulos.kondenssiTasot.length).toBeLessThanOrEqual(2);

    for (const taso of tulos.kondenssiTasot) {
      expect(taso.xAlku).toBeLessThanOrEqual(taso.x);
      expect(taso.x).toBeLessThanOrEqual(taso.xLoppu);
    }
  });

  it('säilyttää kokonaiskondenssimäärän yhdistämisessä', () => {
    const tulos = laske(
      talviRakenne([kerros('kipsi', 13), kerros('villa', 200), kerros('tuulensuoja', 12)]),
      hakemisto,
    );

    const summa = tulos.kondenssiTasot.reduce((s, t) => s + t.gcVrk, 0);
    expect(summa).toBeCloseTo(tulos.kondenssiYhteensa, 10);
    expect(summa).toBeGreaterThan(0);
  });
});

describe('laske — höyrynsulun vaikutus näkyy kastepistekäyrässä (issue #1)', () => {
  // Kun rakenteen ulko-osassa on höyrynsulkua tiiviimpi kerros, höyrynsulun
  // osuus kokonaisdiffuusiovastuksesta jää pieneksi. Kastepistekäyrän on silti
  // pudottava höyrynsulun kohdalla, koska höyryvirta katkeaa siinä.
  const tiivisUlkokuori = (hoyrynsulku: boolean): Kerros[] =>
    [
      kerros('kipsi', 13),
      ...(hoyrynsulku ? [kerros('hoyrynsulku', 0.2)] : []),
      kerros('villa', 200),
      kerros('tuulensuoja', 12),
      kerros('teraslevy', 0.6),
    ].filter(Boolean);

  const kylma: Rakenne['sisa'] = { T: 21, RH: 40 };

  const laskeTapaus = (hoyrynsulku: boolean) =>
    laske(
      {
        nimi: 'testi',
        tyyppi: 'seina',
        kerrokset: tiivisUlkokuori(hoyrynsulku),
        sisa: kylma,
        ulko: { T: -26, RH: 90 },
      },
      hakemisto,
    );

  it('kastepiste putoaa jyrkästi höyrynsulun yli', () => {
    const tulos = laskeTapaus(true);
    const sisapuoli = tulos.profiili.find((p) => p.x < 0.013)!;
    const ulkopuoli = tulos.profiili.find((p) => p.x > 0.014)!;

    // Ennen höyrynsulkua kastepiste on sisäilman tasolla, sen jälkeen selvästi alempi.
    expect(sisapuoli.Tdp).toBeGreaterThan(5);
    expect(ulkopuoli.Tdp).toBeLessThan(sisapuoli.Tdp - 10);
  });

  it('höyrynsulku vähentää kondenssia merkittävästi', () => {
    const kanssa = laskeTapaus(true);
    const ilman = laskeTapaus(false);

    expect(ilman.kondenssiYhteensa).toBeGreaterThan(kanssa.kondenssiYhteensa * 10);
  });

  it('kastepiste on aina lämpötilan alapuolella tai yhtä suuri', () => {
    for (const tulos of [laskeTapaus(true), laskeTapaus(false)]) {
      for (const piste of tulos.profiili) {
        expect(piste.Tdp).toBeLessThanOrEqual(piste.T + 1e-6);
      }
    }
  });

  it('tiivistymisvyöhyke rajautuu kohtiin, joissa kosteus on kyllästystilassa', () => {
    const tulos = laskeTapaus(true);
    expect(tulos.kondenssiAlueet.length).toBeGreaterThan(0);

    for (const piste of tulos.profiili) {
      const vyohykkeella = tulos.kondenssiAlueet.some(
        (a) => piste.x >= a.xAlku - 1e-9 && piste.x <= a.xLoppu + 1e-9,
      );
      if (vyohykkeella) {
        expect(piste.RH).toBeCloseTo(100, 3);
        expect(piste.Tdp).toBeCloseTo(piste.T, 3);
      }
    }
  });
});

describe('laske — tulosten johdonmukaisuus ja herkkyys', () => {
  const kuivaRakenne = (sisa: Rakenne['sisa'], ulko: Rakenne['ulko']): Rakenne => ({
    nimi: 'testi',
    tyyppi: 'seina',
    kerrokset: [
      kerros('kipsi', 13),
      kerros('hoyrynsulku', 0.2),
      kerros('villa', 200),
      kerros('tuulensuoja', 12),
    ],
    sisa,
    ulko,
  });

  it('ei ilmoita kondenssia toimivassa rakenteessa millään talviolosuhteella', () => {
    for (const ulkoT of [-30, -26, -20, -10, -5, 0, 5]) {
      const tulos = laske(kuivaRakenne({ T: 21, RH: 40 }, { T: ulkoT, RH: 90 }), hakemisto);
      expect(tulos.kondenssiTasot, `ulkolämpötila ${ulkoT} °C`).toHaveLength(0);
      expect(tulos.kondenssiAlueet, `ulkolämpötila ${ulkoT} °C`).toHaveLength(0);
    }
  });

  it('ei ilmoita kondenssia tavanomaisessa kesätilanteessa', () => {
    for (const ulkoT of [18, 22, 25]) {
      const tulos = laske(kuivaRakenne({ T: 21, RH: 45 }, { T: ulkoT, RH: 70 }), hakemisto);
      expect(tulos.kondenssiTasot, `ulkolämpötila ${ulkoT} °C`).toHaveLength(0);
    }
  });

  it('havaitsee kesäkondenssin, kun höyry virtaa ulkoa sisään', () => {
    // Kuuma ja kostea ulkoilma, viilennetty sisätila: höyrynsulku on nyt
    // rakenteen kylmällä puolella, ja kosteus tiivistyy sen ulkopintaan.
    const tulos = laske(kuivaRakenne({ T: 21, RH: 45 }, { T: 32, RH: 75 }), hakemisto);

    expect(tulos.pUlko).toBeGreaterThan(tulos.pSisa);
    expect(tulos.kondenssiTasot.length).toBeGreaterThan(0);
    // Tiivistyminen osuu höyrynsulun tuntumaan, rakenteen sisäosaan.
    expect(tulos.kondenssiTasot[0].x).toBeLessThan(0.05);
  });

  it('yhtenäinen tiivistymisalue raportoidaan yhtenä vyöhykkeenä', () => {
    // Yhtenäisessä kerroksessa verhokäyrä seuraa kaarevaa kyllästyskäyrää pitkän
    // matkaa; paloittainen approksimaatio ei saa pilkkoa aluetta useaksi.
    const tulos = laske(
      {
        nimi: 'testi',
        tyyppi: 'seina',
        kerrokset: [kerros('hirsi', 200)],
        sisa: { T: 24, RH: 70 },
        ulko: { T: -26, RH: 90 },
      },
      hakemisto,
    );

    expect(tulos.kondenssiAlueet).toHaveLength(1);
    expect(tulos.kondenssiTasot).toHaveLength(1);
    expect(tulos.kondenssiAlueet[0].xLoppu - tulos.kondenssiAlueet[0].xAlku).toBeGreaterThan(0.02);
  });

  it('jokaista tiivistymisvyöhykettä vastaa kondenssitaso', () => {
    const tapaukset: Rakenne[] = [
      kuivaRakenne({ T: 24, RH: 70 }, { T: -26, RH: 90 }),
      {
        nimi: 'ilman sulkua',
        tyyppi: 'seina',
        kerrokset: [kerros('kipsi', 13), kerros('villa', 200), kerros('tuulensuoja', 12)],
        sisa: { T: 21, RH: 50 },
        ulko: { T: -10, RH: 90 },
      },
      {
        nimi: 'hirsi',
        tyyppi: 'seina',
        kerrokset: [kerros('hirsi', 200)],
        sisa: { T: 24, RH: 70 },
        ulko: { T: -10, RH: 90 },
      },
    ];

    for (const rakenne of tapaukset) {
      const tulos = laske(rakenne, hakemisto);
      if (tulos.kondenssiAlueet.length > 0) {
        expect(tulos.kondenssiTasot.length, rakenne.nimi).toBeGreaterThan(0);
      }
      if (tulos.kondenssiTasot.length > 0) {
        expect(tulos.kondenssiAlueet.length, rakenne.nimi).toBeGreaterThan(0);
      }
    }
  });

  it('kondenssi kasvaa kun sisäilma kostuu', () => {
    const maarat = [30, 40, 50, 60, 70].map(
      (RH) =>
        laske(
          {
            nimi: 'testi',
            tyyppi: 'seina',
            kerrokset: [kerros('kipsi', 13), kerros('villa', 200), kerros('tuulensuoja', 12)],
            sisa: { T: 21, RH },
            ulko: { T: -10, RH: 90 },
          },
          hakemisto,
        ).kondenssiYhteensa,
    );

    for (let i = 1; i < maarat.length; i++) {
      expect(maarat[i]).toBeGreaterThanOrEqual(maarat[i - 1]);
    }
    expect(maarat[maarat.length - 1]).toBeGreaterThan(maarat[0]);
  });
});

describe('laske — profiilin sisäinen johdonmukaisuus', () => {
  const tulos = laske(
    talviRakenne([kerros('kipsi', 13), kerros('villa', 200), kerros('tuulensuoja', 12)]),
    hakemisto,
  );

  it('kastepistekäyrä yhtyy lämpötilakäyrään täsmälleen tiivistymisvyöhykkeellä', () => {
    let vyohykkeellaPisteita = 0;
    let vyohykkeenUlkopuolella = 0;

    for (const piste of tulos.profiili) {
      const vyohykkeella = tulos.kondenssiAlueet.some(
        (a) => piste.x >= a.xAlku - 1e-9 && piste.x <= a.xLoppu + 1e-9,
      );
      if (vyohykkeella) {
        vyohykkeellaPisteita++;
        expect(piste.Tdp).toBeCloseTo(piste.T, 3);
      } else {
        vyohykkeenUlkopuolella++;
        expect(piste.Tdp).toBeLessThan(piste.T + 1e-6);
      }
    }

    // Varmistetaan ettei tarkastelu jäänyt tyhjäksi kummassakaan haarassa.
    expect(vyohykkeellaPisteita).toBeGreaterThan(0);
    expect(vyohykkeenUlkopuolella).toBeGreaterThan(0);
  });

  it('korjattu osapaine ei ylitä kyllästyspainetta missään', () => {
    for (const piste of tulos.profiili) {
      expect(piste.p).toBeLessThanOrEqual(piste.pSat + 1e-6);
    }
  });

  it('lämpötila laskee monotonisesti sisältä ulos', () => {
    for (let i = 1; i < tulos.profiili.length; i++) {
      expect(tulos.profiili[i].T).toBeLessThanOrEqual(tulos.profiili[i - 1].T + 1e-9);
    }
  });

  it('osapaine laskee monotonisesti sisältä ulos', () => {
    for (let i = 1; i < tulos.profiili.length; i++) {
      expect(tulos.profiili[i].p).toBeLessThanOrEqual(tulos.profiili[i - 1].p + 1e-6);
    }
  });

  it('päätepisteet vastaavat ilman olosuhteita', () => {
    expect(tulos.profiili[0].T).toBeCloseTo(tulos.Tsi, 10);
    expect(tulos.profiili[tulos.profiili.length - 1].T).toBeCloseTo(tulos.Tse, 10);
    expect(tulos.pSisa).toBeCloseTo(osapaine(21, 50), 10);
    expect(tulos.pUlko).toBeCloseTo(osapaine(-10, 90), 10);
  });
});

describe('laske — reunatapaukset', () => {
  it('varoittaa tyhjästä rakenteesta kaatumatta', () => {
    const tulos = laske(talviRakenne([]), hakemisto);
    expect(tulos.varoitukset.length).toBeGreaterThan(0);
    expect(Number.isFinite(tulos.Rtot)).toBe(true);
  });

  it('tunnistaa sisäpinnan kondenssin', () => {
    // Erittäin kostea sisäilma ja heikosti eristetty rakenne.
    const tulos = laske(
      {
        nimi: 'testi',
        tyyppi: 'seina',
        kerrokset: [kerros('kipsi', 13)],
        sisa: { T: 21, RH: 90 },
        ulko: { T: -20, RH: 90 },
      },
      hakemisto,
    );

    expect(tulos.pSisa).toBeGreaterThan(pSat(tulos.Tsi));
    expect(tulos.varoitukset.some((v) => v.includes('Sisäpinnalle'))).toBe(true);
  });

  it('ei tuota kondenssia kesäolosuhteissa', () => {
    const tulos = laske(
      {
        nimi: 'testi',
        tyyppi: 'seina',
        kerrokset: [kerros('kipsi', 13), kerros('villa', 200), kerros('tuulensuoja', 12)],
        sisa: { T: 21, RH: 45 },
        ulko: { T: 22, RH: 65 },
      },
      hakemisto,
    );

    expect(tulos.kondenssiTasot).toHaveLength(0);
  });
});
