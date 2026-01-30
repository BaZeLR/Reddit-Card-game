import fs from 'node:fs';
import path from 'node:path';

const defaultLogFile = path.resolve(process.cwd(), 'logs', 'game.log');
const logFile = process.env.POKER_LOG_FILE || defaultLogFile;

function ensureLogDir(target: string): void {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function logEvent(event: string, data: Record<string, unknown> = {}): void {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...data,
  };
  try {
    ensureLogDir(logFile);
    fs.appendFileSync(logFile, `${JSON.stringify(payload)}\n`);
  } catch {
    // Ignore logging failures to avoid breaking gameplay.
  }
}
