(() => {
  const forum = document.getElementById('forum');
  if (!forum || !forumCopy) return;

  const language = document.documentElement.lang;
  const dateFormat = new Intl.DateTimeFormat(language, { dateStyle: 'medium' });
  const languageName = new Intl.DisplayNames([language], { type: 'language' });
  const languages = new Set(['pl', 'en', 'de', 'fr', 'it', 'es']);
  const archivedTest = '07df4be5-7d0c-47bb-a085-46c2b04534ee';
  const panels = new Map();
  const categories = [...forum.querySelectorAll('[data-board]')];
  for (const link of categories) {
    const pinned = forumCopy.pinnedTopics[link.dataset.board];
    const comments = new Map(pinned.map(topic => [topic.id, { ...topic, pinned: true }]));
    panels.set(link.dataset.board, { comments, cursor: null, loaded: false });
  }
  const panel = forum.querySelector('.topic-panel');
  const list = forum.querySelector('[data-topic-list]');
  const pinnedSection = forum.querySelector('[data-pinned-section]');
  const pinnedList = forum.querySelector('[data-pinned-list]');
  const allLanguages = forum.querySelector('[data-all-languages]');
  const status = forum.querySelector('[data-topic-status]');
  const search = forum.querySelector('[data-topic-search]');
  const more = forum.querySelector('[data-topic-more]');
  const retry = forum.querySelector('[data-topic-retry]');
  const composer = document.getElementById('forum-composer');
  const form = composer.querySelector('form');
  const picture = document.getElementById('forum-image');
  let board = categories[0].dataset.board;
  let openTopic = '';
  let scrollToTopic = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function normalize(value) {
    return value.toLocaleLowerCase(language).normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ł', 'l');
  }

  function metadata(comment) {
    const meta = element('span', 'topic-meta', comment.name);
    const parsed = Date.parse(comment.date);
    if (Number.isFinite(parsed)) {
      const date = element('time', '', dateFormat.format(parsed));
      date.dateTime = comment.date;
      meta.append(' · ', date);
    }
    const locale = topicLanguage(comment);
    if (!comment.pinned && locale !== language) meta.append(' · ', languageName.of(locale));
    return meta;
  }

  function topicLanguage(comment) {
    return languages.has(comment.locale) ? comment.locale : 'pl';
  }

  function attachment(comment) {
    const url = communityApi + '/attachment?' + new URLSearchParams({ post: board, id: comment.id });
    const link = element('a', 'forum-attachment');
    link.href = url;
    const image = element('img', '', '');
    image.src = url;
    image.alt = forumCopy.attachment;
    image.loading = 'lazy';
    link.append(image, element('span', '', forumCopy.enlarge));
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      picture.querySelector('img').src = url;
      picture.showModal();
    });
    return link;
  }

  function postBody(comment, isReply = false) {
    const post = element('div', isReply ? 'forum-reply-content' : 'forum-root-content');
    if (isReply) post.append(metadata(comment));
    if (!isReply && comment.title?.includes('@')) {
      const version = element('p', 'forum-message');
      renderVersionMentions(version, comment.title);
      if (version.querySelector('a')) post.append(version);
    }
    const message = element('p', 'forum-message');
    renderVersionMentions(message, comment.body);
    post.append(message);
    if (comment.guide) {
      const link = element('a', '', forumCopy.installationGuide);
      link.href = 'instalacja.html';
      post.append(link);
    }
    if (comment.recipeUrl) {
      try {
        const url = new URL(comment.recipeUrl);
        if (url.protocol === 'https:' && !url.username && !url.password) {
          const link = element('a', 'forum-recipe-link', forumCopy.openRecipeSource + ' · ' + url.hostname);
          link.href = url.href;
          link.rel = 'ugc nofollow noopener';
          post.append(link);
        }
      } catch {
        // An invalid address should not prevent the post from being read.
      }
    }
    if (comment.hasImage) post.append(attachment(comment));
    return post;
  }

  function compose(root = null) {
    const topicTitle = form.querySelector('[data-topic-title]');
    const imageField = form.querySelector('[data-topic-attachment]');
    const recipeField = form.querySelector('[data-recipe-source]');
    const replyTo = root?.id || '';
    if (form.elements.post.value !== board || form.elements.replyTo.value !== replyTo) form.reset();
    form.elements.post.value = board;
    form.elements.replyTo.value = replyTo;
    topicTitle.hidden = Boolean(root);
    form.elements.title.disabled = Boolean(root);
    imageField.hidden = board !== 'zgloszenia';
    form.elements.image.disabled = imageField.hidden;
    recipeField.hidden = board !== 'rozmowy-ai';
    form.elements.recipeUrl.disabled = recipeField.hidden;
    document.getElementById('compose-title').textContent = root
      ? forumCopy.replyTo.replace('{name}', () => root.name)
      : forumCopy.newTopic;
    form.querySelector('[role=status]').textContent = '';
    composer.showModal();
    (root ? form.elements.body : form.elements.title).focus();
  }

  function displayTopic(root, replies) {
    const details = element('details', 'forum-topic');
    details.id = 'wpis-' + root.id;
    details.name = 'forum-topics';
    details.open = openTopic === root.id;
    const summary = element('summary', 'forum-topic-summary');
    const label = element('span', 'topic-label');
    const title = root.title || root.body.trim().split('\n')[0].slice(0, 90);
    const heading = element('strong', 'topic-title', title);
    if (!root.pinned) heading.lang = topicLanguage(root);
    label.append(heading, metadata(root));
    const indicators = element('span', 'topic-indicators');
    if (root.hasImage || replies.some(reply => reply.hasImage)) {
      indicators.append(element('span', 'attachment-note', forumCopy.attachment));
    }
    const count = element('span', 'reply-count', String(replies.length));
    count.title = forumCopy.replies + ' ' + replies.length;
    count.setAttribute('aria-label', count.title);
    indicators.append(count);
    summary.append(label, indicators);
    const body = element('div', 'forum-topic-body');
    const content = postBody(root);
    if (!root.pinned) content.lang = topicLanguage(root);
    body.append(content);
    if (replies.length) {
      const thread = element('div', 'forum-replies');
      thread.append(element('h4', '', forumCopy.replies));
      for (const reply of replies) {
        const post = postBody(reply, true);
        post.lang = topicLanguage(reply);
        thread.append(post);
      }
      body.append(thread);
    }
    const reply = element('button', 'forum-neutral', forumCopy.reply);
    reply.type = 'button';
    reply.addEventListener('click', () => compose(root));
    body.append(reply);
    details.append(summary, body);
    const topicBoard = board;
    details.addEventListener('toggle', () => {
      const routedBoard = location.hash.slice(1).split('/')[0];
      if (!details.isConnected || (panels.has(routedBoard) && routedBoard !== topicBoard)) return;
      if (details.open === (openTopic === root.id)) return;
      openTopic = details.open ? root.id : '';
      history.replaceState(null, '', '#' + topicBoard + (openTopic ? '/wpis-' + openTopic : ''));
      syncLanguageLinks();
    });
    return details;
  }

  function groupTopics(comments) {
    const groups = new Map();
    for (const comment of comments.values()) {
      let root = comment;
      const visited = new Set();
      while (root.replyTo && comments.has(root.replyTo) && !visited.has(root.replyTo)) {
        visited.add(root.id);
        root = comments.get(root.replyTo);
      }
      if (!groups.has(root.id)) groups.set(root.id, { root, replies: [], latest: root.date || '' });
      const group = groups.get(root.id);
      if (comment !== root) group.replies.push(comment);
      if (comment.date > group.latest) group.latest = comment.date;
    }
    return [...groups.values()];
  }

  function render() {
    const state = panels.get(board);
    const term = normalize(search.value.trim());
    const topics = groupTopics(state.comments).filter(({ root }) =>
      root.pinned || allLanguages.checked || topicLanguage(root) === language
    ).map(group => ({
      ...group,
      replies: group.replies.filter(reply => allLanguages.checked || topicLanguage(reply) === language),
    })).filter(({ root, replies }) =>
      !term || [root, ...replies].some(comment =>
        normalize([comment.title, comment.name, comment.body].filter(Boolean).join(' ')).includes(term)
      )
    );
    const row = ({ root, replies }) => {
      replies.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      return displayTopic(root, replies);
    };
    const pinned = topics.filter(({ root }) => root.pinned);
    const community = topics.filter(({ root }) => !root.pinned).sort((a, b) => b.latest.localeCompare(a.latest));
    pinnedSection.hidden = !pinned.length;
    pinnedList.replaceChildren(...pinned.map(row));
    list.replaceChildren(...community.map(row));
    status.textContent = state.error ? forumCopy.loadError
      : state.loading ? forumCopy.loading
        : community.length || (term && pinned.length) ? '' : term ? forumCopy.noMatch : forumCopy.empty;
    more.hidden = !state.cursor || state.error;
    more.disabled = Boolean(state.loading);
    retry.hidden = !state.error;
    if (scrollToTopic && openTopic) {
      const wanted = document.getElementById('wpis-' + openTopic);
      if (wanted) {
        scrollToTopic = false;
        wanted.scrollIntoView({ block: 'start' });
      }
    }
  }

  async function load(key) {
    const state = panels.get(key);
    if (state.loading) return;
    state.loading = true;
    state.error = false;
    if (board === key) render();
    try {
      const params = new URLSearchParams({ post: key, page: '1' });
      if (state.cursor) params.set('cursor', state.cursor);
      const response = await fetch(communityApi + '/comments?' + params, { signal: AbortSignal.timeout(7500) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!Array.isArray(data.comments)) throw new Error();
      await releasesReady;
      for (const comment of data.comments) {
        if (comment.id !== archivedTest && comment.replyTo !== archivedTest && !state.comments.get(comment.id)?.pinned) {
          state.comments.set(comment.id, comment);
        }
      }
      if (openTopic && board === key && scrollToTopic) {
        const requested = state.comments.get(openTopic);
        if (requested && !requested.pinned && topicLanguage(requested) !== language) allLanguages.checked = true;
      }
      state.cursor = data.next;
      state.loaded = true;
    } catch {
      state.error = true;
    } finally {
      state.loading = false;
      if (board === key) render();
    }
    if (!state.error && state.cursor && board === key && scrollToTopic && !state.comments.has(openTopic)) {
      load(key);
    }
  }

  function selectBoard(key, topic = '') {
    if (board !== key) search.value = '';
    board = key;
    openTopic = topic;
    const index = categories.findIndex(link => link.dataset.board === key);
    for (const link of categories) {
      if (link.dataset.board === key) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    panel.id = key;
    document.getElementById('board-title').textContent = forumCopy.boardNames[index];
    forum.querySelector('[data-board-description]').textContent = forumCopy.boardDescriptions[index];
    const state = panels.get(key);
    const requested = state.comments.get(topic);
    if (requested && !requested.pinned && topicLanguage(requested) !== language) allLanguages.checked = true;
    if (!state.loaded && !state.loading) load(key);
    else render();
  }

  function syncLanguageLinks() {
    for (const link of document.querySelectorAll('.site-languages a')) link.hash = location.hash;
  }

  function selectRoute() {
    const [key, thread] = location.hash.slice(1).split('/');
    const topic = (thread || key).startsWith('wpis-') ? (thread || key).slice(5) : '';
    scrollToTopic = Boolean(topic);
    selectBoard(panels.has(key) ? key : board, topic);
    if (['zasady', 'aktualizacje', 'sprzet', 'connect', 'smart'].includes(key)) {
      const target = document.getElementById(key === 'connect' || key === 'smart' ? 'aktualizacje' : key);
      target.open = true;
      if (key === 'connect' || key === 'smart') target.querySelector('select').value = key === 'connect' ? 'Connect' : 'Smart';
      target.scrollIntoView({ block: 'start' });
    }
    syncLanguageLinks();
  }

  forum.querySelector('[data-forum-preview]').hidden = !forumPreview;
  forum.querySelector('[data-compose]').addEventListener('click', () => compose());
  search.addEventListener('input', render);
  allLanguages.addEventListener('change', render);
  more.addEventListener('click', () => load(board));
  retry.addEventListener('click', () => load(board));
  for (const close of forum.querySelectorAll('[data-close-dialog]')) {
    close.addEventListener('click', () => close.closest('dialog').close());
  }
  for (const link of forum.querySelectorAll('[data-open-rules]')) {
    link.addEventListener('click', () => {
      if (composer.open) composer.close();
      document.getElementById('zasady').open = true;
    });
  }
  picture.addEventListener('close', () => picture.querySelector('img').removeAttribute('src'));
  form.addEventListener('comment-published', ({ detail }) => {
    const state = panels.get(detail.post || board);
    if (!state) return;
    state.comments.set(detail.id, detail);
    if (state === panels.get(board)) {
      openTopic = detail.replyTo || detail.id;
      search.value = '';
      history.replaceState(null, '', '#' + board + '/wpis-' + openTopic);
      syncLanguageLinks();
      render();
    }
  });
  addEventListener('hashchange', selectRoute);
  selectRoute();
})();
