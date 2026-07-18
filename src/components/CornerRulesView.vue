<template>
  <div class="corner-rules">
    <!-- 戻るボタン -->
    <button class="back-btn" @click="emit('back')">← ホームに戻る</button>

    <!-- タイトル -->
    <div class="corner-rules__header">
      <span class="corner-rules__icon">{{ corner.icon }}</span>
      <div class="corner-rules__header-text">
        <div class="corner-rules__title-row">
          <h1 class="corner-rules__title" :style="{ color: corner.titleColor }">{{ corner.title }}</h1>
          <div v-if="corner.tags && corner.tags.length" class="corner-rules__tags">
            <span
              v-for="tag in corner.tags"
              :key="tag"
              class="tag-chip"
              :style="{ color: TAG_CONFIG[tag]?.color, background: TAG_CONFIG[tag]?.bg }"
            >{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 準備中 -->
    <div v-if="corner.comingSoon" class="coming-soon">
      <div class="coming-soon__icon">🚧</div>
      <div class="coming-soon__text">準備中</div>
    </div>

    <!-- 箇条書き -->
    <ul v-else class="corner-rules__bullets">
      <li v-for="(b, i) in corner.bullets" :key="i">{{ b }}</li>
    </ul>

    <!-- セクション（タップで開閉） -->
    <div
      v-for="(section, si) in corner.sections"
      :key="si"
      class="corner-rules__section"
      :class="{ 'section--open': openSections.has(si) }"
    >
      <button class="section-header" @click="toggleSection(si)">
        <span class="section-label">{{ section.label }}</span>
        <span class="section-chevron">{{ openSections.has(si) ? '▴' : '▾' }}</span>
      </button>
      <div v-if="openSections.has(si)" class="section-body">
        <p
          v-for="(item, ii) in section.items"
          :key="ii"
          class="section-item"
          :style="{ color: item.color, fontWeight: item.bold ? '700' : '400' }"
          v-html="renderItem(item)"
        />
      </div>
    </div>

    <!-- QRコード -->
    <div v-if="corner.qrUrl" class="qr-area">
      <button class="qr-toggle-btn" @click="showQr = !showQr">
        {{ showQr ? '📷 QRコードを隠す' : '📷 QRコードを表示' }}
      </button>
      <div v-if="showQr" class="qr-display">
        <img :src="qrImageUrl" alt="QRコード" class="qr-image" />
        <div class="qr-caption">{{ corner.qrCaption || 'QRコード' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { TAG_CONFIG } from '../data/corners.js'

const props = defineProps({
  corner: { type: Object, required: true },
})

const emit = defineEmits(['back'])

// セクション開閉（デフォルトは全て閉じた状態）
const openSections = ref(new Set())

function toggleSection(idx) {
  const s = new Set(openSections.value)
  if (s.has(idx)) s.delete(idx)
  else s.add(idx)
  openSections.value = s
}

// QRコード
const showQr = ref(false)

// qrUrl をQR画像に変換（api.qrserver.com で生成）
const qrImageUrl = computed(() => {
  if (!props.corner.qrUrl) return ''
  const encoded = encodeURIComponent(props.corner.qrUrl)
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encoded}&margin=10`
})

function renderItem(item) {
  if (!item.greenRed) return item.text
  return item.text
    .replace(/(正解[^　\s）】）]*)/g, '<span style="color:#43a047;font-weight:700">$1</span>')
    .replace(/(誤答[^　\s）】）]*)/g, '<span style="color:#e53935;font-weight:700">$1</span>')
}
</script>

<style scoped>
.corner-rules {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100vh;
}

.back-btn {
  align-self: flex-start;
  padding: 6px 14px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: #546e7a;
  font-size: 0.82rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.back-btn:hover { border-color: rgba(255,255,255,0.3); color: #90a4ae; }

.corner-rules__header {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 20px 24px;
}

.corner-rules__icon { font-size: 2.2rem; flex-shrink: 0; }

.corner-rules__header-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.corner-rules__title {
  font-size: 1.7rem;
  font-weight: 900;
  margin: 0;
  letter-spacing: 0.03em;
}

.corner-rules__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.corner-rules__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag-chip {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.03em;
  line-height: 1.5;
}

/* 準備中 */
.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
  color: #546e7a;
}
.coming-soon__icon { font-size: 3rem; }
.coming-soon__text { font-size: 1.3rem; font-weight: 700; letter-spacing: 0.1em; }

/* 箇条書き */
.corner-rules__bullets {
  list-style: none;
  padding: 0 4px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.corner-rules__bullets li {
  font-size: 1.2rem;
  color: #cfd8dc;
}

/* セクション（開閉式） */
.corner-rules__section {
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  gap: 8px;
}
.section-header:hover { background: rgba(255,255,255,0.04); }

.section-label {
  padding: 2px 10px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  font-size: 0.78rem;
  color: #90a4ae;
  letter-spacing: 0.05em;
}

.section-chevron {
  font-size: 0.75rem;
  color: #37474f;
}

.section--open .section-label {
  border-color: rgba(255,255,255,0.35);
  color: #b0bec5;
}

.section-body {
  padding: 4px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.section-item {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
}

/* QRコード */
.qr-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.qr-toggle-btn {
  padding: 12px 28px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 10px;
  color: #cfd8dc;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.qr-toggle-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.35); }

.qr-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  animation: fadeIn 0.2s ease;
}

.qr-image {
  width: 220px;
  height: 220px;
  border-radius: 12px;
  background: #fff;
  padding: 10px;
  box-sizing: border-box;
}

.qr-caption {
  font-size: 0.82rem;
  color: #546e7a;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
