<template>
  <div class="app">

    <!-- セットアップ画面 -->
    <div v-if="gameState.phase === 'setup'" class="setup-screen">
      <div class="setup-card">
        <h1 class="setup-title">🃏 Flip 7</h1>
        <p class="setup-sub">7種類の数字を集めるか、200点先取で勝利！</p>

        <div class="setup-section">
          <label>プレイヤー数</label>
          <div class="player-count-btns">
            <button
              v-for="n in [2,3,4]"
              :key="n"
              class="count-btn"
              :class="{ active: playerCount === n }"
              @click="playerCount = n"
            >{{ n }}人</button>
          </div>
        </div>

        <div class="setup-section">
          <label>目標スコア</label>
          <div class="player-count-btns">
            <button
              v-for="s in [100, 200, 300]"
              :key="s"
              class="count-btn"
              :class="{ active: winScore === s }"
              @click="winScore = s"
            >{{ s }}点</button>
          </div>
        </div>

        <div class="setup-players">
          <div v-for="(cfg, i) in playerConfigs.slice(0, playerCount)" :key="i" class="setup-player-row">
            <span class="setup-player-num">P{{ i + 1 }}</span>
            <input
              v-model="cfg.name"
              class="setup-name-input"
              :placeholder="`プレイヤー ${i + 1}`"
              maxlength="12"
            />
            <button
              class="type-btn"
              :class="{ 'human-active': cfg.isHuman }"
              @click="cfg.isHuman = true"
            >👤 人間</button>
            <button
              class="type-btn"
              :class="{ 'ai-active': !cfg.isHuman }"
              @click="cfg.isHuman = false"
            >🤖 CPU</button>
          </div>
        </div>

        <button class="btn-start" @click="startGame">ゲーム開始 →</button>

        <div class="setup-rules">
          <details>
            <summary>ルール概要を見る</summary>
            <ul>
              <li>ターンに1枚引くか、パスを選択</li>
              <li>重複する数字を引いたら<strong>バスト</strong>（そのラウンド0点）</li>
              <li>7種類の数字を集めると<strong>Flip 7達成！</strong> ラウンド即終了＋15点</li>
              <li>❄️ フリーズ：対象プレイヤーを強制パス</li>
              <li>🃏 フリップ3：対象プレイヤーが3枚強制ドロー</li>
              <li>🛡️ セカンドチャンス：バスト1回を回避</li>
              <li>×2カード：数字合計を2倍（加算ボーナスの前）</li>
              <li>先に目標スコア以上を取ったプレイヤーが勝利</li>
            </ul>
          </details>
        </div>
      </div>
    </div>

    <!-- ゲーム中 -->
    <template v-else>
      <GameBoard
        :state="gameState"
        :currentPlayer="currentPlayer"
        :validTargets="validTargets"
        @draw="playerDraw"
        @pass="playerPass"
        @selectTarget="playerSelectTarget"
      />

      <RoundSummary
        v-if="gameState.phase === 'roundEnd' || gameState.phase === 'gameEnd'"
        :players="gameState.players"
        :roundNumber="gameState.roundNumber"
        :winScore="gameState.winScore"
        @next="handleNext"
      />
    </template>

  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useGame } from './game/useGame.js'
import GameBoard from './components/GameBoard.vue'
import RoundSummary from './components/RoundSummary.vue'

const {
  state: gameState,
  currentPlayer,
  startGame: startGameFn,
  playerDraw,
  playerPass,
  playerSelectTarget,
  nextRound,
  getValidTargets,
} = useGame()

const playerCount = ref(2)
const winScore = ref(200)
const playerConfigs = reactive([
  { name: 'あなた', isHuman: true },
  { name: 'CPU-1', isHuman: false },
  { name: 'CPU-2', isHuman: false },
  { name: 'CPU-3', isHuman: false },
])

const validTargets = computed(() => {
  if (gameState.phase !== 'targeting' || !gameState.pendingAction) return []
  return getValidTargets(gameState.pendingAction.sourceIndex)
})

function startGame() {
  gameState.winScore = winScore.value
  startGameFn(
    playerConfigs.slice(0, playerCount.value).map(c => ({
      name: c.name || '???',
      isHuman: c.isHuman,
    }))
  )
}

function handleNext() {
  if (gameState.players.some(p => p.totalScore >= gameState.winScore)) {
    gameState.phase = 'setup'
  } else {
    nextRound()
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
}

.setup-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.setup-card {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 36px 40px;
  max-width: 480px;
  width: 100%;
  backdrop-filter: blur(8px);
}

.setup-title {
  text-align: center;
  font-size: 2.6rem;
  font-weight: 900;
  color: #ffd740;
  margin: 0 0 8px;
  text-shadow: 0 2px 16px rgba(255,200,0,0.5);
  letter-spacing: 0.04em;
}

.setup-sub {
  text-align: center;
  color: #78909c;
  margin: 0 0 28px;
  font-size: 0.88rem;
}

.setup-section {
  margin-bottom: 20px;
}

.setup-section label {
  display: block;
  color: #90a4ae;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 8px;
}

.player-count-btns {
  display: flex;
  gap: 8px;
}

.count-btn {
  flex: 1;
  padding: 8px;
  border: 2px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  color: #78909c;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
  font-family: inherit;
}

.count-btn.active {
  border-color: #ffd740;
  color: #ffd740;
  background: rgba(255,215,0,0.1);
}

.count-btn:hover:not(.active) {
  border-color: rgba(255,255,255,0.25);
  color: #cfd8dc;
}

.setup-players {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.setup-player-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setup-player-num {
  color: #546e7a;
  font-size: 0.8rem;
  width: 22px;
  flex-shrink: 0;
}

.setup-name-input {
  flex: 1;
  padding: 7px 10px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  color: #eceff1;
  font-size: 0.88rem;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}

.setup-name-input:focus { border-color: #42a5f5; }
.setup-name-input::placeholder { color: #37474f; }

.type-btn {
  padding: 6px 10px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  color: #546e7a;
  cursor: pointer;
  font-size: 0.78rem;
  transition: all 0.15s;
  white-space: nowrap;
  font-family: inherit;
}

.type-btn.human-active {
  background: rgba(66,165,250,0.2);
  border-color: #42a5f5;
  color: #90caf9;
}

.type-btn.ai-active {
  background: rgba(239,83,80,0.2);
  border-color: #ef5350;
  color: #ef9a9a;
}

.btn-start {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #43a047, #2e7d32);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 20px;
  font-family: inherit;
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(67,160,71,0.5);
  filter: brightness(1.08);
}

.setup-rules {
  font-size: 0.8rem;
}

.setup-rules summary {
  cursor: pointer;
  color: #546e7a;
  user-select: none;
  margin-bottom: 8px;
}

.setup-rules ul {
  padding-left: 1.3em;
  line-height: 2;
  margin: 8px 0 0;
  color: #607d8b;
}

.setup-rules strong { color: #90a4ae; }
</style>
