import { getRegistrationState } from './registration.js';

const previewButton = document.querySelector('[data-registration-preview]');
const statusRegion = document.querySelector('[data-registration-status]');

if (previewButton && statusRegion) {
  previewButton.addEventListener('click', () => {
    const state = getRegistrationState();
    statusRegion.textContent = state.message;
    statusRegion.dataset.state = state.status;
    statusRegion.hidden = false;
    statusRegion.focus();
  });
}
