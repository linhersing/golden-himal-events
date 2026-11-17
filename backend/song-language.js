/* Shared TEST song-language input contract.
 * Dropdown choices are convenience suggestions, NOT an eligibility restriction.
 * Accept a human-readable language name for songs absent from the menu.
 */
export const SUGGESTED_SONG_LANGUAGES=Object.freeze([
 'Nepali','English','Hindi','Maithili','Bhojpuri','Tamang','Chinese',
 'Tharu','Nepal Bhasa','Awadhi','Gurung','Magar','Limbu','Urdu','Sanskrit','Tibetan'
]);
export function validSongLanguage(value){
 if(typeof value!=='string')return false;
 const name=value.trim();
 // "Other" is a UI choice, not an actual language; it must be specified.
 if(name==='Other'||name.length<2||name.length>60)return false;
 // Human-language names, including Nepali/Indic scripts, accents, spaces and hyphens.
 return /^[\p{L}\p{M}][\p{L}\p{M} .'-\u2019()/]{1,59}$/u.test(name);
}
