import { reactive, computed } from 'vue'
import { buildDeck, shuffleArray, CARD_TYPES, ACTION_NAMES, calculateRoundScore } from './cards.js'

const AI_DELAY = 900 // ms

export function useGame() {
  const state = reactive({
    phase: 'setup', // setup | playing | targeting | roundEnd | gameEnd
    players: [],
    deck: [],
    discardPile: [],
    currentPlayerIndex: 0,
    startPlayerIndex: 0,
    roundNumber: 1,
    pendingAction: null,   // { card, sourceIndex }
    flipThreeState: null,  // { targetIndex, cardsRemaining, deferredActions }
    actionQueue: [],       // [{ card, sourceIndex }]
    log: [],
    lastDrawnCard: null,
    winScore: 200,
  })

  const currentPlayer = computed(() => state.players[state.currentPlayerIndex])
  const activePlayers = computed(() => state.players.filter(p => !p.passed && !p.busted))

  // ---- Setup ----

  function createPlayer(name, isHuman) {
    return {
      name, isHuman,
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
    state.players = playerConfigs.map(p => createPlayer(p.name, p.isHuman))
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

    state.currentPlayerIndex = state.startPlayerIndex
    _skipToActive()

    if (activePlayers.value.length === 0) {
      _endRound()
    } else {
      state.phase = 'playing'
      _scheduleAI()
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

  // カードを解決して結果を返す: 'ok' | 'bust' | 'flip7' | 'needsTarget'
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
      // 初期配布時は自動ターゲット
      _autoExecuteTargeted(drawerIndex, card)
      return 'ok'
    }
    return 'needsTarget'
  }

  function _autoExecuteTargeted(sourceIndex, card) {
    const targets = activePlayers.value.filter(p => state.players.indexOf(p) !== sourceIndex)
    if (targets.length === 0) { state.discardPile.push(card); return }
    let targetIdx
    if (card.name === ACTION_NAMES.FREEZE) {
      // 最高スコアの相手をフリーズ
      let best = targets[0]
      for (const t of targets) {
        if (_runningScore(t) > _runningScore(best)) best = t
      }
      targetIdx = state.players.indexOf(best)
    } else {
      targetIdx = state.players.indexOf(targets[Math.floor(Math.random() * targets.length)])
    }
    _executeTargeted(sourceIndex, targetIdx, card)
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
          // Freeze / FlipThree は後で処理
          _log(`${_actionLabel(card)} を後で処理`)
          state.flipThreeState.deferredActions.push({ card, sourceIndex: targetIndex })
        }
      }

      state.flipThreeState.cardsRemaining--
      _flipThreeNext()
    }, AI_DELAY)
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

  // ---- プレイヤー操作 ----

  function playerDraw() {
    if (state.phase !== 'playing') return
    const player = currentPlayer.value
    if (!player || player.busted || player.passed) return

    const card = _draw()
    if (!card) return

    const result = _resolveCard(state.currentPlayerIndex, card)

    if (result === 'flip7') {
      _endRound()
      return
    }

    if (result === 'needsTarget') {
      const targets = getValidTargets(state.currentPlayerIndex)
      if (targets.length === 0) {
        _log(`対象なし、${_actionLabel(card)} をスキップ`)
        state.discardPile.push(card)
        if (_checkRoundEnd()) return
        _scheduleAI()
        return
      }
      state.pendingAction = { card, sourceIndex: state.currentPlayerIndex }
      if (player.isHuman) {
        state.phase = 'targeting'
      } else {
        _autoExecuteTargeted(state.currentPlayerIndex, card)
        state.pendingAction = null
        if (!state.flipThreeState) {
          if (_checkRoundEnd()) return
          _processQueue()
        }
      }
      return
    }

    // bust or ok
    if (_checkRoundEnd()) return
    if (result === 'bust') {
      _advancePlayer()
    } else {
      // ターン継続（もう一度引くかパスか選べる）
      // AIの場合は少し待ってから再判断
      _scheduleAI()
    }
  }

  function playerPass() {
    if (state.phase !== 'playing') return
    const player = currentPlayer.value
    if (!player || player.busted || player.passed) return

    player.passed = true
    _log(`${player.name} がパス（確定スコア: ${_runningScore(player)}点）`)

    if (_checkRoundEnd()) return
    _advancePlayer()
  }

  function playerSelectTarget(targetIndex) {
    if (state.phase !== 'targeting' || !state.pendingAction) return

    const { card, sourceIndex } = state.pendingAction
    state.pendingAction = null
    state.phase = 'playing'

    _executeTargeted(sourceIndex, targetIndex, card)

    if (!state.flipThreeState) {
      if (_checkRoundEnd()) return
      _processQueue()
    }
    // flipThreeState が設定された場合は _flipThreeNext が自動進行
  }

  // ---- 内部進行 ----

  function _processQueue() {
    if (state.actionQueue.length === 0) {
      _advancePlayer()
      return
    }

    const action = state.actionQueue.shift()
    const source = state.players[action.sourceIndex]
    const targets = getValidTargets(action.sourceIndex)

    if (targets.length === 0) {
      _log(`対象なし、${_actionLabel(action.card)} をスキップ`)
      state.discardPile.push(action.card)
      if (_checkRoundEnd()) return
      _processQueue()
      return
    }

    if (source.isHuman) {
      state.pendingAction = action
      state.phase = 'targeting'
    } else {
      _autoExecuteTargeted(action.sourceIndex, action.card)
      if (!state.flipThreeState) {
        if (_checkRoundEnd()) return
        _processQueue()
      }
    }
  }

  function _advancePlayer() {
    if (_checkRoundEnd()) return

    const n = state.players.length
    let next = (state.currentPlayerIndex + 1) % n
    for (let i = 0; i < n; i++) {
      const p = state.players[next]
      if (!p.busted && !p.passed) {
        state.currentPlayerIndex = next
        _scheduleAI()
        return
      }
      next = (next + 1) % n
    }

    _endRound()
  }

  function _skipToActive() {
    const n = state.players.length
    let idx = state.currentPlayerIndex
    for (let i = 0; i < n; i++) {
      const p = state.players[idx]
      if (!p.busted && !p.passed) {
        state.currentPlayerIndex = idx
        return
      }
      idx = (idx + 1) % n
    }
  }

  function _checkRoundEnd() {
    if (activePlayers.value.length === 0) {
      _endRound()
      return true
    }
    return false
  }

  function _scheduleAI() {
    const player = currentPlayer.value
    if (player && !player.isHuman && state.phase === 'playing') {
      setTimeout(_doAITurn, AI_DELAY)
    }
  }

  function _doAITurn() {
    if (state.phase !== 'playing') return
    const player = currentPlayer.value
    if (!player || player.isHuman || player.busted || player.passed) return

    const score = _runningScore(player)
    const cards = player.tableau.length
    let passProb = 0
    if (cards >= 6) passProb = 0.85
    else if (score >= 35) passProb = 0.7
    else if (score >= 25) passProb = 0.45
    else if (score >= 15) passProb = 0.2

    if (Math.random() < passProb) {
      playerPass()
    } else {
      playerDraw()
    }
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

    // バストしていないプレイヤーのカードのみ捨て牌に戻す
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

  function getValidTargets(sourceIndex) {
    return state.players
      .map((p, i) => ({ player: p, index: i }))
      .filter(({ player, index }) => index !== sourceIndex && !player.busted && !player.passed)
  }

  return {
    state,
    currentPlayer,
    activePlayers,
    startGame,
    playerDraw,
    playerPass,
    playerSelectTarget,
    nextRound,
    getValidTargets,
  }
}
