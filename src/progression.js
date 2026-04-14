export const UPGRADE_DEFS = {
  prod: { label: 'Produktion', costs: [1, 1, 2, 3], maxLevel: 4 },
  damage: { label: 'Schaden', costs: [1, 1, 2, 3], maxLevel: 4 },
  range: { label: 'Reichweite', costs: [1, 1, 2, 3], maxLevel: 4 },
  gather: { label: 'Abbau', costs: [1, 1, 2, 3], maxLevel: 4 },
  hp: { label: 'HP', costs: [1, 1, 2, 3], maxLevel: 4 },
};

const STORAGE_KEY = 'space-rts-profile-v1';

export function createDefaultProfile() {
  return {
    diamonds: 0,
    upgrades: Object.fromEntries(Object.keys(UPGRADE_DEFS).map((key) => [key, 0])),
  };
}

export function loadProfile() {
  const fallback = createDefaultProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const upgrades = Object.fromEntries(
      Object.entries(UPGRADE_DEFS).map(([key, def]) => {
        const level = Number(parsed?.upgrades?.[key] ?? 0);
        return [key, Math.max(0, Math.min(def.maxLevel, Number.isFinite(level) ? level : 0))];
      }),
    );
    const diamonds = Math.max(0, Math.floor(Number(parsed?.diamonds ?? 0) || 0));
    return { diamonds, upgrades };
  } catch {
    return fallback;
  }
}

export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

export function getUpgradeCost(key, level) {
  return UPGRADE_DEFS[key].costs[level] ?? null;
}

export function awardDiamonds(amount) {
  const gain = Math.max(0, Math.floor(amount));
  const profile = loadProfile();
  profile.diamonds += gain;
  return saveProfile(profile);
}

export function purchaseUpgrade(key) {
  const profile = loadProfile();
  const def = UPGRADE_DEFS[key];
  const level = profile.upgrades[key];
  if (!def || level >= def.maxLevel) return profile;
  const cost = getUpgradeCost(key, level);
  if (cost === null || profile.diamonds < cost) return profile;
  profile.diamonds -= cost;
  profile.upgrades[key] += 1;
  return saveProfile(profile);
}

export function resetProfile() {
  return saveProfile(createDefaultProfile());
}
