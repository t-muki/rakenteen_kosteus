/**
 * Käyttäjälle näytettävien lukujen muotoilu.
 *
 * Suomessa ja muualla Manner-Euroopassa desimaalierotin on pilkku. Kaikki
 * näytettävät luvut kulkevat näiden kautta — poikkeuksena lomakkeiden
 * <input type="number">, joiden arvo on HTML:n mukaan aina pisteellinen.
 */

/** Luku kiinteällä desimaalimäärällä, esimerkiksi 0,13. */
export function fi(arvo: number, desimaaleja = 1): string {
  return arvo.toFixed(desimaaleja).replace('.', ',');
}

/** Luku sellaisenaan ilman pyöristystä, vain erotin vaihdettuna. */
export function fiLuku(arvo: number): string {
  return String(arvo).replace('.', ',');
}
