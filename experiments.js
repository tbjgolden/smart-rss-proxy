/*
function* wordGenerator(str) {
  let lastIndex = str.length - 1;
  for (let i = lastIndex; i >= 0; i--) {
    
  }
}
*/

const fs = require('fs');
const path = require('path');



const regex = /[^a-zA-Z\-\u00C0-\u024F\u1E02-\u1EF3]+/gu;
const accents = /[\u0300-\u036f]+/gu;
const nonlatin = /[^a-zA-Z\-]+/g;

const normalize = (str) => {
  str.toLowerCase();

  return str.toLowerCase().normalize("NFD").replace(accents, "").replace(nonlatin, "");
}

// parse 36
// append 0
// regex split 10


const lines = fs.readFileSync(path.join(__dirname, "data", "subset-1k.txt"), 'utf8').split("\n").filter(Boolean);
const jsons = [];
for (let line of lines) {
  jsons.push(JSON.parse(line));
}

const start = Date.now()
for (let json of jsons) {
  if (!json.isRedirect) {
    const str = json.title + " " + json.plaintext;
    const x = str.split(regex);
  }
}
console.log(Date.now() - start);
