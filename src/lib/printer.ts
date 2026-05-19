/**
 * printer.ts — Bluetooth Thermal Receipt Printer Module
 * -------------------------------------------------------
 * Target:   Android (Chrome 85+) — Web Bluetooth API (BLE/GATT)
 * Protocol: ESC/POS
 */

// ─── GATT UUIDs ───────────────────────────────────────────────────────────────
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHAR_UUID    = '00002af1-0000-1000-8000-00805f9b34fb';

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
let _device:    any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _server:    any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _char:      any = null;
let _status:    PrinterStatus = 'disconnected';
let _listeners: ((s: PrinterStatus) => void)[] = [];

const STORAGE_KEY = 'ble_printer_device_id';

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

// ─── CONNECT: FIRST-TIME PAIRING ─────────────────────────────────────────────
/**
 * Opens the Chrome BLE device picker for first-time pairing.
 * Must be called from a user gesture (button click).
 */
export async function connectPrinter(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
    throw new Error('Web Bluetooth API not available. Use Chrome on Android.');
  }

  _setStatus('reconnecting');

  try {
    _device = await (navigator as any).bluetooth.requestDevice({
      filters: [{ services: [PRINTER_SERVICE_UUID] }],
    });

    localStorage.setItem(STORAGE_KEY, _device.id);
    _device.addEventListener('gattserverdisconnected', _onDisconnected);
    await _connect(_device);
    return true;

  } catch (err: any) {
    _setStatus('disconnected');
    if (err.name === 'NotFoundError') return false;
    throw err;
  }
}

// ─── AUTO-CONNECT: SILENT RECONNECT ──────────────────────────────────────────
/**
 * Call this on every page load.
 * Silently reconnects to the last paired printer — no picker shown.
 */
export async function autoConnect(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) return false;

  const savedId = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (!savedId) return false;

  _setStatus('reconnecting');

  try {
    const devices: any[] = await (navigator as any).bluetooth.getDevices();
    _device = devices.find((d: any) => d.id === savedId) ?? null;

    if (!_device) {
      _setStatus('disconnected');
      return false;
    }

    _device.addEventListener('gattserverdisconnected', _onDisconnected);
    await _connect(_device);
    return true;

  } catch {
    _setStatus('disconnected');
    return false;
  }
}

// ─── INTERNAL: GATT CONNECTION ────────────────────────────────────────────────
async function _connect(device: any): Promise<void> {
  _server = await device.gatt.connect();
  const service = await _server.getPrimaryService(PRINTER_SERVICE_UUID);
  _char = await service.getCharacteristic(PRINTER_CHAR_UUID);
  _setStatus('connected');
}

async function _ensureConnected(): Promise<void> {
  if (_server && _server.connected) return;
  if (!_device) throw new Error('No printer paired. Call connectPrinter() first.');
  _setStatus('reconnecting');
  await _connect(_device);
}

function _onDisconnected() {
  _setStatus('disconnected');
  setTimeout(async () => {
    try { await _ensureConnected(); } catch (_) {}
  }, 2000);
}

// ─── PRINT ────────────────────────────────────────────────────────────────────
/**
 * Print a receipt via BLE ESC/POS.
 *
 * Line types:
 *   { text, align?, bold?, doubleWidth?, underline?, feed? }
 *   { type: 'divider' }
 *   { type: 'spacer' }
 *   { type: 'columns', left, right, bold? }
 */
export async function printReceipt(lines: ReceiptLine[], options: PrintOptions = {}): Promise<void> {
  await _ensureConnected();

  const {
    paperWidth = 32,
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
    push(line.doubleWidth ? CMD.DOUBLE_WIDTH   : CMD.NORMAL_SIZE);
    push(line.underline   ? CMD.UNDERLINE_ON   : CMD.UNDERLINE_OFF);

    pushText(String(line.text || ''));
    push(LF);

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
  for (let offset = 0; offset < total; offset += chunkSize) {
    const chunk = new Uint8Array(byteArray.slice(offset, offset + chunkSize));
    await _char.writeValueWithoutResponse(chunk);
    if (offset + chunkSize < total) {
      await _delay(20);
    }
  }
}

function _delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── FORGET ───────────────────────────────────────────────────────────────────
/**
 * Disconnect and clear the saved pairing.
 * Call this to switch to a different printer.
 */
export function forgetPrinter(): void {
  if (_device && _server && _server.connected) {
    _device.gatt.disconnect();
  }
  _device = null;
  _server = null;
  _char   = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  _setStatus('disconnected');
}

/**
 * Returns true if there is a saved printer pairing in localStorage.
 */
export function hasSavedPrinter(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return !!localStorage.getItem(STORAGE_KEY);
}
