#!/usr/bin/env python3
"""Validate/apply V5.00.06 -> V5.00.07 locally. No publication or database changes."""
import argparse,hashlib,json,pathlib,shutil,sys
p=argparse.ArgumentParser(description=__doc__);p.add_argument('target',type=pathlib.Path);p.add_argument('--apply',action='store_true');a=p.parse_args()
source=pathlib.Path(__file__).resolve().parents[1];target=a.target.resolve()
if target==source or not target.is_dir():sys.exit('Choose an existing KeySuite installation, separate from the extracted upgrade folder.')
m=json.loads((source/'UPGRADE_MANIFEST_V50007.json').read_text())
version=target/'VERSION.txt'
if not version.is_file() or version.read_text().strip() not in (m['from'],m['to']):sys.exit('This upgrade requires V5.00.06 (or an already applied V5.00.07).')
def safe(root,name):
 path=(root/name).resolve()
 if root not in path.parents:sys.exit('Unsafe package path: '+name)
 return path
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
errors=[]
for name,row in m['files'].items():
 src,dst=safe(source,name),safe(target,name)
 if not src.is_file() or digest(src)!=row['sha256']:errors.append('Package integrity mismatch: '+name)
 if dst.exists():
  if not dst.is_file() or digest(dst) not in (row['sha256'],row['baseline_sha256']):errors.append('Locally modified target: '+name)
 elif row['baseline_sha256']:errors.append('Missing baseline file: '+name)
if errors:sys.exit('\n'.join(errors))
print('PASS: package hashes and target files verified; '+str(len(m['files']))+' release files.')
if not a.apply:print('Dry run only. Back up your installation, then repeat with --apply.');sys.exit(0)
for name in m['files']:
 dst=safe(target,name);dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(safe(source,name),dst)
for name,row in m['files'].items():
 if digest(safe(target,name))!=row['sha256']:sys.exit('Post-copy verification failed: '+name)
print('PASS: V5.00.07 applied and verified locally. No Supabase migration or Edge Function deployment is required. Nothing was published.')
