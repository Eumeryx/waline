import { marked } from 'marked';

import { defaultHighlighter } from '../config';

type TexToken = {
  type: string;
  raw: string;
  text: string;
  block: boolean;
};

const texTokens: TexToken[] = [];

const inlineMathStart = /\B\$\S(?:.*?\S)?\$\B/;
const inlineMathReg = /^\$(\S(?:.*?\S)?)\$\B/;
const blockMathReg = /^\s{0,3}\$\$((?:.|\n.)+?)\n?\$\$/;

export const markedTexExtensions: marked.TokenizerExtension[] = [
  {
    name: 'blockMath',
    level: 'block',
    tokenizer(src: string): TexToken | void {
      const cap = blockMathReg.exec(src);

      if (cap !== null) {
        const token = {
          type: 'html',
          raw: cap[0],
          text: cap[1],
          block: true,
        };

        texTokens.push(token);

        return token;
      }
    },
  },

  {
    name: 'inlineMath',
    level: 'inline',
    start(src: string): number {
      return src.search(inlineMathStart);
    },
    tokenizer(src: string): TexToken | void {
      const cap = inlineMathReg.exec(src);

      if (cap !== null) {
        const token = {
          type: 'html',
          raw: cap[0],
          text: cap[1],
          block: false,
        };

        texTokens.push(token);

        return token;
      }
    },
  },
];

marked.use({
  breaks: true,
  headerIds: false,
  smartypants: true,
  extensions: markedTexExtensions,
  highlight: (code, lang) => (lang ? defaultHighlighter(code) : undefined),
});

export const MD = async (content: string): Promise<string> => {
  const tokens = marked.Lexer.lex(content);

  for (const t of texTokens) {
    t.text = await import('./katexLazy.js')
      .then(({ KaTeX }) => KaTeX(t.block, t.text))
      .catch(
        () =>
          '<span class="wl-tex">The KaTeX renderer failed to load, but you can still comment.</span>'
      );
  }
  texTokens.length = 0;

  if (marked.defaults.walkTokens) {
    marked.walkTokens(tokens, marked.defaults.walkTokens);
  }

  return marked.Parser.parse(tokens);
};
