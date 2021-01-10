const redis = require("redis");
const client = redis.createClient();
client.on("error", console.error);

const cache = {};

const getScore = async (word) => {
  if (word in cache) return cache[word];
  return new Promise((resolve, reject) => {
    client.zscore("enwiki", word, (err, score) => {
      if (err) reject(err);
      else {
        cache[word] = parseInt(score);
        resolve(cache[word]);
      }
    })
  })
};

const score = async (word, frequency, baselineWord, baselineFrequency) => {
  const scaleFactor = (await getScore(baselineWord)) / baselineFrequency;
  return frequency - Math.pow(((await getScore(word)) / scaleFactor), 2);
};

module.exports = score;
