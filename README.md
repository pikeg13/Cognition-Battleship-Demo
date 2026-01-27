# Battleship (Single Player)

Single-player Battleship built with React + TypeScript (Vite).

## Setup

```bash
npm install
npm run dev
```

Then open the URL printed in the terminal.

### Optional background image

If you add a background image at `public/assets/battleship-bg.jpg`, it will be used as the page background with a dark overlay for readability.

To disable the image for performance/testing, start the dev server with:

```bash
VITE_DISABLE_BG_IMAGE=1 npm run dev
```

## Gameplay

- **[goal]** Sink all enemy ships before the AI sinks yours.
- **[setup mode]** After setting your name, you will place your ships on **Your Board** before the battle starts.
  - **[place ships]** Click a cell on **Your Board** to place the current ship.
  - **[rotate]** Toggle orientation with the **Orientation** button or press **R**.
  - **[preview]** Hover a cell to preview the ship footprint; red indicates an invalid placement.
  - **[start battle]** The **Start Battle** button is disabled until all ships are placed.
- **[boards]**
  - **Enemy Board**: click cells to fire.
  - **Your Board**: shows your ships and where the AI has fired.
- **[shots]** You cannot fire the same cell twice.
- **[turns]** After you fire, the AI immediately takes its turn.
- **[new game]** Use the **New Game** button to reset the match and return to Setup mode (it does not clear your saved name or the leaderboard).
- **[player name]** On first load, you must enter a name before you can start firing. The name is saved locally and reused for **New Game**.
- **[leaderboard]** Wins are saved to a local leaderboard (top 10) stored in `localStorage`. **New Game** does not clear it; use the **Clear leaderboard** button if needed.
- **[change name]** Use the **Change name** button near the leaderboard to update the saved name.
- **[fleet status]** Each board shows a Fleet Status panel indicating which ships are still afloat.
- **[messages]** Shot results use short messages (Miss/Hit!/sunk) with subtle coordinates (e.g. `B7`).

## AI behavior

- **[search]** Fires randomly until it gets a hit.
- **[target]** After a hit, it prioritizes adjacent cells until it sinks the ship.
- **[no repeats]** The AI never fires at the same cell twice.

## Code layout

- **`src/game/types.ts`**: Types and constants.
- **`src/game/board.ts`**: Board creation, ship placement, and shot resolution.
- **`src/game/ai.ts`**: AI move selection.
- **`src/components/Board.tsx`**: Board UI component.
- **`src/App.tsx`**: Game orchestration and main UI.
