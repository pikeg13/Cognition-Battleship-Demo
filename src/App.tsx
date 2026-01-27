import './App.css'
import { useEffect, useMemo, useState } from 'react'
import Board from './components/Board'
import FleetStatus from './components/FleetStatus'
import Leaderboard from './components/Leaderboard'
import ShotResultPopup from './components/ShotResultPopup'
import NewGameWizardModal, { type Difficulty as WizardDifficulty } from './components/NewGameWizardModal'
import PlacementCompleteModal from './components/PlacementCompleteModal'
import SettingsModal from './components/SettingsModal'
import EndgameOverlay from './components/EndgameOverlay'
import BoardsBackdropOverlay from './components/BoardsBackdropOverlay'
import { aiTakeTurn, createInitialAIState, type AIDifficulty, type AIState } from './game/ai'
import {
  allShipsSunk,
  applyShot,
  buildShipCells,
  canPlaceShipAt,
  createEmptyBoard,
  createRandomBoard,
  getFleetStatus,
  getShipType,
  hasAlreadyShot,
  placeShipAt,
} from './game/board'
import { SHIP_SPECS, type BoardState, type Coord, type ShipType, type ShotResult } from './game/types'
import { submitScore } from './services/leaderboard'
import { getSupabaseDebugInfo } from './lib/supabaseClient'

const PLAYER_NAME_KEY = 'battleship_player_name'
const MUTED_KEY = 'battleship_muted'
const LEGACY_SOUND_MUTED_KEY = 'battleship.sound_muted'
const DIFFICULTY_KEY = 'battleship_difficulty'

function loadPlayerName(): string {
  const raw = localStorage.getItem(PLAYER_NAME_KEY)
  return (raw ?? '').trim()
}

function savePlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name)
}

function isValidPlayerName(name: string): boolean {
  const v = name.trim()
  return v.length >= 2 && v.length <= 20
}

function coordLabel(coord: Coord): string {
  const letters = 'ABCDEFGHIJ'
  const col = letters[coord.col] ?? '?'
  const row = coord.row + 1
  return `${col}${row}`
}

function loadMuted(): boolean {
  const raw = localStorage.getItem(MUTED_KEY)
  if (raw !== null) {
    try {
      return Boolean(JSON.parse(raw))
    } catch {
      return false
    }
  }
  const legacy = localStorage.getItem(LEGACY_SOUND_MUTED_KEY)
  if (legacy === '1') return true
  if (legacy === '0') return false
  return false
}

function saveMuted(muted: boolean): void {
  localStorage.setItem(MUTED_KEY, JSON.stringify(muted))
}

function BellIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M9 18a3 3 0 0 0 6 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.3 5.3C6.6 3.8 8.6 3 10.7 3C14.2 3 17 5.8 17 9.3V13l2 2v1H5v-1l2-2V10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function loadDifficulty(): AIDifficulty {
  const raw = (localStorage.getItem(DIFFICULTY_KEY) ?? '').trim()
  if (raw === 'easy' || raw === 'medium' || raw === 'hard') return raw
  return 'medium'
}

function saveDifficulty(difficulty: AIDifficulty): void {
  localStorage.setItem(DIFFICULTY_KEY, difficulty)
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

type Phase = 'setup' | 'battle' | 'gameover'

type SaveStatus = {
  state: 'saving' | 'success' | 'error'
  message: string
  debugText: string
}

function resetBoardForRematch(board: BoardState): BoardState {
  return {
    grid: board.grid.map((row) =>
      row.map((cell) => ({
        shipId: cell.shipId,
        shot: false,
      })),
    ),
    ships: Object.fromEntries(
      Object.entries(board.ships).map(([id, ship]) => [
        id,
        {
          ...ship,
          cells: ship.cells.map((c) => ({ ...c })),
          hits: {},
          sunk: false,
        },
      ]),
    ),
  }
}

function App() {
  const initial = useMemo(() => {
    return {
      playerBoard: createEmptyBoard(),
      aiBoard: createRandomBoard(),
      aiState: createInitialAIState(),
    }
  }, [])

  const hitAudio = useMemo(() => {
    try {
      return new Audio('/sounds/hit.mp3')
    } catch {
      return null
    }
  }, [])

  const missAudio = useMemo(() => {
    try {
      return new Audio('/sounds/miss.mp3')
    } catch {
      return null
    }
  }, [])

  const [playerBoard, setPlayerBoard] = useState<BoardState>(initial.playerBoard)
  const [aiBoard, setAiBoard] = useState<BoardState>(initial.aiBoard)
  const [aiState, setAiState] = useState<AIState>(initial.aiState)
  const [turn, setTurn] = useState<'player' | 'ai'>('player')
  const [phase, setPhase] = useState<Phase>('setup')
  const initialName = useMemo(() => loadPlayerName(), [])
  const initialDifficulty = useMemo(() => loadDifficulty(), [])

  const [status, setStatus] = useState<string>(
    isValidPlayerName(initialName)
      ? `Place your ${SHIP_SPECS[0].type} (length ${SHIP_SPECS[0].size}).`
      : 'Enter your name to start.',
  )
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null)
  const [gameOutcome, setGameOutcome] = useState<null | 'win' | 'lose'>(null)
  const [endgameOverlayDismissed, setEndgameOverlayDismissed] = useState<boolean>(false)
  const [endgameStats, setEndgameStats] = useState<{ shots: number; time: string } | null>(null)

  const [playerName, setPlayerName] = useState<string>(isValidPlayerName(initialName) ? initialName : '')
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
  const [wizardOpen, setWizardOpen] = useState<boolean>(false)
  const [placementMode, setPlacementMode] = useState<'none' | 'manual'>('none')
  const [difficulty, setDifficulty] = useState<AIDifficulty>(initialDifficulty)
  const [placementCompleteOpen, setPlacementCompleteOpen] = useState<boolean>(false)
  const [placementCompleteTitle, setPlacementCompleteTitle] = useState<string>('')
  const [placementCompleteMessage, setPlacementCompleteMessage] = useState<string>('')
  const [setupError, setSetupError] = useState<string | null>(null)

  const displayName = playerName.trim().length > 0 ? playerName : 'Player'

  const [shotsTaken, setShotsTaken] = useState<number>(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [endedAt, setEndedAt] = useState<number | null>(null)

  const [leaderboardRefreshToken, setLeaderboardRefreshToken] = useState<number>(0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null)

  const [muted, setMuted] = useState<boolean>(() => loadMuted())

  const [shotPopup, setShotPopup] = useState<{ message: string } | null>(null)

  const gameStarted = startedAt !== null && endedAt === null && phase === 'battle'

  const [setupShipIndex, setSetupShipIndex] = useState<number>(0)
  const [setupHorizontal, setSetupHorizontal] = useState<boolean>(true)
  const [setupHover, setSetupHover] = useState<Coord | null>(null)

  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!gameStarted) return
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [gameStarted])

  const elapsedSeconds = gameStarted && startedAt !== null ? Math.floor((nowMs - startedAt) / 1000) : 0

  useEffect(() => {
    if (phase !== 'setup') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        const target = e.target as HTMLElement
        const tagName = target.tagName?.toUpperCase()
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }
        e.preventDefault()
        setSetupHorizontal((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase])

  const currentSetupSpec = SHIP_SPECS[setupShipIndex]
  const manualPlacing = phase === 'setup' && placementMode === 'manual' && setupShipIndex < SHIP_SPECS.length
  const placementInProgress = manualPlacing
  const showBoardsOverlay = phase === 'setup' && !gameStarted && !placementInProgress && !wizardOpen && !placementCompleteOpen
  const showEndgameOverlay = gameOutcome !== null && !endgameOverlayDismissed
  const overlayActive = showBoardsOverlay || showEndgameOverlay
  const setupPreviewCells =
    manualPlacing && currentSetupSpec && setupHover
      ? buildShipCells(setupHover, currentSetupSpec.size, setupHorizontal)
      : undefined
  const setupPreviewValid =
    manualPlacing && currentSetupSpec && setupHover
      ? canPlaceShipAt(playerBoard, setupHover, currentSetupSpec.size, setupHorizontal)
      : undefined
  const setupComplete = Object.keys(playerBoard.ships).length >= SHIP_SPECS.length

  function showShotPopup(message: string) {
    setShotPopup({ message })
    window.setTimeout(() => setShotPopup(null), 780)
  }

  function playHitSound() {
    if (muted) return
    if (!hitAudio) {
      console.warn('Failed to initialize hit sound')
      return
    }
    try {
      hitAudio.currentTime = 0
      hitAudio.volume = 0.6
      hitAudio.play().catch((err) => {
        console.warn('Failed to play hit sound', err)
      })
    } catch (err) {
      console.warn('Failed to play hit sound', err)
    }
  }

  function playMissSound() {
    if (muted) return
    if (!missAudio) {
      console.warn('Failed to initialize miss sound')
      return
    }
    try {
      missAudio.currentTime = 0
      missAudio.volume = 0.45
      missAudio.play().catch((err) => {
        console.warn('Failed to play miss sound', err)
      })
    } catch (err) {
      console.warn('Failed to play miss sound', err)
    }
  }

  function openNewGameWizard() {
    setPlayerBoard(createEmptyBoard())
    setAiBoard(createRandomBoard())
    setAiState(createInitialAIState())
    setTurn('player')
    setPhase('setup')
    setWinner(null)
    setGameOutcome(null)
    setEndgameOverlayDismissed(false)
    setEndgameStats(null)
    setShotsTaken(0)
    setStartedAt(null)
    setEndedAt(null)
    setSetupShipIndex(0)
    setSetupHorizontal(true)
    setSetupHover(null)
    setSetupError(null)
    setPlacementMode('none')
    setPlacementCompleteOpen(false)
    setWizardOpen(true)
    setStatus('New game: choose your settings to begin.')
    setSaveStatus(null)
  }

  function restartPlacement() {
    setPlayerBoard(createEmptyBoard())
    setSetupShipIndex(0)
    setSetupHover(null)
    setSetupError(null)
    setPlacementMode('manual')
    setPlacementCompleteOpen(false)
    setStatus(`Place your ${SHIP_SPECS[0].type} (length ${SHIP_SPECS[0].size}). Press R to rotate.`)
  }

  function restartMatch() {
    if (!setupComplete) return
    const now = Date.now()

    setPlayerBoard((prev) => resetBoardForRematch(prev))
    setAiBoard(createRandomBoard())
    setAiState(createInitialAIState())
    setTurn('player')
    setShotsTaken(0)
    setStartedAt(now)
    setEndedAt(null)
    setWinner(null)
    setGameOutcome(null)
    setEndgameOverlayDismissed(false)
    setEndgameStats(null)
    setShotPopup(null)
    setPhase('battle')
    setPlacementMode('none')
    setPlacementCompleteOpen(false)
    setWizardOpen(false)
    setSetupError(null)
    setStatus(`${displayName}'s turn: click a cell to fire.`)
    setSaveStatus(null)
  }

  async function handleCopySaveDebug(): Promise<void> {
    if (!saveStatus) return
    try {
      await navigator.clipboard.writeText(saveStatus.debugText)
    } catch {
      console.info('[supabase] debug info', saveStatus.debugText)
    }
  }

  function showPlacementComplete(title: string, message: string) {
    setPlacementCompleteTitle(title)
    setPlacementCompleteMessage(message)
    setPlacementCompleteOpen(true)
  }

  function handleSetupPlace(coord: Coord) {
    if (!manualPlacing) return
    if (!currentSetupSpec) return

    const copy: BoardState = {
      grid: playerBoard.grid.map((row) => row.map((cell) => ({ ...cell }))),
      ships: Object.fromEntries(
        Object.entries(playerBoard.ships).map(([id, ship]) => [
          id,
          { ...ship, hits: { ...ship.hits }, cells: ship.cells.map((c) => ({ ...c })) },
        ]),
      ),
    }

    const res = placeShipAt(copy, currentSetupSpec.type as ShipType, coord, currentSetupSpec.size, setupHorizontal)
    if (!res.ok) {
      setStatus(`Invalid placement for ${currentSetupSpec.type}. Try a different spot. Press R to rotate.`)
      setSetupError('Invalid placement. Try a different spot or rotate.')
      return
    }

    setPlayerBoard(copy)
    setSetupError(null)

    const nextIndex = setupShipIndex + 1
    setSetupShipIndex(nextIndex)

    if (nextIndex >= SHIP_SPECS.length) {
      setStatus('All ships placed. Start battle?')
      showPlacementComplete('All ships placed', 'All ships placed. Start battle?')
      return
    }

    const next = SHIP_SPECS[nextIndex]
    setStatus(`Place your ${next.type} (length ${next.size}). Press R to rotate.`)
  }

  function startBattle(nameForStatus?: string) {
    if (phase !== 'setup') return
    if (!setupComplete) return
    setPhase('battle')
    setTurn('player')
    setShotsTaken(0)
    setStartedAt(Date.now())
    setEndedAt(null)
    setWinner(null)
    setGameOutcome(null)
    setEndgameOverlayDismissed(false)
    setEndgameStats(null)
    const who = nameForStatus ?? displayName
    setStatus(`${who}'s turn: click a cell to fire.`)
  }

  function handleStartBattleFromSetup() {
    const trimmed = playerName.trim()
    if (!isValidPlayerName(trimmed)) {
      setSetupError('Name must be 2–20 characters.')
      setWizardOpen(true)
      return
    }
    if (!setupComplete) return
    savePlayerName(trimmed)
    setPlayerName(trimmed)
    setSetupError(null)
    setPlacementCompleteOpen(false)
    startBattle(trimmed)
  }

  function saveNameFromSettings() {
    const trimmed = playerName.trim()
    if (!isValidPlayerName(trimmed)) {
      setSetupError('Name must be 2–20 characters.')
      return
    }
    savePlayerName(trimmed)
    setPlayerName(trimmed)
    setSetupError(null)
    setSettingsOpen(false)
  }

  function describePlayerShot(coord: Coord, result: ShotResult, board: BoardState): string {
    const where = coordLabel(coord)
    if (result.outcome === 'miss') return `Miss (${where}).`
    if (result.outcome === 'hit') return `Hit! (${where}).`
    const shipType = result.shipId ? getShipType(board, result.shipId) : undefined
    return `You sunk the enemy ${shipType ?? 'ship'}! (${where}).`
  }

  function describeAIShot(coord: Coord, result: ShotResult, board: BoardState): string {
    const where = coordLabel(coord)
    if (result.outcome === 'miss') return `AI: Miss (${where}).`
    if (result.outcome === 'hit') return `AI: Hit! (${where}).`
    const shipType = result.shipId ? getShipType(board, result.shipId) : undefined
    return `AI sunk your ${shipType ?? 'ship'}! (${where}).`
  }

  function handlePlayerFire(coord: Coord) {
    if (phase !== 'battle') return
    if (!gameStarted) return
    if (winner) return
    if (turn !== 'player') return
    if (hasAlreadyShot(aiBoard, coord)) return

    const nextShotsTaken = shotsTaken + 1
    setShotsTaken(nextShotsTaken)

    const aiBoardCopy: BoardState = {
      grid: aiBoard.grid.map((row) => row.map((cell) => ({ ...cell }))),
      ships: Object.fromEntries(
        Object.entries(aiBoard.ships).map(([id, ship]) => [
          id,
          { ...ship, hits: { ...ship.hits }, cells: ship.cells.map((c) => ({ ...c })) },
        ]),
      ),
    }

    const playerShot = applyShot(aiBoardCopy, coord)
    setAiBoard(aiBoardCopy)

    if (playerShot.outcome === 'miss') {
      // Audio feedback is player-only by design.
      playMissSound()
      showShotPopup('Miss!')
    } else {
      // Audio feedback is player-only by design.
      playHitSound()
      showShotPopup('Direct Hit!')
    }

    if (allShipsSunk(aiBoardCopy)) {
      const now = Date.now()
      const start = startedAt ?? now
      const durationSeconds = Math.max(0, Math.round((now - start) / 1000))

      setWinner('player')
      setGameOutcome('win')
      setEndgameOverlayDismissed(false)
      setEndgameStats({ shots: nextShotsTaken, time: formatClock(durationSeconds) })
      setPhase('gameover')
      setEndedAt(now)
      setStatus('You win!')

      const payload = {
        name: playerName,
        difficulty,
        shots: nextShotsTaken,
        time_seconds: durationSeconds,
      }

      const baseDebug = {
        timestamp: new Date().toISOString(),
        config: getSupabaseDebugInfo(),
        payload,
      }

      setSaveStatus({
        state: 'saving',
        message: 'Saving score…',
        debugText: JSON.stringify({ ...baseDebug, error: null }, null, 2),
      })

      void (async () => {
        const result = await submitScore(payload)
        if (result.ok) {
          setSaveStatus({
            state: 'success',
            message: 'Saved!',
            debugText: JSON.stringify({ ...baseDebug, error: null }, null, 2),
          })
          setLeaderboardRefreshToken((v) => v + 1)
          return
        }
        setSaveStatus({
          state: 'error',
          message: `Save failed: ${result.error.message}`,
          debugText: JSON.stringify({ ...baseDebug, error: result.error }, null, 2),
        })
      })()
      return
    }

    setTurn('ai')

    const playerMsg = describePlayerShot(coord, playerShot, aiBoardCopy)

    const playerBoardCopy: BoardState = {
      grid: playerBoard.grid.map((row) => row.map((cell) => ({ ...cell }))),
      ships: Object.fromEntries(
        Object.entries(playerBoard.ships).map(([id, ship]) => [
          id,
          { ...ship, hits: { ...ship.hits }, cells: ship.cells.map((c) => ({ ...c })) },
        ]),
      ),
    }

    const aiMove = aiTakeTurn(playerBoardCopy, aiState, difficulty)
    setPlayerBoard(playerBoardCopy)
    setAiState(aiMove.state)

    // No popup for AI shots, only sound was removed earlier

    if (aiMove.gameOver) {
      const now = Date.now()
      const start = startedAt ?? now
      const durationSeconds = Math.max(0, Math.round((now - start) / 1000))
      setWinner('ai')
      setGameOutcome('lose')
      setEndgameOverlayDismissed(false)
      setEndgameStats({ shots: nextShotsTaken, time: formatClock(durationSeconds) })
      setPhase('gameover')
      setEndedAt(now)
      setStatus(`${playerMsg} ${describeAIShot(aiMove.coord, aiMove.result, playerBoardCopy)} AI wins.`)
      return
    }

    setTurn('player')
    setStatus(`${displayName}'s turn: click a cell to fire.`)
  }

  const enemyFleet = getFleetStatus(aiBoard)
  const playerFleet = getFleetStatus(playerBoard)

  return (
    <div className="app">
      <NewGameWizardModal
        open={wizardOpen}
        initialName={playerName}
        initialDifficulty={difficulty as WizardDifficulty}
        onCancel={() => setWizardOpen(false)}
        onCompleteAutoPlace={(name, diff) => {
          const d = diff as AIDifficulty
          savePlayerName(name)
          setPlayerName(name)
          saveDifficulty(d)
          setDifficulty(d)

          setWizardOpen(false)
          setPlacementMode('none')
          setSetupHover(null)
          setSetupError(null)

          const copy = createRandomBoard()
          setPlayerBoard(copy)
          setSetupShipIndex(SHIP_SPECS.length)
          setStatus('All ships placed. Ready to start?')
          showPlacementComplete('Ready to start?', 'Ships have been auto-placed. Start battle?')
        }}
        onCompleteManualPlace={(name, diff) => {
          const d = diff as AIDifficulty
          savePlayerName(name)
          setPlayerName(name)
          saveDifficulty(d)
          setDifficulty(d)

          setWizardOpen(false)
          setPlacementMode('manual')
          setSetupShipIndex(0)
          setSetupHover(null)
          setSetupError(null)
          setPlayerBoard(createEmptyBoard())
          setStatus(`Place your ${SHIP_SPECS[0].type} (length ${SHIP_SPECS[0].size}). Press R to rotate.`)
        }}
      />

      <PlacementCompleteModal
        open={placementCompleteOpen}
        title={placementCompleteTitle}
        message={placementCompleteMessage}
        onStartBattle={handleStartBattleFromSetup}
        onRestartPlacement={restartPlacement}
      />

      <SettingsModal
        open={settingsOpen}
        name={playerName}
        onNameChange={(n) => setPlayerName(n)}
        errorMessage={setupError}
        onSaveName={saveNameFromSettings}
        difficulty={difficulty}
        matchActive={gameStarted}
        onSetDifficulty={(d: AIDifficulty) => {
          saveDifficulty(d)
          setDifficulty(d)
        }}
        onRestartMatch={restartMatch}
        onClose={() => setSettingsOpen(false)}
      />

      <main className="game-area">
        <div className="gameEnemyFleet">
          <FleetStatus title="Enemy Fleet Status" fleet={enemyFleet} />
        </div>

        <div className="boardHeader">
          <img className="boardHeaderImage" src="/assets/BS_Title.png" alt="Battleship" />
        </div>

        <div className="boardsArea" aria-label="Boards">
          {showBoardsOverlay ? (
            <BoardsBackdropOverlay role="presentation">
              <div className="board-overlay__cta">
                <button type="button" className="btn btn-primary" onClick={openNewGameWizard}>
                  New Game
                </button>
                <div className="board-overlay__hint">Click to set up match (name, difficulty, placement)</div>
              </div>
            </BoardsBackdropOverlay>
          ) : showEndgameOverlay && gameOutcome ? (
            <EndgameOverlay
              outcome={gameOutcome}
              stats={endgameStats ?? undefined}
              onPlayAgain={() => {
                setGameOutcome(null)
                setEndgameOverlayDismissed(false)
                setEndgameStats(null)
                openNewGameWizard()
              }}
              onClose={() => setEndgameOverlayDismissed(true)}
            />
          ) : null}

          <div
            className="panel boardCard gameEnemyBoard enemy-board-container"
            aria-hidden={showEndgameOverlay ? true : undefined}
          >
            <Board
              board={aiBoard}
              title="Enemy Board"
              onCellClick={handlePlayerFire}
              disabled={phase !== 'battle' || Boolean(winner) || turn !== 'player' || !gameStarted}
            />
            <ShotResultPopup message={shotPopup?.message ?? ''} visible={shotPopup !== null} />
          </div>

          <div className="center-divider" aria-hidden="true"></div>

          <div className="panel boardCard gamePlayerBoard" aria-hidden={showEndgameOverlay ? true : undefined}>
            <Board
              board={playerBoard}
              title="Your Board"
              showShips
              disabled={phase !== 'setup' || placementMode !== 'manual'}
              onCellClick={manualPlacing ? handleSetupPlace : undefined}
              onCellHover={manualPlacing ? setSetupHover : undefined}
              previewCells={setupPreviewCells}
              previewValid={setupPreviewValid}
            />
          </div>
        </div>

        <div className="gamePlayerFleet">
          <FleetStatus title="Your Fleet Status" fleet={playerFleet} />
        </div>

        <div className="status statusCard">
          <div className="statusContent" aria-live="polite">
            <div className="statusLine">{status}</div>
            <div className="statusLine">
              Turn: <strong>{winner ? 'Game Over' : turn === 'player' ? displayName : 'AI'}</strong>
            </div>
            {gameStarted && !winner ? (
              <div className="statusLine">Shots: {shotsTaken} • Time: {formatClock(elapsedSeconds)}</div>
            ) : null}
          </div>

          {phase === 'gameover' && saveStatus ? (
            <div className={`saveStatus saveStatus--${saveStatus.state}`} role="status" aria-live="polite">
              <div>{saveStatus.message}</div>
              <button type="button" className="btn btn-neutral btn-small" onClick={handleCopySaveDebug}>
                Copy debug info
              </button>
            </div>
          ) : null}

          <div className="status-controls" role="group" aria-label="Game controls">
            {!overlayActive ? (
              <button type="button" className="btn btn-neutral" onClick={openNewGameWizard}>
                New Game
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-neutral btn-icon"
              onClick={() => {
                setMuted((v) => {
                  const next = !v
                  saveMuted(next)
                  return next
                })
              }}
              title={muted ? 'Unmute sounds' : 'Mute sounds'}
              aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
              aria-pressed={muted}
            >
              <BellIcon muted={muted} />
            </button>
            <button
              type="button"
              className="btn btn-neutral btn-icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        <Leaderboard refreshSignal={leaderboardRefreshToken} />
      </main>

    </div>
  )
}

export default App
