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
        :isActive="!player.busted && !player.passed"
        :lastDrawnCard="state.lastDrawnCard"
      />
    </div>

    <!-- 操作エリア -->
    <div class="game-board__controls">
      <button
        v-if="canUndo"
        class="btn-undo"
        @click="emit('undo')"
        title="直前の操作に戻す"
      >↩ 戻す</button>

      <!-- プレイヤー選択（クイズ正解者がカードを引く） -->
      <div v-if="state.phase === 'selectDrawer'" class="panel">
        <div class="panel-title">✅ クイズ正解者を選択</div>
        <div class="btn-group">
          <button
            v-for="(player, idx) in state.players"
            :key="idx"
            class="btn btn--player"
            :disabled="player.busted || player.passed"
            @click="emit('selectDrawer', idx)"
          >
            <span class="btn__name">{{ player.name }}</span>
            <span class="btn__sub">
              <template v-if="player.busted">💥 バスト</template>
              <template v-else-if="player.passed">✅ パス済み</template>
              <template v-else>{{ runningScore(player) }}点・{{ player.tableau.length }}枚</template>
            </span>
          </button>
        </div>
        <button class="btn-end-round" @click="emit('endRound')">ラウンド終了</button>
      </div>

      <!-- パス確認 -->
      <div v-else-if="state.phase === 'confirmPass'" class="panel">
        <div class="panel-title">
          <strong>{{ state.players[state.lastDrawerIndex]?.name }}</strong> はパスしますか？
        </div>
        <div class="panel-sub">
          現在 {{ runningScore(state.players[state.lastDrawerIndex]) }}点（{{ state.players[state.lastDrawerIndex]?.tableau.length }}枚）
        </div>
        <div class="btn-group">
          <button class="btn btn--pass" @click="emit('confirmPass', true)">
            ✋ パスする
          </button>
          <button class="btn btn--continue" @click="emit('confirmPass', false)">
            ▶ 続ける
          </button>
        </div>
      </div>

      <!-- ターゲット選択（アクションカード） -->
      <div v-else-if="state.phase === 'targeting'" class="panel">
        <div class="panel-title">
          <template v-if="state.pendingAction?.card.name === 'freeze'">
            ❄️ フリーズ：対象プレイヤーを選んでください
          </template>
          <template v-else-if="state.pendingAction?.card.name === 'flipThree'">
            🃏 フリップ3：対象プレイヤーを選んでください
          </template>
        </div>
        <div class="btn-group">
          <button
            v-for="{ player, index } in validTargets"
            :key="index"
            class="btn btn--target"
            @click="emit('selectTarget', index)"
          >
            <span class="btn__name">{{ player.name }}</span>
            <span class="btn__sub">{{ runningScore(player) }}点</span>
          </button>
        </div>
      </div>

      <!-- フリップ3進行中 -->
      <div v-else-if="state.flipThreeState" class="flipthree-msg">
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
import PlayerArea from './PlayerArea.vue'
import { calculateRoundScore } from '../game/cards.js'

const props = defineProps({
  state: { type: Object, required: true },
  validTargets: { type: Array, default: () => [] },
  canUndo: { type: Boolean, default: false },
})

const emit = defineEmits(['selectDrawer', 'confirmPass', 'selectTarget', 'endRound', 'undo'])

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
  padding: 20px 16px;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
}

.btn-undo {
  position: absolute;
  top: 10px;
  right: 12px;
  padding: 5px 12px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: #90a4ae;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.btn-undo:hover {
  background: rgba(255,255,255,0.15);
  color: #eceff1;
}

/* パネル共通 */
.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.panel-title {
  color: #ffd740;
  font-weight: 700;
  font-size: 1.05rem;
}

.panel-sub {
  color: #90a4ae;
  font-size: 0.85rem;
  margin-top: -6px;
}

.flipthree-msg {
  color: #f48fb1;
  font-size: 0.95rem;
}

/* ボタン群 */
.btn-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ボタン */
.btn {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 110px;
  font-family: inherit;
}

.btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
.btn:active:not(:disabled) { transform: translateY(0); }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }

.btn-end-round {
  margin-top: 4px;
  padding: 6px 18px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: #78909c;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-end-round:hover {
  border-color: #ef9a9a;
  color: #ef9a9a;
}

.btn--player   { background: #1565c0; color: #fff; }
.btn--pass     { background: #546e7a; color: #fff; }
.btn--continue { background: #2e7d32; color: #fff; }
.btn--target   { background: #6a1b9a; color: #fff; }

.btn__name {
  font-size: 1rem;
  font-weight: 700;
}

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
</style>
