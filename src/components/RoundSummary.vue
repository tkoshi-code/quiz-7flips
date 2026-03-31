<template>
  <div class="round-summary">
    <div class="round-summary__card">
      <h2 class="round-summary__title">
        <template v-if="flip7Player">
          🎉 {{ flip7Player.name }} が Flip 7 達成！
        </template>
        <template v-else>
          ラウンド {{ roundNumber }} 終了
        </template>
      </h2>

      <div class="round-summary__rows">
        <div
          v-for="row in sortedPlayers"
          :key="row.index"
          class="summary-row"
          :class="{
            'summary-row--winner': row.isRoundWinner,
            'summary-row--busted': row.player.busted,
            'summary-row--flip7': row.player.tableau.length >= 7,
          }"
        >
          <span class="summary-row__rank">{{ row.rank }}</span>
          <span class="summary-row__name">{{ row.player.name }}</span>
          <div class="summary-row__detail">
            <template v-if="row.player.busted">
              <span class="bust-label">バスト</span>
            </template>
            <template v-else>
              <span>数字合計: {{ numSum(row.player) }}</span>
              <span v-if="hasX2(row.player)">×2</span>
              <span v-if="flatBonus(row.player) > 0">+{{ flatBonus(row.player) }}</span>
              <span v-if="row.player.tableau.length >= 7" class="flip7-bonus">+15 (Flip 7)</span>
            </template>
          </div>
          <span class="summary-row__round-score" :class="{ 'zero-score': row.player.roundScore === 0 }">
            {{ row.player.roundScore }}点
          </span>
          <span class="summary-row__total">
            → 合計 <strong>{{ row.player.totalScore }}</strong>点
            <span v-if="row.player.totalScore >= winScore" class="winner-mark">🏆</span>
          </span>
        </div>
      </div>

      <div v-if="gameOver" class="round-summary__game-over">
        <h3>🏆 ゲーム終了！</h3>
        <p>{{ winners.map(p => p.name).join('、') }} の勝利！</p>
      </div>

      <button class="btn-next" @click="emit('next')">
        {{ gameOver ? 'ゲーム終了' : '次のラウンドへ →' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MODIFIER_TYPES } from '../game/cards.js'

const props = defineProps({
  players: { type: Array, required: true },
  roundNumber: { type: Number, required: true },
  winScore: { type: Number, default: 200 },
})

const emit = defineEmits(['next'])

const flip7Player = computed(() => props.players.find(p => p.tableau.length >= 7 && !p.busted) || null)

const gameOver = computed(() => props.players.some(p => p.totalScore >= props.winScore))

const winners = computed(() => {
  const max = Math.max(...props.players.map(p => p.totalScore))
  return props.players.filter(p => p.totalScore === max)
})

const sortedPlayers = computed(() => {
  const maxRoundScore = Math.max(...props.players.map(p => p.roundScore))
  return props.players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => b.player.roundScore - a.player.roundScore)
    .map((row, i, arr) => ({
      ...row,
      rank: i + 1,
      isRoundWinner: row.player.roundScore === maxRoundScore && maxRoundScore > 0,
    }))
})

function numSum(player) {
  return player.tableau.reduce((s, c) => s + c.value, 0)
}

function hasX2(player) {
  return player.modifiers.some(m => m.modifier === MODIFIER_TYPES.MULTIPLY)
}

function flatBonus(player) {
  return player.modifiers
    .filter(m => m.modifier === MODIFIER_TYPES.ADD)
    .reduce((s, m) => s + m.value, 0)
}
</script>

<style scoped>
.round-summary {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.round-summary__card {
  background: #1a2332;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 16px;
  padding: 28px 32px;
  max-width: 580px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}

.round-summary__title {
  text-align: center;
  font-size: 1.4rem;
  color: #ffd740;
  margin: 0 0 20px;
}

.round-summary__rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 10px 14px;
  flex-wrap: wrap;
}

.summary-row--winner {
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.summary-row--busted {
  background: rgba(200, 0, 0, 0.1);
  opacity: 0.75;
}

.summary-row--flip7 {
  background: rgba(0, 200, 100, 0.1);
  border: 1px solid rgba(0, 200, 100, 0.3);
}

.summary-row__rank {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
  color: #78909c;
}

.summary-row__name {
  font-weight: 700;
  color: #eceff1;
  min-width: 80px;
}

.summary-row__detail {
  display: flex;
  gap: 8px;
  flex: 1;
  font-size: 0.8rem;
  color: #90a4ae;
  flex-wrap: wrap;
}

.summary-row__round-score {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  min-width: 48px;
  text-align: right;
}

.zero-score { color: #ef5350 !important; }

.summary-row__total {
  font-size: 0.85rem;
  color: #b0bec5;
  min-width: 110px;
}

.summary-row__total strong { color: #fff; }

.bust-label {
  color: #ef5350;
  font-weight: 700;
}

.flip7-bonus {
  color: #69f0ae;
  font-weight: 700;
}

.winner-mark {
  margin-left: 4px;
}

.round-summary__game-over {
  text-align: center;
  margin-bottom: 16px;
}

.round-summary__game-over h3 {
  color: #ffd740;
  font-size: 1.3rem;
  margin: 0 0 6px;
}

.round-summary__game-over p {
  color: #eceff1;
  margin: 0;
}

.btn-next {
  display: block;
  width: 100%;
  padding: 12px;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-next:hover { background: #1565c0; transform: translateY(-1px); }
</style>
