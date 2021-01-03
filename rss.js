const Parser = require('rss-parser');
const parser = new Parser();

(async () => {
  const feed = await parser.parseURL('https://www.reddit.com/.rss');
  console.log(feed.title);
  feed.items.map(item => {
    const text = `${item.title} ${item.contentSnippet}`;
    console.log(text);
  });
})();
