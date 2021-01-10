const path = require('path');
const os = require('os');
const cluster = require('cluster');

const generateJSONArrayReader = require('./generateJSONArrayReader');

const redis = require("redis");
const client = redis.createClient();
client.on("error", console.error);

const estimate = 20000000;

const formatDuration = ms => {
  let seconds = Math.round(ms / 1000);
  let minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  seconds = seconds % 60;
  minutes = minutes % 60;
  return `${hours}:${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`;
}

const run = async () => {
  cluster.setupMaster({
    exec: path.join(__dirname, 'worker.js')
  });
  
  const maxProcesses = os.cpus().length - 1;
  const waitUntil = (condition) => {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (condition()) {
          clearInterval(interval);
          resolve();
        }
      }, 30);
    })
  };

  let lines = [];

  for (let i = 0; i < maxProcesses; i++) cluster.fork();

  let lineCount = 0;
  let hasFinishedReading = false;
  let startTime = Date.now();

  const printUpdate = () => {
    console.log('Processed', lineCount, "pages");
    console.log('Processing', Math.round(lineCount / ((Date.now() - startTime) / 1000)), "articles per second")
    console.log('If this was', estimate, 'pages, this would take', formatDuration((estimate / lineCount) * (Date.now() - startTime)));
  };

  let interval;

  const THRESHOLD = 1000;

  const start = () => {
    console.log("Starting", maxProcesses, 'workers');

    for (const id in cluster.workers) {
      const worker = cluster.workers[id];

      worker.on('message', async (data) => {
        if (data === 1) {
          const threshold = hasFinishedReading ? Math.min(lines.length, THRESHOLD) : THRESHOLD;
          if (hasFinishedReading && lines.length === 0 && !worker.exitedAfterDisconnect) {
            console.log("closing", id);
            worker.disconnect();
          } else if (lines.length >= threshold) {
            worker.send(lines.splice(0, threshold));
          } else {
            setTimeout(() => worker.send([]), 1000);
          }
        }
      });

      worker.send(1);
    }

    interval = setInterval(() => {
      printUpdate();
    }, 5000);
  };

  start();

  for await (const json of generateJSONArrayReader(path.join(__dirname  , 'data/pages.txt'))) {
    lineCount += 1;
    if (lines.length >= 10000) await waitUntil(() => lines.length < 10000);
    lines.push(json);
  }

  hasFinishedReading = true;
  console.log("Finished reading file");

  clearInterval(interval);

  console.log(`Finished in`, formatDuration(Date.now() - startTime));
  console.log("Results in Redis sorted set as `enwiki`");
};

client.exists("enwiki", async (err, exists) => {
  if (err) {
    console.log("Redis error:");
    console.error(err);
  } else if (exists === 1) {
    console.log("Results already found in enwiki. Delete them to run again with correct counts.");
  } else {
    await run();
  }

  client.quit();
})
