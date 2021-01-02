const path = require('path');
const dumpster = require('dumpster-dive');

dumpster({ file: path.join(__dirname, 'data/enwiki.xml'), db: 'enwiki', plaintext: true, categories: false });
