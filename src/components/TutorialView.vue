<template>
  <div class="tutorial">
    <!-- プログレスバー -->
    <div class="tutorial__progress">
      <div
        class="tutorial__progress-fill"
        :style="{ width: `${((step + 1) / steps.length) * 100}%` }"
      />
    </div>

    <!-- ステップカウンター -->
    <div class="tutorial__counter">{{ step + 1 }} / {{ steps.length }}</div>

    <!-- コンテンツ -->
    <div class="tutorial__body">
      <div class="tutorial__title">{{ current.title }}</div>
      <div class="tutorial__desc" v-html="current.desc" />

      <!-- ビジュアルデモ -->
      <div v-if="current.visual" class="tutorial__visual">

        <!-- 数字カード例 -->
        <template v-if="current.visual === 'numbers'">
          <div class="vis-label">数字カードの例</div>
          <div class="vis-cards">
            <div v-for="v in [1, 3, 5, 7, 9, 11]" :key="v" class="card" :class="`card--num-${v}`">
              <span class="card__value">{{ v }}</span>
            </div>
          </div>
        </template>

        <!-- バスト例 -->
        <template v-else-if="current.visual === 'bust'">
          <div class="vis-label">自分の場に <strong>5</strong> があるのに、また <strong>5</strong> を引いたら…</div>
          <div class="vis-cards">
            <div class="card card--num-3"><span class="card__value">3</span></div>
            <div class="card card--num-5"><span class="card__value">5</span></div>
            <div class="card card--num-8"><span class="card__value">8</span></div>
            <div class="card card--bust card--num-5"><span class="card__value">5</span></div>
          </div>
          <div class="vis-note bust-note">💥 バスト！ このラウンドは 0点</div>
        </template>

        <!-- パス例 -->
        <template v-else-if="current.visual === 'pass'">
          <div class="vis-label">場のカード（合計26点）</div>
          <div class="vis-cards">
            <div class="card card--num-3"><span class="card__value">3</span></div>
            <div class="card card--num-7"><span class="card__value">7</span></div>
            <div class="card card--num-9"><span class="card__value">9</span></div>
            <div class="card card--num-7" style="opacity:0.35;border-style:dashed"><span class="card__value">?</span></div>
          </div>
          <div class="vis-choice">
            <div class="vis-btn vis-btn--pass">✋ パスして 26点 確定</div>
            <div class="vis-btn vis-btn--continue">▶ 続けてリスクを取る</div>
          </div>
        </template>

        <!-- Flip 7 -->
        <template v-else-if="current.visual === 'flip7'">
          <div class="vis-label">7種類を集めると Flip 7 達成！</div>
          <div class="vis-cards">
            <div v-for="v in [1, 3, 5, 6, 8, 10, 12]" :key="v" class="card card--flip7" :class="`card--num-${v}`">
              <span class="card__value">{{ v }}</span>
            </div>
          </div>
          <div class="vis-note flip7-note">🎉 ラウンド即終了 ＋ 15点ボーナス！</div>
        </template>

        <!-- フリーズ -->
        <template v-else-if="current.visual === 'freeze'">
          <div class="vis-scene">
            <div class="vis-player">
              <div class="vis-player-name">あなた</div>
              <div class="card card--action card--freeze"><span class="card__action">❄️ フリーズ</span></div>
            </div>
            <div class="vis-arrow">→</div>
            <div class="vis-player">
              <div class="vis-player-name">相手（高スコア）</div>
              <div class="vis-frozen">✅ 強制パス！</div>
            </div>
          </div>
        </template>

        <!-- フリップ3 -->
        <template v-else-if="current.visual === 'flip3'">
          <div class="vis-scene">
            <div class="vis-player">
              <div class="vis-player-name">あなた</div>
              <div class="card card--action card--flipThree"><span class="card__action">🃏 フリップ3</span></div>
            </div>
            <div class="vis-arrow">→</div>
            <div class="vis-player">
              <div class="vis-player-name">相手</div>
              <div class="vis-cards" style="gap:4px">
                <div class="card card--back">?</div>
                <div class="card card--back">?</div>
                <div class="card card--back">?</div>
              </div>
              <div class="vis-note" style="margin-top:4px">3枚強制ドロー…</div>
            </div>
          </div>
        </template>

        <!-- セカンドチャンス -->
        <template v-else-if="current.visual === 'second'">
          <div class="vis-label">重複カードを引いても…</div>
          <div class="vis-scene" style="align-items:center">
            <div class="card card--bust card--num-7"><span class="card__value">7</span></div>
            <div class="vis-arrow">+</div>
            <div class="card card--action card--secondChance"><span class="card__action">🛡️ セカンドチャンス</span></div>
            <div class="vis-arrow">=</div>
            <div class="vis-note" style="color:#81c784;font-size:1.1rem;font-weight:700">セーフ！✨</div>
          </div>
        </template>

        <!-- モディファイアカード -->
        <template v-else-if="current.visual === 'modifier'">
          <div class="vis-label">スコア修飾カード</div>
          <div class="vis-cards">
            <div class="card card--mod"><span class="card__mod">×2</span></div>
            <div class="card card--mod"><span class="card__mod">+10</span></div>
            <div class="card card--mod"><span class="card__mod">+6</span></div>
          </div>
          <div class="vis-calc">
            数字合計 <strong>20点</strong> ＋ <span class="mod-x2">×2</span> ＋ <span class="mod-add">+10</span>
            ＝ <strong class="total">50点！</strong>
          </div>
        </template>

        <!-- スコア -->
        <template v-else-if="current.visual === 'score'">
          <div class="vis-label">ラウンド終了時のスコア例</div>
          <div class="vis-scoreboard">
            <div class="vis-score-row">
              <span>プレイヤー1</span>
              <span class="score-val">＋32点 → 累計 <strong>87点</strong></span>
            </div>
            <div class="vis-score-row bust-row">
              <span>プレイヤー2 💥</span>
              <span class="score-val">＋0点 → 累計 <strong>45点</strong></span>
            </div>
            <div class="vis-score-row">
              <span>プレイヤー3</span>
              <span class="score-val">＋18点 → 累計 <strong>112点</strong></span>
            </div>
          </div>
          <div class="vis-note" style="margin-top:8px">先に 200点 に達したプレイヤーが勝利！</div>
        </template>

      </div>
    </div>

    <!-- ナビゲーション -->
    <div class="tutorial__nav">
      <button class="nav-btn nav-btn--back" :disabled="step === 0" @click="step--">← 戻る</button>
      <button v-if="step < steps.length - 1" class="nav-btn nav-btn--next" @click="step++">次へ →</button>
      <button v-else class="nav-btn nav-btn--finish" @click="emit('finish')">プレイ画面へ →</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['finish'])

const step = ref(0)

const steps = [
  {
    title: 'Flip 7 へようこそ！',
    desc: 'クイズに正解したプレイヤーが山札から1枚カードを引きます。<br>数字カードを集めてスコアを稼ぎ、<strong>目標スコア（例: 200点）</strong>に先着したチームの勝利です！',
    visual: null,
  },
  {
    title: '数字カード',
    desc: '0〜12の数字カードがあります。<br>引いた数字は自分の<strong>場（tableau）</strong>に追加され、ラウンド終了時に合計がそのまま得点になります。',
    visual: 'numbers',
  },
  {
    title: 'バスト！',
    desc: '自分の場にすでにある数字と<strong>同じ数字</strong>を引いてしまうと<strong>バスト</strong>。<br>そのラウンドの得点は <strong>0点</strong> になります。',
    visual: 'bust',
  },
  {
    title: 'パスする？続ける？',
    desc: 'カードを引いた後、<strong>パス</strong>か<strong>続ける</strong>かを選べます。<br>パスすると現在のスコアが確定し、バストのリスクがなくなります。<br>欲張って続けるか、堅実にパスするかが駆け引きの肝！',
    visual: 'pass',
  },
  {
    title: 'Flip 7 達成！',
    desc: '<strong>7種類すべての異なる数字</strong>を集めると <strong>Flip 7</strong> 達成！<br>ラウンドが即座に終了し、<strong>+15点のボーナス</strong>が加算されます。<br>狙えるなら最大の逆転チャンス！',
    visual: 'flip7',
  },
  {
    title: 'アクションカード: ❄️ フリーズ',
    desc: '対象プレイヤーを選んで<strong>強制パス</strong>させます。<br>高得点のプレイヤーを止めたり、有利な展開を作りましょう。',
    visual: 'freeze',
  },
  {
    title: 'アクションカード: 🃏 フリップ3',
    desc: '対象プレイヤーに<strong>3枚強制ドロー</strong>させます。<br>バストのリスクを相手に押し付ける強力なカード。<br>自分自身を対象にすることもできます。',
    visual: 'flip3',
  },
  {
    title: 'アクションカード: 🛡️ セカンドチャンス',
    desc: 'このカードを持っていると、<strong>バストを1回だけ回避</strong>できます。<br>重複カードを引いてしまってもセーフ！安心して積極的に引けます。',
    visual: 'second',
  },
  {
    title: 'モディファイアカード',
    desc: '数字カードではなく、<strong>スコアにボーナス</strong>を与えるカードです。<br><strong>×2</strong>: 数字の合計を2倍にします（加算ボーナスの前に適用）。<br><strong>+N</strong>: 数字の合計にフラットボーナスを加算します。',
    visual: 'modifier',
  },
  {
    title: 'ラウンド終了とスコア',
    desc: '全員がパスまたはバストすると<strong>ラウンド終了</strong>。<br>バストしたプレイヤーは0点。パスしたプレイヤーは場の合計が得点になります。<br>複数ラウンドを重ねて<strong>目標スコア</strong>を目指しましょう！',
    visual: 'score',
  },
  {
    title: '準備完了！',
    desc: 'ルールは以上です。<br>クイズで正解者を選び、カードを引いて、スコアを競いましょう！<br>それでは、<strong>Flip 7</strong> を楽しんでください🎉',
    visual: null,
  },
]

const current = ref(steps[0])

import { watch } from 'vue'
watch(step, v => { current.value = steps[v] })
</script>

<style scoped>
.tutorial {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 100vh;
  max-width: 640px;
  margin: 0 auto;
  padding: 0 16px 24px;
}

/* プログレスバー */
.tutorial__progress {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  margin-bottom: 8px;
}

.tutorial__progress-fill {
  height: 100%;
  background: #ffd740;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.tutorial__counter {
  text-align: right;
  font-size: 0.75rem;
  color: #546e7a;
  margin-bottom: 12px;
}

/* コンテンツ */
.tutorial__body {
  flex: 1;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 28px 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tutorial__title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #ffd740;
  text-shadow: 0 2px 8px rgba(255,200,0,0.4);
}

.tutorial__desc {
  font-size: 0.95rem;
  line-height: 1.8;
  color: #cfd8dc;
}

.tutorial__desc strong {
  color: #fff;
}

/* ビジュアルエリア */
.tutorial__visual {
  background: rgba(0,0,0,0.25);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.vis-label {
  font-size: 0.8rem;
  color: #78909c;
  text-align: center;
}

.vis-label strong {
  color: #b0bec5;
}

.vis-cards {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.vis-note {
  font-size: 0.85rem;
  color: #90a4ae;
  text-align: center;
}

.bust-note { color: #ef9a9a; font-weight: 600; }
.flip7-note { color: #ffd740; font-weight: 700; font-size: 1rem; }

.vis-choice {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.vis-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
}

.vis-btn--pass { background: #546e7a; color: #fff; }
.vis-btn--continue { background: #2e7d32; color: #fff; }

.vis-scene {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.vis-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.vis-player-name {
  font-size: 0.8rem;
  color: #78909c;
}

.vis-frozen {
  font-size: 0.85rem;
  color: #81c784;
  font-weight: 700;
  padding: 6px 12px;
  border: 1px solid #81c784;
  border-radius: 6px;
}

.vis-arrow {
  font-size: 1.4rem;
  color: #546e7a;
  align-self: center;
}

.vis-calc {
  font-size: 0.9rem;
  color: #b0bec5;
  text-align: center;
}

.vis-calc strong { color: #fff; }
.mod-x2 { color: #ffb74d; font-weight: 700; }
.mod-add { color: #81c784; font-weight: 700; }
.total { color: #ffd740; font-size: 1.1rem; }

.vis-scoreboard {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vis-score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #b0bec5;
  padding: 6px 10px;
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
}

.bust-row { opacity: 0.6; }
.score-val strong { color: #ffd740; }

/* カード */
.card {
  width: 56px;
  height: 78px;
  border-radius: 8px;
  background: #fff;
  border: 2px solid #ccc;
  box-shadow: 2px 3px 6px rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card__value {
  font-size: 1.7rem;
  font-weight: 800;
  line-height: 1;
}

.card__mod {
  font-size: 1.1rem;
  font-weight: 700;
  color: #7a5900;
}

.card__action {
  font-size: 0.58rem;
  font-weight: 700;
  text-align: center;
  white-space: pre-line;
  line-height: 1.3;
  padding: 4px;
}

.card--num-0, .card--num-1  { background: #f8f9fa; color: #555; }
.card--num-2, .card--num-3  { background: #e8f5e9; color: #1b5e20; }
.card--num-4, .card--num-5  { background: #e3f2fd; color: #0d47a1; }
.card--num-6, .card--num-7  { background: #fff9c4; color: #f57f17; }
.card--num-8, .card--num-9  { background: #ffe0b2; color: #e65100; }
.card--num-10, .card--num-11, .card--num-12 { background: #fce4ec; color: #b71c1c; }

.card--flip7 {
  box-shadow: 0 0 10px 3px rgba(255,215,64,0.7), 2px 3px 6px rgba(0,0,0,0.3);
  transform: translateY(-3px);
}

.card--mod {
  background: linear-gradient(135deg, #fffde7, #fff9c4);
  border-color: #f9a825;
}

.card--freeze {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border-color: #1976d2;
  color: #0d47a1;
}

.card--flipThree {
  background: linear-gradient(135deg, #fce4ec, #f8bbd0);
  border-color: #c62828;
  color: #b71c1c;
}

.card--secondChance {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border-color: #2e7d32;
  color: #1b5e20;
}

.card--bust {
  background: #ffcdd2 !important;
  border-color: #d32f2f !important;
  position: relative;
}

.card--bust::after {
  content: '×';
  position: absolute;
  font-size: 2.5rem;
  color: rgba(211,47,47,0.6);
  font-weight: 900;
}

.card--back {
  background: linear-gradient(135deg, #1a237e, #283593);
  border-color: #3949ab;
  color: #7986cb;
  font-size: 1.5rem;
  font-weight: 700;
}

/* ナビゲーション */
.tutorial__nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  gap: 12px;
}

.nav-btn {
  padding: 12px 28px;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}

.nav-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.nav-btn--back {
  background: rgba(255,255,255,0.07);
  color: #90a4ae;
  border: 1px solid rgba(255,255,255,0.15);
}

.nav-btn--back:hover:not(:disabled) {
  background: rgba(255,255,255,0.12);
  color: #cfd8dc;
}

.nav-btn--next {
  background: #1565c0;
  color: #fff;
  margin-left: auto;
}

.nav-btn--next:hover {
  background: #1976d2;
  transform: translateY(-1px);
}

.nav-btn--finish {
  background: linear-gradient(135deg, #43a047, #2e7d32);
  color: #fff;
  margin-left: auto;
}

.nav-btn--finish:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
</style>
