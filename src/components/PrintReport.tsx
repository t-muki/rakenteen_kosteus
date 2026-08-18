/**
 * Tulostusraportti: kaavion oheen tulostuva dokumentti, jossa rakenteen
 * kerrokset, olosuhteet, tunnusluvut ja kondenssitulokset taulukkoina.
 *
 * Näkyy vain tulostettaessa (@media print). Selaimen tulostustoiminnosta
 * valitaan "Tallenna PDF-tiedostona", jolloin kaavio säilyy vektorina.
 */

import { VAHAINEN_KONDENSSI } from '../lib/calculate';
import { absoluuttinenKosteus, hoyrynTiheys, kastepiste, osapaine } from '../lib/psychrometrics';
import type { Olosuhde, Rakenne, RakenneTyyppi, Tulos } from '../lib/types';

const RAKENNEOSA: Record<RakenneTyyppi, string> = {
  seina: 'Ulkoseinä',
  ylapohja: 'Yläpohja',
  alapohja: 'Alapohja',
};

interface Props {
  rakenne: Rakenne;
  tulos: Tulos;
  /** Kumpi kaavio on näkyvissä — kerrotaan raportissa. */
  nakyma: string;
}

/** Suomalainen desimaalierotin luvulle. */
function luku(arvo: number, desimaaleja = 2): string {
  return arvo.toFixed(desimaaleja).replace('.', ',');
}

/** Raportin yläosa: otsikkotiedot. Sijoitetaan kaavion yläpuolelle. */
export function PrintHeader({ rakenne, tulos, nakyma }: Props) {
  const paivays = new Date().toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="tulostus">
      <header className="tulostus__otsikko">
        <div>
          <h1>{rakenne.nimi}</h1>
          <p>
            {RAKENNEOSA[rakenne.tyyppi]} · {(tulos.paksuus * 1000).toFixed(0)} mm ·{' '}
            U {luku(tulos.U, 3)} W/(m²·K)
          </p>
        </div>
        <div className="tulostus__meta">
          <p>Seinärakenteen kosteus- ja lämpöleikkaus</p>
          <p>{paivays}</p>
        </div>
      </header>

      <p className="tulostus__nakyma">Kuvaaja: {nakyma}</p>
    </div>
  );
}

/** Raportin taulukko-osa. Sijoitetaan kaavion alapuolelle. */
export function PrintDetails({ rakenne, tulos }: Omit<Props, 'nakyma'>) {
  const kondenssia = tulos.kondenssiTasot.length > 0;
  const merkittava = kondenssia && tulos.kondenssiYhteensa >= VAHAINEN_KONDENSSI;

  return (
    <div className="tulostus">
      <section className="tulostus__lohko">
        <h2>Olosuhteet</h2>
        <table className="tulostus__taulukko">
          <thead>
            <tr>
              <th scope="col">Ilma</th>
              <th scope="col">Lämpötila</th>
              <th scope="col">Suht. kosteus</th>
              <th scope="col">Kastepiste</th>
              <th scope="col">Osapaine</th>
              <th scope="col">Kosteussisältö</th>
              <th scope="col">Vesihöyrypitoisuus</th>
            </tr>
          </thead>
          <tbody>
            <OlosuhdeRivi nimi="Sisäilma" olosuhde={rakenne.sisa} />
            <OlosuhdeRivi nimi="Ulkoilma" olosuhde={rakenne.ulko} />
          </tbody>
        </table>
      </section>

      <section className="tulostus__lohko">
        <h2>Rakenteen kerrokset sisältä ulos</h2>
        <table className="tulostus__taulukko">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Materiaali</th>
              <th scope="col">Paksuus</th>
              <th scope="col">λ [W/mK]</th>
              <th scope="col">μ [-]</th>
              <th scope="col">R [m²K/W]</th>
              <th scope="col">s_d [m]</th>
            </tr>
          </thead>
          <tbody>
            {tulos.kerrokset.map((k, i) => (
              <tr key={k.kerros.id} className={k.mukanaLaskennassa ? undefined : 'rivi--passiivinen'}>
                <td>{i + 1}</td>
                <th scope="row">
                  {k.materiaali.nimi}
                  {!k.mukanaLaskennassa && ' (ei laskennassa)'}
                </th>
                <td>{String(k.kerros.paksuus).replace('.', ',')} mm</td>
                <td>{luku(k.materiaali.lambda, 3)}</td>
                <td>{k.materiaali.sd !== undefined ? '—' : k.materiaali.mu}</td>
                <td>{k.mukanaLaskennassa ? luku(k.R) : '—'}</td>
                <td>{k.mukanaLaskennassa ? luku(k.sd, k.sd < 1 ? 3 : 1) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <th scope="row">Yhteensä</th>
              <td>{(tulos.paksuus * 1000).toFixed(0)} mm</td>
              <td colSpan={2} />
              <td>{luku(tulos.Rtot)}</td>
              <td>{luku(tulos.sdTot)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="tulostus__alaviite">
          R sisältää pintavastukset R_si {luku(tulos.Rsi)} ja R_se {luku(tulos.Rse)} m²·K/W.
          Kalvoille annetaan s_d suoraan taulukkoarvona, jolloin μ ei ole käytössä.
        </p>
      </section>

      <section className="tulostus__lohko">
        <h2>Tunnusluvut</h2>
        <dl className="tulostus__tunnusluvut">
          <Tunnusluku nimi="Lämmönläpäisykerroin U" arvo={`${luku(tulos.U, 3)} W/(m²·K)`} />
          <Tunnusluku nimi="Kokonaislämpövastus R" arvo={`${luku(tulos.Rtot)} m²·K/W`} />
          <Tunnusluku nimi="Lämpövirran tiheys q" arvo={`${luku(tulos.q, 1)} W/m²`} />
          <Tunnusluku nimi="Diffuusiovastus s_d" arvo={`${luku(tulos.sdTot)} m`} />
          <Tunnusluku nimi="Diffuusiovuo" arvo={`${luku(tulos.diffuusioVuo)} g/(m²·vrk)`} />
          <Tunnusluku nimi="Sisäpinnan lämpötila" arvo={`${luku(tulos.Tsi, 1)} °C`} />
          <Tunnusluku nimi="Sisäpinnan suht. kosteus" arvo={`${tulos.RHsi.toFixed(0)} %`} />
          <Tunnusluku nimi="Lämpötilaindeksi f_Rsi" arvo={luku(tulos.fRsi)} />
        </dl>
      </section>

      <section className="tulostus__lohko">
        <h2>Kosteustekninen tulos</h2>
        <p className={merkittava ? 'tulostus__tilanne--riski' : 'tulostus__tilanne--ok'}>
          {merkittava
            ? 'Rakenteeseen tiivistyy kosteutta.'
            : kondenssia
              ? 'Tiivistyminen on häviävän vähäistä, eikä sillä ole rakenteen kannalta merkitystä.'
              : 'Rakenteeseen ei tiivisty kosteutta näillä olosuhteilla.'}
        </p>

        {kondenssia && (
          <table className="tulostus__taulukko">
            <thead>
              <tr>
                <th scope="col">Tiivistymiskohta</th>
                <th scope="col">Lämpötila</th>
                <th scope="col">Määrä</th>
              </tr>
            </thead>
            <tbody>
              {tulos.kondenssiTasot.map((taso, i) => (
                <tr key={i}>
                  <th scope="row">{taso.sijainti}</th>
                  <td>{luku(taso.T, 1)} °C</td>
                  <td>
                    {taso.gcVrk < VAHAINEN_KONDENSSI
                      ? `alle ${luku(VAHAINEN_KONDENSSI)}`
                      : luku(taso.gcVrk)}{' '}
                    g/(m²·vrk)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tulos.varoitukset.length > 0 && (
          <>
            <h3>Huomiot</h3>
            <ul className="tulostus__varoitukset">
              {tulos.varoitukset.map((varoitus) => (
                <li key={varoitus}>{varoitus}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="tulostus__lohko">
        <h2>Arvot kerrosrajoilla</h2>
        <table className="tulostus__taulukko">
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
              <tr key={i} className={solmu.Tdp >= solmu.T - 1e-6 ? 'rivi--riski' : undefined}>
                <th scope="row">{solmu.nimi}</th>
                <td>{(solmu.x * 1000).toFixed(0)}</td>
                <td>{luku(solmu.T, 1)}</td>
                <td>{luku(solmu.Tdp, 1)}</td>
                <td>{solmu.p.toFixed(0)}</td>
                <td>{solmu.pSat.toFixed(0)}</td>
                <td>{solmu.RH.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="tulostus__alatunniste">
        <p>
          <strong>Menetelmä.</strong> Lämpötilaprofiili ja U-arvo EN ISO 6946, kyllästyspaine ja
          kastepiste EN ISO 13788, kosteustarkastelu Glaser-menetelmällä (EN ISO 13788).
          Materiaaliarvot ovat SFS-EN ISO 10456:n ja valmistajien taulukkoarvoja.
        </p>
        <p>
          <strong>Rajoitukset.</strong> Laskenta on stationaarinen: se kuvaa tasapainotilan yhdessä
          olosuhdeparissa eikä huomioi materiaalien kosteudensitomiskykyä, rakenteen kuivumista,
          ilmavuotoja eikä kaksiulotteisia kylmäsiltoja. Tulos on suuntaa antava vertailutyökalu
          rakennevaihtoehtojen välillä, ei rakennusfysikaalinen suunnitelma. Tarkista suunnittelussa
          aina tuotekohtaiset arvot.
        </p>
      </footer>
    </div>
  );
}

function OlosuhdeRivi({ nimi, olosuhde }: { nimi: string; olosuhde: Olosuhde }) {
  const p = osapaine(olosuhde.T, olosuhde.RH);
  return (
    <tr>
      <th scope="row">{nimi}</th>
      <td>{luku(olosuhde.T, 1)} °C</td>
      <td>{olosuhde.RH.toFixed(0)} %</td>
      <td>{luku(kastepiste(p), 1)} °C</td>
      <td>{p.toFixed(0)} Pa</td>
      <td>{luku(absoluuttinenKosteus(p), 1)} g/kg</td>
      <td>{luku(hoyrynTiheys(p, olosuhde.T), 1)} g/m³</td>
    </tr>
  );
}

function Tunnusluku({ nimi, arvo }: { nimi: string; arvo: string }) {
  return (
    <div>
      <dt>{nimi}</dt>
      <dd>{arvo}</dd>
    </div>
  );
}
