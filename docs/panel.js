const dialog = document.getElementById('owner-panel');
const login = dialog.querySelector('#panel-login');
const area = dialog.querySelector('#panel-area');
const status = dialog.querySelector('#panel-status');
const output = dialog.querySelector('#panel-entries');
const passwordField = login.elements.password;
const releaseForm = dialog.querySelector('#panel-release');
const more = dialog.querySelector('#panel-more');
const roleField = login.elements.role;
const approval = document.createElement('button');
approval.type = 'button';
approval.hidden = true;
area.prepend(approval);
let credentials;
let activeKind = 'pending';
let requestId = 0;
let approvalRequired;

function showApproval(required) {
  approvalRequired = required;
  approval.hidden = typeof required !== 'boolean';
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
  releaseForm.reset();
  releaseForm.hidden = true;
  more.hidden = true;
  login.hidden = false;
  area.hidden = true;
  output.replaceChildren();
  status.textContent = '';
}

async function callPanel(action, fields = {}, auth = credentials) {
  const response = await fetch('https://lidlomix-pro-spolecznosc.heroicsquirrel3.chatgpt.site/panel', {
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
  releaseForm.hidden = true;
  const currentRequest = ++requestId;
  const result = await callPanel('list', { kind, cursor });
  if (currentRequest !== requestId) return;
  const { entries, next } = result;
  if (!approval.disabled) showApproval(result.approvalRequired);
  activeKind = kind;
  output.replaceChildren();
  if (!entries.length) output.textContent = 'Brak wpisów.';
  for (const { id, record } of entries) {
    const card = document.createElement('article');
    const label = document.createElement('strong');
    const body = document.createElement('p');
    label.textContent = [record.title, record.name, record.post, record.model, [record.postalCode, record.city].filter(Boolean).join(" "), record.email].filter(Boolean).join(' · ');
    body.textContent = [record.body, record.description, record.date].filter(Boolean).join('\n');
    card.append(label, body);
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
    passwordField.value = '';
    area.hidden = false;
    for (const node of area.querySelectorAll('[data-admin-only]')) node.hidden = credentials.role !== 'admin';
    status.textContent = credentials.role === 'admin' ? 'Zalogowano jako administrator.' : 'Zalogowano jako moderator.';
  } catch (error) {
    credentials = undefined;
    status.textContent = error.message;
  } finally { button.disabled = false; }
});
for (const button of area.querySelectorAll('[data-panel-kind]')) {
  button.addEventListener('click', () => loadEntries(button.dataset.panelKind).catch(error => { status.textContent = error.message; }));
}
dialog.querySelector('#panel-releases-toggle').addEventListener('click', () => {
  requestId++;
  output.replaceChildren();
  more.hidden = true;
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
dialog.querySelector('#panel-logout').addEventListener('click', lockPanel);
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
