import {
  Button,
  HStack,
  Icon,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from 'await';

// ===== Constants =====
const STEPS = 16;
const ROWS = 4;
const MEASURES_TO_SCHEDULE = 8;

const DEFAULT_BPM = 120;
const MIN_BPM = 40;
const MAX_BPM = 240;
const BPM_STEP = 5;

const SOUNDFONT = '/assets/sounds/909.sf2';
const SOUNDFONT_BANK = 128;
const NOTE_VOLUME = 2;
const NOTE_VELOCITY = 100;

// MIDI note per row, top -> bottom: open hh, closed hh, snare, kick
const ROW_NOTES: number[] = [46, 42, 38, 36];

const COLOR_CELL_DEFAULT: Color  = {light: 0.85, dark: 0.25};
const COLOR_CELL_ACTIVE: Color   = {light: 'F9E15A', dark: 'F9E15A'};
const COLOR_CELL_PLAYHEAD: Color = {light: 'B6F9A6', dark: 'B6F9A6'};
const COLOR_CHROME_FG: Color     = {light: 0.15, dark: 0.9};
const COLOR_CHROME_BG: Color     = {light: 0.95, dark: 0.18};
const COLOR_BUTTON_BG: Color     = {light: 0.92, dark: 0.30};

const PADDING = 12;
const TOP_BAR_GAP = 12;
const ROW_SPACING = 6;
const CELL_SPACING_INNER = 3;
const CELL_SPACING_GROUP = 8;
const CELL_RADIUS = 5;

// ===== State read helpers =====
function getCells(): boolean[] {
  return AwaitStore.array<boolean>('cells', new Array(ROWS * STEPS).fill(false));
}

function getBpm(): number {
  return AwaitStore.num('bpm', DEFAULT_BPM);
}

function getPlaying(): boolean {
  return AwaitStore.bool('playing', false);
}

function getPlayStartedAt(): number {
  return AwaitStore.num('playStartedAt', 0);
}

// ===== Step math =====
function stepDurationMs(bpm: number): number {
  return 60_000 / bpm / 4;
}

function currentStep(bpm: number, playStartedAt: number): number {
  if (!playStartedAt) return -1;
  const elapsed = Date.now() - playStartedAt;
  if (elapsed < 0) return -1;
  return Math.floor(elapsed / stepDurationMs(bpm)) % STEPS;
}

function cellIndex(row: number, col: number): number {
  return row * STEPS + col;
}

function computeCellSize(widgetWidth: number): number {
  const usable = widgetWidth - 2 * PADDING;
  const totalGaps = 3 * CELL_SPACING_GROUP + 12 * CELL_SPACING_INNER;
  const cellWidth = (usable - totalGaps) / STEPS;
  return Math.max(8, Math.floor(cellWidth));
}

// ===== Components =====
function Cell({row, col, isActive, isOnPlayhead, size}: {
  row: number;
  col: number;
  isActive: boolean;
  isOnPlayhead: boolean;
  size: number;
}) {
  const fill = isOnPlayhead
    ? COLOR_CELL_PLAYHEAD
    : isActive ? COLOR_CELL_ACTIVE : COLOR_CELL_DEFAULT;
  return (
    <Button fast intent={app.toggleCell(row, col)} frame={{width: size, height: size}}>
      <RoundedRectangle rectRadius={CELL_RADIUS} fill={fill}/>
    </Button>
  );
}

function Row({row, cells, playStep, cellSize}: {
  row: number;
  cells: boolean[];
  playStep: number;
  cellSize: number;
}) {
  return (
    <HStack spacing={CELL_SPACING_GROUP}>
      {[0, 1, 2, 3].map(g =>
        <HStack spacing={CELL_SPACING_INNER}>
          {[0, 1, 2, 3].map(c => {
            const col = g * 4 + c;
            return (
              <Cell
                row={row}
                col={col}
                isActive={cells[cellIndex(row, col)] === true}
                isOnPlayhead={col === playStep}
                size={cellSize}
              />
            );
          })}
        </HStack>
      )}
    </HStack>
  );
}

function IconButton({iconName, intent, size}: {
  iconName: string;
  intent: IntentInfo;
  size: number;
}) {
  return (
    <Button fast intent={intent} frame={{width: size, height: size}}>
      <ZStack>
        <RoundedRectangle rectRadius={size / 4} fill={COLOR_BUTTON_BG}/>
        <Icon value={iconName} fontSize={size * 0.5}/>
      </ZStack>
    </Button>
  );
}

function TopBar({bpm, playing}: {bpm: number; playing: boolean}) {
  const size = 32;
  return (
    <HStack frame={{maxWidth: 'max'}} alignment='center'>
      <HStack spacing={4}>
        <IconButton iconName='backward.end.fill' intent={app.backToHead()} size={size}/>
        <IconButton iconName={playing ? 'pause.fill' : 'play.fill'} intent={app.togglePlay()} size={size}/>
      </HStack>
      <Spacer/>
      <HStack spacing={6}>
        <Text value={String(bpm)} fontSize={18} fontWeight={700} monospacedDigit/>
        <IconButton iconName='minus' intent={app.tempoDown()} size={size}/>
        <IconButton iconName='plus' intent={app.tempoUp()} size={size}/>
      </HStack>
    </HStack>
  );
}

// ===== Widget =====
function widget(entry: WidgetEntry) {
  const cells = getCells();
  const bpm = getBpm();
  const playing = getPlaying();
  const playStartedAt = getPlayStartedAt();
  const playStep = playing ? currentStep(bpm, playStartedAt) : -1;
  const cellSize = computeCellSize(entry.size.width);

  return (
    <VStack
      spacing={TOP_BAR_GAP}
      padding={PADDING}
      maxSides
      background={COLOR_CHROME_BG}
      foreground={COLOR_CHROME_FG}
    >
      <TopBar bpm={bpm} playing={playing}/>
      <Spacer/>
      <VStack spacing={ROW_SPACING}>
        {[0, 1, 2, 3].map(r =>
          <Row row={r} cells={cells} playStep={playStep} cellSize={cellSize}/>
        )}
      </VStack>
    </VStack>
  );
}

// ===== Intents =====
function toggleCell(row: number, col: number) {
  const cells = getCells();
  const idx = cellIndex(row, col);
  cells[idx] = !cells[idx];
  AwaitStore.set('cells', cells);
}

function togglePlay() {
  // stub — implemented in Task 7
}

function backToHead() {
  // stub — implemented in Task 7
}

function tempoUp() {
  const bpm = getBpm();
  const next = Math.min(MAX_BPM, bpm + BPM_STEP);
  AwaitStore.set('bpm', next);
}

function tempoDown() {
  const bpm = getBpm();
  const next = Math.max(MIN_BPM, bpm - BPM_STEP);
  AwaitStore.set('bpm', next);
}

// ===== App =====
const app = Await.define({
  widget,
  widgetIntents: {
    toggleCell,
    togglePlay,
    backToHead,
    tempoUp,
    tempoDown,
  },
});
