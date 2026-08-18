/**
 * Rakenteen tallennus selaimen muistiin ja jakaminen URL-osoitteessa.
 * Kaikki tapahtuu selaimessa — palvelinta ei tarvita, joten sovellus toimii
 * sellaisenaan GitHub Pagesista.
 */

import type { Rakenne } from './types';

const TILA_AVAIN = 'seinarakenne.tila';

/** Tiivis siirtomuoto: lyhyet avaimet pitävät URL-osoitteen luettavana. */
interface TiivisRakenne {
  n: string;
  t: Rakenne['tyyppi'];
  k: [string, number][];
  s: [number, number];
  u: [number, number];
}

function tiivista(rakenne: Rakenne): TiivisRakenne {
  return {
    n: rakenne.nimi,
    t: rakenne.tyyppi,
    k: rakenne.kerrokset.map((k) => [k.materiaaliId, k.paksuus]),
    s: [rakenne.sisa.T, rakenne.sisa.RH],
    u: [rakenne.ulko.T, rakenne.ulko.RH],
  };
}

function laajenna(tiivis: TiivisRakenne): Rakenne {
  return {
    nimi: tiivis.n,
    tyyppi: tiivis.t,
    kerrokset: tiivis.k.map(([materiaaliId, paksuus], i) => ({
      id: `jaettu-${i}`,
      materiaaliId,
      paksuus,
    })),
    sisa: { T: tiivis.s[0], RH: tiivis.s[1] },
    ulko: { T: tiivis.u[0], RH: tiivis.u[1] },
  };
}

/** Koodaa merkkijonon URL-turvalliseksi base64:ksi (UTF-8 säilyttäen). */
function koodaa(teksti: string): string {
  const tavut = new TextEncoder().encode(teksti);
  let binaari = '';
  for (const tavu of tavut) binaari += String.fromCharCode(tavu);
  return btoa(binaari).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pura(koodattu: string): string {
  const base64 = koodattu.replace(/-/g, '+').replace(/_/g, '/');
  const binaari = atob(base64);
  const tavut = Uint8Array.from(binaari, (merkki) => merkki.charCodeAt(0));
  return new TextDecoder().decode(tavut);
}

/** Jaettava osoite, joka sisältää koko rakenteen ja olosuhteet. */
export function jakoOsoite(rakenne: Rakenne): string {
  const tunnus = koodaa(JSON.stringify(tiivista(rakenne)));
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#r=${tunnus}`;
}

/** Lukee rakenteen osoiterivin hash-osasta, jos sellainen on. */
export function lueOsoitteesta(): Rakenne | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#r=')) return null;
  try {
    return laajenna(JSON.parse(pura(hash.slice(3))) as TiivisRakenne);
  } catch {
    return null;
  }
}

export function tallennaTila(rakenne: Rakenne): void {
  try {
    localStorage.setItem(TILA_AVAIN, JSON.stringify(tiivista(rakenne)));
  } catch {
    // Tallennustila ei käytettävissä — jatketaan ilman muistia.
  }
}

export function lataaTila(): Rakenne | null {
  try {
    const raaka = localStorage.getItem(TILA_AVAIN);
    return raaka ? laajenna(JSON.parse(raaka) as TiivisRakenne) : null;
  } catch {
    return null;
  }
}

/** Tallentaa kuvaajan PNG-kuvana. */
export function viePng(svg: SVGSVGElement, tiedostonimi: string, skaala = 2): void {
  const kopio = svg.cloneNode(true) as SVGSVGElement;
  kopio.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  liitaTyylit(kopio);

  const viewBox = (svg.getAttribute('viewBox') ?? '0 0 940 520').split(/\s+/).map(Number);
  const leveys = viewBox[2];
  const korkeus = viewBox[3];

  const data = new XMLSerializer().serializeToString(kopio);
  const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));

  const kuva = new Image();
  kuva.onload = () => {
    const kangas = document.createElement('canvas');
    kangas.width = leveys * skaala;
    kangas.height = korkeus * skaala;
    const piirto = kangas.getContext('2d');
    if (piirto) {
      piirto.fillStyle = '#ffffff';
      piirto.fillRect(0, 0, kangas.width, kangas.height);
      piirto.drawImage(kuva, 0, 0, kangas.width, kangas.height);
      kangas.toBlob((blob) => {
        if (blob) lataaTiedosto(blob, `${tiedostonimi}.png`);
      }, 'image/png');
    }
    URL.revokeObjectURL(url);
  };
  kuva.src = url;
}

/**
 * Kopioi sivun tyylisäännöt SVG:n sisään, jotta viety tiedosto näyttää
 * samalta kuin ruudulla.
 */
function liitaTyylit(svg: SVGSVGElement): void {
  const saannot: string[] = [];
  for (const arkki of Array.from(document.styleSheets)) {
    try {
      for (const saanto of Array.from(arkki.cssRules)) {
        saannot.push(saanto.cssText);
      }
    } catch {
      // Eri alkuperästä ladattu tyylitiedosto — ohitetaan.
    }
  }

  const tyyli = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  tyyli.textContent = saannot.join('\n');
  svg.insertBefore(tyyli, svg.firstChild);
}

function lataaTiedosto(blob: Blob, nimi: string): void {
  const url = URL.createObjectURL(blob);
  const linkki = document.createElement('a');
  linkki.href = url;
  linkki.download = nimi;
  linkki.click();
  URL.revokeObjectURL(url);
}
