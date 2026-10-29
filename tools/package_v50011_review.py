from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1];base=root.parent/'KeySuite_V5.00.10';out=root.parent/'deliverables';out.mkdir(exist_ok=True)
def include(p):
 rel=p.relative_to(root)
 return p.is_file() and not any(x in ('.git','node_modules','__pycache__','.DS_Store') for x in rel.parts) and not p.name.startswith('.env') and p.suffix not in ('.pyc','.zip','.blend1')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
files={str(p.relative_to(root)):p for p in root.rglob('*') if include(p) and p.name!='REVIEW_MANIFEST_V50011.json'}
changed={n:{'sha256':sha(p),'baseline_sha256':sha(base/n) if (base/n).is_file() else None} for n,p in files.items() if not (base/n).is_file() or sha(p)!=sha(base/n)}
manifest={'version':'5.00.11-review','baseline':'5.00.10','production_ready':False,'deployed':False,'migration_applied':False,'deletions':[],'files':changed}
mp=root/'REVIEW_MANIFEST_V50011.json';mp.write_text(json.dumps(manifest,indent=2)+'\n');files[mp.name]=mp
for label,chosen in [('FULL',files),('CHANGES',{n:files[n] for n in [*changed,mp.name]})]:
 target=out/f'KeySuite_V5.00.11_{label}_REVIEW.zip'
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,p in sorted(chosen.items()):z.write(p,'KeySuite_V5.00.11/'+n)
 with zipfile.ZipFile(target) as z:
  assert z.testzip() is None
  assert len(z.namelist())==len(chosen)
 print(target.name,round(target.stat().st_size/1024/1024,1),'MB',len(chosen),'files','SHA256',sha(target))
print('Changed/new files:',len(changed))
