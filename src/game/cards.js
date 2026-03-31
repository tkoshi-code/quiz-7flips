export const CARD_TYPES = {
  NUMBER: 'number',
  MODIFIER: 'modifier',
  ACTION: 'action',
}

export const ACTION_NAMES = {
  FREEZE: 'freeze',
  FLIP_THREE: 'flipThree',
  SECOND_CHANCE: 'secondChance',
}

export const MODIFIER_TYPES = {
  ADD: 'add',
  MULTIPLY: 'multiply',
}

export function buildDeck() {
  const cards = []
  let id = 0

  // 数字カード: 0と1は各1枚、2〜12は枚数=数値
  for (let v = 0; v <= 12; v++) {
    const count = v <= 1 ? 1 : v
    for (let i = 0; i < count; i++) {
      cards.push({ id: id++, type: CARD_TYPES.NUMBER, value: v })
    }
  }
  // 合計79枚

  // スコア修飾カード 6枚
  for (const bonus of [2, 4, 6, 8, 10]) {
    cards.push({ id: id++, type: CARD_TYPES.MODIFIER, modifier: MODIFIER_TYPES.ADD, value: bonus })
  }
  cards.push({ id: id++, type: CARD_TYPES.MODIFIER, modifier: MODIFIER_TYPES.MULTIPLY, value: 2 })

  // アクションカード 9枚
  for (let i = 0; i < 3; i++) {
    cards.push({ id: id++, type: CARD_TYPES.ACTION, name: ACTION_NAMES.FREEZE })
    cards.push({ id: id++, type: CARD_TYPES.ACTION, name: ACTION_NAMES.FLIP_THREE })
    cards.push({ id: id++, type: CARD_TYPES.ACTION, name: ACTION_NAMES.SECOND_CHANCE })
  }

  return shuffleArray(cards)
}

export function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function cardDisplayName(card) {
  if (!card) return '?'
  if (card.type === CARD_TYPES.NUMBER) return String(card.value)
  if (card.type === CARD_TYPES.MODIFIER) {
    return card.modifier === MODIFIER_TYPES.MULTIPLY ? '×2' : `+${card.value}`
  }
  if (card.type === CARD_TYPES.ACTION) {
    switch (card.name) {
      case ACTION_NAMES.FREEZE: return 'フリーズ'
      case ACTION_NAMES.FLIP_THREE: return 'フリップ3'
      case ACTION_NAMES.SECOND_CHANCE: return 'セカンド\nチャンス'
    }
  }
  return '?'
}

export function calculateRoundScore(player) {
  if (player.busted) return 0
  let score = player.tableau.reduce((sum, c) => sum + c.value, 0)
  const hasX2 = player.modifiers.some(m => m.modifier === MODIFIER_TYPES.MULTIPLY)
  if (hasX2) score *= 2
  const flatBonus = player.modifiers
    .filter(m => m.modifier === MODIFIER_TYPES.ADD)
    .reduce((sum, m) => sum + m.value, 0)
  score += flatBonus
  if (player.tableau.length >= 7) score += 15
  return score
}
