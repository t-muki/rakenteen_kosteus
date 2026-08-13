import { describe, expect, it } from 'vitest';
import { kerroksenR, kerroksenSd, kokonaisR, laskeKerrokset, uArvo } from '../thermal';
import type { Kerros, Materiaali } from '../types';

const villa: Materiaali = {
  id: 'villa',
  nimi: 'Villa',
  kategoria: 'eriste',
  lambda: 0.04,
  mu: 1,
  rho: 30,
  c: 1030,
  oletusPaksuus: 100,
  vari: '#fff',
  lahde: 'testi',
};

const betoni: Materiaali = {
  ...villa,
  id: 'betoni',
  nimi: 'Betoni',
  kategoria: 'massiivinen',
  lambda: 2.0,
  mu: 100,
};

const kalvo: Materiaali = {
  ...villa,
  id: 'kalvo',
  nimi: 'Höyrynsulku',
  kategoria: 'kalvo',
  lambda: 0.33,
  mu: 100000,
  sd: 100,
};

const rako: Materiaali = {
  ...villa,
  id: 'rako',
  nimi: 'Tuulettuva rako',
  kategoria: 'ilmarako',
  rFixed: 0,
  sd: 0.01,
  tuulettuva: true,
};

const hakemisto = new Map<string, Materiaali>([
  [villa.id, villa],
  [betoni.id, betoni],
  [kalvo.id, kalvo],
  [rako.id, rako],
]);

const kerros = (materiaaliId: string, paksuus: number): Kerros => ({
  id: `${materiaaliId}-${paksuus}`,
  materiaaliId,
  paksuus,
});

describe('kerroksen lämpövastus', () => {
  it('on d/λ', () => {
    // 200 mm villaa, λ = 0,04 → R = 0,2/0,04 = 5,0
    expect(kerroksenR(villa, 200)).toBeCloseTo(5.0, 10);
    // 150 mm betonia, λ = 2,0 → R = 0,075
    expect(kerroksenR(betoni, 150)).toBeCloseTo(0.075, 10);
  });

  it('käyttää kiinteää arvoa jos se on annettu', () => {
    expect(kerroksenR(rako, 25)).toBe(0);
  });
});

describe('kerroksen diffuusiovastus', () => {
  it('on μ·d', () => {
    expect(kerroksenSd(betoni, 150)).toBeCloseTo(15, 10);
    expect(kerroksenSd(villa, 200)).toBeCloseTo(0.2, 10);
  });

  it('käyttää kalvon kiinteää s_d-arvoa', () => {
    expect(kerroksenSd(kalvo, 0.2)).toBe(100);
  });
});

describe('U-arvo', () => {
  it('vastaa käsin laskettua kolmikerrosrakennetta', () => {
    // 13 mm kipsi (λ 0,25) + 200 mm villa (λ 0,04) + 80 mm betoni (λ 2,0)
    const kipsi: Materiaali = { ...villa, id: 'kipsi', lambda: 0.25, mu: 10 };
    const kartta = new Map(hakemisto);
    kartta.set(kipsi.id, kipsi);

    const kerrokset = laskeKerrokset(
      [kerros('kipsi', 13), kerros('villa', 200), kerros('betoni', 80)],
      kartta,
    );

    // R = 0,13 + 0,013/0,25 + 0,2/0,04 + 0,08/2,0 + 0,04
    const odotettuR = 0.13 + 0.052 + 5.0 + 0.04 + 0.04;
    const Rtot = kokonaisR(kerrokset, 0.13, 0.04);
    expect(Rtot).toBeCloseTo(odotettuR, 10);
    expect(uArvo(Rtot)).toBeCloseTo(1 / odotettuR, 10);
    expect(uArvo(Rtot)).toBeCloseTo(0.19, 3);
  });
});

describe('kumulatiiviset koordinaatit', () => {
  it('kasvavat kerroksittain', () => {
    const kerrokset = laskeKerrokset([kerros('villa', 100), kerros('betoni', 150)], hakemisto);
    expect(kerrokset[0].xAlku).toBe(0);
    expect(kerrokset[0].xLoppu).toBeCloseTo(0.1, 10);
    expect(kerrokset[1].xAlku).toBeCloseTo(0.1, 10);
    expect(kerrokset[1].xLoppu).toBeCloseTo(0.25, 10);
    expect(kerrokset[1].sdLoppu).toBeCloseTo(0.1 + 15, 10);
  });

  it('ohittaa tuntemattomat materiaalit', () => {
    const kerrokset = laskeKerrokset(
      [kerros('villa', 100), kerros('ei-olemassa', 50)],
      hakemisto,
    );
    expect(kerrokset).toHaveLength(1);
  });
});

describe('tuulettuva ilmarako', () => {
  it('rajaa itsensä ja ulkopuoliset kerrokset laskennan ulkopuolelle', () => {
    const kerrokset = laskeKerrokset(
      [kerros('villa', 200), kerros('rako', 25), kerros('betoni', 80)],
      hakemisto,
    );

    expect(kerrokset.map((k) => k.mukanaLaskennassa)).toEqual([true, false, false]);
    // Vain villan lämpövastus jää mukaan.
    expect(kokonaisR(kerrokset, 0.13, 0.04)).toBeCloseTo(0.13 + 5.0 + 0.04, 10);
    // Kerrospaksuudet säilyvät piirtoa varten.
    expect(kerrokset[2].xLoppu).toBeCloseTo(0.305, 10);
  });
});
