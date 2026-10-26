#!/usr/bin/env python3
"""Verify/apply the KeySuite V5.00.03 file upgrade. No hosting, database or network operations."""
import argparse, hashlib, json, pathlib, shutil, sys
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('target',type=pathlib.Path)
parser.add_argument('--apply',action='store_true')
args=parser.parse_args()
source=pathlib.Path(__file__).resolve().parents[1]
target=args.target.resolve()
if not target.is_dir():sys.exit('Target does not exist')
manifest=json.loads((source/'UPGRADE_MANIFEST_V50003.json').read_text())
def safe(root,name):
    path=root/name
    if root not in path.resolve().parents:raise ValueError('Unsafe path: '+name)
    return path
errors=[]
for name,item in manifest['files'].items():
    src,dst=safe(source,name),safe(target,name)
    if not src.is_file() or sha(src)!=item['sha256']:errors.append('Package integrity mismatch: '+name)
    if dst.exists() and (not dst.is_file() or sha(dst) not in [item['sha256'],*item['baseline_sha256']]):errors.append('Locally modified target: '+name)
    if not dst.exists() and item['required_in_baseline']:errors.append('Missing V5.00.02 baseline file: '+name)
if errors:sys.exit('\n'.join(errors))
print(f"Verified package and target. {len(manifest['files'])} files to copy.")
if not args.apply:
    print('Dry run only. Back up your project, then repeat with --apply.')
    sys.exit(0)
for name in manifest['files']:
    destination=safe(target,name);destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(safe(source,name),destination)
for name in ('UPGRADE_MANIFEST_V50003.json','SHA256SUMS_V50003.txt'):
    shutil.copy2(safe(source,name),safe(target,name))
print('V5.00.03 local upgrade applied. Nothing published or migrated.')
