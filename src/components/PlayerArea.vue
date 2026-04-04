<template>
  <div
    class="player-area"
    :class="{
      'player-area--active': isActive,
      'player-area--busted': player.busted,
      'player-area--passed': player.passed && !player.busted,
    }"
  >
    <!-- ヘッダー -->
    <div class="player-area__header">
      <span class="player-area__name">{{ player.name }}</span>
      <span class="player-area__status">
        <template v-if="player.busted">💥 バスト</template>
        <template v-else-if="player.passed">✅ パス済み</template>
      </span>
      <span class="player-area__score">
        累計: <strong>{{ player.totalScore }}</strong>点
      </span>
    </div>

    <!-- 数字カード一覧 -->
    <div class="player-area__tableau">
      <template v-if="player.tableau.length === 0 && !player.busted">
        <span class="player-area__empty">まだカードなし</span>
      </template>
      <Card
        v-for="card in player.tableau"
        :key="card.id"
        :card="card"
        :glow="lastDrawnCard && card.id === lastDrawnCard.id"
      />
      <Card
        v-if="player.busted && player.bustCard"
        :card="player.bustCard"
        :bust="true"
        :glow="lastDrawnCard && player.bustCard.id === lastDrawnCard.id"
      />
    </div>

    <!-- 修飾カード & セカンドチャンス -->
    <div v-if="player.modifiers.length > 0 || player.secondChance" class="player-area__extras">
      <Card
        v-for="card in player.modifiers"
        :key="card.id"
        :card="card"
        :glow="lastDrawnCard && card.id === lastDrawnCard.id"
      />
      <Card
        v-if="player.secondChance"
        :card="player.secondChance"
      />
    </div>

    <!-- ランニングスコア -->
    <div class="player-area__running">
      <template v-if="player.busted">
        今ラウンド: <strong class="bust-text">0点</strong>
      </template>
      <template v-else>
        今ラウンド: <strong>{{ runningScore }}</strong>点
        <span v-if="player.tableau.length >= 1" class="card-count">（{{ player.tableau.length }}枚）</span>
        <span v-if="player.tableau.length === 6" class="flip7-warn">⚠️ あと1枚でFlip 7！</span>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Card from './Card.vue'
import { calculateRoundScore } from '../game/cards.js'

const props = defineProps({
  player: { type: Object, required: true },
  isActive: { type: Boolean, default: false },
  lastDrawnCard: { type: Object, default: null },
})

const runningScore = computed(() => calculateRoundScore(props.player))
</script>

<style scoped>
.player-area {
  background: rgba(0, 0, 0, 0.25);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 12px 16px;
  transition: all 0.3s;
}

.player-area--current {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 220, 50, 0.6);
  box-shadow: 0 0 16px rgba(255, 220, 50, 0.3);
}

.player-area--busted {
  background: rgba(180, 0, 0, 0.2);
  border-color: rgba(255, 80, 80, 0.4);
  opacity: 0.75;
}

.player-area--passed {
  opacity: 0.7;
}

.player-area__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.player-area__name {
  font-weight: 700;
  font-size: 1.05rem;
  color: #fff;
}

.player-area__status {
  font-size: 0.8rem;
  color: #ffd700;
  flex: 1;
}

.player-area__score {
  font-size: 0.85rem;
  color: #b0bec5;
}

.player-area__tableau {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 90px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.player-area__empty {
  color: rgba(255,255,255,0.3);
  font-size: 0.85rem;
  align-self: center;
}

.player-area__extras {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 8px;
}

.player-area__running {
  font-size: 0.85rem;
  color: #cfd8dc;
}

.player-area__running strong {
  color: #fff;
  font-size: 1rem;
}

.bust-text {
  color: #ff5252 !important;
}

.card-count {
  color: #90a4ae;
  margin-left: 4px;
}

.flip7-warn {
  color: #ffd740;
  margin-left: 6px;
  font-weight: 600;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
