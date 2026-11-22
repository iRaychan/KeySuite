"""Build and verify V5.00.85 FULL/UPGRADE without deployment or database access."""
from pathlib import Path,PurePosixPath
import json,hashlib,zipfile,sys,subprocess
root=Path(__file__).resolve().parents[1]
baseline=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(baseline) as z:old={i.filename:z.read(i) for i in z.infolist() if not i.is_dir()}
meta_names={'UPGRADE_MANIFEST_V50085.json','CHANGED_FILES_V50085.md','SHA256SUMS_V50085.txt'}
files={p.relative_to(root).as_posix():p.read_bytes() for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='.DS_Store' and p.relative_to(root).as_posix() not in meta_names}
missing=set(old)-set(files);assert not missing,('Unexpected deletions',missing)
modified=sorted(n for n in files if n in old and files[n]!=old[n]);added=sorted(set(files)-set(old))
# Syntax-check changed runtime code in the final release source.
for name in modified:
 if name.endswith('.js'):subprocess.run(['node','--check',str(root/name)],check=True,capture_output=True)
# Explicitly protect calculation code, SQL, and unrelated product engineering datasets.
protected=['pricing.js','operating-speed.js']+[n for n in old if n.endswith('.sql') or n.startswith(('supabase/functions/','selector-cr/','selector-kv/','selector-bfi/','selector-es/','selector-iso/'))]
for name in protected:assert files[name]==old[name],('Protected source changed',name)
manifest={'release':'5.00.85','baseline':'5.00.84','baseline_zip_sha256':'20aa59161edcbca689c6578a7c6e6496037794fe2e05b347c026fe097c64b985','modified':modified,'added':added,'supporting_manifests':sorted(meta_names),'deleted':[],'payload_sha256':{n:sha(files[n]) for n in modified+added},'deployment_performed':False,'database_changes_performed':False}
(root/'UPGRADE_MANIFEST_V50085.json').write_text(json.dumps(manifest,indent=2)+'\n')
lines=['# Changed files — V5.00.85','','All unlisted V5.00.84 files are byte-identical. No deletions.','','## Modified baseline files','']+['- '+n for n in modified]+['','## Added release files','']+['- '+n for n in added]+['','## Generated supporting manifests','']+['- '+n for n in sorted(meta_names)]+['']
(root/'CHANGED_FILES_V50085.md').write_text('\n'.join(lines))
for name in meta_names-{'SHA256SUMS_V50085.txt'}:files[name]=(root/name).read_bytes()
(root/'SHA256SUMS_V50085.txt').write_text(''.join(f'{sha(files[n])}  {n}\n' for n in sorted(files)))
files['SHA256SUMS_V50085.txt']=(root/'SHA256SUMS_V50085.txt').read_bytes()
upgrade={n:b for n,b in files.items() if n not in old or b!=old[n]}
def archive(name,members):
 target=out/name
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n in sorted(members):
   p=PurePosixPath(n);assert not p.is_absolute() and '..' not in p.parts
   info=zipfile.ZipInfo(n,(2026,11,22,16,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,members[n])
 with zipfile.ZipFile(target) as z:
  assert z.testzip() is None
  assert len(z.namelist())==len(set(z.namelist()))==len(members)
  for n in z.namelist():assert sha(z.read(n))==sha(members[n]),n
 return {'filename':name,'path':str(target),'size_bytes':target.stat().st_size,'sha256':sha(target.read_bytes()),'archive_integrity':'PASS','members':len(members)}
results=[archive('KeySuite_V5.00.85_FULL.zip',files),archive('KeySuite_V5.00.85_UPGRADE.zip',upgrade)]
overlay={**old,**upgrade};assert overlay.keys()==files.keys();assert all(overlay[n]==files[n] for n in files)
report={'status':'PASS','packages':results,'overlay_equivalence':'PASS','protected_files_unchanged':len(protected),'modified_baseline_files':len(modified),'new_payload_files':len(added),'upgrade_members':len(upgrade),'full_members':len(files),'crc_safe_paths_unique_members_hashes':'PASS'}
(out/'KeySuite_V5.00.85_PACKAGE_VERIFICATION.json').write_text(json.dumps(report,indent=2)+'\n')
(out/'KeySuite_V5.00.85_SHA256SUMS.txt').write_text(''.join(r['sha256']+'  '+r['filename']+'\n' for r in results))
print(json.dumps(report,indent=2))
