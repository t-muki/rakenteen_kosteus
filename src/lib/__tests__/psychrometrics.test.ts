import { describe, expect, it } from 'vitest';
import {
  absoluuttinenKosteus,
  kastepiste,
  osapaine,
  pSat,
  suhteellinenKosteus,
} from '../psychrometrics';

describe('kyllästyspaine', () => {
  // EN ISO 13788:n Magnus-approksimaatio poikkeaa taulukoiduista tarkoista
  // arvoista noin 0,1 %, joten vertailu tehdään suhteellisella toleranssilla.
  const lahella = (saatu: number, taulukko: number) => {
    expect(Math.abs(saatu - taulukko) / taulukko).toBeLessThan(0.005);
  };

  it('antaa taulukkoarvoja vastaavat tulokset', () => {
    expect(pSat(0)).toBeCloseTo(610.5, 1);
    lahella(pSat(10), 1228);
    lahella(pSat(20), 2339);
    lahella(pSat(25), 3169);
  });

  it('käyttää pakkaskaavaa nollan alapuolella', () => {
    lahella(pSat(-10), 260);
    // Kovassa pakkasessa standardin kaava eroaa jään yli mitatuista
    // taulukkoarvoista muutaman prosentin; tässä varmistetaan kaavan oma arvo.
    expect(pSat(-26)).toBeCloseTo(56.8, 1);
  });

  it('on käytännössä jatkuva nollan kohdalla', () => {
    expect(pSat(-0.001)).toBeCloseTo(pSat(0.001), 0);
  });

  it('kasvaa monotonisesti', () => {
    for (let T = -30; T < 40; T += 0.5) {
      expect(pSat(T + 0.5)).toBeGreaterThan(pSat(T));
    }
  });
});

describe('kastepiste', () => {
  it('on kyllästyspaineen käänteisfunktio', () => {
    for (const T of [-30, -20, -10, -0.5, 0, 5, 15, 21, 30, 40]) {
      expect(kastepiste(pSat(T))).toBeCloseTo(T, 6);
    }
  });

  // Kosteustaulukoista tarkistetut vertailuarvot tavanomaisille sisäilman tiloille.
  it('antaa 10,2 °C sisäilmalle 21 °C / 50 %', () => {
    expect(kastepiste(osapaine(21, 50))).toBeCloseTo(10.2, 1);
  });

  it('antaa 9,6 °C sisäilmalle 15 °C / 70 %', () => {
    expect(kastepiste(osapaine(15, 70))).toBeCloseTo(9.6, 1);
  });

  it('on aina lämpötilaa alempi kun RH < 100 %', () => {
    for (const T of [-15, 0, 10, 21, 30]) {
      expect(kastepiste(osapaine(T, 60))).toBeLessThan(T);
    }
  });

  it('on yhtä suuri kuin lämpötila kun RH = 100 %', () => {
    expect(kastepiste(osapaine(18, 100))).toBeCloseTo(18, 6);
  });
});

describe('absoluuttinen kosteus', () => {
  // Kosteusdiagrammista luettavat vertailuarvot.
  it('antaa 7,7 g/kg sisäilmalle 21 °C / 50 %', () => {
    expect(absoluuttinenKosteus(osapaine(21, 50))).toBeCloseTo(7.7, 1);
  });

  it('antaa 7,41 g/kg sisäilmalle 15 °C / 70 %', () => {
    expect(absoluuttinenKosteus(osapaine(15, 70))).toBeCloseTo(7.41, 1);
  });
});

describe('suhteellinen kosteus', () => {
  it('palauttaa lähtöarvon edestakaisin', () => {
    expect(suhteellinenKosteus(osapaine(21, 45), 21)).toBeCloseTo(45, 6);
  });

  it('rajataan sataan prosenttiin', () => {
    expect(suhteellinenKosteus(pSat(20) * 1.5, 20)).toBe(100);
  });
});
