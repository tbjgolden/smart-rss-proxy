const path = require('path');
const os = require('os');
const fs = require('fs');
const cluster = require('cluster');

const generateJSONArrayReader = require('./generateJSONArrayReader');

const redis = require("redis");
const client = redis.createClient();
client.on("error", console.error);

const run = async () => {
  cluster.setupMaster({
    exec: path.join(__dirname, 'worker.js')
  });
  
  const maxProcesses = os.cpus().length - 1;
  console.log(`Master ${process.pid} is running`);
  
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

  // ----

  let lines = [];
  let hasStarted = false;

  const ref = {
    frequencyMap: Object.create(null)
  };

  for (let i = 0; i < maxProcesses; i++) {
    cluster.fork();
  }

  const activeWorkers = {};

  let mergeCount = 0;
  let lineCount = 0;

  const start = () => {
    console.log("Starting", maxProcesses, 'workers');
    let startTime = Date.now();
    let lastTime = Date.now();

    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      worker.on('message', (data) => {
        if (data === 1) {
          activeWorkers[id] = lines.length > 0;
          worker.send(lines.splice(0, 20));
        } else {
          for (const [k, v] of Object.entries(data)) {
            ref.frequencyMap[k] = (ref.frequencyMap[k] || 0) + v;
          }

          mergeCount += 1;

          if (mergeCount % 1000000 === 0) {
            const now = Date.now();
            console.log(Math.floor((now - lastTime) / 1000), "seconds since last 1 million");
            lastTime = now;
            console.log('Processed', lineCount, "pages");
            console.log('Processing', Math.round(lineCount / ((now - startTime) / 60000)), "articles per minute")

            const workerStates = Object.values(cluster.workers).reduce((o, w) => {
              const e = w.exitedAfterDisconnect;
              const key = (e === false ? "dead" : "alive");
              if (!e) o[key] = (o[key] || 0) + 1;
              return o;
            }, {});
            console.log("Worker states:", JSON.stringify(workerStates, null, 2));

            // stage frequencyMap for addition to redis
            const toAdd = ref.frequencyMap;
            // reset frequencyMap variable
            ref.frequencyMap = Object.create(null);
            // add each to redis
            for (const [word, count] of Object.entries(toAdd)) {
              client.zincrby("enwiki", count, word);
            }
          }
        }
      });

      worker.send(1);
    }
  };

  for await (const json of generateJSONArrayReader(path.join(__dirname  , 'data/pages.txt'))) {
    lineCount += 1;

    if (lines.length >= 10000) {
      if (!hasStarted) {
        hasStarted = true;
        start();
      }

      await waitUntil(() => lines.length < 10000);
    }

    lines.push(json);
  }

  console.log("emptied backlog");
  await waitUntil(() => !Object.values(activeWorkers).some(Boolean));
  console.log("all completed");

  // close them

  console.log("ensuring all results added to redis");
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 3000);
  });

  console.log("all results should be in redis sorted set as `enwiki`");
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
  process.exit(1);
})
