import {
  Button,
  Color,
  HStack,
  Icon,
  Modifier,
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

// @panel {type:'slider',min:40,max:240,step:5}
const DEFAULT_BPM = 120;
// @panel {type:'slider',min:20,max:120,step:5}
const MIN_BPM = 40;
// @panel {type:'slider',min:120,max:300,step:5}
const MAX_BPM = 240;
const BPM_STEP = 5;

const SOUNDFONT = '/assets/sounds/909.sf2';
const SOUNDFONT_BANK = 128;
// @panel {type:'slider',min:0,max:5,step:0.1}
const NOTE_VOLUME = 2;
// @panel {type:'slider',min:1,max:127,step:1}
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
// @panel {type:'slider',min:0,max:20,step:1}
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
    <Button fast audio intent={app.toggleCell(row, col)} frame={{width: size, height: size}}>
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

function SweepBar({x, width, gridWidth, durationSec}: {
  x: number;
  width: number;
  gridWidth: number;
  durationSec: number;
}) {
  return (
    <ZStack
      animation={{duration: durationSec}}
      alignment='leading'
      frame={{width: gridWidth}}
      maxHeight
    >
      <Color
        id='sweepbar'
        value={COLOR_CELL_PLAYHEAD}
        opacity={0.55}
        frame={{width}}
        maxHeight
        offset={{x}}
      />
    </ZStack>
  );
}

function IconButton({iconName, intent, size}: {
  iconName: string;
  intent: IntentInfo;
  size: number;
}) {
  return (
    <Button fast audio intent={intent} frame={{width: size, height: size}}>
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
        <IconButton iconName={playing ? 'stop.fill' : 'play.fill'} intent={app.togglePlay()} size={size}/>
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
  const inApp = AwaitEnv.host === 'app';
  const playStep = (playing && inApp) ? currentStep(bpm, playStartedAt) : -1;
  const cellSize = computeCellSize(entry.size.width);

  // Sweep bar (home-screen visual indicator). Autonomous SwiftUI animation:
  // looping autoreverse keeps it moving without per-render entries.
  const showSweep = !inApp && playing;
  const gridDrawWidth = STEPS * cellSize + 12 * CELL_SPACING_INNER + 3 * CELL_SPACING_GROUP;
  const sweepBarWidth = 6;
  const barDurMs = STEPS * stepDurationMs(bpm);
  const sweepDurationSec = barDurMs / 1000;
  const sweepFlag = Math.floor(entry.date.getTime() / barDurMs) % 2 === 0;
  const sweepX = sweepFlag ? 0 : Math.max(0, gridDrawWidth - sweepBarWidth);

  return (
    <VStack
      spacing={TOP_BAR_GAP}
      padding={PADDING}
      maxSides
      background={COLOR_CHROME_BG}
      foreground={COLOR_CHROME_FG}
      buttonStyle={buttonStyle}
    >
      <TopBar bpm={bpm} playing={playing}/>
      <Spacer/>
      <VStack
        spacing={ROW_SPACING}
        overlay={showSweep ? {
          alignment: 'leading',
          content: <SweepBar x={sweepX} width={sweepBarWidth} gridWidth={gridDrawWidth} durationSec={sweepDurationSec}/>,
        } : undefined}
      >
        {[0, 1, 2, 3].map(r =>
          <Row row={r} cells={cells} playStep={playStep} cellSize={cellSize}/>
        )}
      </VStack>
    </VStack>
  );
}

// ===== Audio =====
function fireStepNotes(cells: boolean[], step: number) {
  for (let row = 0; row < ROWS; row++) {
    if (!cells[cellIndex(row, step)]) continue;
    AwaitAudio.playNote(ROW_NOTES[row]!, {
      soundFont: SOUNDFONT,
      bank: SOUNDFONT_BANK,
      volume: NOTE_VOLUME,
      velocity: NOTE_VELOCITY,
    });
  }
}

// ===== Timeline =====
function widgetTimeline(): Timeline {
  const playing = getPlaying();
  const ttlBumped = Date.now() - AwaitStore.num('ttl', 0) < 500;
  const inApp = AwaitEnv.host === 'app';

  if (!playing) {
    return {entries: [{date: new Date()}]};
  }

  if (inApp) {
    // Per-step entries to drive audio side effect + per-step playhead in app.
    const bpm = getBpm();
    const playStartedAt = getPlayStartedAt();
    const stepDurMs = stepDurationMs(bpm);
    const totalSteps = STEPS * MEASURES_TO_SCHEDULE;
    const entries: Array<{date: Date}> = [];
    const now = Date.now();
    for (let i = 0; i < totalSteps; i++) {
      const t = playStartedAt + i * stepDurMs;
      if (t < now - 50) continue;
      entries.push({date: new Date(t)});
    }
    if (entries.length === 0 || ttlBumped) entries.unshift({date: new Date()});
    return {entries};
  }

  // Home screen: SwiftUI animation runs autonomously, so we only need to
  // ensure iOS renders at least once after each intent. A small batch of
  // future entries (one per bar) keeps the widget alive without flooding.
  const bpm2 = getBpm();
  const barDurMs = STEPS * stepDurationMs(bpm2);
  const entries: Array<{date: Date}> = [{date: new Date()}];
  const now = Date.now();
  for (let i = 1; i <= 12; i++) {
    entries.push({date: new Date(now + i * barDurMs)});
  }
  if (ttlBumped) entries.unshift({date: new Date()});
  return {entries};
}

// ===== Intents =====
function toggleCell(row: number, col: number) {
  const cells = getCells();
  const idx = cellIndex(row, col);
  cells[idx] = !cells[idx];
  AwaitStore.set('cells', cells);
  AwaitStore.set('ttl', Date.now());
}

async function togglePlay() {
  const playing = getPlaying();
  if (playing) {
    AwaitStore.set('playing', false);
    AwaitStore.set('playStartedAt', 0);
    AwaitAudio.setAudioSession(false);
    AwaitStore.set('ttl', Date.now());
    return;
  }
  AwaitAudio.setAudioSession(true);
  AwaitStore.set('playing', true);
  AwaitStore.set('playStartedAt', Date.now());
  AwaitStore.set('ttl', Date.now());

  // Sequencer loop. Runs while the playing flag is true; the stop-tap flips
  // the flag (assuming intents are dispatched concurrently in the runtime),
  // and the next iteration's check exits the loop.
  let step = 0;
  while (getPlaying()) {
    const cells = getCells();
    const bpm = getBpm();
    fireStepNotes(cells, step);
    AwaitStore.set('ttl', Date.now());
    await sleep(stepDurationMs(bpm));
    step = (step + 1) % STEPS;
  }
}

function tempoUp() {
  const bpm = getBpm();
  const next = Math.min(MAX_BPM, bpm + BPM_STEP);
  AwaitStore.set('bpm', next);
  AwaitStore.set('ttl', Date.now());
}

function tempoDown() {
  const bpm = getBpm();
  const next = Math.max(MIN_BPM, bpm - BPM_STEP);
  AwaitStore.set('bpm', next);
  AwaitStore.set('ttl', Date.now());
}

// ===== App =====
const app = Await.define({
  widget,
  widgetTimeline,
  widgetIntents: {
    toggleCell,
    togglePlay,
    tempoUp,
    tempoDown,
  },
});

const buttonStyle: CustomButtonStyle = {
  press: <Modifier
    geometryGroup
    scaleEffect={0.92}
    animation={{type: 'snappy', duration: 0.08}}
  />,
  normal: <Modifier
    geometryGroup
    scaleEffect={1}
    animation={{type: 'snappy', duration: 0.4}}
  />,
};
