import { preloadClickSound, playClickSound as playGlobalClickSound } from './ui-audio.js';
import { awardDiamonds, loadProfile } from './progression.js';

const ATTACK_SOUND_URL = new URL('../sound/attack.wav', import.meta.url).href;
const BASE_ATTACK_SOUND_URL = new URL('../sound/basis_attack.wav', import.meta.url).href;
const GAME_OVER_SOUND_URL = new URL('../sound/game_over.wav', import.meta.url).href;
const METEOR_SOUND_URL = new URL('../sound/meteor.wav', import.meta.url).href;
const WIN_SOUND_URL = new URL('../sound/win.wav', import.meta.url).href;

const UNIT_TYPES = {
  worker: {
    label: 'Arbeiter',
    hp: 60,
    damage: 0,
    speed: 92,
    range: 42,
    attackCooldown: 1.1,
    gatherRate: 9,
    costIron: 50,
    costGold: 20,
    productionTime: 6.5,
    radius: 11,
  },
  melee: {
    label: 'Nahkämpfer',
    hp: 120,
    damage: 18,
    speed: 84,
    range: 28,
    attackCooldown: 0.8,
    gatherRate: 0,
    costIron: 70,
    costGold: 30,
    productionTime: 8,
    radius: 13,
  },
  ranged: {
    label: 'Fernkämpfer',
    hp: 80,
    damage: 12,
    speed: 88,
    range: 140,
    attackCooldown: 1.2,
    gatherRate: 0,
    costIron: 60,
    costGold: 40,
    productionTime: 8.8,
    radius: 12,
  },
};

const TEAM_COLORS = {
  player: {
    fill: '#78b8ff',
    stroke: '#d8ecff',
    health: '#78b8ff',
  },
  ai: {
    fill: '#ff7d8a',
    stroke: '#ffd1d6',
    health: '#ff8c8c',
  },
};

const DIFFICULTIES = {
  easy: {
    label: 'Einfach',
    startIron: 129,
    startGold: 79,
    gatherMultiplier: 0.79,
    aggression: 0.351,
    aiBonuses: { prod: 0.99, damage: 0.99, range: 0.99, gather: 0.99, hp: 0.99 },
  },
  medium: {
    label: 'Mittel',
    startIron: 103.4,
    startGold: 62.04,
    gatherMultiplier: 1.034,
    aggression: 0.6204,
    aiBonuses: { prod: 1.034, damage: 1.034, range: 1.034, gather: 1.034, hp: 1.034 },
  },
  hard: {
    label: 'Schwer',
    startIron: 176,
    startGold: 110,
    gatherMultiplier: 1.38,
    aggression: 0.99,
    aiBonuses: { prod: 1.1, damage: 1.1, range: 1.1, gather: 1.1, hp: 1.1 },
  },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min, max) => min + Math.random() * (max - min);
const getTargetRadius = (target) => ('type' in target ? UNIT_TYPES[target.type].radius : target.radius || 0);

class Meteor {
  constructor(kind, resourceType, x, y, vx, vy, iron, gold, diamond, size, lifetime = null, isStormMeteor = false) {
    this.kind = kind;
    this.resourceType = resourceType;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.iron = iron;
    this.gold = gold;
    this.diamond = diamond;
    this.size = size;
    this.alive = true;
    this.spin = rand(0, Math.PI * 2);
    this.lifetime = lifetime;
    this.isStormMeteor = isStormMeteor;
  }

  update(dt, game) {
    if (this.kind === 'resource') {
      this.spin += dt * 0.08;
      return;
    }

    if (this.lifetime !== null) {
      this.lifetime -= dt;
      if (this.lifetime <= 0) {
        this.alive = false;
        return;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += dt * 0.4;

    const despawnMargin = 120;
    if (
      this.x < -despawnMargin ||
      this.x > game.width + despawnMargin ||
      this.y < -despawnMargin ||
      this.y > game.height + despawnMargin
    ) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);
    const isIron = this.resourceType === 'iron';
    const isGold = this.resourceType === 'gold';
    const isDiamond = this.resourceType === 'diamond';
    ctx.fillStyle = this.kind === 'resource'
      ? isIron
        ? '#818a96'
        : isGold
          ? '#b6942f'
          : '#2f9bb6'
      : '#16181d';
    ctx.strokeStyle = this.kind === 'resource'
      ? isIron
        ? '#c8ced8'
        : isGold
          ? '#ffd24d'
          : '#85f0ff'
      : '#4b5567';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.9, -this.size * 0.2);
    ctx.lineTo(-this.size * 0.4, -this.size * 0.8);
    ctx.lineTo(this.size * 0.8, -this.size * 0.4);
    ctx.lineTo(this.size * 0.9, this.size * 0.3);
    ctx.lineTo(-this.size * 0.1, this.size * 0.9);
    ctx.lineTo(-this.size * 0.85, this.size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (this.kind === 'resource') {
      ctx.fillStyle = isIron ? '#c8ced8' : isGold ? '#ffd24d' : '#85f0ff';
      ctx.font = '11px Pixelify Sans, sans-serif';
      ctx.textAlign = 'center';
      const amount = isIron ? this.iron : isGold ? this.gold : this.diamond;
      ctx.fillText(`${Math.ceil(amount)}`, 0, this.size + 14);
    }
    ctx.restore();
  }
}

class Base {
  constructor(owner, x, y, game) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.game = game;
    this.layout = owner === 'ai'
      ? (game.levelConfig.aiBaseStyle || game.levelConfig.baseStyle || 'single')
      : (game.levelConfig.playerBaseStyle || game.levelConfig.baseStyle || 'single');
    this.hp = 500;
    this.radius = this.layout === 'triple' ? 72 : 58;
    this.safeRadius = this.layout === 'triple' ? 168 : 150;
    this.iron = owner === 'player' ? 156 : 0;
    this.gold = owner === 'player' ? 91 : 0;
    this.diamond = 0;
    this.queue = [];
    this.active = null;
    this.productionProgress = 0;
    this.upgrades = { prod: 0, damage: 0, range: 0, gather: 0, hp: 0 };
    this.spawnIndex = 0;
    this.parts = this.layout === 'triple'
      ? [
          { id: 'top', x: -46, y: -88, radius: 24, maxHp: 250, hp: 250, kind: 'side', hpBarSide: 'top' },
          { id: 'bottom', x: -46, y: 88, radius: 24, maxHp: 250, hp: 250, kind: 'side', hpBarSide: 'bottom' },
          { id: 'core', x: 0, y: 0, radius: 72, maxHp: 750, hp: 750, kind: 'core' },
        ]
      : null;
  }

  get maxHp() {
    if (this.layout === 'triple') return this.parts.reduce((sum, part) => sum + part.maxHp, 0);
    return Math.round(500 * this.modifiers.hp);
  }

  get currentHp() {
    if (this.layout === 'triple') return this.parts.reduce((sum, part) => sum + part.hp, 0);
    return this.hp;
  }

  get modifiers() {
    const aiBonuses = this.owner === 'ai' ? this.game.getDifficulty().aiBonuses : { prod: 1, damage: 1, range: 1, gather: 1, hp: 1 };
    return {
      prod: (1 + this.upgrades.prod * 0.16) * aiBonuses.prod,
      damage: (1 + this.upgrades.damage * 0.14) * aiBonuses.damage,
      range: (1 + this.upgrades.range * 0.12) * aiBonuses.range,
      gather: (1 + this.upgrades.gather * 0.25) * aiBonuses.gather,
      hp: (1 + this.upgrades.hp * 0.2) * aiBonuses.hp,
    };
  }

  getProductionTime(type) {
    return UNIT_TYPES[type].productionTime / this.modifiers.prod;
  }

  getActiveProgress() {
    if (!this.active || this.active.time <= 0) return 0;
    return clamp(this.productionProgress / this.active.time, 0, 1);
  }

  canAffordUnit(type) {
    const stats = UNIT_TYPES[type];
    return this.iron >= stats.costIron && this.gold >= stats.costGold;
  }

  enqueueUnit(type) {
    if (!this.canAffordUnit(type)) return false;
    const stats = UNIT_TYPES[type];
    this.iron -= stats.costIron;
    this.gold -= stats.costGold;
    this.queue.push({ kind: 'unit', type, time: this.getProductionTime(type) });
    return true;
  }

  takeDamage(amount, source = null) {
    this.game.playBaseAttackSound();

    if (this.layout === 'triple') {
      const aliveSides = this.parts.filter((part) => part.kind === 'side' && part.hp > 0);
      const targetPart = aliveSides.length > 0
        ? (source
          ? aliveSides.reduce((closest, part) => {
              const currentDist = Math.hypot(source.x - (this.x + part.x), source.y - (this.y + part.y));
              const closestDist = Math.hypot(source.x - (this.x + closest.x), source.y - (this.y + closest.y));
              return currentDist < closestDist ? part : closest;
            }, aliveSides[0])
          : aliveSides[0])
        : this.parts.find((part) => part.kind === 'core' && part.hp > 0);

      if (!targetPart) return;

      targetPart.hp = Math.max(0, targetPart.hp - amount);
      if (targetPart.kind === 'core' && targetPart.hp <= 0) {
        this.game.finishGame(this.owner === 'player' ? 'lose' : 'win');
      }
      return;
    }

    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.game.finishGame(this.owner === 'player' ? 'lose' : 'win');
    }
  }

  update(dt) {
    if (!this.active && this.queue.length > 0) {
      this.active = this.queue.shift();
      this.productionProgress = 0;
    }

    if (!this.active) return;

    this.productionProgress += dt;
    if (this.productionProgress < this.active.time) return;

    this.spawnUnit(this.active.type);

    this.active = null;
    this.productionProgress = 0;
  }

  spawnUnit(type) {
    const spawnParts = this.layout === 'triple'
      ? this.parts.filter((part) => part.kind === 'side' && part.hp > 0)
      : null;

    if (spawnParts && spawnParts.length > 0) {
      const part = spawnParts[this.spawnIndex % spawnParts.length];
      this.spawnIndex += 1;
      this.game.units.push(new Unit(this.game, this.owner, type, this.x + part.x, this.y + part.y));
      return;
    }

    const angle = this.owner === 'player' ? rand(-0.7, 0.7) : rand(Math.PI - 0.7, Math.PI + 0.7);
    const dist = this.radius + 24;
    this.game.units.push(new Unit(this.game, this.owner, type, this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.layout === 'triple') {
      const nodeRadius = 24;
      const topNode = this.parts[0];
      const bottomNode = this.parts[1];
      const coreNode = this.parts[2];
      const connectorColor = this.owner === 'player' ? 'rgba(121, 184, 255, 0.9)' : 'rgba(255, 125, 138, 0.9)';

      ctx.strokeStyle = connectorColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(topNode.x + nodeRadius * 0.7, topNode.y + nodeRadius * 0.25);
      ctx.lineTo(-this.radius * 0.12, -this.radius * 0.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bottomNode.x + nodeRadius * 0.7, bottomNode.y - nodeRadius * 0.25);
      ctx.lineTo(-this.radius * 0.12, this.radius * 0.9);
      ctx.stroke();

      const drawNode = (node, fill, stroke) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 3;
        ctx.stroke();

        if (node.hp > 0) {
          const barY = node.hpBarSide === 'bottom' ? node.y + 30 : node.y - 34;
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillRect(node.x - 18, barY, 36, 4);
          ctx.fillStyle = this.owner === 'player' ? '#69e2a1' : '#ff8c8c';
          ctx.fillRect(node.x - 18, barY, 36 * (node.hp / node.maxHp), 4);
        }
      };

      drawNode(topNode, this.owner === 'player' ? '#1a345d' : '#5b1b25', connectorColor);
      drawNode(bottomNode, this.owner === 'player' ? '#1a345d' : '#5b1b25', connectorColor);
    }

    if (this.game.selectedBase === this) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, this.safeRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.owner === 'player' ? 'rgba(104, 178, 255, 0.06)' : 'rgba(255, 110, 110, 0.06)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, this.layout === 'triple' ? 72 : this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.owner === 'player' ? '#173562' : '#5a1520';
    ctx.strokeStyle = this.owner === 'player' ? '#79b8ff' : '#ff7d8a';
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const healthBarWidth = this.layout === 'triple' ? 92 : 68;
    ctx.fillRect(-healthBarWidth / 2, -3, healthBarWidth, 6);
    ctx.fillStyle = this.owner === 'player' ? '#78b8ff' : '#ff8c8c';
    ctx.fillRect(-healthBarWidth / 2, -3, healthBarWidth * (this.currentHp / this.maxHp), 6);

    ctx.restore();
  }
}

class Unit {
  constructor(game, owner, type, x, y) {
    this.game = game;
    this.owner = owner;
    this.type = type;
    this.x = x;
    this.y = y;
    this.moveTarget = null;
    this.moveOverride = false;
    this.hp = this.maxHp;
    this.cooldown = 0;
    this.selected = false;
    this.alive = true;
    this.meteorFlash = 0;
    this.lastMeteorHitAt = -Infinity;
  }

  get stats() {
    const base = UNIT_TYPES[this.type];
    const modifiers = this.game.getBase(this.owner).modifiers;
    return {
      ...base,
      hp: Math.round(base.hp * modifiers.hp),
      damage: Math.round(base.damage * modifiers.damage),
      range: Math.round(base.range * modifiers.range),
      gatherRate: Math.round(base.gatherRate * modifiers.gather),
    };
  }

  get maxHp() {
    return this.stats.hp;
  }

  commandMove(x, y, override = false) {
    this.moveTarget = { x, y };
    this.moveOverride = override;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  update(dt) {
    if (!this.alive) return;

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.meteorFlash = Math.max(0, this.meteorFlash - dt);
    const enemy = this.game.findClosestEnemy(this);
    const range = this.stats.range;

    if (this.type !== 'worker' && !this.moveOverride && enemy && distance(this, enemy) <= range + getTargetRadius(enemy)) {
      this.moveTarget = null;
      if (this.cooldown <= 0) {
        enemy.takeDamage(this.stats.damage, this);
        this.game.spawnAttackEffect(this, enemy);
        this.cooldown = this.stats.attackCooldown;
      }
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.x;
      const dy = this.moveTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        this.moveTarget = null;
        this.moveOverride = false;
      } else {
        const speed = this.stats.speed;
        const step = speed * dt;
        this.x += (dx / dist) * Math.min(step, dist);
        this.y += (dy / dist) * Math.min(step, dist);
      }
    }

    this.x = clamp(this.x, 8, this.game.width - 8);
    this.y = clamp(this.y, 8, this.game.height - 8);

    if (this.type === 'worker') {
      const meteor = this.game.findClosestMeteor(this, 24);
      if (meteor && meteor.iron + meteor.gold + meteor.diamond > 0) {
        const gather = this.stats.gatherRate * dt;
        const total = meteor.iron + meteor.gold + meteor.diamond;
        const ironShare = total > 0 ? meteor.iron / total : 0;
        const goldShare = total > 0 ? meteor.gold / total : 0;
        const diamondShare = total > 0 ? meteor.diamond / total : 0;
        const ironTaken = Math.min(meteor.iron, gather * ironShare);
        const goldTaken = Math.min(meteor.gold, gather * goldShare);
        const diamondTaken = Math.min(meteor.diamond, gather * diamondShare);
        meteor.iron -= ironTaken;
        meteor.gold -= goldTaken;
        meteor.diamond -= diamondTaken;
        const base = this.game.getBase(this.owner);
        base.iron += ironTaken;
        base.gold += goldTaken;
        base.diamond += diamondTaken;
        if (ironTaken > 0) this.game.spawnMiningParticles(meteor, this, ironTaken, 'iron');
        if (goldTaken > 0) this.game.spawnMiningParticles(meteor, this, goldTaken, 'gold');
        if (diamondTaken > 0) this.game.spawnMiningParticles(meteor, this, diamondTaken, 'diamond');
        if (meteor.iron <= 0 && meteor.gold <= 0 && meteor.diamond <= 0) meteor.alive = false;
      }
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    const stats = this.stats;
    const teamColors = TEAM_COLORS[this.owner];
    const radius = UNIT_TYPES[this.type].radius;
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.meteorFlash > 0) {
      const flashAlpha = Math.min(0.38, this.meteorFlash * 2.2);
      ctx.beginPath();
      ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 241, 196, ${flashAlpha})`;
      ctx.fill();
    }

    ctx.beginPath();
    this.drawShapePath(ctx, radius);
    ctx.fillStyle = teamColors.fill;
    ctx.fill();
    ctx.lineWidth = this.selected ? 3 : 1.5;
    ctx.strokeStyle = this.selected ? '#ffffff' : teamColors.stroke;
    ctx.stroke();

    if (this.type === 'worker') {
      ctx.fillStyle = '#0a1327';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillRect(-18, -26, 36, 4);
    ctx.fillStyle = teamColors.health;
    ctx.fillRect(-18, -26, 36 * (this.hp / stats.hp), 4);

    ctx.restore();
  }

  drawShapePath(ctx, radius) {
    if (this.type === 'worker') {
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      return;
    }

    if (this.type === 'melee') {
      for (let i = 0; i < 8; i += 1) {
        const angle = -Math.PI / 8 + (Math.PI * 2 * i) / 8;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      return;
    }

    ctx.moveTo(0, -radius - 1);
    ctx.lineTo(radius, radius);
    ctx.lineTo(-radius, radius);
    ctx.closePath();
  }
}

export class Game {
  constructor({ canvas, hud, selectionBox, levelConfig = {} }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hud = hud;
    this.selectionBox = selectionBox;
    this.levelConfig = {
      hazardMeteorScale: 1,
      hazardMeteorSpeedScale: 1,
      resourceMeteorMultiplier: 1,
      ...levelConfig,
    };
    this.width = 0;
    this.height = 0;
    this.running = false;
    this.started = false;
    this.loopStarted = false;
    this.lastTime = 0;
    this.units = [];
    this.meteors = [];
    this.attackEffects = [];
    this.meteorImpacts = [];
    this.miningParticles = [];
    this.stars = [];
    this.selectedUnits = [];
    this.selectedBase = null;
    this.playerDifficulty = 'medium';
    this.elapsedTime = 0;
    this.paused = false;
    this.aiTimer = 0;
    this.hazardMeteorTimer = 0;
    this.stormCountdown = null;
    this.stormActiveUntil = 0;
    this.stormNextAt = rand(30, 60);
    this.stormHazardTimer = 0;
this.stormRecoveryUntil = 0;
		this.aiJustFinishedStorm = false;
		this.dragging = false;
    this.dragStarted = false;
    this.dragStart = null;
    this.pointer = { x: 0, y: 0 };
    this.gameOver = null;
    this.rewardsGranted = false;
    this.audioEnabled = false;
    this.audioPools = {
      attack: [],
      baseAttack: [],
      gameOver: [],
      meteor: [],
      win: [],
    };
    this.lastAttackSoundAt = -Infinity;
    this.lastBaseAttackSoundAt = -Infinity;
    this.outcomeSoundPlayed = false;

    this.bases = {
      player: new Base('player', 140, 0, this),
      ai: new Base('ai', 0, 0, this),
    };

    this.setupAudio();
    preloadClickSound();

    this.bindUI();
    this.bindInput();
    this.resize();
    this.reset();
    this.syncHUD();
  }

  bindUI() {
    const { buttons, difficultyOptions } = this.hud;
    buttons.worker.addEventListener('click', () => {
      this.playClickSound();
      this.bases.player.enqueueUnit('worker');
    });
    buttons.melee.addEventListener('click', () => {
      this.playClickSound();
      this.bases.player.enqueueUnit('melee');
    });
    buttons.ranged.addEventListener('click', () => {
      this.playClickSound();
      this.bases.player.enqueueUnit('ranged');
    });

    for (const button of difficultyOptions) {
      button.addEventListener('click', () => {
        this.playClickSound();
        this.playerDifficulty = button.dataset.difficulty;
        this.updateDifficultyButtons();
        this.updateDifficultyLabel();
        this.beginGame();
      });
    }

    this.updateDifficultyButtons();
    this.updateDifficultyLabel();
  }

  bindInput() {
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.canvas.addEventListener('mousedown', (event) => this.handlePointerDown(event));
    window.addEventListener('mousemove', (event) => this.handlePointerMove(event));
    window.addEventListener('mouseup', (event) => this.handlePointerUp(event));
    window.addEventListener('keydown', (event) => this.handleKeyDown(event));
    window.addEventListener('resize', () => this.resize());
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!this.started || this.gameOver) return;
      this.togglePause();
      return;
    }
    if (this.paused) return;
    if (event.key === '1') this.selectByShortcut('worker');
    if (event.key === '2') this.selectByShortcut('melee');
    if (event.key === '3') this.selectByShortcut('ranged');
    if (event.key === '4') this.selectByShortcut('combat');
  }

  start() {
    if (this.loopStarted) return;
    this.loopStarted = true;
    requestAnimationFrame((time) => this.loop(time));
  }

  beginGame() {
    if (this.started && this.running) return;
    this.reset();
    this.started = true;
    this.running = true;
    this.paused = false;
    this.gameOver = null;
    this.lastTime = 0;
    this.enableAudio();
    this.hud.startScreen.classList.add('is-hidden');
    this.hud.gameOverScreen.classList.add('is-hidden');
    this.hud.pauseScreen?.classList.add('is-hidden');
  }

  reset() {
    this.units.length = 0;
    this.meteors.length = 0;
    this.attackEffects.length = 0;
    this.meteorImpacts.length = 0;
    this.miningParticles.length = 0;
    this.selectedUnits = [];
    this.selectedBase = null;
    this.gameOver = null;
    this.hud.gameOverScreen.classList.add('is-hidden');
    this.hud.pauseScreen?.classList.add('is-hidden');
    this.outcomeSoundPlayed = false;
    this.rewardsGranted = false;
    this.lastAttackSoundAt = -Infinity;
    this.lastBaseAttackSoundAt = -Infinity;
    this.elapsedTime = 0;
    this.stormCountdown = null;
    this.stormActiveUntil = 0;
    this.stormNextAt = rand(30, 60);
this.stormHazardTimer = 0;
		this.stormRecoveryUntil = 0;
		this.aiJustFinishedStorm = false;
		this.bases.player.x = 140;
    this.bases.player.y = this.height * 0.5;
    this.bases.ai.x = this.width - 140;
    this.bases.ai.y = this.height * 0.5;

    const difficulty = this.getDifficulty();
    const profile = loadProfile();
    this.bases.player.iron = 120;
    this.bases.player.gold = 70;
    this.bases.player.diamond = 0;
    this.bases.player.upgrades = { ...profile.upgrades };
    this.bases.player.hp = this.bases.player.maxHp;
    this.bases.ai.iron = difficulty.startIron;
    this.bases.ai.gold = difficulty.startGold;
    this.bases.ai.diamond = 0;
    this.bases.ai.upgrades = { prod: 0, damage: 0, range: 0, gather: 0, hp: 0 };
    this.bases.ai.hp = this.bases.ai.maxHp;

    this.spawnInitialUnits();
    this.spawnInitialMeteors();
    this.syncHUD();
  }

  getDifficulty() {
    return DIFFICULTIES[this.playerDifficulty];
  }

  spawnInitialUnits() {
    const playerStart = [
      ['worker', -42, -22],
      ['worker', -42, 18],
      ['melee', -54, 0],
    ];
    const aiStart = [
      ['worker', 42, -22],
      ['worker', 42, 18],
      ['melee', 54, 0],
    ];

    for (const [type, dx, dy] of playerStart) {
      this.units.push(new Unit(this, 'player', type, this.bases.player.x + dx, this.bases.player.y + dy));
    }
    for (const [type, dx, dy] of aiStart) {
      this.units.push(new Unit(this, 'ai', type, this.bases.ai.x - dx, this.bases.ai.y + dy));
    }

    if (this.playerDifficulty === 'hard') {
      this.units.push(new Unit(this, 'ai', 'ranged', this.bases.ai.x - 68, this.bases.ai.y - 24));
    }
  }

  spawnInitialMeteors() {
    for (let i = 0; i < 9; i += 1) {
      this.meteors.push(this.createResourceMeteor(i));
    }
    this.stars = Array.from({ length: 180 }, () => ({ x: Math.random() * this.width, y: Math.random() * this.height, r: rand(0.5, 1.8), a: rand(0.2, 1) }));
  }

  createResourceMeteor(index = 0) {
    const resourcePattern = ['iron', 'gold', 'iron', 'gold', 'iron', 'gold', 'diamond', 'iron', 'gold'];
    const resourceType = resourcePattern[index % resourcePattern.length];
    const resourceMultiplier = this.levelConfig.resourceMeteorMultiplier;
    const iron = resourceType === 'iron' ? rand(70, 120) * 1.15 * 1.3 * 1.15 * 1.2 * resourceMultiplier : 0;
    const gold = resourceType === 'gold' ? rand(40, 75) * 0.6 * 1.3 * 1.15 * 1.2 * resourceMultiplier : 0;
    const diamond = resourceType === 'diamond' ? rand(3, 4) : 0;
    const safeMarginX = 210;
    const safeMarginY = 90;
    const zoneWidth = Math.max(120, this.width - safeMarginX * 2);
    const zoneHeight = Math.max(120, this.height - safeMarginY * 2);
    const clusterBias = index < 3 ? 0.28 : index < 6 ? 0.52 : 0.76;
    const x = safeMarginX + zoneWidth * clusterBias + rand(-130, 130);
    const y = safeMarginY + rand(0, zoneHeight) + rand(-55, 55);

    return new Meteor(
      'resource',
      resourceType,
      clamp(x, safeMarginX, this.width - safeMarginX),
      clamp(y, safeMarginY, this.height - safeMarginY),
      0,
      0,
      iron,
      gold,
      diamond,
      rand(18, 30),
    );
  }

  createHazardMeteor(isStormMeteor = false) {
    const edge = Math.floor(Math.random() * 4);
    const size = rand(14, 28) * this.levelConfig.hazardMeteorScale;
    const speedScale = this.levelConfig.hazardMeteorSpeedScale;
    const speed = (isStormMeteor ? rand(70, 120) : rand(40, 76)) * speedScale;
    const minY = 70;
    const maxY = Math.max(70, this.height - 70);
    const lifetime = isStormMeteor ? 7 : null;

    if (edge === 0) return new Meteor('hazard', null, -40, rand(minY, maxY), speed, rand(-18, 18), 0, 0, 0, size, lifetime, isStormMeteor);
    if (edge === 1) return new Meteor('hazard', null, this.width + 40, rand(minY, maxY), -speed, rand(-18, 18), 0, 0, 0, size, lifetime, isStormMeteor);
    if (edge === 2) return new Meteor('hazard', null, rand(70, Math.max(70, this.width - 70)), -40, rand(-18, 18), speed, 0, 0, 0, size, lifetime, isStormMeteor);
    return new Meteor('hazard', null, rand(70, Math.max(70, this.width - 70)), this.height + 40, rand(-18, 18), -speed, 0, 0, 0, size, lifetime, isStormMeteor);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.bases.player.y = this.height * 0.5;
    this.bases.ai.x = this.width - 140;
    this.bases.ai.y = this.height * 0.5;
    if (this.stars.length === 0) this.stars = Array.from({ length: 180 }, () => ({ x: Math.random() * this.width, y: Math.random() * this.height, r: rand(0.5, 1.8), a: rand(0.2, 1) }));
  }

  loop(time) {
    const dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (!this.started || !this.running) {
      this.syncHUD();
      return;
    }

    this.elapsedTime += dt;

    this.bases.player.update(dt);
    this.bases.ai.update(dt);

    for (const unit of this.units) unit.update(dt);
    this.units = this.units.filter((unit) => unit.alive !== false);

    for (const meteor of this.meteors) meteor.update(dt, this);
    this.meteors = this.meteors.filter((meteor) => meteor.alive !== false);
    this.attackEffects = this.attackEffects.filter((effect) => {
      effect.elapsed += dt;
      return effect.elapsed < effect.duration;
    });
    this.meteorImpacts = this.meteorImpacts.filter((effect) => {
      effect.elapsed += dt;
      return effect.elapsed < effect.duration;
    });
    this.miningParticles = this.miningParticles.filter((particle) => {
      particle.elapsed += dt;
      return particle.elapsed < particle.duration;
    });

    this.hazardMeteorTimer += dt;
    if (!this.isStormActive() && this.hazardMeteorTimer >= 3) {
      this.hazardMeteorTimer = 0;
      const activeHazards = this.meteors.filter((meteor) => meteor.kind === 'hazard').length;
      const lateGameReduction = this.elapsedTime > 180 ? 1 : 0;
      const maxHazards = 12 - lateGameReduction;
      if (activeHazards < maxHazards) this.meteors.push(this.createHazardMeteor());
    }

    this.handleMeteorDamage(dt);
    this.updateStorm(dt);
    this.updateAI(dt);
    this.syncHUD();
  }

  updateStorm(dt) {
    if (this.stormCountdown === null && !this.isStormActive() && this.elapsedTime >= this.stormNextAt) {
      this.stormCountdown = 5;
      this.stormHazardTimer = 0;
      this.stormNextAt = Infinity;
    }

    if (this.stormCountdown !== null) {
      this.stormCountdown -= dt;
      if (this.stormCountdown <= 0) {
        this.stormCountdown = null;
        this.stormActiveUntil = this.elapsedTime + 7;
        this.stormHazardTimer = 0;
        this.playStormSound();
      }
    }

    if (this.isStormActive()) {
      this.stormHazardTimer += dt;
      while (this.stormHazardTimer >= 0.08) {
        this.stormHazardTimer -= 0.08;
        this.meteors.push(this.createHazardMeteor(true));
      }
      if (this.elapsedTime >= this.stormActiveUntil) {
        this.stormActiveUntil = 0;
        this.stormRecoveryUntil = this.elapsedTime + 2;
        this.stormNextAt = this.elapsedTime + rand(30, 60);
      }
    }
  }

  isStormWarningActive() {
    return this.stormCountdown !== null;
  }

  isStormActive() {
    return this.stormActiveUntil > this.elapsedTime;
  }

  isStormRetreatActive() {
    return this.isStormWarningActive() || this.isStormActive() || this.elapsedTime < this.stormRecoveryUntil;
  }

  hasActiveStormMeteors() {
    return this.meteors.some((meteor) => meteor.kind === 'hazard' && meteor.isStormMeteor);
  }

  handleMeteorDamage(dt) {
    for (const meteor of this.meteors) {
      if (meteor.kind !== 'hazard') continue;
      for (const unit of this.units) {
        if (!unit.alive) continue;
        const base = this.getBase(unit.owner);
        if (distance(unit, base) <= base.safeRadius) continue;
        const hitRadius = meteor.size + unit.stats.radius + 2;
        if (distance(unit, meteor) <= hitRadius) {
          unit.takeDamage(16 * dt);
          if (this.elapsedTime - unit.lastMeteorHitAt > 0.18) {
            unit.lastMeteorHitAt = this.elapsedTime;
            unit.meteorFlash = 0.22;
            this.meteorImpacts.push({
              x: unit.x,
              y: unit.y,
              size: Math.max(12, meteor.size * 0.7),
              duration: 0.22,
              elapsed: 0,
            });
          }
        }
      }
    }
  }

  updateAI(dt) {
    const aiBase = this.bases.ai;
    const difficulty = DIFFICULTIES[this.playerDifficulty];
    this.aiTimer += dt;
    const canProduce = this.elapsedTime >= 4;

    if (this.aiTimer >= 1.4) {
      this.aiTimer = 0;
      const aiUnits = this.units.filter((unit) => unit.owner === 'ai');
      const aiWorkers = aiUnits.filter((unit) => unit.type === 'worker').length;
      const combatUnits = aiUnits.filter((unit) => unit.type !== 'worker');
      const desiredWorkers = difficulty.aggression < 0.45 ? 3 : difficulty.aggression < 0.75 ? 2 : 2;

if (this.isStormRetreatActive()) {
			for (const unit of aiUnits) {
				if (!unit.moveTarget || distance(unit, aiBase) > aiBase.safeRadius - 28) {
					unit.commandMove(aiBase.x + rand(-30, 30), aiBase.y + rand(-30, 30));
				}
			}
			this.aiJustFinishedStorm = true;
			return;
		}

		if (this.aiJustFinishedStorm) {
			this.aiJustFinishedStorm = false;
			for (const unit of combatUnits) {
				unit.moveTarget = null;
			}
		}

      if (canProduce && aiWorkers < desiredWorkers && aiBase.enqueueUnit('worker')) return;

      const pressure = difficulty.aggression;
      const chooseRanged = Math.random() < 0.35 + pressure * 0.25;
      if (canProduce && aiBase.canAffordUnit(chooseRanged ? 'ranged' : 'melee')) {
        aiBase.enqueueUnit(chooseRanged ? 'ranged' : 'melee');
      }

      if (combatUnits.length > 0) {
        const target = this.getPlayerPressurePoint();
        for (const unit of combatUnits) {
          if (!unit.moveTarget || distance(unit, unit.moveTarget) < 18) {
            unit.commandMove(target.x + rand(-60, 60), target.y + rand(-45, 45));
          }
        }
      }

      for (const worker of aiUnits.filter((u) => u.type === 'worker')) {
        if (!worker.moveTarget || distance(worker, worker.moveTarget) < 16) {
          const meteor = this.findBestMeteorForAI(worker);
          if (meteor) worker.commandMove(meteor.x + rand(-12, 12), meteor.y + rand(-12, 12));
        }
      }
    }
  }

  findBestMeteorForAI(worker) {
    const meteors = this.meteors.filter((meteor) => meteor.kind === 'resource' && meteor.iron + meteor.gold + meteor.diamond > 0);
    if (meteors.length === 0) return null;
    meteors.sort((a, b) => (b.iron + b.gold + b.diamond) - (a.iron + a.gold + a.diamond));
    return meteors[0];
  }

  getPlayerPressurePoint() {
    const enemyUnits = this.units.filter((unit) => unit.owner === 'player');
    if (enemyUnits.length > 0) return enemyUnits.reduce((acc, unit) => (distance(unit, this.bases.ai) < distance(acc, this.bases.ai) ? unit : acc), enemyUnits[0]);
    return this.bases.player;
  }

  findClosestEnemy(unit) {
    const enemies = this.units.filter((candidate) => candidate.owner !== unit.owner && candidate.alive !== false);
    const base = this.getBase(unit.owner === 'player' ? 'ai' : 'player');
    const baseDistance = distance(unit, base);
    const baseInRange = baseDistance <= unit.stats.range + getTargetRadius(base);

    if (baseInRange) {
      return base;
    }

    if (enemies.length === 0) return null;

    let best = null;
    let bestDist = Infinity;

    for (const enemy of enemies) {
      const d = distance(unit, enemy) - getTargetRadius(enemy);
      if (d < bestDist) {
        best = enemy;
        bestDist = d;
      }
    }

    if (bestDist <= unit.stats.range) return best;
    return null;
  }

  findClosestMeteor(unit, maxDistance = Infinity) {
    let best = null;
    let bestDist = maxDistance;
    for (const meteor of this.meteors) {
      if (meteor.kind !== 'resource') continue;
      const d = distance(unit, meteor);
      if (d < bestDist) {
        best = meteor;
        bestDist = d;
      }
    }
    return best;
  }

  getBase(owner) {
    return owner === 'player' ? this.bases.player : this.bases.ai;
  }

  getGatherMultiplier(owner) {
    if (owner === 'player') return 1;
    return DIFFICULTIES[this.playerDifficulty].gatherMultiplier;
  }

  spawnAttackEffect(attacker, target) {
    const kind = attacker.type === 'ranged' ? 'ranged' : attacker.type === 'melee' ? 'melee' : null;
    if (!kind) return;

    this.playAttackSound();

    this.attackEffects.push({
      kind,
      owner: attacker.owner,
      fromX: attacker.x,
      fromY: attacker.y,
      toX: target.x,
      toY: target.y,
      sourceRadius: UNIT_TYPES[attacker.type].radius,
      duration: kind === 'ranged' ? 0.18 : 0.12,
      elapsed: 0,
    });
  }

  spawnMiningParticles(meteor, worker, amount, kind) {
    const count = Math.max(1, Math.min(3, Math.ceil(amount * 0.5)));
    const color = kind === 'gold' ? '255, 214, 102' : kind === 'diamond' ? '133, 240, 255' : '186, 196, 212';
    for (let i = 0; i < count; i += 1) {
      this.miningParticles.push({
        fromX: meteor.x + rand(-meteor.size * 0.3, meteor.size * 0.3),
        fromY: meteor.y + rand(-meteor.size * 0.3, meteor.size * 0.3),
        toX: worker.x + rand(-worker.stats.radius * 0.35, worker.stats.radius * 0.35),
        toY: worker.y + rand(-worker.stats.radius * 0.35, worker.stats.radius * 0.35),
        color,
        size: rand(2, 3.6),
        duration: rand(0.26, 0.42),
        elapsed: 0,
      });
    }
  }

  handlePointerDown(event) {
    const point = this.getPointerPosition(event);
    this.pointer = point;

    if (event.button === 2) {
      this.issueMoveCommand(point);
      return;
    }

    if (event.button !== 0) return;

    this.dragging = true;
    this.dragStarted = false;
    this.dragStart = point;
    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = `${point.x}px`;
    this.selectionBox.style.top = `${point.y}px`;
    this.selectionBox.style.width = '0px';
    this.selectionBox.style.height = '0px';
  }

  handlePointerMove(event) {
    if (!this.dragging) return;
    const point = this.getPointerPosition(event);
    this.pointer = point;
    const dx = point.x - this.dragStart.x;
    const dy = point.y - this.dragStart.y;
    if (!this.dragStarted && Math.hypot(dx, dy) > 6) this.dragStarted = true;
    if (!this.dragStarted) return;

    const left = Math.min(this.dragStart.x, point.x);
    const top = Math.min(this.dragStart.y, point.y);
    const width = Math.abs(dx);
    const height = Math.abs(dy);

    this.selectionBox.style.left = `${left}px`;
    this.selectionBox.style.top = `${top}px`;
    this.selectionBox.style.width = `${width}px`;
    this.selectionBox.style.height = `${height}px`;
  }

  handlePointerUp(event) {
    if (!this.dragging || event.button !== 0) return;
    const point = this.getPointerPosition(event);
    this.pointer = point;

    if (this.dragStarted) {
      this.selectInBox(this.dragStart, point);
    } else {
      this.selectSingle(point);
    }

    this.dragging = false;
    this.dragStarted = false;
    this.dragStart = null;
    this.selectionBox.style.display = 'none';
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!this.started || this.gameOver) return;
      this.togglePause();
      return;
    }

    if (!this.started || this.gameOver || this.paused) return;
    if (event.repeat) return;

    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'BUTTON') return;

    if (event.key === '1') {
      this.selectUnitsByType('worker');
    } else if (event.key === '2') {
      this.selectUnitsByType('melee');
    } else if (event.key === '3') {
      this.selectUnitsByType('ranged');
    } else if (event.key === '4') {
      this.selectFighters();
    } else {
      return;
    }

    event.preventDefault();
  }

  selectSingle(point) {
    const clicked = [...this.units].reverse().find((unit) => unit.owner === 'player' && distance(unit, point) <= UNIT_TYPES[unit.type].radius + 4);
    this.clearSelection();
    if (clicked) {
      clicked.selected = true;
      this.selectedUnits = [clicked];
      return;
    }

    if (distance(point, this.bases.player) <= this.bases.player.radius) {
      this.selectedBase = this.bases.player;
    }
  }

  selectInBox(a, b) {
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    this.clearSelection();
    this.selectedUnits = this.units.filter((unit) => unit.owner === 'player' && unit.x >= left && unit.x <= right && unit.y >= top && unit.y <= bottom);
    for (const unit of this.selectedUnits) unit.selected = true;
  }

  clearSelection() {
    for (const unit of this.selectedUnits) unit.selected = false;
    this.selectedUnits = [];
    this.selectedBase = null;
  }

  selectUnitsByType(type) {
    this.clearSelection();
    this.selectedUnits = this.units.filter((unit) => unit.owner === 'player' && unit.type === type && unit.alive !== false);
    for (const unit of this.selectedUnits) unit.selected = true;
  }

  selectFighters() {
    this.clearSelection();
    this.selectedUnits = this.units.filter((unit) => unit.owner === 'player' && unit.type !== 'worker' && unit.alive !== false);
    for (const unit of this.selectedUnits) unit.selected = true;
  }

  issueMoveCommand(point) {
    if (this.selectedUnits.length === 0) return;
    const center = this.selectedUnits.length > 1 ? this.getSelectionCenter() : point;
    const offsetRadius = Math.min(36, 10 + this.selectedUnits.length * 2);
    this.selectedUnits.forEach((unit, index) => {
      const angle = (Math.PI * 2 * index) / this.selectedUnits.length;
      const offset = this.selectedUnits.length === 1 ? { x: 0, y: 0 } : { x: Math.cos(angle) * offsetRadius, y: Math.sin(angle) * offsetRadius };
      unit.commandMove(clamp(point.x + offset.x, 10, this.width - 10), clamp(point.y + offset.y, 10, this.height - 10), true);
    });
  }

  getSelectionCenter() {
    if (this.selectedUnits.length === 0) return { x: 0, y: 0 };
    const sum = this.selectedUnits.reduce((acc, unit) => ({ x: acc.x + unit.x, y: acc.y + unit.y }), { x: 0, y: 0 });
    return { x: sum.x / this.selectedUnits.length, y: sum.y / this.selectedUnits.length };
  }

  getPointerPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#030712');
    gradient.addColorStop(1, '#071223');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      ctx.fillStyle = `rgba(255,255,255,${star.a})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawGrid();

    for (const meteor of this.meteors) meteor.draw(ctx);
    this.drawMeteorImpacts(ctx);
    this.drawMiningParticles(ctx);
    this.bases.player.draw(ctx);
    this.bases.ai.draw(ctx);
    this.drawAttackEffects(ctx);
    for (const unit of this.units) unit.draw(ctx);
    if (this.gameOver) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#f4f8ff';
      ctx.font = '700 44px Pixelify Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.gameOver === 'win' ? 'Sieg' : 'Niederlage', this.width / 2, this.height / 2 - 6);
      ctx.font = '16px Pixelify Sans, sans-serif';
      ctx.fillText('Seite neu laden, um neu zu starten.', this.width / 2, this.height / 2 + 28);
      ctx.restore();
    }
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(120, 159, 255, 0.06)';
    ctx.lineWidth = 1;
    const spacing = 80;
    for (let x = 0; x < this.width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawAttackEffects(ctx) {
    for (const effect of this.attackEffects) {
      const progress = effect.elapsed / effect.duration;
      if (effect.kind === 'ranged') {
        const dx = effect.toX - effect.fromX;
        const dy = effect.toY - effect.fromY;
        const color = effect.owner === 'player' ? '120, 184, 255' : '255, 125, 138';

        ctx.save();
        for (let i = 0; i < 4; i += 1) {
          const offsetProgress = Math.max(0, progress - i * 0.08);
          const x = effect.fromX + dx * offsetProgress;
          const y = effect.fromY + dy * offsetProgress;
          const radius = Math.max(1.2, 3.6 - i * 0.5);
          ctx.fillStyle = `rgba(${color}, ${0.9 - i * 0.18})`;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      const alpha = 0.35 * (1 - progress);
      ctx.save();
      ctx.strokeStyle = effect.owner === 'player' ? `rgba(120, 184, 255, ${alpha})` : `rgba(255, 125, 138, ${alpha})`;
      ctx.lineWidth = 12 * (1 - progress * 0.25);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(effect.fromX, effect.fromY);
      ctx.lineTo(effect.toX, effect.toY);
      ctx.stroke();

      const haloRadius = effect.sourceRadius + 6 + progress * 14;
      ctx.fillStyle = effect.owner === 'player' ? `rgba(120, 184, 255, ${0.2 * (1 - progress)})` : `rgba(255, 125, 138, ${0.2 * (1 - progress)})`;
      ctx.beginPath();
      ctx.arc(effect.fromX, effect.fromY, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = effect.owner === 'player' ? `rgba(190, 223, 255, ${0.45 * (1 - progress)})` : `rgba(255, 209, 214, ${0.45 * (1 - progress)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(effect.fromX, effect.fromY, haloRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawMeteorImpacts(ctx) {
    for (const effect of this.meteorImpacts) {
      const progress = effect.elapsed / effect.duration;
      const radius = effect.size * (0.45 + progress * 0.8);
      const alpha = 0.45 * (1 - progress);

      ctx.save();
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 214, 122, ${alpha * 0.35})`;
      ctx.fill();
      ctx.lineWidth = 3 * (1 - progress * 0.35);
      ctx.strokeStyle = `rgba(255, 244, 214, ${alpha})`;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawMiningParticles(ctx) {
    for (const particle of this.miningParticles) {
      const progress = particle.elapsed / particle.duration;
      const eased = progress * (2 - progress);
      const x = particle.fromX + (particle.toX - particle.fromX) * eased;
      const y = particle.fromY + (particle.toY - particle.fromY) * eased - Math.sin(progress * Math.PI) * 8;
      const alpha = 1 - progress;

      ctx.save();
      ctx.fillStyle = `rgba(${particle.color}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  syncHUD() {
    const player = this.bases.player;
    this.hud.iron.textContent = Math.floor(player.iron);
    this.hud.gold.textContent = Math.floor(player.gold);
    this.hud.diamond.textContent = Math.floor(player.diamond);
    this.hud.difficulty.textContent = DIFFICULTIES[this.playerDifficulty].label;
    const selectedNames = this.selectedUnits.map((unit) => UNIT_TYPES[unit.type].label).join(', ');
    this.hud.info.textContent = this.selectedBase
      ? 'Basis ausgewählt.'
      : this.selectedUnits.length > 0
        ? `Ausgewählt: ${this.selectedUnits.length} (${selectedNames})`
        : 'Wähle Einheiten oder die Basis aus.';

    this.hud.productionStatus.classList.toggle('is-active', Boolean(player.active));
    this.hud.productionStatusFill.style.width = `${player.getActiveProgress() * 100}%`;

    if (this.isStormWarningActive()) {
      this.hud.stormAlert.textContent = `Massiver Meteoritenschauer in ${Math.ceil(this.stormCountdown)}... Zur Basis zurück!`;
      this.hud.stormAlert.classList.add('is-visible');
    } else if (this.isStormActive()) {
      this.hud.stormAlert.textContent = 'Massiver Meteoritenschauer aktiv';
      this.hud.stormAlert.classList.add('is-visible');
    } else {
      this.hud.stormAlert.textContent = '';
      this.hud.stormAlert.classList.remove('is-visible');
    }

    const { buttons } = this.hud;
    buttons.worker.disabled = !player.canAffordUnit('worker');
    buttons.melee.disabled = !player.canAffordUnit('melee');
    buttons.ranged.disabled = !player.canAffordUnit('ranged');
  }

  updateDifficultyLabel() {
    this.hud.difficulty.textContent = DIFFICULTIES[this.playerDifficulty].label;
  }

  updateDifficultyButtons() {
    for (const button of this.hud.difficultyOptions) {
      button.classList.toggle('is-active', button.dataset.difficulty === this.playerDifficulty);
    }
  }

  finishGame(result) {
    if (!this.rewardsGranted) {
      awardDiamonds(this.bases.player.diamond);
      this.rewardsGranted = true;
    }
    this.gameOver = result;
    this.running = false;
    this.playOutcomeSound(result);
    this.showGameOverOverlay(result);
  }

  togglePause() {
    this.paused = !this.paused;
    this.running = !this.paused;
    this.hud.pauseScreen?.classList.toggle('is-hidden', !this.paused);
  }

  showGameOverOverlay(result) {
    this.hud.gameOverTitle.textContent = result === 'win' ? 'Sieg' : 'Niederlage';
    this.hud.gameOverText.textContent = result === 'win'
      ? 'Du hast gewonnen. Zur Levelübersicht zurückkehren oder das Level erneut spielen.'
      : 'Du hast verloren. Zur Levelübersicht zurückkehren oder das Level erneut spielen.';
    this.hud.gameOverScreen.classList.remove('is-hidden');
  }

  setupAudio() {
    this.audioPools.attack = this.createAudioPool(ATTACK_SOUND_URL, 6, 0.38);
    this.audioPools.baseAttack = this.createAudioPool(BASE_ATTACK_SOUND_URL, 3, 0.6);
    this.audioPools.gameOver = this.createAudioPool(GAME_OVER_SOUND_URL, 1, 0.8);
    this.audioPools.meteor = this.createAudioPool(METEOR_SOUND_URL, 1, 0.75);
    this.audioPools.win = this.createAudioPool(WIN_SOUND_URL, 1, 0.8);
  }

  createAudioPool(src, size, volume) {
    return Array.from({ length: size }, () => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = volume;
      return audio;
    });
  }

  enableAudio() {
    if (this.audioEnabled) return;
    this.audioEnabled = true;
    for (const pool of Object.values(this.audioPools)) {
      for (const audio of pool) {
        const playAttempt = audio.play();
        if (playAttempt && typeof playAttempt.then === 'function') {
          playAttempt.then(() => {
            audio.pause();
            audio.currentTime = 0;
          }).catch(() => {
            this.audioEnabled = false;
          });
        }
      }
    }
  }

  playSound(name) {
    if (!this.audioEnabled) return;
    const pool = this.audioPools[name];
    if (!pool || pool.length === 0) return;
    const audio = pool.find((entry) => entry.paused || entry.ended) || pool[0];
    audio.currentTime = 0;
    const playAttempt = audio.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {});
    }
  }

  playAttackSound() {
    if (this.elapsedTime - this.lastAttackSoundAt < 0.08) return;
    this.lastAttackSoundAt = this.elapsedTime;
    this.playSound('attack');
  }

  playBaseAttackSound() {
    if (this.elapsedTime - this.lastBaseAttackSoundAt < 0.22) return;
    this.lastBaseAttackSoundAt = this.elapsedTime;
    this.playSound('baseAttack');
  }

  playClickSound() {
    playGlobalClickSound();
  }

  playOutcomeSound(result) {
    if (this.outcomeSoundPlayed) return;
    this.outcomeSoundPlayed = true;
    this.playSound(result === 'win' ? 'win' : 'gameOver');
  }

  playStormSound() {
    this.playSound('meteor');
  }
}
