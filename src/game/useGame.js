import { reactive, computed } from 'vue'
import { buildDeck, shuffleArray, CARD_TYPES, ACTION_NAMES, calculateRoundScore } from './cards.js'

const FLIP_THREE_DELAY = 900 // ms
const MAX_HISTORY = 15

export function useGame() {
  // リアクティブ外で管理（スナップショットのネスト回避）
  const history = []

  const state = reactive({
    phase: 'setup', // setup | selectDrawer | confirmPass | targeting | roundEnd | gameEnd
    players: [],
    deck: [],
    discardPile: [],
    startPlayerIndex: 0,
    roundNumber: 1,
    pendingAction: null,    // { card, sourceIndex }
    flipThreeState: null,   // { targetIndex, cardsRemaining, deferredActions }
    actionQueue: [],        // [{ card, sourceIndex }]
    lastDrawerIndex: null,  // 直前にカードを引いたプレイヤー（confirmPass用）
    log: [],
    lastDrawnCard: null,
    winScore: 200,
  })

  const activePlayers = computed(() => state.players.filter(p => !p.passed && !p.busted))
  const canUndo = computed(() => history.length > 0)

  // ---- 履歴（undo） ----

  function _saveSnapshot() {
    const snap = JSON.parse(JSON.stringify({
      phase: state.phase,
      players: state.players,
      deck: state.deck,
      discardPile: state.discardPile,
      startPlayerIndex: state.startPlayerIndex,
      roundNumber: state.roundNumber,
      pendingAction: state.pendingAction,
      flipThreeState: state.flipThreeState,
      actionQueue: state.actionQueue,
      lastDrawerIndex: state.lastDrawerIndex,
      log: state.log,
      lastDrawnCard: state.lastDrawnCard,
    }))
    history.push(snap)
    if (history.length > MAX_HISTORY) history.shift()
  }

  function undo() {
    if (history.length === 0) return
    const snap = history.pop()
    Object.assign(state, snap)
  }

  // ---- セットアップ ----

  function createPlayer(name) {
    return {
      name,
      totalScore: 0,
      tableau: [],
      modifiers: [],
      secondChance: null,
      passed: false,
      busted: false,
      bustCard: null,
      roundScore: 0,
    }
  }

  function startGame(playerConfigs) {
    state.players = playerConfigs.map(p => createPlayer(p.name))
    state.roundNumber = 1
    state.startPlayerIndex = 0
    state.deck = buildDeck()
    state.discardPile = []
    _startRound()
  }

  function _startRound() {
    state.lastDrawnCard = null
    state.flipThreeState = null
    state.pendingAction = null
    state.actionQueue = []
    state.lastDrawerIndex = null
    state.log = []

    for (const p of state.players) {
      p.tableau = []
      p.modifiers = []
      p.secondChance = null
      p.passed = false
      p.busted = false
      p.bustCard = null
      p.roundScore = 0
    }

    if (state.deck.length === 0) _reshuffleDeck()

    _log(`=== ラウンド ${state.roundNumber} 開始 ===`)

    // 全員に1枚ずつ配る
    const order = _turnOrder()
    for (const idx of order) {
      const card = _draw()
      if (card) _resolveCard(idx, card, true)
    }

    if (activePlayers.value.length === 0) {
      _endRound()
    } else if (state.actionQueue.length > 0) {
      _processQueue()
    } else {
      state.phase = 'selectDrawer'
    }
  }

  function _turnOrder() {
    const n = state.players.length
    return Array.from({ length: n }, (_, i) => (state.startPlayerIndex + i) % n)
  }

  function _draw() {
    if (state.deck.length === 0) _reshuffleDeck()
    return state.deck.pop() || null
  }

  function _reshuffleDeck() {
    if (state.discardPile.length === 0) return
    _log('山札を補充（捨て札をシャッフル）')
    state.deck = shuffleArray([...state.discardPile])
    state.discardPile = []
  }

  // カードを解決: 'ok' | 'bust' | 'flip7' | 'needsTarget'
  function _resolveCard(playerIndex, card, isInitialDeal = false) {
    const player = state.players[playerIndex]
    state.lastDrawnCard = card

    if (card.type === CARD_TYPES.NUMBER) {
      const dup = player.tableau.some(c => c.value === card.value)
      if (dup) {
        if (player.secondChance) {
          _log(`${player.name} がセカンドチャンスを使用`)
          state.discardPile.push(player.secondChance)
          state.discardPile.push(card)
          player.secondChance = null
          return 'ok'
        }
        player.busted = true
        player.bustCard = card
        state.discardPile.push(card)
        _log(`${player.name} がバスト！（重複: ${card.value}）`)
        return 'bust'
      }
      player.tableau.push(card)
      _log(`${player.name} が ${card.value} を獲得`)
      if (player.tableau.length === 7) {
        _log(`${player.name} が Flip 7 達成！`)
        return 'flip7'
      }
      return 'ok'
    }

    if (card.type === CARD_TYPES.MODIFIER) {
      player.modifiers.push(card)
      _log(`${player.name} が ${_modLabel(card)} を獲得`)
      return 'ok'
    }

    if (card.type === CARD_TYPES.ACTION) {
      return _resolveAction(playerIndex, card, isInitialDeal)
    }

    return 'ok'
  }

  function _resolveAction(drawerIndex, card, isInitialDeal) {
    const drawer = state.players[drawerIndex]

    if (card.name === ACTION_NAMES.SECOND_CHANCE) {
      if (!drawer.secondChance) {
        drawer.secondChance = card
        _log(`${drawer.name} がセカンドチャンスを入手`)
      } else {
        const others = activePlayers.value.filter(p => p !== drawer && !p.secondChance)
        if (others.length > 0) {
          others[0].secondChance = card
          _log(`セカンドチャンスを ${others[0].name} に渡した`)
        } else {
          state.discardPile.push(card)
          _log('セカンドチャンスを捨て牌に')
        }
      }
      return 'ok'
    }

    // Freeze / FlipThree → 対象選択が必要
    if (isInitialDeal) {
      // フリーズ・フリップ3ともに初期配布でも対象選択UIを出す
      state.actionQueue.push({ card, sourceIndex: drawerIndex })
      return 'ok'
    }
    return 'needsTarget'
  }

  function _executeTargeted(sourceIndex, targetIndex, card) {
    const source = state.players[sourceIndex]
    const target = state.players[targetIndex]

    if (card.name === ACTION_NAMES.FREEZE) {
      _log(`${source.name} → ${target.name} にフリーズ！`)
      target.passed = true
      state.discardPile.push(card)
    } else if (card.name === ACTION_NAMES.FLIP_THREE) {
      _log(`${source.name} → ${target.name} にフリップ3！`)
      state.discardPile.push(card)
      state.flipThreeState = { targetIndex, cardsRemaining: 3, deferredActions: [] }
      _flipThreeNext()
    }
  }

  function _flipThreeNext() {
    if (!state.flipThreeState) return
    const { targetIndex, cardsRemaining } = state.flipThreeState
    const target = state.players[targetIndex]

    if (cardsRemaining === 0 || target.busted || target.tableau.length >= 7) {
      _finishFlipThree()
      return
    }

    setTimeout(() => {
      if (!state.flipThreeState) return
      const card = _draw()
      if (!card) { _finishFlipThree(); return }

      _log(`フリップ3 (残${state.flipThreeState.cardsRemaining}): ${target.name} が引く`)
      state.lastDrawnCard = card

      if (card.type === CARD_TYPES.NUMBER) {
        const dup = target.tableau.some(c => c.value === card.value)
        if (dup) {
          if (target.secondChance) {
            _log(`${target.name} がセカンドチャンスを使用`)
            state.discardPile.push(target.secondChance)
            state.discardPile.push(card)
            target.secondChance = null
          } else {
            target.busted = true
            target.bustCard = card
            state.discardPile.push(card)
            _log(`${target.name} がバスト！（重複: ${card.value}）`)
          }
        } else {
          target.tableau.push(card)
          _log(`${target.name} が ${card.value} を獲得`)
          if (target.tableau.length === 7) {
            _log(`${target.name} が Flip 7 達成！`)
            _finishFlipThree(true)
            return
          }
        }
      } else if (card.type === CARD_TYPES.MODIFIER) {
        target.modifiers.push(card)
        _log(`${target.name} が ${_modLabel(card)} を獲得`)
      } else if (card.type === CARD_TYPES.ACTION) {
        if (card.name === ACTION_NAMES.SECOND_CHANCE) {
          if (!target.secondChance) {
            target.secondChance = card
            _log(`${target.name} がセカンドチャンスを入手`)
          } else {
            const others = activePlayers.value.filter(p => p !== target && !p.secondChance)
            if (others.length > 0) {
              others[0].secondChance = card
              _log(`セカンドチャンスを ${others[0].name} に渡した`)
            } else {
              state.discardPile.push(card)
            }
          }
        } else {
          _log(`${_actionLabel(card)} を後で処理`)
          state.flipThreeState.deferredActions.push({ card, sourceIndex: targetIndex })
        }
      }

      state.flipThreeState.cardsRemaining--
      _flipThreeNext()
    }, FLIP_THREE_DELAY)
  }

  function _finishFlipThree(isFlip7 = false) {
    if (!state.flipThreeState) return
    const deferred = [...state.flipThreeState.deferredActions]
    state.flipThreeState = null

    if (isFlip7) {
      _endRound()
      return
    }

    for (const d of deferred) state.actionQueue.push(d)
    if (_checkRoundEnd()) return
    _processQueue()
  }

  // ---- プレイヤー操作（クイズモード） ----

  // ホストが「このプレイヤーが正解した」と選んでカードを引かせる
  function selectDrawer(playerIndex) {
    if (state.phase !== 'selectDrawer') return
    _saveSnapshot()
    const player = state.players[playerIndex]
    if (!player || player.busted || player.passed) return

    state.lastDrawerIndex = playerIndex

    const card = _draw()
    if (!card) return

    const result = _resolveCard(playerIndex, card)

    if (result === 'flip7') {
      _endRound()
      return
    }

    if (result === 'needsTarget') {
      const targets = getValidTargets(playerIndex, card)
      if (targets.length === 0) {
        _log(`対象なし、${_actionLabel(card)} をスキップ`)
        state.discardPile.push(card)
        if (_checkRoundEnd()) return
        _afterDraw()
        return
      }
      state.pendingAction = { card, sourceIndex: playerIndex }
      state.phase = 'targeting'
      return
    }

    if (_checkRoundEnd()) return

    if (result === 'bust') {
      // バストしたのでパス確認不要、そのまま選択画面へ
      state.phase = 'selectDrawer'
    } else {
      // 引けた → パスするか確認
      state.phase = 'confirmPass'
    }
  }

  // 引いた後：パスするか継続するか
  function confirmPassChoice(doPass) {
    if (state.phase !== 'confirmPass') return
    _saveSnapshot()
    const player = state.players[state.lastDrawerIndex]
    if (!player) return

    if (doPass) {
      player.passed = true
      _log(`${player.name} がパス（確定スコア: ${_runningScore(player)}点）`)
      if (_checkRoundEnd()) return
    }

    state.phase = 'selectDrawer'
  }

  function playerSelectTarget(targetIndex) {
    if (state.phase !== 'targeting' || !state.pendingAction) return
    _saveSnapshot()

    const { card, sourceIndex } = state.pendingAction
    state.pendingAction = null

    _executeTargeted(sourceIndex, targetIndex, card)

    if (!state.flipThreeState) {
      if (_checkRoundEnd()) return
      _processQueue()
    }
  }

  // ---- 内部進行 ----

  function _afterDraw() {
    if (_checkRoundEnd()) return
    const drawer = state.players[state.lastDrawerIndex]
    if (!drawer || drawer.busted) {
      state.phase = 'selectDrawer'
    } else {
      state.phase = 'confirmPass'
    }
  }

  function _processQueue() {
    if (state.actionQueue.length === 0) {
      _afterDraw()
      return
    }

    const action = state.actionQueue.shift()
    const targets = getValidTargets(action.sourceIndex, action.card)

    if (targets.length === 0) {
      _log(`対象なし、${_actionLabel(action.card)} をスキップ`)
      state.discardPile.push(action.card)
      if (_checkRoundEnd()) return
      _processQueue()
      return
    }

    // フリップ3の遅延アクションは常に対象選択UIを表示
    state.pendingAction = action
    state.phase = 'targeting'
  }

  function _checkRoundEnd() {
    if (activePlayers.value.length === 0) {
      _endRound()
      return true
    }
    return false
  }

  // ---- ラウンド終了 ----

  function _endRound() {
    state.flipThreeState = null
    state.pendingAction = null
    state.actionQueue = []

    for (const p of state.players) {
      p.roundScore = calculateRoundScore(p)
      p.totalScore += p.roundScore
    }

    for (const p of state.players) {
      if (!p.busted) {
        state.discardPile.push(...p.tableau, ...p.modifiers)
        if (p.secondChance) state.discardPile.push(p.secondChance)
      }
    }

    _log('--- ラウンド終了 ---')
    for (const p of state.players) {
      _log(`${p.name}: ${p.roundScore}点 → 合計${p.totalScore}点`)
    }

    state.phase = 'roundEnd'
  }

  function nextRound() {
    if (state.players.some(p => p.totalScore >= state.winScore)) {
      state.phase = 'gameEnd'
      return
    }
    state.startPlayerIndex = (state.startPlayerIndex + 1) % state.players.length
    state.roundNumber++
    _startRound()
  }

  // ---- ユーティリティ ----

  function _runningScore(player) {
    return player.tableau.reduce((s, c) => s + c.value, 0)
  }

  function _modLabel(card) {
    return card.modifier === 'multiply' ? '×2' : `+${card.value}`
  }

  function _actionLabel(card) {
    switch (card.name) {
      case ACTION_NAMES.FREEZE: return 'フリーズ'
      case ACTION_NAMES.FLIP_THREE: return 'フリップ3'
      case ACTION_NAMES.SECOND_CHANCE: return 'セカンドチャンス'
    }
  }

  function _log(msg) {
    state.log.unshift(msg)
    if (state.log.length > 40) state.log.pop()
  }

  function getValidTargets(sourceIndex, card = null) {
    const isFlipThree = card?.name === ACTION_NAMES.FLIP_THREE
    return state.players
      .map((p, i) => ({ player: p, index: i }))
      .filter(({ player, index }) => (isFlipThree || index !== sourceIndex) && !player.busted && !player.passed)
  }

  function endRoundNow() {
    if (state.phase !== 'selectDrawer') return
    _saveSnapshot()
    _log('ラウンドを強制終了')
    _endRound()
  }

  return {
    state,
    activePlayers,
    canUndo,
    startGame,
    selectDrawer,
    confirmPassChoice,
    playerSelectTarget,
    nextRound,
    getValidTargets,
    endRoundNow,
    undo,
  }
}
