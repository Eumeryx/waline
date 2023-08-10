import katex from 'katex';
import 'katex/contrib/mhchem';

export const KaTeX = (blockMode: boolean, tex: string): string =>
  katex.renderToString(tex, {
    displayMode: blockMode,
    throwOnError: false,
    output: 'html',
    strict: (errorCode: string) =>
      errorCode === 'htmlExtension' ? true : 'warn',
  });
