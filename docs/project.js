const pluginStatus = document.getElementById('plugin-status');
const pluginTrigger = document.querySelector('.plugin-trigger');

if (pluginTrigger && pluginStatus) {
  const disclosure = pluginTrigger.closest('.plugin-disclosure');
  const setOpen = open => {
    pluginStatus.hidden = !open;
    pluginTrigger.setAttribute('aria-expanded', String(open));
  };

  disclosure.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') setOpen(true);
  });
  disclosure.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && !pluginTrigger.matches(':focus-visible')) setOpen(false);
  });
  pluginTrigger.addEventListener('focus', () => {
    if (pluginTrigger.matches(':focus-visible')) setOpen(true);
  });
  pluginTrigger.addEventListener('blur', () => setOpen(false));
  pluginTrigger.addEventListener('click', event => {
    setOpen(event.pointerType === 'touch' ? pluginStatus.hidden : true);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !pluginStatus.hidden) setOpen(false);
  });
  document.addEventListener('pointerdown', event => {
    if (!disclosure.contains(event.target)) setOpen(false);
  });
}
