import './start.css';
import { preloadClickSound, playClickSound } from './ui-audio.js';
import { UPGRADE_DEFS, getUpgradeCost, loadProfile, purchaseUpgrade, resetProfile } from './progression.js';

const CLICK_DELAY_MS = 110;

preloadClickSound();

const diamondBank = document.querySelector('#diamond-bank');
const upgradeShop = document.querySelector('#upgrade-shop');
const resetButton = document.querySelector('#reset-progress');

function renderShop() {
  const profile = loadProfile();
  diamondBank.textContent = `${profile.diamonds}`;

  upgradeShop.innerHTML = Object.entries(UPGRADE_DEFS).map(([key, def]) => {
    const level = profile.upgrades[key];
    const cost = level >= def.maxLevel ? 'MAX' : `${getUpgradeCost(key, level)} D`;
    const levels = Array.from({ length: def.maxLevel }, (_, index) => `<span class="shop-level${index < level ? ' is-filled' : ''}"></span>`).join('');
    return `
      <div class="shop-row">
        <div class="shop-name">${def.label}</div>
        <div class="shop-levels">${levels}</div>
        <button class="shop-buy" data-upgrade="${key}" ${level >= def.maxLevel || profile.diamonds < getUpgradeCost(key, level) ? 'disabled' : ''}>${cost}</button>
      </div>
    `;
  }).join('');

  for (const button of upgradeShop.querySelectorAll('.shop-buy')) {
    button.addEventListener('click', async () => {
      await playClickSound();
      purchaseUpgrade(button.dataset.upgrade);
      renderShop();
    });
  }
}

resetButton.addEventListener('click', async () => {
  await playClickSound();
  resetProfile();
  renderShop();
});

renderShop();

for (const link of document.querySelectorAll('.link')) {
  link.addEventListener('click', async (event) => {
    event.preventDefault();
    await playClickSound();
    window.setTimeout(() => {
      window.location.href = link.href;
    }, CLICK_DELAY_MS);
  });
}
