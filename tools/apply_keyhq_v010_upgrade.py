#!/usr/bin/env python3
"""Apply only a verified V0.9 -> V0.10 local file upgrade. Never contacts a server."""
import argparse, hashlib, json, pathlib, shutil, sys

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def within(root, name):
    p = root / name
    if root not in p.resolve().parents:
        raise ValueError('Unsafe path: ' + name)
    return p

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('target', type=pathlib.Path, help='Existing KeySuite V4.29.25 / KeyHQ V0.9 checkout')
parser.add_argument('--apply', action='store_true', help='Write files after all checks pass; default is a dry run')
args = parser.parse_args()
source = pathlib.Path(__file__).resolve().parents[1]
target = args.target.resolve()
if not target.is_dir():
    sys.exit('Target directory does not exist.')
manifest = json.loads((source / 'UPGRADE_MANIFEST_KEYHQ_V0.10.json').read_text())
errors = []
for name, item in manifest['files'].items():
    src, dst = within(source, name), within(target, name)
    if not src.is_file() or digest(src) != item['sha256']:
        errors.append('Package integrity mismatch: ' + name)
    if dst.exists() and (not dst.is_file() or digest(dst) not in [item['sha256'], item.get('baseline_sha256')]):
        errors.append('Locally modified target (preserve and reconcile first): ' + name)
    if not dst.exists() and item.get('baseline_sha256'):
        errors.append('Expected baseline file missing: ' + name)
for name, sha in manifest['removed'].items():
    dst = within(target, name)
    if dst.exists() and (not dst.is_file() or digest(dst) != sha):
        errors.append('Refusing to delete a modified legacy file: ' + name)
if errors:
    sys.exit('\n'.join(errors))
print(f"Verified {len(manifest['files'])} added/changed files and {len(manifest['removed'])} retired files.")
if not args.apply:
    print('Dry run passed. Back up the checkout, then repeat with --apply to update local files.')
    sys.exit(0)
for name in manifest['files']:
    src, dst = within(source, name), within(target, name)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
for name in manifest['removed']:
    dst = within(target, name)
    if dst.exists():
        dst.unlink()
shutil.copy2(source / 'UPGRADE_MANIFEST_KEYHQ_V0.10.json', target / 'UPGRADE_MANIFEST_KEYHQ_V0.10.json')
print('Local file upgrade complete. No database, GitHub, or hosting changes were performed.')
