import { type WalineEmojiMaps } from '../typings/index.js';

export const parseEmoji = (text = '', emojiMap: WalineEmojiMaps = {}): string =>
  text.replace(/:(.+?):/g, (placeholder, key: string) =>
    emojiMap[key]
      ? `<img class="wl-emoji" src="${emojiMap[key]}" alt="${key}">`
      : placeholder
  );

export const parseMarkdown = (
  content: string,
  emojiMap: WalineEmojiMaps
): Promise<string> =>
  import('./markedLazy.js')
    .then(({ MD }) => MD(parseEmoji(content, emojiMap)))
    .catch(
      () =>
        '<p>The markdown renderer failed to load, but you can still comment.</p>'
    );
