const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const Parser = require('rss-parser');

const calculateFrequencies = require("./frequencies");
const score = require("./score");

const parser = new Parser();

const cacheDirName = "bbcworld";
const rssFeedUrl = "http://feeds.bbci.co.uk/news/world/rss.xml";
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
          if (!text.includes("<rss") || !text.includes("</rss>")) {
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

  const PARALLEL = 4;
  await Promise.all(new Array(PARALLEL).fill(0).map(async (_, j) => {
    for (let i = j; i < selectedLines.length; i += PARALLEL) {
      const line = selectedLines[i];
      await cachedFetch(line[1], `https://web.archive.org/web/${line[1]}/${line[2]}`);
    }
  }))

  // Then get the cached data
  let allPages = await Promise.all(selectedLines.map((line) => cachedFetch(line[1], `https://web.archive.org/web/${line[1]}/${line[2]}`)));
  const successes = allPages.filter(Boolean).length;
  const fetches = allPages.length;
  console.log(successes, '/', fetches, 'successful');

  const runAnyway = process.argv.includes('--force');

  if (successes === fetches || runAnyway) {
    if (runAnyway) allPages = allPages.filter(Boolean);

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

    const articles = [...map.values()];

    const totalFrequencies = articles.reduce((counts, article) => {
      const map = calculateFrequencies(article);
      for (const word of map.keys()) {
        counts.set(word, (counts.get(word) || 0) + 1);
      }
      return counts;
    }, new Map());

    const list = (await Promise.all([...totalFrequencies.entries()]
      .map(async ([word, count]) => [word, count, await score(word, count, "the", totalFrequencies.get("the"))])))
      .sort(([,, a], [,, b]) => b - a);

    console.log(list.slice(0, 100).map(a => `| ${a[0].padEnd(24, " ")} | ${a[1].toString().padStart(6, " ")} | ${a[2].toFixed(1).padStart(7, " ")} |`).join("\n"));
  }

  process.exit(1);
})();

