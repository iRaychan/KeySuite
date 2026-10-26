#!/usr/bin/env python3
"""Build V5.00.06 FULL CLEAN and UPGRADE ZIPs from the user-supplied V5.00.05 ZIP."""
import argparse,hashlib,json,pathlib,zipfile
p=argparse.ArgumentParser();p.add_argument('--base',required=True,type=pathlib.Path);p.add_argument('--output',type=pathlib.Path);a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];out=a.output or root.parent.parent.parent/'outputs';out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(a.base) as z:base={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
generated={'INTEGRITY_V50006.json','UPGRADE_MANIFEST_V50006.json','SHA256SUMS_V50006.txt'}
def files():return {f.relative_to(root).as_posix():f.read_bytes() for f in sorted(root.rglob('*')) if f.is_file() and f.name!='.DS_Store' and '__pycache__' not in f.parts}
def save(name,data):(root/name).write_text(json.dumps(data,indent=2,sort_keys=True)+'\n')
content={k:v for k,v in files().items() if k not in generated}
if set(base)-set(content):raise SystemExit('Unexpected deletion: '+', '.join(sorted(set(base)-set(content))))
allowed_migrations={
 'supabase/migrations/20261026190000_v50006_bgf_pricelist.sql',
 'supabase/migrations/20261027100000_v50006_bgf_rls_performance.sql',
}
for name,value in base.items():
 if name.startswith('supabase/') and content.get(name)!=value:raise SystemExit('Unexpected baseline Supabase change: '+name)
save('INTEGRITY_V50006.json',{'version':'5.00.06','base_zip_sha256':sha(a.base.read_bytes()),'bgf_workbook_sha256':sha((root/'source/004 - BGF -  261026 - V1.0.xlsx').read_bytes()),'files':{k:sha(v) for k,v in content.items()}})
content=files();changed={k:v for k,v in content.items() if k not in {'UPGRADE_MANIFEST_V50006.json','SHA256SUMS_V50006.txt'} and base.get(k)!=v}
unexpected=[name for name in changed if name.startswith('supabase/') and name not in allowed_migrations]
if unexpected:raise SystemExit('Unexpected Supabase upgrade content: '+', '.join(unexpected))
missing=allowed_migrations-set(changed)
if missing:raise SystemExit('Missing approved BGF migration: '+', '.join(sorted(missing)))
manifest={'from':'5.00.05','to':'5.00.06','new_database_migration_required':True,'production_migration_applied':True,'deletions':[],'files':{k:{'sha256':sha(v),'baseline_sha256':[sha(base[k])] if k in base else [],'required_in_baseline':k in base} for k,v in changed.items()}}
save('UPGRADE_MANIFEST_V50006.json',manifest)
content=files();(root/'SHA256SUMS_V50006.txt').write_text(''.join(f'{sha(v)}  {k}\n' for k,v in sorted(content.items()) if k!='SHA256SUMS_V50006.txt'))
content=files();upgrade=set(changed)|{'UPGRADE_MANIFEST_V50006.json','SHA256SUMS_V50006.txt'}
for suffix,names in [('FULL_CLEAN_GitHub',set(content)),('UPGRADE_from_V5.00.05',upgrade)]:
 dest=out/f'KeySuite_V5.00.06_{suffix}.zip'
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for name in sorted(names):
   info=zipfile.ZipInfo(name,(2026,10,26,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,content[name])
 with zipfile.ZipFile(dest) as z:
  if z.testzip() is not None or set(z.namelist())!=names:raise SystemExit('ZIP validation failed: '+dest.name)
 print(dest.name,len(names),'files',sha(dest.read_bytes()))
report=out/'KeySuite_V5.00.06_CHANGE_AND_TEST_REPORT.md';report.write_bytes((root/'CHANGE_TEST_REPORT_V50006.md').read_bytes())
deliverables=sorted(out.glob('KeySuite_V5.00.06_*.zip'))+[report]
(out/'SHA256SUMS_V50006.txt').write_text(''.join(f'{sha(path.read_bytes())}  {path.name}\n' for path in deliverables))
print('PASS ZIP CRC, file lists, no source deletions, and approved additive BGF migrations only')
