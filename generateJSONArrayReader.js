const fs = require('fs');
const path = require('path');

const generateJSONArrayReader = (filePath) => {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });

  const iterator = stream[Symbol.asyncIterator]();

  let carryStr = "";
  let queue = [];

  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          while (queue.length === 0) {
            const next = await iterator.next();
            if (next.done) return { done: true };

            const chunk = next.value;
            const lastNewLineIndex = chunk.lastIndexOf("\n");

            if (lastNewLineIndex === -1) {
              carryStr += chunk;
              continue;
            }

            queue.push(...(carryStr + chunk.slice(0, lastNewLineIndex)).split("\n"));
            carryStr = chunk.slice(lastNewLineIndex + 1);
          }

          return { done: false, value: queue.shift() };
        }
      };
    }
  };
};

module.exports = generateJSONArrayReader;

if (require.main === module) {
  (async () => {
    const startTime = Date.now();
    let totalCount = 0;

    const filePath = path.join(__dirname, 'data/pages.txt');
    for await (const page of generateJSONArrayReader(filePath)) {
      // await new Promise(resolve => {
      //   setTimeout(() => {
      //     resolve(page);
      //   }, 1000);
      // });
      if (!page.isRedirect) {
        totalCount += 1;

        if (totalCount % 10000 === 0) {
          console.log(totalCount);
        }
      }
    }

    console.log(`Found ${totalCount} pages in ${Math.round((Date.now() - startTime) / 1000)} seconds`);
  })();
}
