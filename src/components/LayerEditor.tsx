/** Kerroslista: materiaalin valinta, paksuus, järjestely ja poisto. */

import { useState } from 'react';
import { kerroksenR, kerroksenSd } from '../lib/thermal';
import type { Kerros, Materiaali } from '../lib/types';
import { MaterialPicker } from './MaterialPicker';

interface Props {
  kerrokset: Kerros[];
  materiaalit: Materiaali[];
  hakemisto: Map<string, Materiaali>;
  muuta: (kerrokset: Kerros[]) => void;
}

let seuraavaId = 0;
const uusiId = () => `kerros-${Date.now().toString(36)}-${seuraavaId++}`;

export function LayerEditor({ kerrokset, materiaalit, hakemisto, muuta }: Props) {
  const [lisaysAuki, setLisaysAuki] = useState(false);
  const [vaihdettava, setVaihdettava] = useState<string | null>(null);

  const paivita = (id: string, muutos: Partial<Kerros>) => {
    muuta(kerrokset.map((k) => (k.id === id ? { ...k, ...muutos } : k)));
  };

  const poista = (id: string) => muuta(kerrokset.filter((k) => k.id !== id));

  const siirra = (index: number, suunta: -1 | 1) => {
    const kohde = index + suunta;
    if (kohde < 0 || kohde >= kerrokset.length) return;
    const kopio = [...kerrokset];
    [kopio[index], kopio[kohde]] = [kopio[kohde], kopio[index]];
    muuta(kopio);
  };

  const lisaa = (materiaali: Materiaali) => {
    muuta([
      ...kerrokset,
      { id: uusiId(), materiaaliId: materiaali.id, paksuus: materiaali.oletusPaksuus },
    ]);
    setLisaysAuki(false);
  };

  return (
    <div className="kerroseditori">
      <div className="kerroseditori__otsikko">
        <h2>Rakenteen kerrokset</h2>
        <p className="ohje">Järjestys sisältä ulos.</p>
      </div>

      <ol className="kerroslista">
        {kerrokset.map((kerros, index) => {
          const materiaali = hakemisto.get(kerros.materiaaliId);
          if (!materiaali) return null;

          const R = kerroksenR(materiaali, kerros.paksuus);
          const sd = kerroksenSd(materiaali, kerros.paksuus);

          return (
            <li key={kerros.id} className="kerrosrivi">
              <span
                className="kerrosrivi__vari"
                style={{ background: materiaali.vari }}
                aria-hidden="true"
              />

              <div className="kerrosrivi__sisalto">
                <button
                  type="button"
                  className="kerrosrivi__nimi"
                  onClick={() => setVaihdettava(vaihdettava === kerros.id ? null : kerros.id)}
                  title="Vaihda materiaali"
                >
                  {materiaali.nimi}
                </button>

                <div className="kerrosrivi__arvot">
                  <label>
                    <input
                      type="number"
                      min={0.1}
                      step={materiaali.oletusPaksuus < 1 ? 0.1 : 1}
                      value={kerros.paksuus}
                      onChange={(e) =>
                        paivita(kerros.id, { paksuus: Math.max(0.1, Number(e.target.value)) })
                      }
                      aria-label={`${materiaali.nimi} paksuus millimetreinä`}
                    />
                    <span>mm</span>
                  </label>
                  <span className="kerrosrivi__tunnus" title="Lämpövastus">
                    R {R.toFixed(2)}
                  </span>
                  <span className="kerrosrivi__tunnus" title="Vesihöyryn diffuusiovastus">
                    s<sub>d</sub> {sd < 1 ? sd.toFixed(3) : sd.toFixed(1)} m
                  </span>
                </div>
              </div>

              <div className="kerrosrivi__napit">
                <button type="button" onClick={() => siirra(index, -1)} disabled={index === 0} title="Siirrä sisemmäs">
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => siirra(index, 1)}
                  disabled={index === kerrokset.length - 1}
                  title="Siirrä ulommas"
                >
                  ↓
                </button>
                <button type="button" onClick={() => poista(kerros.id)} title="Poista kerros">
                  ✕
                </button>
              </div>

              {vaihdettava === kerros.id && (
                <div className="kerrosrivi__valitsin">
                  <MaterialPicker
                    materiaalit={materiaalit}
                    valitse={(m) => {
                      paivita(kerros.id, { materiaaliId: m.id });
                      setVaihdettava(null);
                    }}
                    sulje={() => setVaihdettava(null)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {lisaysAuki ? (
        <MaterialPicker
          materiaalit={materiaalit}
          valitse={lisaa}
          sulje={() => setLisaysAuki(false)}
        />
      ) : (
        <button type="button" className="nappi nappi--leveä" onClick={() => setLisaysAuki(true)}>
          + Lisää kerros
        </button>
      )}
    </div>
  );
}
