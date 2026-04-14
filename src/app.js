import './style.css';
import { Game } from './game.js';

const GAME_UI_CLICK_DELAY_MS = 110;

export function initGameApp(levelConfig = {}) {
  const app = document.querySelector('#app');

  app.innerHTML = `
    <canvas id="game"></canvas>
    <div class="start-screen" id="start-screen">
      <div class="start-card">
        <div class="start-eyebrow">Space RTS</div>
        <h1>Schwierigkeit wählen</h1>
        <p>Wähle vor dem Start, wie aggressiv und ressourcenstark die gegnerische KI sein soll.</p>
        <div class="start-controls">
          <div class="control-block">
            <span class="shortcut-label">Steuerung</span>
            <p class="start-hint">Linksklick wählt Einheiten oder die Basis, Rechtsklick bewegt ausgewählte Einheiten, Drag-Box markiert mehrere Einheiten.</p>
          </div>
          <div class="shortcut-block">
            <span class="shortcut-label">Shortcuts</span>
            <div class="shortcut-row">
            <span class="shortcut-item"><span class="keycap">1</span> Arbeiter</span>
            <span class="shortcut-item"><span class="keycap">2</span> Nahkämpfer</span>
            <span class="shortcut-item"><span class="keycap">3</span> Fernkämpfer</span>
            <span class="shortcut-item"><span class="keycap">4</span> alle Kämpfer</span>
            <span class="shortcut-item"><span class="keycap">ESC</span> Pause</span>
            </div>
          </div>
        </div>
        <div class="difficulty-options" id="difficulty-options">
          <button class="difficulty-button" data-difficulty="easy">Einfach</button>
          <button class="difficulty-button is-active" data-difficulty="medium">Mittel</button>
          <button class="difficulty-button" data-difficulty="hard">Schwer</button>
        </div>
      </div>
    </div>
    <div class="start-screen game-over-screen is-hidden" id="game-over-screen">
      <div class="start-card">
        <div class="start-eyebrow">Space RTS</div>
        <h1 id="game-over-title">Spiel beendet</h1>
        <p id="game-over-text">Zur Levelübersicht zurückkehren oder neu starten.</p>
        <button class="start-button" id="game-over-button">Zur Levelübersicht</button>
      </div>
    </div>
    <div class="start-screen pause-screen is-hidden" id="pause-screen">
      <div class="start-card">
        <div class="start-eyebrow">Space RTS</div>
        <h1>Pause</h1>
        <p>Das Spiel ist angehalten.</p>
        <button class="start-button" id="pause-resume-button">Zum Spiel zurückkehren</button>
        <button class="start-button" id="pause-exit-button">Spiel beenden und zur Levelauswahl zurück</button>
      </div>
    </div>
    <div class="top-bar" id="top-bar">
      <span class="resource-iron">Eisen <strong id="iron-value">0</strong></span>
      <span class="resource-gold">Gold <strong id="gold-value">0</strong></span>
      <span class="resource-diamond">Diamant <strong id="diamond-value">0</strong></span>
      <span>Schwierigkeit <strong id="difficulty-value">Mittel</strong></span>
    </div>
    <div class="storm-alert" id="storm-alert"></div>
    <div class="hud" id="hud">
      <div class="hud-top">
        <div class="production-status" id="production-status">
          <div class="production-status-fill" id="production-status-fill"></div>
          <span class="production-status-label">Produktion</span>
        </div>
      </div>

      <div class="section">
        <div class="buttons production-buttons">
          <button class="production-unit worker" id="spawn-worker"><span class="unit-name">Arbeiter</span><span class="unit-cost"><span class="cost-iron">50E</span> <span class="cost-gold">20G</span></span></button>
          <button class="production-unit melee" id="spawn-melee"><span class="unit-name">Nahkämpfer</span><span class="unit-cost"><span class="cost-iron">70E</span> <span class="cost-gold">30G</span></span></button>
          <button class="production-unit ranged" id="spawn-ranged"><span class="unit-name">Fernkämpfer</span><span class="unit-cost"><span class="cost-iron">60E</span> <span class="cost-gold">40G</span></span></button>
        </div>
      </div>

    </div>
    <div class="status-bar" id="status-bar">
      <div id="selection-info">Wähle Einheiten oder die Basis aus.</div>
    </div>
    <div class="selection-box" id="selection-box"></div>
  `;

  const game = new Game({
    canvas: document.querySelector('#game'),
    hud: {
      iron: document.querySelector('#iron-value'),
      gold: document.querySelector('#gold-value'),
      diamond: document.querySelector('#diamond-value'),
      selection: document.querySelector('#selection-value'),
      difficulty: document.querySelector('#difficulty-value'),
      stormAlert: document.querySelector('#storm-alert'),
      info: document.querySelector('#selection-info'),
      productionStatus: document.querySelector('#production-status'),
      productionStatusFill: document.querySelector('#production-status-fill'),
      startScreen: document.querySelector('#start-screen'),
      gameOverScreen: document.querySelector('#game-over-screen'),
      gameOverTitle: document.querySelector('#game-over-title'),
      gameOverText: document.querySelector('#game-over-text'),
      gameOverButton: document.querySelector('#game-over-button'),
      pauseScreen: document.querySelector('#pause-screen'),
      pauseResumeButton: document.querySelector('#pause-resume-button'),
      pauseExitButton: document.querySelector('#pause-exit-button'),
      difficultyOptions: [...document.querySelectorAll('[data-difficulty]')],
      buttons: {
        worker: document.querySelector('#spawn-worker'),
        melee: document.querySelector('#spawn-melee'),
        ranged: document.querySelector('#spawn-ranged'),
      },
    },
    selectionBox: document.querySelector('#selection-box'),
    levelConfig,
  });

  game.hud.gameOverButton.addEventListener('click', (event) => {
    event.preventDefault();
    game.playClickSound();
    window.setTimeout(() => {
      window.location.href = './start.html';
    }, GAME_UI_CLICK_DELAY_MS);
  });

  game.hud.pauseExitButton.addEventListener('click', (event) => {
    event.preventDefault();
    game.playClickSound();
    window.setTimeout(() => {
      window.location.href = './start.html';
    }, GAME_UI_CLICK_DELAY_MS);
  });

  game.hud.pauseResumeButton.addEventListener('click', (event) => {
    event.preventDefault();
    game.playClickSound();
    game.togglePause();
  });

  game.start();
  return game;
}
