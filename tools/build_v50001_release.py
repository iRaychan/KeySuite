#!/usr/bin/env python3
"""Package the static release against the supplied V5.00.00 ZIP; no network operations."""
import argparse,hashlib,json,pathlib,zipfile
p=argparse.ArgumentParser();p.add_argument('--base',required=True,type=pathlib.Path);p.add_argument('--output',type=pathlib.Path);a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];out=a.output or root.parent/'outputs';out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(a.base) as z:base={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
generated={'INTEGRITY_V50001.json','UPGRADE_MANIFEST_V50001.json','SHA256SUMS_V50001.txt'}
def files():return {p.relative_to(root).as_posix():p.read_bytes() for p in sorted(root.rglob('*')) if p.is_file() and '.DS_Store'!=p.name and '__pycache__' not in p.parts}
def save(name,data):(root/name).write_text(json.dumps(data,indent=2,sort_keys=True)+'\n')
content={k:v for k,v in files().items() if k not in generated}
for n,b in base.items():
 if n.startswith('supabase/') and content.get(n)!=b:raise SystemExit('Unexpected Supabase change: '+n)
assert not set(base)-set(content),'Unexpected deletion'
save('INTEGRITY_V50001.json',{'version':'5.00.01','base_zip_sha256':sha(a.base.read_bytes()),'files':{k:sha(v) for k,v in content.items()}})
content=files();changed={k:v for k,v in content.items() if k not in {'UPGRADE_MANIFEST_V50001.json','SHA256SUMS_V50001.txt'} and base.get(k)!=v}
manifest={'from':'5.00.00','to':'5.00.01','new_database_migration_required':False,'deletions':[],'files':{k:{'sha256':sha(v),'baseline_sha256':[sha(base[k])] if k in base else [],'required_in_baseline':k in base} for k,v in changed.items()}}
save('UPGRADE_MANIFEST_V50001.json',manifest)
content=files();(root/'SHA256SUMS_V50001.txt').write_text(''.join(f'{sha(v)}  {k}\n' for k,v in sorted(content.items()) if k!='SHA256SUMS_V50001.txt'))
content=files();upgrade=set(changed)|{'UPGRADE_MANIFEST_V50001.json','SHA256SUMS_V50001.txt'}
for suffix,names in [('FULL_CLEAN_GitHub',set(content)),('UPGRADE',upgrade)]:
 dest=out/f'KeySuite_V5.00.01_{suffix}.zip'
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for n in sorted(names):
   info=zipfile.ZipInfo(n,(2026,10,26,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,content[n])
 with zipfile.ZipFile(dest) as z:assert z.testzip() is None and set(z.namelist())==names
 print(dest.name,len(names),'files',sha(dest.read_bytes()))
(out/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.name}\n' for p in sorted(out.glob('KeySuite_V5.00.01_*.zip'))))
print('PASS ZIP CRC, file lists, no source deletions, Supabase byte preservation')
