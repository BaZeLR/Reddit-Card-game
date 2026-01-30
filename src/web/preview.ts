import { requestExpandedMode } from '@devvit/web/client';

const AGE_KEY = 'pokerAgeOk';
const playButton = document.getElementById('play-button') as HTMLButtonElement | null;
const ageNoButton = document.getElementById('age-no') as HTMLButtonElement | null;
const warning = document.getElementById('age-warning');

function rememberAgeGate() {
  try {
    localStorage.setItem(AGE_KEY, '1');
  } catch {
    // ignore storage failures
  }
}

if (playButton) {
  playButton.addEventListener('click', async (event) => {
    rememberAgeGate();
    try {
      await requestExpandedMode(event, 'game');
    } catch (err) {
      console.error('Failed to open expanded mode', err);
    }
  });
}

if (ageNoButton) {
  ageNoButton.addEventListener('click', () => {
    if (warning) {
      warning.classList.remove('hidden');
    }
    ageNoButton.disabled = true;
    if (playButton) {
      playButton.disabled = true;
    }
  });
}
