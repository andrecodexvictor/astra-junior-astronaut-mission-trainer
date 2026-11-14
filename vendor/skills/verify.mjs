/** Local integrity audit only: no downloads, subprocesses or remote instructions. */
import { readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '../..'));
const failures = [];
const seenIds = new Set();
const seenFiles = new Set();
let verified = 0;
const digest = data => createHash('sha256').update(data).digest('hex');
async function checkFile(path, expected) {
  try {
    if (typeof path !== 'string' || !path || isAbsolute(path)) throw Error('path must be relative');
    const resolved = await realpath(resolve(root, path));
    const local = relative(root, resolved);
    if (local.startsWith('../') || local === '..' || isAbsolute(local)) throw Error('path escapes repository');
    if (!/^[a-f0-9]{64}$/.test(expected)) throw Error('missing/invalid SHA-256');
    const actual = digest(await readFile(resolved));
    if (actual !== expected) throw Error(`SHA-256 mismatch: expected ${expected}, actual ${actual}`);
    verified++;
  } catch (error) { failures.push(`${path}: ${error.message}`); }
}
const lock = JSON.parse(await readFile(resolve(root, 'skills.lock.json'), 'utf8'));
if (lock.version !== 1) failures.push(`Unsupported lock version: ${lock.version}`);
const sources = new Map();
for (const source of lock.sources ?? []) {
  if (sources.has(source.id)) failures.push(`Duplicate source ${source.id}`);
  sources.set(source.id, source);
  await checkFile(source.licenseFile, source.licenseSha256);
  if (source.noticeFile) await checkFile(source.noticeFile, source.noticeSha256);
}
for (const skill of lock.skills ?? []) {
  if (seenIds.has(skill.id)) failures.push(`Duplicate skill ${skill.id}`);
  seenIds.add(skill.id);
  const source = sources.get(skill.sourceId);
  if (!source) failures.push(`${skill.id}: unknown source ${skill.sourceId}`);
  if (source?.license !== skill.license) failures.push(`${skill.id}: license differs from source`);
  if (source?.commit && source.commit !== skill.sourceCommit) failures.push(`${skill.id}: commit differs from source`);
  if (!skill.files?.some(file => file.path === skill.entrypoint)) failures.push(`${skill.id}: entrypoint absent from files`);
  for (const file of skill.files ?? []) {
    if (seenFiles.has(file.path)) failures.push(`Duplicate file ${file.path}`);
    seenFiles.add(file.path);
    await checkFile(file.path, file.sha256);
  }
}
if (failures.length) {
  console.error(`Skill audit failed (${failures.length}):\n${failures.map(x => `- ${x}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Skill audit passed: ${seenIds.size} skills, ${seenFiles.size} skill files, ${sources.size} license sources; ${verified} hashes verified.`);
}
