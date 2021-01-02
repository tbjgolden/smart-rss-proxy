const words = Object.keys(require("./data/words_dictionary.json"));

const others = new Set();

for (const word of words) {
  for (let i = 0; i < word.length; i++) {
    const charCode = word.charCodeAt(i);
    if (charCode < 97 || charCode > 122) {
      others.add(word.charAt(i));
    }
  }
}

console.log(others);
