<template>
  <div class="wl-comment">
    <div v-if="config.login !== 'disable' && isLogin" class="wl-login-info">
      <div class="wl-avatar">
        <button class="wl-logout-btn" :title="locale.logout" @click="onLogout">
          <CloseIcon :size="14" />
        </button>

        <img :src="userInfo.avatar" alt="avatar" />
      </div>
      <a
        href="#"
        class="wl-login-nick"
        aria-label="Profile"
        @click="onProfile"
        v-text="userInfo.display_name"
      />
    </div>

    <div class="wl-panel">
      <div
        v-if="config.login !== 'force' && config.meta.length && !isLogin"
        :class="['wl-header', `item${config.meta.length}`]"
      >
        <div v-for="kind in config.meta" class="wl-header-item" :key="kind">
          <label
            :for="kind"
            v-text="
              locale[kind] +
              (config.requiredMeta.includes(kind) || !config.requiredMeta.length
                ? ''
                : `(${locale.optional})`)
            "
          />
          <input
            :ref="
              (element) => {
                if (element) inputRefs[kind] = element;
              }
            "
            :id="`wl-${kind}`"
            :class="['wl-input', `wl-${kind}`]"
            :name="kind"
            :type="kind === 'mail' ? 'email' : 'text'"
            v-model="userMeta[kind]"
          />
        </div>
      </div>

      <textarea
        class="wl-editor"
        ref="editorRef"
        id="wl-edit"
        :placeholder="replyUser ? `@${replyUser}` : locale.placeholder"
        v-model="editor"
        @keydown="onKeyDown"
        @drop="onDrop"
        @paste="onPaste"
      />

      <div class="wl-preview" v-show="showPreview">
        <hr />
        <h4>{{ locale.preview }}:</h4>
        <div class="wl-content" v-html="previewText" />
      </div>

      <div class="wl-footer">
        <div class="wl-actions">
          <a
            href="https://guides.github.com/features/mastering-markdown/"
            title="Markdown Guide"
            aria-label="Markdown is supported"
            class="wl-action"
            target="_blank"
            rel="noreferrer"
          >
            <MarkdownIcon />
          </a>

          <button
            v-show="emoji.tabs.length"
            ref="emojiButtonRef"
            class="wl-action"
            :class="{ actived: showEmoji }"
            :title="locale.emoji"
            @click="showEmoji = !showEmoji"
          >
            <EmojiIcon />
          </button>

          <input
            ref="imageUploadRef"
            class="upload"
            id="wl-image-upload"
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.bmp,.gif"
            @change="onChange"
          />

          <label
            v-if="canUploadImage"
            for="wl-image-upload"
            class="wl-action"
            :title="locale.uploadImage"
          >
            <ImageIcon />
          </label>

          <button
            class="wl-action"
            :class="{ actived: showPreview }"
            :title="locale.preview"
            @click="showPreview = !showPreview"
          >
            <PreviewIcon />
          </button>
        </div>

        <div class="wl-info">
          <div class="wl-text-number">
            {{ wordNumber }}

            <span v-if="config.wordLimit">
              &nbsp;/&nbsp;
              <span
                :class="{ illegal: !isWordNumberLegal }"
                v-text="wordLimit"
              />
            </span>

            &nbsp;{{ locale.word }}
          </div>

          <button
            v-if="config.login !== 'disable' && !isLogin"
            class="wl-btn"
            @click="onLogin"
            v-text="locale.login"
          />

          <button
            v-if="config.login !== 'force' || isLogin"
            class="wl-btn primary"
            title="Cmd|Ctrl + Enter"
            :disabled="isSubmitting"
            @click="submitComment"
          >
            <LoadingIcon v-if="isSubmitting" :size="16" />
            <template v-else>
              {{ locale.submit }}
            </template>
          </button>
        </div>

        <div
          ref="emojiPopupRef"
          class="wl-emoji-popup"
          :class="{ display: showEmoji }"
        >
          <template v-for="(config, index) in emoji.tabs" :key="config.name">
            <div v-if="index === emojiTabIndex" class="wl-tab-wrapper">
              <button
                v-for="key in config.items"
                :key="key"
                :title="key"
                @click="insert(`:${key}:`)"
              >
                <img
                  v-if="showEmoji"
                  class="wl-emoji"
                  :src="emoji.map[key]"
                  :alt="key"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </button>
            </div>
          </template>
          <div v-if="emoji.tabs.length > 1" class="wl-tabs">
            <button
              v-for="(config, index) in emoji.tabs"
              :key="config.name"
              class="wl-tab"
              :class="{ active: emojiTabIndex === index }"
              @click="emojiTabIndex = index"
            >
              <img
                class="wl-emoji"
                :src="config.icon"
                :alt="config.name"
                :title="config.name"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="replyId"
      class="wl-close"
      :title="locale.cancelReply"
      @click="$emit('cancel-reply')"
    >
      <CloseIcon :size="24" />
    </button>
  </div>
</template>

<script lang="ts">
import autosize from 'autosize';
import {
  computed,
  defineComponent,
  inject,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue';

import {
  CloseIcon,
  EmojiIcon,
  ImageIcon,
  MarkdownIcon,
  PreviewIcon,
  LoadingIcon,
} from './Icons';
import { useEditor, useUserMeta, useUserInfo } from '../composables';
import {
  getImagefromDataTransfer,
  parseMarkdown,
  getWordNumber,
  parseEmoji,
  postComment,
  getEmojis,
} from '../utils';

import type { ComputedRef, DeepReadonly } from 'vue';
import type { WalineCommentData, WalineImageUploader } from '../typings';
import type { WalineConfig, WalineEmojiConfig } from '../utils';

export default defineComponent({
  name: 'CommentBox',

  components: {
    CloseIcon,
    EmojiIcon,
    ImageIcon,
    MarkdownIcon,
    PreviewIcon,
    LoadingIcon,
  },

  props: {
    rootId: {
      type: String,
      default: '',
    },
    replyId: {
      type: String,
      default: '',
    },
    replyUser: {
      type: String,
      default: '',
    },
  },

  emits: ['submit', 'cancel-reply'],

  setup(props, { emit }) {
    const config = inject<ComputedRef<WalineConfig>>(
      'config'
    ) as ComputedRef<WalineConfig>;

    const editor = useEditor();
    const userMeta = useUserMeta();
    const userInfo = useUserInfo();

    const inputRefs = ref<Record<string, HTMLInputElement>>({});
    const editorRef = ref<HTMLTextAreaElement | null>(null);
    const imageUploadRef = ref<HTMLInputElement | null>(null);
    const emojiButtonRef = ref<HTMLDivElement | null>(null);
    const emojiPopupRef = ref<HTMLDivElement | null>(null);

    const emoji = ref<DeepReadonly<WalineEmojiConfig>>({ tabs: [], map: {} });
    const emojiTabIndex = ref(0);
    const showEmoji = ref(false);
    const showPreview = ref(false);
    const previewText = ref('');
    const wordNumber = ref(0);

    const wordLimit = ref(0);
    const isWordNumberLegal = ref(false);

    const content = ref('');

    const isSubmitting = ref(false);

    const locale = computed(() => config.value.locale);

    const isLogin = computed(() => Boolean(userInfo.value?.token));

    const canUploadImage = computed(() => config.value.imageUploader !== false);

    const insert = (content: string): void => {
      const textArea = editorRef.value as HTMLTextAreaElement;
      const startPosition = textArea.selectionStart;
      const endPosition = textArea.selectionEnd || 0;
      const scrollTop = textArea.scrollTop;

      editor.value =
        textArea.value.substring(0, startPosition) +
        content +
        textArea.value.substring(endPosition, textArea.value.length);
      textArea.focus();
      textArea.selectionStart = startPosition + content.length;
      textArea.selectionEnd = startPosition + content.length;
      textArea.scrollTop = scrollTop;
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      const key = event.key;

      // Shortcut key
      if ((event.ctrlKey || event.metaKey) && key === 'Enter') submitComment();
    };

    const uploadImage = (file: File): Promise<void> => {
      const uploadText = `![${config.value.locale.uploading} ${file.name}]()`;

      insert(uploadText);

      return Promise.resolve()
        .then(() => (config.value.imageUploader as WalineImageUploader)(file))
        .then((url) => {
          editor.value = editor.value.replace(
            uploadText,
            `\r\n![${file.name}](${url})`
          );
        });
    };

    const onDrop = (event: DragEvent): void => {
      if (event.dataTransfer?.items) {
        const file = getImagefromDataTransfer(event.dataTransfer.items);

        if (file && canUploadImage.value) {
          uploadImage(file);
          event.preventDefault();
        }
      }
    };

    const onPaste = (event: ClipboardEvent): void => {
      if (event.clipboardData) {
        const file = getImagefromDataTransfer(event.clipboardData.items);

        if (file && canUploadImage.value) uploadImage(file);
      }
    };

    const onChange = (): void => {
      const inputElement = imageUploadRef.value as HTMLInputElement;

      if (inputElement.files && canUploadImage.value)
        uploadImage(inputElement.files[0]).then(() => {
          // clear input so a same image can be uploaded later
          inputElement.value = '';
        });
    };

    const submitComment = (): void => {
      const { serverURL, lang, login, wordLimit, requiredMeta } = config.value;

      const comment: WalineCommentData = {
        comment: content.value,
        nick: userMeta.value.nick,
        mail: userMeta.value.mail,
        link: userMeta.value.link,
        ua: navigator.userAgent,
        url: config.value.path,
      };

      if (userInfo.value?.token) {
        // login user

        comment.nick = userInfo.value.display_name;
        comment.mail = userInfo.value.email;
        comment.link = userInfo.value.url;
      } else {
        if (login === 'force') return;

        // check nick
        if (requiredMeta.indexOf('nick') > -1 && !comment.nick) {
          inputRefs.value.nick?.focus();
          return alert(locale.value.nickError);
        }

        // check mail
        if (
          (requiredMeta.indexOf('mail') > -1 && !comment.mail) ||
          (comment.mail &&
            !/^\w(?:[\w._-]*\w)?@(?:\w(?:[\w-]*\w)?\.)*\w+$/.exec(comment.mail))
        ) {
          inputRefs.value.mail?.focus();
          return alert(locale.value.mailError);
        }

        // check comment
        if (!comment.comment) {
          editorRef.value?.focus();
          return;
        }

        if (!comment.nick) comment.nick = locale.value.anonymous;
      }

      if (!isWordNumberLegal.value)
        return alert(
          locale.value.wordHint
            .replace('$0', (wordLimit as [number, number])[0].toString())
            .replace('$1', (wordLimit as [number, number])[1].toString())
            .replace('$2', wordNumber.value.toString())
        );

      comment.comment = parseEmoji(comment.comment, emoji.value.map);

      if (props.replyId && props.rootId) {
        comment.pid = props.replyId;
        comment.rid = props.rootId;
        comment.at = props.replyUser;
      }

      isSubmitting.value = true;

      postComment({
        serverURL,
        lang,
        token: userInfo.value?.token,
        comment,
      })
        .then((resp) => {
          isSubmitting.value = false;

          if (resp.errmsg) return alert(resp.errmsg);

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          emit('submit', resp.data!);

          editor.value = '';

          previewText.value = '';

          if (props.replyId) emit('cancel-reply');
        })
        .catch((err: TypeError) => {
          isSubmitting.value = false;

          alert(err.message);
        });
    };

    const onLogin = (event: Event): void => {
      event.preventDefault();
      const { lang, serverURL } = config.value;

      const width = 450;
      const height = 450;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      const handler = window.open(
        `${serverURL}/ui/login?lng=${encodeURIComponent(lang)}`,
        '_blank',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no`
      );

      handler?.postMessage({ type: 'TOKEN', data: null }, '*');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const receiver = ({ data }: any): void => {
        if (!data || data.type !== 'userInfo') return;

        if (data.data.token) {
          handler?.close();
          userInfo.value = data.data;
          (data.data.remember ? localStorage : sessionStorage).setItem(
            'WALINE_USER',
            JSON.stringify(data.data)
          );

          window.removeEventListener('message', receiver);
        }
      };

      window.addEventListener('message', receiver);
    };

    const onLogout = (): void => {
      userInfo.value = {};
      localStorage.setItem('WALINE_USER', 'null');
      sessionStorage.setItem('WALINE_USER', 'null');
    };

    const onProfile = (event: Event): void => {
      event.preventDefault();

      const { lang, serverURL } = config.value;

      const width = 800;
      const height = 800;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      const handler = window.open(
        `${serverURL}/ui/profile?lng=${encodeURIComponent(lang)}`,
        '_blank',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no`
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      handler?.postMessage({ type: 'TOKEN', data: userInfo.value!.token }, '*');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const receiver = ({ data }: any): void => {
        if (!data || data.type !== 'profile') return;

        userInfo.value = { ...userInfo.value, ...data };

        [localStorage, sessionStorage]
          .filter((store) => store.getItem('WALINE_USER'))
          .forEach((store) =>
            store.setItem('WALINE_USER', JSON.stringify(userInfo))
          );
        window.removeEventListener('message', receiver);
      };

      window.addEventListener('message', receiver);
    };

    const popupHandler = (event: MouseEvent): void => {
      if (
        !(emojiButtonRef.value as HTMLElement).contains(event.target as Node) &&
        !(emojiPopupRef.value as HTMLElement).contains(event.target as Node)
      )
        showEmoji.value = false;
    };

    // update wordNumber
    watch(
      [config, wordNumber],
      ([config, wordNumber]) => {
        const { wordLimit: limit } = config;

        if (limit) {
          if (wordNumber < limit[0] && limit[0] !== 0) {
            wordLimit.value = limit[0];
            isWordNumberLegal.value = false;
          } else if (wordNumber > limit[1]) {
            wordLimit.value = limit[1];
            isWordNumberLegal.value = false;
          } else {
            wordLimit.value = limit[1];
            isWordNumberLegal.value = true;
          }
        } else {
          wordLimit.value = 0;
          isWordNumberLegal.value = true;
        }
      },
      { immediate: true }
    );

    onMounted(() => {
      document.body.addEventListener('click', popupHandler);

      // watch editor
      watch(
        () => editor.value,
        (value) => {
          const { highlighter, texRenderer } = config.value;

          content.value = value;
          previewText.value = parseMarkdown(value, {
            emojiMap: emoji.value.map,
            highlighter,
            texRenderer,
          });
          wordNumber.value = getWordNumber(value);

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          if (value) autosize(editorRef.value!);
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          else autosize.destroy(editorRef.value!);
        },
        { immediate: true }
      );

      // watch emoji value change
      watch(
        () => config.value.emoji,
        (emojiConfig) =>
          getEmojis(Array.isArray(emojiConfig) ? emojiConfig : []).then(
            (config) => {
              emoji.value = config;
            }
          ),
        { immediate: true }
      );
    });

    onUnmounted(() => {
      document.body.removeEventListener('click', popupHandler);
    });

    return {
      // config
      config,
      locale,

      // events
      insert,
      onChange,
      onDrop,
      onKeyDown,
      onPaste,
      onLogin,
      onLogout,
      onProfile,
      submitComment,

      isLogin,
      userInfo,
      isSubmitting,

      // word
      wordNumber,
      wordLimit,
      isWordNumberLegal,

      // inputs
      editor,
      userMeta,

      // emoji
      emoji,
      emojiTabIndex,
      showEmoji,

      // image
      canUploadImage,

      // preview
      previewText,
      showPreview,

      // ref
      inputRefs,
      editorRef,
      emojiButtonRef,
      emojiPopupRef,
      imageUploadRef,
    };
  },
});
</script>
