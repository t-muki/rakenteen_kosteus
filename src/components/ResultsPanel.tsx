/** Numeeriset tulokset: tunnusluvut, varoitukset ja kerrosrajojen taulukko. */

import { VAHAINEN_KONDENSSI } from '../lib/calculate';
import type { Tulos } from '../lib/types';

interface Props {
  tulos: Tulos;
}

/** Näyttömuoto kondenssimäärälle; hyvin pienet arvot eivät pyöristy nollaan. */
function maara(gVrk: number): string {
  return gVrk < VAHAINEN_KONDENSSI ? `alle ${VAHAINEN_KONDENSSI} ` : `${gVrk.toFixed(2)} `;
}

export function ResultsPanel({ tulos }: Props) {
  const kondenssia = tulos.kondenssiTasot.length > 0;
  const merkittava = kondenssia && tulos.kondenssiYhteensa >= VAHAINEN_KONDENSSI;

  return (
    <div
      className="tulokset"
      data-tilanne={merkittava ? 'riski' : kondenssia ? 'vahainen' : 'ok'}
    >
      <div
        className={
          merkittava
            ? 'tilanne tilanne--riski'
            : kondenssia
              ? 'tilanne tilanne--vahainen'
              : 'tilanne tilanne--ok'
        }
      >
        <strong>
          {merkittava
            ? 'Rakenteeseen tiivistyy kosteutta'
            : kondenssia
              ? 'Tiivistyminen on häviävän vähäistä'
              : 'Rakenteeseen ei tiivisty kosteutta'}
        </strong>
        {kondenssia ? (
          <>
            {!merkittava && (
              <p>
                Laskennallista tiivistymistä esiintyy, mutta määrä on niin pieni, ettei sillä ole
                rakenteen kannalta merkitystä.
              </p>
            )}
            <ul>
              {tulos.kondenssiTasot.map((taso, i) => (
                <li key={i}>
                  {taso.sijainti}: {maara(taso.gcVrk)}g/(m²·vrk), lämpötila {taso.T.toFixed(1)} °C
                </li>
              ))}
            </ul>
          </>
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
          <dt>
            Diffuusiovastus s<sub>d</sub>
          </dt>
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
          <dt>
            Lämpötilaindeksi f<sub>Rsi</sub>
          </dt>
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
              <th scope="col">
                p<sub>sat</sub> [Pa]
              </th>
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
