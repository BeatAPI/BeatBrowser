// [INPUT] Authenticated remote client identity and normal browser tool calls.
// [OUTPUT] One lazily started local stdio MCP client per credential generation.
// [POS] Remote-to-local adapter. [PROTOCOL] Never replay a failed browser action.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { getToolList } from '../mcp-server.js';
import { failure } from './store.js';

const CLI = fileURLToPath(new URL('../cli.js', import.meta.url));
const excluded = new Set(['upload', 'download', 'learnings', 'browser_task']);
export function remoteTools() {
  return getToolList({ fastAgentEnabled: false }).filter(tool => !excluded.has(tool.name)).map(tool => {
    const copy = structuredClone(tool);
    delete copy.inputSchema.properties?.savePath;
    delete copy.inputSchema.properties?.path;
    if (copy.inputSchema.properties?.binary) copy.inputSchema.properties.binary = { const: false, description: 'Remote mode returns text only for fetch.' };
    return copy;
  });
}
const names = new Set(remoteTools().map(tool => tool.name));
export function validateCall(name, args) {
  if (!names.has(name)) throw failure(400, 'Tool is not available remotely.');
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw failure(400, 'Tool arguments must be an object.');
  if (Object.hasOwn(args, 'path') || Object.hasOwn(args, 'savePath') || (name === 'fetch' && args.binary)) {
    throw failure(400, 'Remote tools do not accept local file paths or binary fetches.');
  }
}

export function localBackend() {
  const pool = new Map();
  async function client(identity) {
    if (!pool.has(identity.key)) {
      const pending = (async () => {
        const label = `remote-${identity.id}-${identity.key.split(':')[1]}`;
        const result = new Client({ name: label, version: '1.0.0' });
        const transport = new StdioClientTransport({ command: process.execPath,
          args: [CLI, 'mcp', '--client', label], stderr: 'pipe',
          env: { ...process.env, BEAT_BROWSER_FAST_AGENT: '0' } });
        try {
          await result.connect(transport);
          transport.stderr?.on('data', () => {});
          return result;
        } catch (error) { await result.close().catch(() => {}); throw error; }
      })();
      pool.set(identity.key, pending);
      pending.catch(() => { if (pool.get(identity.key) === pending) pool.delete(identity.key); });
    }
    return pool.get(identity.key);
  }
  return {
    async call(identity, name, args) {
      validateCall(name, args);
      const connection = await client(identity);
      try {
        return await connection.callTool({ name, arguments: args }, undefined,
          { timeout: 660000, maxTotalTimeout: 660000 });
      } catch {
        // A lost reply can follow a successful click. Drop the connection, never retry.
        pool.delete(identity.key);
        await connection.close().catch(() => {});
        throw failure(502, 'Browser connection failed. Inspect the task before issuing another action.');
      }
    },
    async release(key) {
      const pending = pool.get(key);
      pool.delete(key);
      if (pending) await pending.then(connection => connection.close()).catch(() => {});
    },
    async close() {
      const connections = [...pool.values()];
      pool.clear();
      await Promise.allSettled(connections.map(async pending => (await pending).close()));
    },
  };
}
