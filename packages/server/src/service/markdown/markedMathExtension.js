const { escapeHtml } = require('./utils');

const inlineMathStart = /\B\$\S(?:.*?\S)?\$\B/;
const inlineMathReg = /^\$(\S(?:.*?\S)?)\$\B/;
const blockMathReg = /^\s{0,3}\$\$((?:.|\n.)+?)\n?\$\$/;

const markedTexExtensions = {
  extensions: [
    {
      name: 'blockMath',
      level: 'block',
      tokenizer(src) {
        const cap = blockMathReg.exec(src);

        if (cap !== null) {
          return {
            type: 'html',
            raw: cap[0],
            text: `<span class="tex tex-block">${escapeHtml(cap[1])}</span>`,
          };
        }

        return undefined;
      },
    },
    {
      name: 'inlineMath',
      level: 'inline',
      start(src) {
        return src.search(inlineMathStart);
      },
      tokenizer(src) {
        const cap = inlineMathReg.exec(src);

        if (cap !== null) {
          return {
            type: 'html',
            raw: cap[0],
            text: `<span class="tex tex-inline">${escapeHtml(cap[1])}</span>`,
          };
        }

        return undefined;
      },
    },
  ],
};

module.exports = { markedTexExtensions };
