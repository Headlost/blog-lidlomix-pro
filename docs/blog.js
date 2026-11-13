const communityApi = "https://lidlomix-pro-spolecznosc.heroicsquirrel3.chatgpt.site";

const publishedVersions = new Set(['0.15.0']);

function renderVersionMentions(element, value) {
  let offset = 0;
  for (const match of value.matchAll(/(?<![\w@.])@(\d+\.\d+\.\d+)(?![\w-]|\.\d)/g)) {
    const version = match[1];
    if (!publishedVersions.has(version)) continue;
    const link = document.createElement('a');
    link.className = 'version-mention';
    link.href = 'aktualizacje.html#wersja-' + version.replaceAll('.', '-');
    link.textContent = match[0];
    element.append(value.slice(offset, match.index), link);
    offset = match.index + match[0].length;
  }
  element.append(value.slice(offset));
}

const boardLinks = [...document.querySelectorAll('[data-board-link]')];
const boards = [...document.querySelectorAll('.forum-board')];
function selectBoard() {
  const hash = location.hash.slice(1);
  if (hash === 'connect' || hash === 'smart') {
    const signup = document.getElementById('aktualizacje');
    signup.open = true;
    signup.querySelector('select').value = hash === 'connect' ? 'Connect' : 'Smart';
    signup.scrollIntoView();
  }
  const boardId = boards.find(board => board.id === hash)?.id;
  const active = boardId || document.querySelector('.forum-board:not([hidden])')?.id || boards[0]?.id;
  for (const board of boards) board.hidden = board.id !== active;
  for (const link of boardLinks) {
    if (link.hash === '#' + active) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
  if (boardId) document.getElementById(boardId).scrollIntoView();
  const detail = ['zasady', 'aktualizacje', 'sprzet'].includes(hash) && document.getElementById(hash);
  if (detail) detail.open = true;
}
if (boards.length) {
  for (const link of document.querySelectorAll('[data-open-rules]')) {
    link.addEventListener('click', () => { document.getElementById('zasady').open = true; });
  }
  selectBoard();
  addEventListener('hashchange', selectBoard);
}

for (const section of document.querySelectorAll('[data-post]')) {
  const status = section.querySelector('[data-comments-status]');
  const list = section.querySelector('ul');
  const more = section.querySelector('.more-posts');
  const form = section.querySelector('form');
  const replyNote = form.querySelector('.reply-note');
  const post = section.dataset.post;
  const composer = form.closest('.topic-composer');
  const topicTitle = form.querySelector('[data-topic-title]');
  function setReply(id, name = '') {
    form.elements.replyTo.value = id;
    replyNote.hidden = !id;
    if (topicTitle) {
      topicTitle.hidden = !!id;
      topicTitle.querySelector('input').disabled = !!id;
    }
    if (composer) composer.querySelector('summary').textContent = id ? 'Napisz odpowiedź' : 'Załóż temat';
    replyNote.querySelector('span').textContent = id ? 'Odpowiedź do ' + name : '';
  }
  let cursor = '';
  let loading = false;

  function renderComment(comment) {
    const item = document.createElement('li');
    item.id = 'wpis-' + comment.id;
    const name = document.createElement('strong');
    const body = document.createElement('p');
    name.textContent = comment.name;
    renderVersionMentions(body, comment.body);
    if (comment.title) {
      const title = document.createElement('h3');
      renderVersionMentions(title, comment.title);
      item.append(title);
    }
    if (comment.replyTo) item.classList.add('forum-reply');
    item.append(name);
    if (comment.date) {
      const date = document.createElement('time');
      date.className = 'reply-meta';
      date.dateTime = comment.date;
      date.textContent = ' · ' + new Date(comment.date).toLocaleDateString('pl-PL');
      item.append(date);
    }

    if (comment.replyTo) {
      const parent = document.createElement('a');
      parent.className = 'reply-meta';
      parent.href = '#wpis-' + comment.replyTo;
      parent.textContent = 'Przejdź do wpisu, na który odpowiada';
      const line = document.createElement('div');
      line.append(parent);
      item.append(line);
    }
    item.append(body);

    if (comment.hasImage) {
      const url = communityApi + '/attachment?' + new URLSearchParams({post, id: comment.id});
      const link = document.createElement('a');
      const image = document.createElement('img');
      link.href = url;
      image.src = url;
      image.alt = 'Zrzut ekranu dołączony do zgłoszenia';
      image.loading = 'lazy';
      image.className = 'comment-image';
      link.append(image);
      item.append(link);
    }

    if (replyNote) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reply-button';
      button.textContent = 'Odpowiedz';
      button.addEventListener('click', () => {
        setReply(comment.replyTo || comment.id, comment.name);
        if (composer) composer.open = true;
        form.elements.body.focus();
      });
      item.append(button);
    }
    return item;
  }

  async function loadComments() {
    if (loading) return;
    loading = true;
    if (more) more.disabled = true;
    try {
      const params = new URLSearchParams({post, page: '1'});
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(communityApi + '/comments?' + params);
      if (!response.ok) throw new Error();
      const page = await response.json();
      for (const comment of page.comments) {
        if (document.getElementById('wpis-' + comment.id)) continue;
        list.append(renderComment(comment));
      }
      if (composer) {
        for (const reply of list.querySelectorAll('.forum-reply')) {
          const root = document.getElementById(reply.querySelector('.reply-meta[href]')?.hash.slice(1));
          if (!root || root.parentElement !== list) continue;
          let tail = root;
          while (tail.nextElementSibling?.dataset.thread === root.id) tail = tail.nextElementSibling;
          reply.dataset.thread = root.id;
          if (tail !== reply) tail.after(reply);
        }
      }
      cursor = page.next;
      status.textContent = list.children.length ? '' : 'Tu jeszcze nie ma wpisów.';
      if (more) more.hidden = !cursor;
    } catch {
      status.textContent = 'Nie udało się wczytać wpisów. Odśwież stronę, aby spróbować ponownie.';
    } finally {
      loading = false;
      if (more) more.disabled = false;
    }
  }
  more?.addEventListener('click', loadComments);
  replyNote?.querySelector('button').addEventListener('click', () => {
    setReply('');
    form.elements.body.focus();
  });
  form.addEventListener('reset', () => { if (replyNote) setReply(''); });
  loadComments();
}

async function encodeScreenshot(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1048576) {
    throw new Error('Wybierz plik PNG, JPG lub WebP do 1 MB.');
  }
  // Re-encode the pixels so the public attachment does not carry file metadata.
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/webp', .82);
    if (image.length > Math.ceil(1048576 / 3) * 4) throw new Error('Zrzut po przetworzeniu jest za duży.');
    return image.split(',')[1];
  } finally {
    bitmap.close();
  }
}

for (const form of document.querySelectorAll('[data-endpoint]')) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type=submit]');
    const status = form.querySelector('[role=status]');
    const data = Object.fromEntries(new FormData(form));
    const endpoint = form.dataset.endpoint;
    if (form.elements.consent) data.consent = form.elements.consent.checked;
    button.disabled = true;
    status.textContent = 'Wysyłam…';
    try {
      const screenshot = data.image;
      delete data.image;
      if (screenshot?.size) data.image = await encodeScreenshot(screenshot);
      const response = await fetch(communityApi + '/' + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Spróbuj ponownie za chwilę.');
      form.reset();
      const replyNote = form.querySelector('.reply-note');
      if (replyNote) replyNote.hidden = true;
      status.textContent = endpoint === 'comments'
        ? 'Dziękuję. Wpis czeka na zatwierdzenie.'
        : result.emailed ? 'Zapisano i przesłano zgłoszenie. Dziękuję!' : 'Zapisano zgłoszenie. Dziękuję!';
    } catch (error) {
      status.textContent = 'Nie udało się wysłać. ' + error.message;
    } finally {
      button.disabled = false;
    }
  });
}

document.querySelectorAll('[data-youtube]').forEach(button=>{const id=button.dataset.youtube;if(!/^[a-zA-Z0-9_-]{11}$/.test(id))return;button.addEventListener('click',()=>{const frame=document.createElement('iframe');frame.title='Film demonstracyjny Lidlomix Pro';frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;button.replaceWith(frame);frame.focus()})});