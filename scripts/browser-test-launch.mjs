// Synthetic browser tests must never request access to the user's login keychain.
import path from 'node:path';
import os from 'node:os';

export function browserTestArgs({ temporaryDirectory, extensionDirectory, url, platform = process.platform, headless = true }) {
  const relative = path.relative(os.tmpdir(), temporaryDirectory);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(temporaryDirectory).startsWith('beat-spaces-')) {
    throw new Error('Browser tests require a disposable beat-spaces-* directory under the OS temporary directory.');
  }
  return [
    `--user-data-dir=${path.join(temporaryDirectory, 'profile')}`,
    `--load-extension=${extensionDirectory}`,
    `--disable-extensions-except=${extensionDirectory}`,
    ...(platform === 'darwin' ? ['--use-mock-keychain'] : []),
    ...(headless ? ['--headless=new', '--disable-gpu'] : []),
    '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    '--disable-features=DialMediaRouteProvider',
    url,
  ];
}
