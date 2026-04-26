import {Text, ZStack} from 'await';

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

// ===== Widget =====
function widget(_entry: WidgetEntry) {
  return (
    <ZStack>
      <Text value='909'/>
    </ZStack>
  );
}

Await.define({widget});
