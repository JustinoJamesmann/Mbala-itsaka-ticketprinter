// ─── ESC/POS COMMAND BYTES ────────────────────────────────────────────────────
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

const CMD: Record<string, number[]> = {
  INIT:          [ESC, 0x40],
  ALIGN_LEFT:    [ESC, 0x61, 0x00],
  ALIGN_CENTER:  [ESC, 0x61, 0x01],
  ALIGN_RIGHT:   [ESC, 0x61, 0x02],
  BOLD_ON:       [ESC, 0x45, 0x01],
  BOLD_OFF:      [ESC, 0x45, 0x00],
  DOUBLE_WIDTH:  [ESC, 0x21, 0x20],
  DOUBLE_WH:     [ESC, 0x21, 0x30],
  NORMAL_SIZE:   [ESC, 0x21, 0x00],
  UNDERLINE_ON:  [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  FEED_3:        [ESC, 0x64, 0x03],
  FEED_1:        [ESC, 0x64, 0x01],
  CUT_FULL:      [GS,  0x56, 0x00],
  CUT_PARTIAL:   [GS,  0x56, 0x01],
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type PrinterStatus = 'connected' | 'reconnecting' | 'disconnected';

export type ReceiptLine =
  | { type: 'divider' }
  | { type: 'spacer' }
  | { type: 'columns'; left: string; right: string; bold?: boolean }
  | {
      type?: never;
      text: string;
      align?: 'left' | 'center' | 'right';
      bold?: boolean;
      doubleWidth?: boolean;
      doubleHeight?: boolean;
      underline?: boolean;
      feed?: number;
    };

export type PrintOptions = {
  paperWidth?: number;
  cutAfter?: boolean;
  partialCut?: boolean;
};

// ─── STATE ────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _port:      any = null;
let _status:    PrinterStatus = 'disconnected';
let _listeners: ((s: PrinterStatus) => void)[] = [];

const STORAGE_KEY = 'serial_printer_port_saved';

// ─── STATUS ───────────────────────────────────────────────────────────────────
function _setStatus(s: PrinterStatus) {
  _status = s;
  _listeners.forEach(fn => fn(s));
}

/**
 * Subscribe to printer status changes.
 * Returns an unsubscribe function.
 */
export function onStatusChange(fn: (s: PrinterStatus) => void): () => void {
  _listeners.push(fn);
  fn(_status);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

/**
 * Returns the current printer status string.
 */
export function getPrinterStatus(): PrinterStatus {
  return _status;
}

export async function connectPrinter(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !(navigator as any).serial) {
    throw new Error('Web Serial API not available. Use Chrome on Android.');
  }

  _setStatus('reconnecting');

  try {
    _port = await (navigator as any).serial.requestPort({
      allowedBluetoothServiceClassIds: [
        '00001101-0000-1000-8000-00805f9b34fb',
      ],
    });

    localStorage.setItem(STORAGE_KEY, 'true');
    await _connect(_port);
    return true;

  } catch (err: any) {
    _setStatus('disconnected');
    if (err.name === 'NotFoundError') return false;
    throw err;
  }
}

export async function autoConnect(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !(navigator as any).serial) return false;

  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (!saved) return false;

  _setStatus('reconnecting');

  try {
    const ports: any[] = await (navigator as any).serial.getPorts();
    _port = ports[0] ?? null;

    if (!_port) {
      _setStatus('disconnected');
      return false;
    }

    await _connect(_port);
    return true;

  } catch {
    _setStatus('disconnected');
    return false;
  }
}

async function _connect(port: any): Promise<void> {
  await port.open({ baudRate: 9600 });
  _setStatus('connected');
}

async function _ensureConnected(): Promise<void> {
  if (_port?.writable) return;
  if (!_port) throw new Error('No printer paired. Call connectPrinter() first.');
  _setStatus('reconnecting');
  await _connect(_port);
}

// ─── PRINT ────────────────────────────────────────────────────────────────────
export async function printReceipt(lines: ReceiptLine[], options: PrintOptions = {}): Promise<void> {
  await _ensureConnected();

  const {
    paperWidth = 48,
    cutAfter   = true,
    partialCut = false,
  } = options;

  const buf: number[] = [];

  const push = (...bytes: (number | number[])[]) =>
    bytes.forEach(b => buf.push(...(Array.isArray(b) ? b : [b])));

  const pushText = (str: string) => {
    const encoded = new TextEncoder().encode(str);
    encoded.forEach(b => buf.push(b));
  };

  push(CMD.INIT);

  for (const line of lines) {

    if (line.type === 'divider') {
      push(CMD.ALIGN_LEFT, CMD.BOLD_OFF, CMD.NORMAL_SIZE);
      pushText('-'.repeat(paperWidth));
      push(LF);
      continue;
    }

    if (line.type === 'spacer') {
      push(LF);
      continue;
    }

    if (line.type === 'columns') {
      push(CMD.ALIGN_LEFT, CMD.NORMAL_SIZE);
      push(line.bold ? CMD.BOLD_ON : CMD.BOLD_OFF);
      const leftText  = String(line.left  || '');
      const rightText = String(line.right || '');
      const gap = paperWidth - leftText.length - rightText.length;
      const row = leftText + ' '.repeat(Math.max(1, gap)) + rightText;
      pushText(row.substring(0, paperWidth));
      push(LF);
      continue;
    }

    const align = line.align || 'left';
    push(
      align === 'center' ? CMD.ALIGN_CENTER :
      align === 'right'  ? CMD.ALIGN_RIGHT  : CMD.ALIGN_LEFT
    );
    push(line.bold        ? CMD.BOLD_ON        : CMD.BOLD_OFF);
    if (line.doubleWidth && line.doubleHeight) {
      push(CMD.DOUBLE_WH);
    } else if (line.doubleWidth) {
      push(CMD.DOUBLE_WIDTH);
    } else {
      push(CMD.NORMAL_SIZE);
    }
    push(line.underline   ? CMD.UNDERLINE_ON   : CMD.UNDERLINE_OFF);

    pushText(String(line.text || ''));
    push(LF);

    if (line.doubleWidth && line.doubleHeight) {
      push(CMD.NORMAL_SIZE);
    }

    if (line.feed && line.feed > 0) {
      for (let i = 0; i < line.feed; i++) push(LF);
    }
  }

  push(CMD.NORMAL_SIZE, CMD.BOLD_OFF, CMD.ALIGN_LEFT, CMD.UNDERLINE_OFF);
  push(CMD.FEED_3);
  if (cutAfter) {
    push(partialCut ? CMD.CUT_PARTIAL : CMD.CUT_FULL);
  }

  await _sendBuffer(buf);
}

async function _sendBuffer(byteArray: number[], chunkSize = 512): Promise<void> {
  const total = byteArray.length;
  const writer = _port.writable.getWriter();
  for (let offset = 0; offset < total; offset += chunkSize) {
    const chunk = new Uint8Array(byteArray.slice(offset, offset + chunkSize));
    await writer.write(chunk);
    if (offset + chunkSize < total) {
      await _delay(20);
    }
  }
  writer.releaseLock();
}

function _delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── FORGET ───────────────────────────────────────────────────────────────────
export async function forgetPrinter(): Promise<void> {
  if (_port) {
    try { await _port.close(); } catch (_) {}
  }
  _port = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  _setStatus('disconnected');
}

export function hasSavedPrinter(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return !!localStorage.getItem(STORAGE_KEY);
}
