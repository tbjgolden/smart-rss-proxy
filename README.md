# Smart RSS Proxy / Media Bias Detection

### Motivation

Five years ago I created a browser extension that would replace every article with a headline that mentioned certain
keywords (e.g. "Donald Trump", "Nigel Farage", "Kim Kardashian" etc) with an empty box.

On hovering, it would allow me to view any matched keywords, an estimated toxicity as a percentage,
and a button to allow me to see it anyway.

One of the main issues with that approach is that it relied on manually passing in the things to filter out.

This project is an alternative approach - one that relies on using Wikipedia as a "balancer" - a way to determine
how often words 'should' appear in content, and compare that with articles from a particular source.

In doing so, we can use this to:

1. Calculate the trends and keywords that different media sources over-expose
2. Create an automated list of words that are currently over-exposed from a source for use in a filter, as above

### Process

1. Download English Wikipedia
2. Parse English Wikipedia for word/phrase frequency
3. Compare this against recent articles from a sources

A generated list of keywords and weights can then be used as part of a RSS proxy server to filter out the noise.

### Strengths of approach

1. The frequency of articles that mention a topic is often higher for more 'significant' topics - which means that
   that while the general trend is to reduce over-exposed significance, it may still reward under-exposed significance.
2. Less than 1% of the input data comes from any individual person, reducing the likelihood of significant intentional bias
   (though systematic bias may still be an issue).

### Weaknesses of approach

1. Wikipedia does not have the same language structure as news articles; there may be systematic errors with some common words.
2. In scoping to the English language, it is subject to the same bias that English-language Wikipedia has - which is well documented.

### Schedule

For this process to be reliable, it needs to use regularly updated data.

- The calculations based on word count frequency should be determined from new Wikipedia backups at least every 90 days (latest: 2020-12-20).
- The articles used to calculate should be recalculated from all articles from within the last 180 days, every day.

---

## Status

So far, a way has been developed to systematically attain an expected word frequency from Wikipedia.

| Step |      Name       |    Time |
| :--: | :-------------: | ------: |
|  1   | mirror download | 10 mins |
|  2   |     pbzip2      | <2 mins |
|  3   |  dumpster-dive  |  1 hour |
|  4   |   mongoexport   | 20 mins |
|  5   | word frequency  | 16 mins |

---

The results from the latest analysis are included in this repo:

- Top 1000 English language words by frequency in Wikipedia\*

> \* accented characters use their non-accented counterparts,
> a-z and hyphen considered valid, everything else (including apostrophes) considered word separators
>
> Only words that are found in [this dictionary](https://github.com/dwyl/english-words/blob/master/words_dictionary.json) are counted
> (the dictionary includes proper nouns)

[A description of this word frequency process is here.](https://tom.bio/blog/reading-every-word-on-wikipedia-using-node-js)
