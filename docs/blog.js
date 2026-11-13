const communityApi = "https://lidlomix-pro-spolecznosc.heroicsquirrel3.chatgpt.site";
for (const section of document.querySelectorAll('[data-post]')) {
  const status = section.querySelector('[data-comments-status]');
  fetch(communityApi + '/comments?post=' + encodeURIComponent(section.dataset.post))
    .then(response => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then(comments => {
      status.textContent = comments.length ? '' : 'Tu jeszcze nie ma komentarzy.';
      for (const comment of comments) {
        const item = document.createElement('li');
        const name = document.createElement('strong');
        const body = document.createElement('p');
        name.textContent = comment.name;
        body.textContent = comment.body;
        item.append(name, body);
        section.querySelector('ul').append(item);
      }
    })
    .catch(() => { status.textContent = 'Nie udało się wczytać komentarzy. Odśwież stronę, aby spróbować ponownie.'; });
}

for (const form of document.querySelectorAll('[data-endpoint]')) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type=submit]');
    const status = form.querySelector('[role=status]');
    const data = Object.fromEntries(new FormData(form));
    const endpoint = form.dataset.endpoint;
    if (endpoint === 'waitlist') data.consent = form.elements.consent.checked;
    button.disabled = true;
    status.textContent = 'Wysyłam…';
    try {
      const response = await fetch(communityApi + '/' + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Spróbuj ponownie za chwilę.');
      form.reset();
      status.textContent = endpoint === 'waitlist' ? 'Zapisano zgłoszenie. Dziękuję!' : 'Dziękuję. Komentarz czeka na zatwierdzenie.';
    } catch (error) {
      status.textContent = 'Nie udało się wysłać. ' + error.message;
    } finally {
      button.disabled = false;
    }
  });
}
document.querySelectorAll('[data-youtube]').forEach(button=>{const id=button.dataset.youtube;if(!/^[a-zA-Z0-9_-]{11}$/.test(id))return;button.addEventListener('click',()=>{const frame=document.createElement('iframe');frame.title='Film demonstracyjny Lidlomix Pro';frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;button.replaceWith(frame);frame.focus()})});