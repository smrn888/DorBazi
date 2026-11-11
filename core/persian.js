const ZWNJ = /\u200C/g;
const DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g; // harakat + tatweel

function normalize(input) {
  return String(input ?? '')
    .replace(/[\u064A\u0649]/g, 'ی')   // ي, ى -> ی
    .replace(/\u0643/g, 'ک')           // ك -> ک
    .replace(/[\u0623\u0625]/g, 'ا')   // أ, إ -> ا   (آ is kept on purpose)
    .replace(/\u0629/g, 'ه')           // ة -> ه
    .replace(/[\u0660-\u0669]/g, (d) => d.charCodeAt(0) - 0x0660) // Arabic-Indic digits
    .replace(/[\u06F0-\u06F9]/g, (d) => d.charCodeAt(0) - 0x06f0) // Persian digits
    .replace(DIACRITICS, '')
    .replace(ZWNJ, '')                 // drop ZWNJ for comparison only
    .replace(/\s+/g, ' ')
    .trim();
}

// Use for dedupe keys, never for display
const key = (s) => normalize(s);

module.exports = { normalize, key };