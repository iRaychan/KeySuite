#!/usr/bin/env python3
"""Verify/apply the V4.29.26 file upgrade. No hosting, database or network operations."""
import argparse, hashlib, json, pathlib, shutil, sys
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
p=argparse.ArgumentParser(description=__doc__);p.add_argument('target',type=pathlib.Path);p.add_argument('--apply',action='store_true');args=p.parse_args()
source=pathlib.Path(__file__).resolve().parents[1];target=args.target.resolve()
if not target.is_dir():sys.exit('Target does not exist')
manifest=json.loads((source/'UPGRADE_MANIFEST_V42926.json').read_text());errors=[]
def safe(root,name):
    path=root/name
    if root not in path.resolve().parents:raise ValueError('Unsafe path: '+name)
    return path
for name,item in manifest['files'].items():
    src,dst=safe(source,name),safe(target,name)
    if not src.is_file() or sha(src)!=item['sha256']:errors.append('Package integrity mismatch: '+name)
    if dst.exists() and (not dst.is_file() or sha(dst) not in [item['sha256'],*item['baseline_sha256']]):errors.append('Locally modified target: '+name)
    if not dst.exists() and item['required_in_all_baselines']:errors.append('Missing baseline file: '+name)
for name,hashes in manifest['removed'].items():
    dst=safe(target,name)
    if dst.exists() and (not dst.is_file() or sha(dst) not in hashes):errors.append('Modified retired file: '+name)
if errors:sys.exit('\n'.join(errors))
print('Verified package and target. '+str(len(manifest['files']))+' files to copy; '+str(len(manifest['removed']))+' possible retired files.')
if not args.apply:print('Dry run only. Back up your project, then repeat with --apply.');sys.exit(0)
for name in manifest['files']:
    dst=safe(target,name);dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(safe(source,name),dst)
for name in manifest['removed']:
    dst=safe(target,name)
    if dst.exists():dst.unlink()
shutil.copy2(source/'UPGRADE_MANIFEST_V42926.json',target/'UPGRADE_MANIFEST_V42926.json')
print('Local upgrade applied. Nothing published or migrated.')
