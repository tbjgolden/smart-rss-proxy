const redis = require("redis");
const client = redis.createClient();
client.on("error", console.error);

const calculateFrequencies = require("./frequencies");

const processLines = async (lines) => {
  if (lines.length === 0) return 2;

  const text = lines.reduce((s, line) => {
    const data = JSON.parse(line);
    if (data.isRedirect) {
      return s;
    } else {
      return s + " " + (data.title + " " + data.plaintext).toLowerCase();
    }
  }, "");

  const frequencyMap = calculateFrequencies(text);

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
