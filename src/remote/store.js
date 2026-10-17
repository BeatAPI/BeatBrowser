// [INPUT] Local operator commands and private remote credentials.
// [OUTPUT] Atomic credential records and owner-only token/config files.
// [POS] Remote access configuration. [PROTOCOL] Never log credential values.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { HOME } from '../lib/paths.js';

export const REMOTE_HOME = path.join(HOME, 'remote');
export const REMOTE_PORT = 18920;
export const digest = value => crypto.createHash('sha256').update(value).digest('hex');
export const failure = (status, message) => Object.assign(new Error(message), { status });

export function privateDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw failure(400, 'Expected a private directory, not a link.');
  fs.chmodSync(directory, 0o700);
}

export function privateRead(filename) {
  if (fs.lstatSync(filename).isSymbolicLink()) throw failure(400, 'Remote configuration must not be a symbolic link.');
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || (process.platform !== 'win32' && (stat.mode & 0o077))) {
      throw failure(400, 'Remote configuration must be an owner-only regular file.');
    }
    return fs.readFileSync(fd, 'utf8');
  } finally { fs.closeSync(fd); }
}

export function privateWrite(filename, value, { exclusive = false } = {}) {
  privateDirectory(path.dirname(filename));
  if (exclusive) {
    fs.writeFileSync(filename, value, { flag: 'wx', mode: 0o600 });
    return;
  }
  const temporary = `${filename}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, value, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, filename);
  } finally { fs.rmSync(temporary, { force: true }); }
}

export function clientId(id) {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]{0,47}$/.test(id)) {
    throw failure(400, 'Client name must start with a lowercase letter and use up to 48 lowercase letters, digits or hyphens.');
  }
  return id;
}

export function remoteStore(directory = REMOTE_HOME) {
  const filename = path.join(directory, 'clients.json');
  const tokenPath = id => path.join(directory, 'tokens', clientId(id));
  function read() {
    try {
      const data = JSON.parse(privateRead(filename));
      if (data.version !== 1 || !Array.isArray(data.clients) || data.clients.length > 32
        || new Set(data.clients.map(record => record?.id)).size !== data.clients.length
        || data.clients.some(record => !record || typeof record !== 'object'
          || !/^[a-z][a-z0-9-]{0,47}$/.test(record.id) || typeof record.revision !== 'string'
          || !/^[a-f0-9]{64}$/.test(record.sha256) || typeof record.enabled !== 'boolean'
          || !Number.isFinite(Date.parse(record.expiresAt)))) throw Error('Invalid store');
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') return { version: 1, clients: [] };
      throw failure(400, 'Cannot read remote credentials. Check clients.json and its file permissions.');
    }
  }
  function change(update) {
    privateDirectory(directory);
    const lock = path.join(directory, 'clients.lock');
    let fd;
    try { fd = fs.openSync(lock, 'wx', 0o600); }
    catch { throw failure(409, 'Another credential update is in progress.'); }
    try {
      const data = read();
      const result = update(data);
      privateWrite(filename, JSON.stringify(data, null, 2) + '\n');
      return result;
    } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
  }
  return {
    directory, tokenPath,
    list: () => read().clients.map(({ sha256, ...record }) => record),
    add(id, { days = 90, rotate = false } = {}) {
      clientId(id);
      if (!Number.isInteger(days) || days < 1 || days > 365) throw failure(400, 'Credential lifetime must be 1 to 365 days.');
      return change(data => {
        const existing = data.clients.find(record => record.id === id);
        if (existing && !rotate) throw failure(409, 'Client already exists. Use remote rotate to replace its credential.');
        if (!existing && rotate) throw failure(404, 'Client does not exist. Use remote add first.');
        if (!existing && data.clients.length >= 32) throw failure(400, 'At most 32 named clients are supported.');
        const token = crypto.randomBytes(32).toString('base64url');
        const record = { id, revision: crypto.randomUUID(), sha256: digest(token), enabled: true,
          createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + days * 86400000).toISOString() };
        privateWrite(tokenPath(id), token + '\n');
        if (rotate) fs.rmSync(path.join(directory, `${id}.connection.json`), { force: true });
        data.clients = data.clients.filter(item => item.id !== id).concat(record);
        return { id, expiresAt: record.expiresAt, tokenFile: tokenPath(id) };
      });
    },
    revoke(id) {
      clientId(id);
      return change(data => {
        const record = data.clients.find(item => item.id === id);
        if (!record) throw failure(404, 'Client does not exist.');
        record.enabled = false;
        fs.rmSync(tokenPath(id), { force: true });
        // Exported connection files contain the old token; make local cleanup explicit.
        fs.rmSync(path.join(directory, `${id}.connection.json`), { force: true });
        return { id, revoked: true };
      });
    },
    authenticate(token) {
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      let data;
      try { data = read(); } catch { return null; }
      const actual = Buffer.from(digest(token), 'hex');
      for (const record of data.clients) {
        if (!record.enabled || !(Date.parse(record.expiresAt) > Date.now()) || !/^[a-f0-9]{64}$/.test(record.sha256)) continue;
        if (crypto.timingSafeEqual(actual, Buffer.from(record.sha256, 'hex'))) {
          return { id: clientId(record.id), key: `${record.id}:${record.revision}` };
        }
      }
      return null;
    },
    token(id) {
      const token = privateRead(tokenPath(id)).trim();
      if (!this.authenticate(token)) throw failure(401, 'Credential is revoked or expired.');
      return token;
    },
  };
}

export function endpoint(value) {
  let url;
  try { url = new URL(value); } catch { throw failure(400, 'Use an HTTPS public URL.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password
    || url.search || url.hash || url.pathname !== '/') throw failure(400, 'Use a root HTTPS URL without credentials, query or path.');
  return url.origin;
}
