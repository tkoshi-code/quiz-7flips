<template>
  <div class="announcement">
    <!-- ヘッダー -->
    <div class="announcement__bar">
      <button class="back-btn" @click="emit('back')">← ホームに戻る</button>
      <div class="announcement__title">📢 告知スライド</div>
      <button class="url-btn" @click="showUrlEdit = !showUrlEdit">⚙️ URL設定</button>
    </div>

    <!-- URL編集 -->
    <div v-if="showUrlEdit" class="url-edit">
      <input
        v-model="draftUrl"
        class="url-input"
        placeholder="Google スライドの公開URLを入力"
      />
      <div class="url-actions">
        <button class="save-btn" @click="saveUrl">適用</button>
        <button class="cancel-btn" @click="showUrlEdit = false">キャンセル</button>
      </div>
    </div>

    <!-- スライド埋め込み -->
    <div class="announcement__frame-wrap">
      <iframe
        v-if="embedUrl"
        :src="embedUrl"
        class="announcement__frame"
        frameborder="0"
        allowfullscreen
      />
      <div v-else class="announcement__empty">
        <p>⚙️ URL設定からGoogle スライドの公開URLを入力してください</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['back'])

const STORAGE_KEY = 'piyopiyo_announcement_url'

const DEFAULT_URL = 'https://docs.google.com/presentation/d/e/2PACX-1vSbZpjtG1tmTwAA7DkbJXvPFCgurWW1SWojV3G0En0sWxLEmpYuPzv9aqOTXgqixOfn6WtOlLLJZp8B/embed?start=true&loop=true&delayms=5000'

function loadUrl() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL
}

const currentUrl = ref(loadUrl())
const draftUrl = ref(currentUrl.value)
const showUrlEdit = ref(false)

// 公開URLを埋め込み用URLに変換
// /pub?... → /embed?... に変換しないとiframeでブロックされる
const embedUrl = computed(() => {
  const url = currentUrl.value.trim()
  if (!url) return ''
  return url.replace('/pub?', '/embed?')
})

function saveUrl() {
  currentUrl.value = draftUrl.value
  localStorage.setItem(STORAGE_KEY, draftUrl.value)
  showUrlEdit.value = false
}
</script>

<style scoped>
.announcement {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #000;
}

/* バー */
.announcement__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(0,0,0,0.7);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
  gap: 12px;
}

.announcement__title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #ffd740;
  flex: 1;
  text-align: center;
}

.back-btn, .url-btn {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: #78909c;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 0.15s;
}

.back-btn:hover { color: #cfd8dc; border-color: rgba(255,255,255,0.35); }
.url-btn:hover  { color: #ffd740; border-color: #ffd740; }

/* URL編集 */
.url-edit {
  padding: 12px 16px;
  background: rgba(0,0,0,0.6);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.url-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: #eceff1;
  font-size: 0.85rem;
  outline: none;
  font-family: inherit;
}
.url-input:focus { border-color: #42a5f5; }

.url-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.save-btn {
  padding: 7px 18px;
  background: #1565c0;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.save-btn:hover { background: #1976d2; }

.cancel-btn {
  padding: 7px 14px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: #546e7a;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
}

/* フレーム */
.announcement__frame-wrap {
  flex: 1;
  display: flex;
  align-items: stretch;
  background: #111;
}

.announcement__frame {
  width: 100%;
  height: 100%;
  border: none;
}

.announcement__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #546e7a;
  font-size: 0.95rem;
  text-align: center;
  padding: 24px;
}
</style>
