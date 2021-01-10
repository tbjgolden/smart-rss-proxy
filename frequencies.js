const regex = /[^a-zA-Z\-\u00C0-\u024F\u1E02-\u1EF3]+/gu;
const nonlatin = /[^a-zA-Z\-]+/g;

const normalize = (str) => str.normalize("NFD").replace(nonlatin, "");

const allEnglishWords = require("./words_dictionary.json");

const calculateFrequencies = (text) => {
  const frequencyMap = new Map();
  const str = text.toLowerCase();
  const words = str.split(regex);
  for (const word of words) {
    const w = normalize(word);
    if (allEnglishWords[w]) frequencyMap.set(w, (frequencyMap.get(w) || 0) + 1);
  }
  return frequencyMap;
}

module.exports = calculateFrequencies;
