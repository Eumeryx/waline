const katex = require('katex');

require('katex/contrib/mhchem');

const katexRenderer = (htmlElement) => {
  for (const t of htmlElement.getElementsByClassName('tex')) {
    t.innerHTML = katex.renderToString(t.textContent, {
      output: 'html',
      throwOnError: false,
      displayMode: t.classList.contains('tex-block'),
      strict: (errorCode) => (errorCode === 'htmlExtension' ? true : 'warn'),
    });
  }

  return htmlElement;
};

module.exports = { katexRenderer };
