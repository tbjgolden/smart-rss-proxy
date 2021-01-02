const accents = /[\u0300-\u036f]+/g
const nonlatin = /[^a-z\-]+/g;

const normalize = (str) => 
  str.toLowerCase().normalize("NFD").replace(accents, "").replace(nonlatin, "")

const allEnglishWords = new Set(Object.keys(require("./data/results.json")));

const entities = require("./entities");

process.on('message', (msg) => {
  if (msg === 1) {
    // ready to start
    process.send(1);
  } else {
    process.send(processLines(msg));
    process.send(1);
  }
});

function processLines (lines) {
  const frequencyMap = Object.create(null);

  for (const line of lines) {
    const { title, plaintext, isRedirect } = JSON.parse(line);
    if (!isRedirect) {
      const words = title + " " + plaintext;

      let arr;
      while ((arr = regex.exec(words)) !== null) {
        let w = normalize(arr[0]);
        w = w in entities ? entities[w] : w;
        if (allEnglishWords.has(w)) {
          frequencyMap[w] = (frequencyMap[w] || 0) + 1;
        }
      }
    }
  }

  return frequencyMap;
}

