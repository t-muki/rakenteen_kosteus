/** Numeeriset tulokset: tunnusluvut, varoitukset ja kerrosrajojen taulukko. */

import type { Tulos } from '../lib/types';

interface Props {
  tulos: Tulos;
}

export function ResultsPanel({ tulos }: Props) {
  const kondenssia = tulos.kondenssiTasot.length > 0;

  return (
    <div className="tulokset">
      <div className={kondenssia ? 'tilanne tilanne--riski' : 'tilanne tilanne--ok'}>
        <strong>
          {kondenssia
            ? 'Rakenteeseen tiivistyy kosteutta'
            : 'Rakenteeseen ei tiivisty kosteutta'}
        </strong>
        {kondenssia ? (
          <ul>
            {tulos.kondenssiTasot.map((taso, i) => (
              <li key={i}>
                {taso.sijainti}: {taso.gcVrk.toFixed(2)} g/(m²·vrk), lämpötila{' '}
                {taso.T.toFixed(1)} °C
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Vesihöyryn osapaine pysyy kyllästyspaineen alapuolella koko rakenteen läpi näillä
            olosuhteilla.
          </p>
        )}
      </div>

      <dl className="tunnusluvut">
        <div>
          <dt>U-arvo</dt>
          <dd>{tulos.U.toFixed(3)} W/(m²·K)</dd>
        </div>
        <div>
          <dt>Kokonaisvastus R</dt>
          <dd>{tulos.Rtot.toFixed(2)} m²·K/W</dd>
        </div>
        <div>
          <dt>Lämpövirta q</dt>
          <dd>{tulos.q.toFixed(1)} W/m²</dd>
        </div>
        <div>
          <dt>Paksuus</dt>
          <dd>{(tulos.paksuus * 1000).toFixed(0)} mm</dd>
        </div>
        <div>
          <dt>Diffuusiovastus s_d</dt>
          <dd>{tulos.sdTot.toFixed(2)} m</dd>
        </div>
        <div>
          <dt>Diffuusiovuo</dt>
          <dd>{tulos.diffuusioVuo.toFixed(2)} g/(m²·vrk)</dd>
        </div>
        <div>
          <dt>Sisäpinnan lämpötila</dt>
          <dd>{tulos.Tsi.toFixed(1)} °C</dd>
        </div>
        <div>
          <dt>Sisäpinnan RH</dt>
          <dd>{tulos.RHsi.toFixed(0)} %</dd>
        </div>
        <div>
          <dt>Lämpötilaindeksi f_Rsi</dt>
          <dd>{tulos.fRsi.toFixed(2)}</dd>
        </div>
      </dl>

      {tulos.varoitukset.length > 0 && (
        <ul className="varoitukset">
          {tulos.varoitukset.map((varoitus) => (
            <li key={varoitus}>{varoitus}</li>
          ))}
        </ul>
      )}

      <details className="solmutaulukko">
        <summary>Arvot kerrosrajoilla</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Kohta</th>
              <th scope="col">x [mm]</th>
              <th scope="col">T [°C]</th>
              <th scope="col">T_kaste [°C]</th>
              <th scope="col">p [Pa]</th>
              <th scope="col">p_sat [Pa]</th>
              <th scope="col">RH [%]</th>
            </tr>
          </thead>
          <tbody>
            {tulos.solmut.map((solmu, i) => (
              <tr key={i} className={solmu.Tdp > solmu.T ? 'rivi--riski' : undefined}>
                <th scope="row">{solmu.nimi}</th>
                <td>{(solmu.x * 1000).toFixed(0)}</td>
                <td>{solmu.T.toFixed(1)}</td>
                <td>{solmu.Tdp.toFixed(1)}</td>
                <td>{solmu.p.toFixed(0)}</td>
                <td>{solmu.pSat.toFixed(0)}</td>
                <td>{solmu.RH.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
