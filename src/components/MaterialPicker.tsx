/** Materiaalin valinta: haku, kategoriaryhmittely ja arvojen esittely. */

import { useMemo, useState } from 'react';
import { KATEGORIA_JARJESTYS, KATEGORIA_NIMET } from '../lib/materials';
import { fiLuku } from '../lib/muotoile';
import type { Kategoria, Materiaali } from '../lib/types';

interface Props {
  materiaalit: Materiaali[];
  valitse: (materiaali: Materiaali) => void;
  sulje: () => void;
}

export function MaterialPicker({ materiaalit, valitse, sulje }: Props) {
  const [haku, setHaku] = useState('');

  const ryhmat = useMemo(() => {
    const suodatin = haku.trim().toLowerCase();
    const osuvat = suodatin
      ? materiaalit.filter(
          (m) =>
            m.nimi.toLowerCase().includes(suodatin) ||
            KATEGORIA_NIMET[m.kategoria].toLowerCase().includes(suodatin),
        )
      : materiaalit;

    const kartta = new Map<Kategoria, Materiaali[]>();
    for (const m of osuvat) {
      const lista = kartta.get(m.kategoria) ?? [];
      lista.push(m);
      kartta.set(m.kategoria, lista);
    }

    return KATEGORIA_JARJESTYS.filter((k) => kartta.has(k)).map((k) => ({
      kategoria: k,
      materiaalit: kartta.get(k)!,
    }));
  }, [materiaalit, haku]);

  return (
    <div className="valitsin">
      <div className="valitsin__haku">
        <input
          type="search"
          placeholder="Hae materiaalia…"
          value={haku}
          onChange={(e) => setHaku(e.target.value)}
          autoFocus
          aria-label="Hae materiaalia"
        />
        <button type="button" onClick={sulje} title="Sulje">
          ✕
        </button>
      </div>

      <div className="valitsin__lista">
        {ryhmat.length === 0 && <p className="ohje">Ei osumia haulla “{haku}”.</p>}

        {ryhmat.map(({ kategoria, materiaalit: lista }) => (
          <section key={kategoria}>
            <h4>{KATEGORIA_NIMET[kategoria]}</h4>
            {lista.map((m) => (
              <button
                key={m.id}
                type="button"
                className="valitsin__kohde"
                onClick={() => valitse(m)}
                title={m.lahde}
              >
                <span className="valitsin__vari" style={{ background: m.vari }} aria-hidden="true" />
                <span className="valitsin__nimi">{m.nimi}</span>
                <span className="valitsin__arvot">
                  λ {fiLuku(m.lambda)} ·{' '}
                  {m.sd !== undefined ? (
                    <>
                      s<sub>d</sub> {fiLuku(m.sd)} m
                    </>
                  ) : (
                    `μ ${m.mu}`
                  )}
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
