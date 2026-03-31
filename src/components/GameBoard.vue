<template>
  <div class="game-board">
    <!-- ヘッダー -->
    <div class="game-board__header">
      <h1 class="game-title">🃏 Flip 7</h1>
      <div class="game-info">
        <span>ラウンド {{ state.roundNumber }}</span>
        <span>山札: {{ state.deck.length }}枚</span>
        <span>目標: {{ state.winScore }}点</span>
      </div>
    </div>

    <!-- プレイヤーエリア -->
    <div class="game-board__players" :class="`players-${state.players.length}`">
      <PlayerArea
        v-for="(player, idx) in state.players"
        :key="idx"
        :player="player"
        :isCurrent="idx === state.currentPlayerIndex && state.phase === 'playing'"
        :isActive="!player.busted && !player.passed"
        :lastDrawnCard="state.lastDrawnCard"
      />
    </div>

    <!-- アクション操作エリア -->
    <div class="game-board__controls">

      <!-- ターゲット選択 -->
      <div v-if="state.phase === 'targeting'" class="targeting-panel">
        <div class="targeting-panel__title">
          <template v-if="state.pendingAction?.card.name === 'freeze'">
            ❄️ フリーズ：対象プレイヤーを選んでください
          </template>
          <template v-else-if="state.pendingAction?.card.name === 'flipThree'">
            🃏 フリップ3：対象プレイヤーを選んでください
          </template>
        </div>
        <div class="targeting-panel__buttons">
          <button
            v-for="{ player, index } in validTargets"
            :key="index"
            class="btn btn--target"
            @click="emit('selectTarget', index)"
          >
            {{ player.name }}
            <span class="btn__sub">（{{ runningScore(player) }}点）</span>
          </button>
        </div>
      </div>

      <!-- 通常ターン操作 -->
      <div v-else-if="state.phase === 'playing'" class="turn-panel">
        <template v-if="isHumanTurn">
          <div class="turn-panel__info">
            <strong>{{ currentPlayer?.name }}</strong> のターン
          </div>
          <div class="turn-panel__buttons">
            <button class="btn btn--draw" @click="emit('draw')">
              📥 カードを引く
              <span class="btn__sub">（山札 {{ state.deck.length }}枚）</span>
            </button>
            <button
              class="btn btn--pass"
              :disabled="currentPlayer?.tableau.length === 0 && currentPlayer?.modifiers.length === 0"
              @click="emit('pass')"
            >
              ✋ パス
              <span class="btn__sub">（{{ runningScore(currentPlayer) }}点で確定）</span>
            </button>
          </div>
        </template>
        <template v-else>
          <div class="turn-panel__ai">
            <span class="dots">{{ currentPlayer?.name }} が考えています</span>
          </div>
        </template>
      </div>

      <!-- フリップ3進行中 -->
      <div v-else-if="state.flipThreeState" class="flipthree-panel">
        🃏 <strong>{{ state.players[state.flipThreeState.targetIndex]?.name }}</strong> がフリップ3を処理中
        （残り {{ state.flipThreeState.cardsRemaining }} 枚）
      </div>
    </div>

    <!-- ログ -->
    <div class="game-board__log">
      <div class="log-title">ゲームログ</div>
      <div class="log-body">
        <div v-for="(entry, i) in state.log" :key="i" class="log-entry">{{ entry }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PlayerArea from './PlayerArea.vue'
import { calculateRoundScore } from '../game/cards.js'

const props = defineProps({
  state: { type: Object, required: true },
  currentPlayer: { type: Object, default: null },
  validTargets: { type: Array, default: () => [] },
})

const emit = defineEmits(['draw', 'pass', 'selectTarget'])

const isHumanTurn = computed(() =>
  props.currentPlayer?.isHuman &&
  !props.currentPlayer?.busted &&
  !props.currentPlayer?.passed
)

function runningScore(player) {
  if (!player) return 0
  return calculateRoundScore(player)
}
</script>

<style scoped>
.game-board {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100vh;
  padding: 16px;
  max-width: 1100px;
  margin: 0 auto;
}

.game-board__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.game-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #ffd740;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

.game-info {
  display: flex;
  gap: 16px;
  color: #b0bec5;
  font-size: 0.9rem;
}

.game-board__players {
  display: grid;
  gap: 12px;
}

.players-2 { grid-template-columns: 1fr 1fr; }
.players-3 { grid-template-columns: 1fr 1fr 1fr; }
.players-4 { grid-template-columns: 1fr 1fr; }

@media (max-width: 700px) {
  .players-2, .players-3, .players-4 { grid-template-columns: 1fr; }
}

.game-board__controls {
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
  padding: 16px;
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ターゲット選択 */
.targeting-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.targeting-panel__title {
  color: #ffd740;
  font-weight: 700;
  font-size: 1rem;
}

.targeting-panel__buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 通常操作 */
.turn-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.turn-panel__info {
  color: #eceff1;
  font-size: 1rem;
}

.turn-panel__buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.turn-panel__ai {
  color: #90a4ae;
  font-size: 0.95rem;
}

/* フリップ3 */
.flipthree-panel {
  color: #f48fb1;
  font-size: 0.95rem;
}

/* ボタン */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 130px;
}

.btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
.btn:active:not(:disabled) { transform: translateY(0); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn--draw { background: #43a047; color: #fff; }
.btn--pass { background: #546e7a; color: #fff; }
.btn--target { background: #1976d2; color: #fff; }

.btn__sub {
  font-size: 0.72rem;
  font-weight: 400;
  opacity: 0.85;
}

/* ログ */
.game-board__log {
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
  padding: 12px 16px;
}

.log-title {
  font-size: 0.8rem;
  color: #78909c;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.log-body {
  max-height: 130px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.log-entry {
  font-size: 0.8rem;
  color: #b0bec5;
  padding: 1px 0;
}

.log-entry:first-child {
  color: #eceff1;
  font-weight: 500;
}

/* AIアニメーション */
.dots::after {
  content: '...';
  animation: dots 1.2s steps(3, end) infinite;
}

@keyframes dots {
  0%   { content: '.'; }
  33%  { content: '..'; }
  66%  { content: '...'; }
}
</style>
