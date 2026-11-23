"""Build and verify an exact delta over the user-supplied corrected baseline."""
from pathlib import Path, PurePosixPath
import hashlib, json, sys, zipfile

root=Path(__file__).resolve().parents[1]
baseline=Path(sys.argv[1]).resolve()
out=Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(baseline) as z:
    assert z.testzip() is None
    old={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
assert old['VERSION.txt'].decode().strip()=='5.00.85'
def tree():
    return {p.relative_to(root).as_posix():p.read_bytes() for p in root.rglob('*')
        if p.is_file() and not {'node_modules','.git','.temp','__pycache__'}.intersection(p.relative_to(root).parts)
        and p.name!='.DS_Store'}
allowed={'RELEASE.json','VERSION.txt','index.html','keystock-v100.css','keystock-v100.js',
    'manifest.json','release-version.js','sw.js','tests/package-lock.json','tests/package.json',
    'tests/v50051-server.cjs','tests/v50054-db.cjs'}
current=tree()
assert not set(old)-set(current),'Missing baseline files'
modified=sorted(n for n in old if current[n]!=old[n])
assert not set(modified)-allowed,('Unexpected baseline edits',set(modified)-allowed)
for n in ['tests/v50086-db-results.json','tests/v50086-ui-results.json','review-v50086/browser-results.json']:
    assert json.loads(current[n])['status']=='PASS',n
logs=['database.log','ui.log','rollback.log','ledger-v104.log','v50085-corrective.cjs.log',
    'v50085-corrective-boundaries.cjs.log','commercial-identity.cjs.log','v50085-bsw.cjs.log',
    'v50084-brands.cjs.log','v50083.cjs.log','v50082_verify.cjs.log']
for name in logs:
    data=current['tests/v50086-logs/'+name].decode()
    assert 'PASS' in data and 'AssertionError' not in data and 'FAIL' not in data,name
protected=['app.js','commercial-identity.js','manual-price-v50011.js','v40001-multibrand.js',
    'quotation-templates.js','assembly.js','product.js','pricing.js','pricelist.js','technical-pdf.js']
assert all(current[n]==old[n] for n in protected)
generated={'CHANGED_FILES_V50086.md','UPGRADE_MANIFEST_V50086.json','SHA256SUMS_V50086.txt'}
added=sorted((set(current)-set(old))|generated)
(root/'CHANGED_FILES_V50086.md').write_text('# V5.00.86 exact payload\n\nBaseline: supplied V5.00.85 Corrected FULL. No deletions.\n\n## Modified files\n\n'+
    '\n'.join('- '+n for n in modified)+'\n\n## Added files\n\n'+'\n'.join('- '+n for n in added)+'\n')
current=tree()
manifest={'release':'5.00.86','keystock':'1.04','baseline':baseline.name,'baseline_zip_sha256':sha(baseline.read_bytes()),
    'modified':modified,'added':added,'deleted':[],'payload_sha256':{n:sha(current[n]) for n in modified+added if n not in generated},
    'protected_application_bytes_unchanged':{n:sha(current[n]) for n in protected},
    'production_deployed':False,'production_migrated':False}
(root/'UPGRADE_MANIFEST_V50086.json').write_text(json.dumps(manifest,indent=2)+'\n')
current=tree();current.pop('SHA256SUMS_V50086.txt',None)
(root/'SHA256SUMS_V50086.txt').write_text(''.join(sha(b)+'  '+n+'\n' for n,b in sorted(current.items())))
current=tree();delta={n:b for n,b in current.items() if old.get(n)!=b}
assert {**old,**delta}==current
def archive(name,members):
    p=out/name
    with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for n,b in sorted(members.items()):
            path=PurePosixPath(n);assert not path.is_absolute() and '..' not in path.parts
            info=zipfile.ZipInfo(n,(2026,11,23,10,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            z.writestr(info,b)
    with zipfile.ZipFile(p) as z:
        assert z.testzip() is None
        assert len(set(z.namelist()))==len(z.namelist())==len(members)
        for n in z.namelist():assert sha(z.read(n))==sha(members[n]),n
    return {'filename':name,'bytes':p.stat().st_size,'sha256':sha(p.read_bytes()),'members':len(members),'integrity':'PASS'}
packages=[archive('KeySuite_V5.00.86_FULL.zip',current),archive('KeySuite_V5.00.86_UPGRADE.zip',delta)]
report={'status':'PASS','packages':packages,'baseline_zip_sha256':manifest['baseline_zip_sha256'],
    'upgrade_overlay_equals_full':True,'unchanged_baseline_files':len(old)-len(modified),
    'modified_baseline_files':modified,'protected_application_bytes_unchanged':True,
    'all_member_hashes_and_crc_verified':True,'production_changes':False}
(out/'KeySuite_V5.00.86_PACKAGE_VERIFICATION.json').write_text(json.dumps(report,indent=2)+'\n')
(out/'KeySuite_V5.00.86_SHA256SUMS.txt').write_text(''.join(p['sha256']+'  '+p['filename']+'\n' for p in packages))
(out/'V5.00.86_REPORT.md').write_bytes(current['V5.00.86_REPORT.md'])
print(json.dumps(report,indent=2))
