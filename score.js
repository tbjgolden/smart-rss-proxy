const redis = require("redis");
const client = redis.createClient();
client.on("error", console.error);

const cache = {};

const score = async (word, frequency, baselineWord, baselineFrequency) => {
  if (!(baselineWord in cache)) {
    await redis.get();
  }
};
