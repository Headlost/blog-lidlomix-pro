const dialog = document.getElementById('owner-panel');
const login = dialog.querySelector('#panel-login');
const area = dialog.querySelector('#panel-area');
const status = dialog.querySelector('#panel-status');
const output = dialog.querySelector('#panel-entries');
const passwordField = login.elements.password;
const releaseForm = dialog.querySelector('#panel-release');
const more = dialog.querySelector('#panel-more');
const roleField = login.elements.role;
const filters = dialog.querySelector('#panel-filters');
const localeFilter = filters.querySelector('[name=locale]');
const boardFilter = filters.querySelector('[name=board]');
const views = [...area.querySelectorAll('[data-panel-kind]')];
const languages = new Map([...document.querySelectorAll('.site-languages a')].map(link => [link.lang, link.textContent]));
const boardNames = new Map([...boardFilter.options].map(option => [option.value, option.textContent]));
for (const [code, name] of languages) localeFilter.add(new Option(name, code));
const localPanel = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
login.querySelector('#panel-preview-note').hidden = !localPanel;
const approval = dialog.querySelector('#panel-approval');
const logout = dialog.querySelector('#panel-logout');
let credentials;
let activeKind = 'pending';
let requestId = 0;
let approvalRequired;

function showApproval(required) {
  approvalRequired = required;
  approval.hidden = filters.hidden || typeof required !== 'boolean';
  approval.textContent = required ? 'Wyłącz zatwierdzanie nowych wpisów' : 'Włącz zatwierdzanie nowych wpisów';
}

approval.addEventListener('click', async () => {
  const session = credentials;
  approval.disabled = true;
  try {
    const result = await callPanel('setForumApproval', { required: !approvalRequired }, session);
    if (credentials !== session) return;
    showApproval(result.approvalRequired);
    status.textContent = approvalRequired ? 'Nowe wpisy będą czekać na zatwierdzenie.' : 'Nowe wpisy będą publikowane od razu.';
  } catch (error) {
    if (credentials === session) status.textContent = error.message;
  } finally {
    approval.disabled = false;
  }
});

function lockPanel() {
  credentials = undefined;
  showApproval(undefined);
  requestId++;
  login.reset();
  dialog.querySelector('#panel-roles').reset();
  dialog.querySelector('#panel-moderator').open = false;
  releaseForm.reset();
  releaseForm.hidden = true;
  more.hidden = true;
  filters.hidden = true;
  localeFilter.value = '';
  boardFilter.value = '';
  login.hidden = false;
  logout.hidden = true;
  area.hidden = true;
  output.replaceChildren();
  status.textContent = '';
}

async function callPanel(action, fields = {}, auth = credentials) {
  const endpoint = localPanel ? '/__forum/panel' : 'https://lidlomix-pro-spolecznosc.heroicsquirrel3.chatgpt.site/panel';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...auth, ...fields, action })
  });
  if (action === 'preview' && response.ok) return response.blob();
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Nie udało się wykonać operacji.');
  return result;
}

async function loadEntries(kind, cursor = '') {
  activeKind = kind;
  releaseForm.hidden = true;
  const forumView = kind === 'pending' || kind === 'published';
  filters.hidden = !forumView;
  approval.hidden = !forumView || typeof approvalRequired !== 'boolean';
  for (const tab of views) tab.setAttribute('aria-pressed', String(tab.dataset.panelKind === kind));
  const currentRequest = ++requestId;
  const selected = forumView ? { locale: localeFilter.value, board: boardFilter.value } : {};
  more.hidden = true;
  if (!cursor) output.textContent = 'Wczytywanie…';
  let result;
  try {
    result = await callPanel('list', { kind, cursor, ...selected });
  } catch (error) {
    if (requestId !== currentRequest) return;
    output.replaceChildren();
    throw error;
  }
  if (currentRequest !== requestId) return;
  const { entries, next } = result;
  if (!approval.disabled) showApproval(result.approvalRequired);
  output.replaceChildren();
  if (!entries.length) output.textContent = next ? 'Na tej stronie nie ma pasujących wpisów.' : 'Brak pasujących wpisów.';
  for (const { id, record } of entries) {
    const card = document.createElement('article');
    const label = document.createElement('strong');
    const body = document.createElement('p');
    label.textContent = [record.title, record.name, record.model, [record.postalCode, record.city].filter(Boolean).join(' '), record.email].filter(Boolean).join(' · ');
    card.append(label);
    if (forumView) {
      const lang = languages.has(record.locale) ? record.locale : 'pl';
      const meta = document.createElement('p');
      meta.className = 'panel-entry-meta';
      meta.textContent = [boardNames.get(record.post), languages.get(lang), record.replyTo && 'Odpowiedź'].filter(Boolean).join(' · ');
      card.append(meta);
      if (kind === 'published') {
        const link = document.createElement('a');
        link.href = (lang === 'pl' ? '' : lang + '/') + 'spolecznosc.html#' + record.post + '/wpis-' + (record.replyTo || id);
        link.textContent = 'Otwórz na forum';
        card.append(link);
      }
    }
    const date = new Date(record.date);
    const dateLabel = Number.isFinite(date.valueOf()) ? new Intl.DateTimeFormat('pl', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '';
    body.textContent = [record.body, record.description, record.recipeUrl, dateLabel].filter(Boolean).join('\n');
    card.append(body);
    if (kind === 'pending') {
      const actions = document.createElement('div');
      actions.className = 'panel-actions';
      for (const [action, text] of [['approve','Zatwierdź'], ['reject','Odrzuć'], ['preview','Pokaż załącznik']]) {
        if (action === 'preview' && !record.hasImage) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const session = credentials;
            const result = await callPanel(action, { id });
            if (credentials !== session || !card.isConnected) return;
            if (action === 'preview') {
              const image = document.createElement('img');
              image.alt = 'Załącznik oczekujący na moderację';
              const url = URL.createObjectURL(result);
              image.onload = image.onerror = () => URL.revokeObjectURL(url);
              image.src = url;
              card.append(image);
              button.hidden = true;
            } else {
              await loadEntries(activeKind);
              status.textContent = action === 'approve' ? 'Zatwierdzono wpis.' : 'Odrzucono wpis.';
            }
          } catch (error) { status.textContent = error.message; }
          finally { button.disabled = false; }
        });
        actions.append(button);
      }
      card.append(actions);
    }
    output.append(card);
  }
  more.hidden = !next;
  more.onclick = next ? () => loadEntries(kind, next).catch(error => { status.textContent = error.message; }) : null;
}

login.addEventListener('submit', async event => {
  event.preventDefault();
  const button = login.querySelector('button');
  button.disabled = true;
  try {
    const session = { password: passwordField.value, role: roleField.value };
    credentials = session;
    await loadEntries('pending');
    if (!dialog.open || credentials !== session) return;
    login.hidden = true;
    logout.hidden = false;
    passwordField.value = '';
    area.hidden = false;
    for (const node of area.querySelectorAll('[data-admin-only]')) node.hidden = credentials.role !== 'admin';
    status.textContent = credentials.role === 'admin' ? 'Zalogowano jako administrator.' : 'Zalogowano jako moderator.';
  } catch (error) {
    credentials = undefined;
    status.textContent = error.message;
  } finally { button.disabled = false; }
});
function viewEntries(kind) {
  status.textContent = '';
  loadEntries(kind).catch(error => { status.textContent = error.message; });
}
for (const button of views) {
  button.addEventListener('click', () => viewEntries(button.dataset.panelKind));
}
filters.addEventListener('change', () => viewEntries(activeKind));
dialog.querySelector('#panel-releases-toggle').addEventListener('click', () => {
  requestId++;
  output.replaceChildren();
  more.hidden = true;
  filters.hidden = true;
  approval.hidden = true;
  for (const tab of views) tab.setAttribute('aria-pressed', 'false');
  status.textContent = '';
  releaseForm.hidden = false;
  releaseForm.elements.version.focus();
});
releaseForm.addEventListener('submit', async event => {
  event.preventDefault();
  const session = credentials;
  const data = Object.fromEntries(new FormData(releaseForm));
  const button = releaseForm.querySelector('button');
  button.disabled = true;
  try {
    await callPanel('saveRelease', data, session);
    if (credentials !== session) return;
    releaseForm.reset();
    status.textContent = 'Opublikowano wersję ' + data.version + '.';
  } catch (error) {
    if (credentials === session) status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
dialog.querySelector('#panel-roles').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const session = credentials;
    await callPanel('setModerator', { newPassword: event.target.elements.newPassword.value });
    if (credentials !== session) return;
    event.target.reset();
    status.textContent = 'Zapisano hasło moderatora.';
  } catch (error) { status.textContent = error.message; }
});
dialog.querySelector('#panel-close').addEventListener('click', () => dialog.close());
logout.addEventListener('click', lockPanel);
dialog.addEventListener('close', lockPanel);
document.addEventListener('keydown', event => {
  if (event.ctrlKey && event.shiftKey && !event.altKey && event.code === 'KeyA') {
    event.preventDefault();
    if (!dialog.open) dialog.showModal();
  }
});
for (const opener of document.querySelectorAll('[data-open-owner-panel]')) {
  opener.addEventListener('click', () => { if (!dialog.open) dialog.showModal(); });
}
