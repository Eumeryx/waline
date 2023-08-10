const { marked } = require('marked');

const { resolveHighlighter } = require('./highlight');
const { katexRenderer } = require('./katex');
const { markedTexExtensions } = require('./markedMathExtension');
const { sanitize } = require('./xss');

const getMarkdownParser = () => {
  const { markdown = {} } = think.config();
  const { config = {} } = markdown;

  // marked
  marked.setOptions({
    breaks: true,
    headerIds: false,
    smartypants: true,

    // default highlight
    highlight: (code, lang) => {
      const highlighter = resolveHighlighter(lang);

      return highlighter ? highlighter(code) : code;
    },

    ...config,
  });

  marked.use(markedTexExtensions);

  return (content) => katexRenderer(sanitize(marked(content))).innerHTML;
};

module.exports = { getMarkdownParser };
