"""Package an exact, verified delta over the supplied V5.00.86 FULL ZIP."""
from pathlib import Path, PurePosixPath
import hashlib,json,sys,zipfile
root=Path(__file__).resolve().parents[1]; baseline=Path(sys.argv[1]).resolve(); out=Path(sys.argv[2]).resolve(); out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(baseline) as z:
 assert z.testzip() is None
 old={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
assert old['VERSION.txt'].decode().strip()=='5.00.86'
allowed={'RELEASE.json','VERSION.txt','app.js','index.html','keyhq-launcher.js','manifest.json','release-version.js','sw.js','v39441-login-stability.js'}
def tree():
 return {p.relative_to(root).as_posix():p.read_bytes() for p in root.rglob('*') if p.is_file() and not {'.git','node_modules','__pycache__'}.intersection(p.relative_to(root).parts) and p.name!='.DS_Store'}
current=tree();assert not set(old)-set(current)
modified=sorted(n for n in old if old[n]!=current[n]);assert set(modified)<=allowed,(set(modified)-allowed)
for file in ['tests/v50087-db-results.json','tests/v50087-ui-results.json','tests/v50087-brand-results.json']:assert json.loads(current[file])['status']=='PASS'
protected=['keystock-v100.js','keystock-v100.css','commercial-identity.js','assembly.js','product.js','pricing.js','pricelist.js','quotation-templates.js','manual-price-v50011.js','v40001-multibrand.js','technical-pdf.js']
assert all(current[n]==old[n] for n in protected)
manifest={'version':'5.00.87','baseline':'5.00.86','baseline_zip_sha256':sha(baseline.read_bytes()),'modified':modified,'added':sorted(set(current)-set(old)),'deleted':[],'protected_unchanged_sha256':{n:sha(current[n]) for n in protected},'production_deployed':False,'production_migrated':False,'production_fix_verified':False}
(root/'UPGRADE_MANIFEST_V50087.json').write_text(json.dumps(manifest,indent=2)+'\n');current=tree()
delta={n:b for n,b in current.items() if old.get(n)!=b};assert {**old,**delta}==current
packages=[]
for suffix,members in [('FULL',current),('UPGRADE',delta)]:
 name='KeySuite_V5.00.87_'+suffix+'.zip';p=out/name
 with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,b in sorted(members.items()):
   path=PurePosixPath(n);assert not path.is_absolute() and '..' not in path.parts
   info=zipfile.ZipInfo(n,(2026,11,24,10,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,b)
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  assert len(z.namelist())==len(set(z.namelist()))==len(members)
  assert all(z.read(n)==b for n,b in members.items())
 packages.append({'filename':name,'bytes':p.stat().st_size,'sha256':sha(p.read_bytes()),'members':len(members),'integrity':'PASS'})
# Reconstruct using the actual archived bytes as an independent overlay check.
with zipfile.ZipFile(out/packages[0]['filename']) as f,zipfile.ZipFile(out/packages[1]['filename']) as u:
 assert {**old,**{n:u.read(n) for n in u.namelist()}}=={n:f.read(n) for n in f.namelist()}
report={'status':'PASS','packages':packages,'modified':modified,'added':sorted(set(current)-set(old)),'deleted':[],'upgrade_overlay_equals_full':True,'crc_and_member_bytes_verified':True,'protected_files_unchanged':True,'baseline_zip_sha256':manifest['baseline_zip_sha256'],'production_changes':False}
(out/'KeySuite_V5.00.87_PACKAGE_VERIFICATION.json').write_text(json.dumps(report,indent=2)+'\n')
(out/'KeySuite_V5.00.87_SHA256SUMS.txt').write_text(''.join(p['sha256']+'  '+p['filename']+'\n' for p in packages))
(out/'V5.00.87_REPORT.md').write_bytes(current['V5.00.87_REPORT.md'])
(out/'V5.00.87_MIGRATION.sql').write_bytes(current['supabase/migrations/20261124100000_v50087_quotation_history_summaries.sql'])
print(json.dumps(report,indent=2))
