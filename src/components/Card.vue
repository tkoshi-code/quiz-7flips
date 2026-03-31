<template>
  <div class="card" :class="[typeClass, { 'card--bust': bust, 'card--glow': glow }]">
    <div class="card__inner">
      <template v-if="card.type === 'number'">
        <span class="card__value">{{ card.value }}</span>
      </template>
      <template v-else-if="card.type === 'modifier'">
        <span class="card__mod">{{ card.modifier === 'multiply' ? '×2' : `+${card.value}` }}</span>
      </template>
      <template v-else-if="card.type === 'action'">
        <span class="card__action">{{ actionLabel }}</span>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: { type: Object, required: true },
  bust: { type: Boolean, default: false },
  glow: { type: Boolean, default: false },
})

const typeClass = computed(() => {
  if (props.card.type === 'number') return `card--num card--num-${props.card.value}`
  if (props.card.type === 'modifier') return 'card--mod'
  if (props.card.type === 'action') return `card--action card--${props.card.name}`
  return ''
})

const actionLabel = computed(() => {
  switch (props.card.name) {
    case 'freeze': return '❄️ フリーズ'
    case 'flipThree': return '🃏 フリップ3'
    case 'secondChance': return '🛡️ セカンド\nチャンス'
    default: return '?'
  }
})
</script>

<style scoped>
.card {
  width: 64px;
  height: 90px;
  border-radius: 8px;
  background: #fff;
  border: 2px solid #ccc;
  box-shadow: 2px 3px 6px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
  cursor: default;
  user-select: none;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 2px 6px 10px rgba(0,0,0,0.35);
}

.card__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.card__value {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
}

.card__mod {
  font-size: 1.3rem;
  font-weight: 700;
  color: #7a5900;
}

.card__action {
  font-size: 0.65rem;
  font-weight: 700;
  text-align: center;
  white-space: pre-line;
  line-height: 1.3;
  padding: 4px;
}

/* 数字カードのカラー（値が高いほど赤み） */
.card--num-0, .card--num-1 { background: #f8f9fa; color: #555; }
.card--num-2, .card--num-3 { background: #e8f5e9; color: #1b5e20; }
.card--num-4, .card--num-5 { background: #e3f2fd; color: #0d47a1; }
.card--num-6, .card--num-7 { background: #fff9c4; color: #f57f17; }
.card--num-8, .card--num-9 { background: #ffe0b2; color: #e65100; }
.card--num-10, .card--num-11, .card--num-12 { background: #fce4ec; color: #b71c1c; }

/* スコア修飾カード */
.card--mod {
  background: linear-gradient(135deg, #fffde7, #fff9c4);
  border-color: #f9a825;
  border-width: 2px;
}

/* アクションカード */
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

/* バスト時 */
.card--bust {
  background: #ffcdd2 !important;
  border-color: #d32f2f !important;
  opacity: 0.8;
}

/* グロー（最後に引いたカード） */
.card--glow {
  box-shadow: 0 0 12px 4px rgba(255, 200, 0, 0.8), 2px 3px 6px rgba(0,0,0,0.3);
  transform: translateY(-4px) scale(1.05);
}
</style>
