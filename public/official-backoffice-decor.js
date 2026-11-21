/* Canonical-domain-only staff visual identifier.
   No authentication, cookies, challenges, network or form handlers are touched. */
(() => {
  const officialHosts = new Set(['goldenhimalpalace.com', 'www.goldenhimalpalace.com']);
  if (!officialHosts.has(window.location.hostname)) return;

  const decorate = () => {
    if (document.body?.dataset.page !== 'back') return;
    document.body.classList.add('ghp-official-backoffice');
    const heading = document.querySelector('main.page-shell > h1.page-heading');
    if (!heading || document.querySelector('.ghp-official-site-tag')) return;

    const label = document.createElement('p');
    label.className = 'ghp-official-site-tag';
    label.textContent = '官方網站 · goldenhimalpalace.com · STAFF';
    label.setAttribute('aria-label', 'Golden Himal Palace 官方網站工作人員後台');
    heading.insertAdjacentElement('afterend', label);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorate, {once: true});
  } else {
    decorate();
  }
})();
