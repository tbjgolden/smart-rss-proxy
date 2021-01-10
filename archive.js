const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const Parser = require('rss-parser');

const calculateFrequencies = require("./frequencies");

const parser = new Parser();

const cacheDirName = "cnn";
const rssFeedUrl = "http://rss.cnn.com/rss/cnn_topstories.rss";
const cdxUrl = `http://web.archive.org/cdx/search/cdx?url=${rssFeedUrl.split("://")[1]}`;
const now = Date.now();
const sixMonthsAgo = now - (183 * 24 * 60 * 60 * 1000);
const sixMonthsAgoTimeStamp = new Date(sixMonthsAgo).toISOString().replace(/[^\d]+/g, "").slice(0, -3);

const cachedFetch = async (uid, ...args) => {
  const filePath = path.join(__dirname, 'cache', cacheDirName, uid);

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.log("Fetching", uid)
    return (
      fetch(...args)
        .then(res => res.text())
        .then(text => {
          if (text.includes("This snapshot cannot be displayed due to an internal error.")) {
            return null;
          } else {
            fs.writeFileSync(filePath, text);
            return text;
          }
        })
    );
  }
};

(async () => {
  const text = await fetch(cdxUrl).then(res => res.text());
  const lines = text.split("\n").filter(Boolean)

  const selectedLines = [];

  let lastDatestamp = "9999";
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].split(/\s+/g);
    const timestamp = line[1];
    const datestamp = timestamp.slice(0, 8) + ((timestamp.slice(8, 10) < "12") ? "a" : "p");
    if (timestamp < sixMonthsAgoTimeStamp) {
      break;
    }
    if (datestamp < lastDatestamp) {
      selectedLines.push(line);
      lastDatestamp = datestamp;
    }
  }

  // Simple safe sequential fetch
  for (const line of selectedLines) {
    const result = await cachedFetch(line[1], `https://web.archive.org/web/${line[1]}/${line[2]}`);
  }

  // Then get the cached data
  let allPages = await Promise.all(selectedLines.map((line) => cachedFetch(line[1], `https://web.archive.org/web/${line[1]}/${line[2]}`)));
  const successes = allPages.filter(Boolean).length;
  const fetches = allPages.length;
  console.log(successes, '/', fetches, 'successful');

  if (successes === fetches) {
    const map = new Map();
    for (let i = 0; i < allPages.length; i++) {
      allPages[i] = allPages[i].slice(allPages[i].indexOf("<rss"), allPages[i].lastIndexOf("</rss>") + 6);
      const feed = await parser.parseString(allPages[i]);
      feed.items.forEach(item => {
        if (item.title && item.contentSnippet && item.guid) {
          map.set(item.guid, item.contentSnippet);
        }
      });
    }
    console.log(map.size, 'articles processed');
    const frequencyMap = calculateFrequencies([...map.values()].join(" "));
    console.log([...frequencyMap.entries()].sort(([, a], [, b]) => b - a).slice(0, 1000).join("\n"));
  }
})();

