const redis = require("redis");
const client = redis.createClient();
client.on("error", console.error);

const regex = /[^a-zA-Z\-\u00C0-\u024F\u1E02-\u1EF3]+/gu;
const nonlatin = /[^a-zA-Z\-]+/g;

const normalize = (str) => str.normalize("NFD").replace(nonlatin, "");

const allEnglishWords = require("./data/words_dictionary.json");

const processLines = async (lines) => {
  if (lines.length === 0) return 2;

  const frequencyMap = new Map();
  for (const line of lines) {
    const data = JSON.parse(line);
    if (!data.isRedirect) {
      const str = (data.title + " " + data.plaintext).toLowerCase();
      const words = str.split(regex);
      for (const word of words) {
        const w = normalize(word);
        if (allEnglishWords[w]) frequencyMap.set(w, (frequencyMap.get(w) || 0) + 1);
      }
    }
  }

  await Promise.all(
    [...frequencyMap.entries()].map(([word, freq]) => (
      new Promise((resolve) => {
        client.zincrby("enwiki", freq, word, resolve);
      })
    ))
  );
}

process.on('message', async (data) => {
  if (data === 1) {
    process.send(1);
  } else {
    await processLines(data);
    process.send(1);
  }
});


process.on('disconnect', () => {
  client.quit();
});
