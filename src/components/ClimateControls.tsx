/** Sisä- ja ulkopuolen olosuhteiden säätö sekä valmiit esiasetukset. */

import type { OlosuhdePreset } from '../lib/materials';
import { absoluuttinenKosteus, kastepiste, osapaine } from '../lib/psychrometrics';
import type { Olosuhde } from '../lib/types';

interface Props {
  otsikko: string;
  olosuhde: Olosuhde;
  muuta: (olosuhde: Olosuhde) => void;
  presetit: OlosuhdePreset[];
  lampoRaja: [number, number];
}

export function ClimateControls({ otsikko, olosuhde, muuta, presetit, lampoRaja }: Props) {
  const p = osapaine(olosuhde.T, olosuhde.RH);
  const Tdp = kastepiste(p);

  return (
    <fieldset className="olosuhde">
      <legend>{otsikko}</legend>

      <label className="liuku">
        <span className="liuku__nimi">Lämpötila</span>
        <input
          type="range"
          min={lampoRaja[0]}
          max={lampoRaja[1]}
          step={0.5}
          value={olosuhde.T}
          onChange={(e) => muuta({ ...olosuhde, T: Number(e.target.value) })}
        />
        <input
          type="number"
          className="liuku__luku"
          min={lampoRaja[0]}
          max={lampoRaja[1]}
          step={0.5}
          value={olosuhde.T}
          onChange={(e) => muuta({ ...olosuhde, T: Number(e.target.value) })}
          aria-label={`${otsikko} lämpötila`}
        />
        <span className="liuku__yksikko">°C</span>
      </label>

      <label className="liuku">
        <span className="liuku__nimi">Suht. kosteus</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={olosuhde.RH}
          onChange={(e) => muuta({ ...olosuhde, RH: Number(e.target.value) })}
        />
        <input
          type="number"
          className="liuku__luku"
          min={0}
          max={100}
          step={1}
          value={olosuhde.RH}
          onChange={(e) =>
            muuta({ ...olosuhde, RH: Math.min(100, Math.max(0, Number(e.target.value))) })
          }
          aria-label={`${otsikko} suhteellinen kosteus`}
        />
        <span className="liuku__yksikko">%</span>
      </label>

      <dl className="olosuhde__johdetut">
        <div>
          <dt>Kastepiste</dt>
          <dd>{Tdp.toFixed(1)} °C</dd>
        </div>
        <div>
          <dt>Osapaine</dt>
          <dd>{p.toFixed(0)} Pa</dd>
        </div>
        <div>
          <dt>Kosteussisältö</dt>
          <dd>{absoluuttinenKosteus(p).toFixed(1)} g/kg</dd>
        </div>
      </dl>

      <div className="olosuhde__presetit">
        {presetit.map((preset) => (
          <button
            key={preset.nimi}
            type="button"
            className={
              preset.T === olosuhde.T && preset.RH === olosuhde.RH
                ? 'siru siru--valittu'
                : 'siru'
            }
            onClick={() => muuta({ T: preset.T, RH: preset.RH })}
          >
            {preset.nimi}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
