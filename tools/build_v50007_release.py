#!/usr/bin/env python3
"""Package the V5.00.07 working tree; verify it derives from the supplied V5.00.06 ZIP."""
import argparse, hashlib, json, pathlib, zipfile
p=argparse.ArgumentParser();p.add_argument('--base',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args()
r=pathlib.Path(__file__).resolve().parents[1];a.output.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(a.base) as z:base={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
assert base['VERSION.txt'].decode().strip()=='5.00.06'
def files():return {x.relative_to(r).as_posix():x.read_bytes() for x in sorted(r.rglob('*')) if x.is_file() and x.name!='.DS_Store' and '__pycache__' not in x.parts}
content=files();assert not set(base)-set(content),'Original files missing'
changed=sorted(n for n in base if content[n]!=base[n])
allowed={'RELEASE.json','VERSION.txt','assembly.js','bgf-v50006.js','index.html','keyhq/campus/camera-safety.js','keyhq/campus/campus.css','keyhq/campus/controls.js','keyhq/campus/diving.js','keyhq/campus/main.js','keyhq/campus/scene.js','keyhq/index.html','manifest.json','roles.js','selector-es/index.html','sw.js','v40001-multibrand.js','v40407-role-authority.js'}
assert set(changed)==allowed,changed
for n,v in base.items():
 if n.startswith(('supabase/','source/')):assert content[n]==v,n
for n in ['app.js','pricing.js','coupling.js','auth.js','quotation-templates.js','pdf-optimization.js']:assert content[n]==base[n],n
assert content['VERSION.txt'].decode().strip()=='5.00.07'
generated={'MODIFIED_FILES_V50007.md','INTEGRITY_V50007.json','SHA256SUMS_V50007.txt'}
added=sorted(set(content)-set(base)-generated)
(r/'MODIFIED_FILES_V50007.md').write_text('# V5.00.07 file inventory\n\n## Modified baseline files\n\n'+''.join('- `'+n+'`\n' for n in changed)+'\n## Added files\n\n'+''.join('- `'+n+'`\n' for n in sorted(added+list(generated)))+'\nNo baseline files deleted. '+str(len(base)-len(changed))+' original files remain byte-identical.\n')
content=files();manifest={'version':'5.00.07','baseline':'5.00.06','base_zip_sha256':sha(a.base.read_bytes()),'changed_baseline_files':changed,'unchanged_baseline_files':len(base)-len(changed),'deleted_files':[],'new_database_migration_required':False,'files':{n:sha(v) for n,v in content.items() if n not in {'INTEGRITY_V50007.json','SHA256SUMS_V50007.txt'}}}
(r/'INTEGRITY_V50007.json').write_text(json.dumps(manifest,indent=2)+'\n');content=files();(r/'SHA256SUMS_V50007.txt').write_text(''.join(f'{sha(v)}  {n}\n' for n,v in sorted(content.items()) if n!='SHA256SUMS_V50007.txt'));content=files()
dest=a.output/'KeySuite_V5.00.07_FULL_CLEAN_GitHub.zip'
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for n,v in sorted(content.items()):
  assert not n.startswith('/') and '..' not in pathlib.PurePosixPath(n).parts
  info=zipfile.ZipInfo(n,(2026,10,27,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,v)
with zipfile.ZipFile(dest) as z:
 assert z.testzip() is None
 assert set(z.namelist())==set(content)
 for n,v in content.items():assert sha(z.read(n))==sha(v),n
for n in ['CHANGELOG_V50007.md','VERIFICATION_V50007.md','MODIFIED_FILES_V50007.md']:(a.output/n).write_bytes((r/n).read_bytes())
(a.output/'SHA256SUMS.txt').write_text(f'{sha(dest.read_bytes())}  {dest.name}\n')
print(json.dumps({'archive':str(dest),'files':len(content),'modified':len(changed),'unchanged':len(base)-len(changed),'bytes':dest.stat().st_size,'sha256':sha(dest.read_bytes()),'crc':'PASS','preservation':'PASS'},indent=2))
