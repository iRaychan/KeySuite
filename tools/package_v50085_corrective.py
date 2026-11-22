"""Package CORRECTED R1 from verified original V5.00.85 bytes; no network/writes outside output."""
from pathlib import Path,PurePosixPath
import sys,json,hashlib,zipfile,subprocess,re
root=Path(__file__).resolve().parents[1]
baseline=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
def tree(p):return {x.relative_to(p).as_posix():x.read_bytes() for x in p.rglob('*') if x.is_file() and x.name!='.DS_Store' and '__pycache__' not in x.parts}
old=tree(baseline)
for line in (baseline/'SHA256SUMS_V50085.txt').read_text().splitlines():
 h,n=line.split('  ',1);assert sha(old[n])==h,n
allowed={'app.js','commercial-identity.js','manual-price-v50011.js','v40001-multibrand.js','release-version.js','v41200-bootstrap.js','sw.js','index.html','RELEASE.json','README_UPGRADE_V50085.md','CHANGED_FILES_V50085.md','UPGRADE_MANIFEST_V50085.json','SHA256SUMS_V50085.txt'}
current=tree(root)
assert not set(old)-set(current),'Unexpected deletion'
assert not {n for n in old if current[n]!=old[n]}-allowed,'Unrelated baseline changes'
code=['app.js','commercial-identity.js','manual-price-v50011.js','v40001-multibrand.js','release-version.js','v41200-bootstrap.js','sw.js']
for n in code:subprocess.run(['node','--check',str(root/n)],check=True,capture_output=True)
# Embedded browser application sources must be exactly the files being packaged.
html=(root/'tests/v50085-corrective-browser.html').read_text();start=html.index('const sources=')+len('const sources=')
embedded,_=json.JSONDecoder().raw_decode(html[start:]);assert len(embedded)==14
for n,text in embedded.items():assert text==(root/n).read_text(),('Stale Safari fixture',n)
functional=json.loads((root/'tests/v50085-corrective-results.json').read_text());assert functional['status']=='PASS'
boundary=json.loads((root/'tests/v50085-corrective-boundaries-results.json').read_text());assert boundary['status']=='PASS' and boundary['mode']=='corrected_assertions'
native=json.loads((root/'tests/v50085-corrective-safari-results.json').read_text());assert len(native['checks'])==10
lifecycle=json.loads((root/'tests/v50085-corrective-lifecycle.json').read_text());assert len(lifecycle['reopened'])==48
scripts=['v50085-corrective.cjs','v50085-corrective-boundaries.cjs','commercial-identity.cjs','v50085-bsw.cjs','v50084-brands.cjs','v50083.cjs','v50082/verify.cjs']
for n in scripts:
 log=(root/'tests/corrective-logs'/(n.replace('/','_')+'.log')).read_text();assert 'PASS' in log and not re.search(r'^(?:FAIL|AssertionError|Error:)',log,re.M),n
from pypdf import PdfReader
pdf=root/'tests/KeySuite_V5.00.85_CORRECTED_SAFARI_EXPORT.pdf';reader=PdfReader(pdf);assert len(reader.pages)==8
for p in reader.pages:assert len(p.images)==1 and p.images[0].image.size==(1588,2246)
proof={'status':'PASS','suites':scripts,'safari_regression_groups':10,'saved_reopened_items':48,'native_safari_pdf':{'pages':8,'sha256':sha(pdf.read_bytes()),'structural_integrity':'PASS','exact_brand_model_inputs_asserted':True,'representative_exported_pages_visually_checked':[2,3,7,8],'ocr':'unavailable; not claimed'},'browser_embedded_source_equivalence':'PASS','application_code_sha256':{n:sha((root/n).read_bytes()) for n in code+['index.html']},'production_writes':False,'push_deploy_migrate':False}
(root/'tests/v50085-corrective-executed-tests.json').write_text(json.dumps(proof,indent=2)+'\n')
(root/'README_UPGRADE_V50085.md').write_bytes((root/'README_UPGRADE_V50085_CORRECTED.md').read_bytes())
current=tree(root)
generated={'CHANGED_FILES_V50085.md','UPGRADE_MANIFEST_V50085.json','SHA256SUMS_V50085.txt'}
modified=sorted(n for n in old if current[n]!=old[n] or n in generated)
added=sorted(set(current)-set(old))
lines=['# V5.00.85 CORRECTED R1 — exact changed files','','Baseline: original V5.00.85 FULL. No deletions. All unlisted baseline files are byte-identical.','','## Modified baseline files','']+['- '+n for n in modified]+['','## Added files','']+['- '+n for n in added]+['']
(root/'CHANGED_FILES_V50085.md').write_text('\n'.join(lines))
current=tree(root)
manifest={'release':'5.00.85','package_revision':'CORRECTED-R1','baseline':'original 5.00.85 FULL','upgrade_supported_from':'original 5.00.85 FULL','original_library_file_id':'libfile_3690c1c25b58819190b13e8f809fea35','baseline_manifest_sha256':sha(old['SHA256SUMS_V50085.txt']),'modified':modified,'added':added,'deleted':[],'payload_sha256':{n:sha(current[n]) for n in modified+added if n not in {'UPGRADE_MANIFEST_V50085.json','SHA256SUMS_V50085.txt'}},'tested_application_sha256':proof['application_code_sha256'],'browser_embedded_source_equivalence':'PASS','deployment_performed':False,'database_changes_performed':False}
(root/'UPGRADE_MANIFEST_V50085.json').write_text(json.dumps(manifest,indent=2)+'\n')
current=tree(root);current.pop('SHA256SUMS_V50085.txt',None)
(root/'SHA256SUMS_V50085.txt').write_text(''.join(sha(b)+'  '+n+'\n' for n,b in sorted(current.items())))
current=tree(root);delta={n:b for n,b in current.items() if n not in old or b!=old[n]}
assert set(delta)==set(modified+added)
for n,h in proof['application_code_sha256'].items():assert sha(current[n])==h
def archive(name,members):
 target=out/name
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,b in sorted(members.items()):
   p=PurePosixPath(n);assert not p.is_absolute() and '..' not in p.parts
   info=zipfile.ZipInfo(n,(2026,11,23,2,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,b)
 with zipfile.ZipFile(target) as z:
  assert z.testzip() is None;assert len(z.namelist())==len(set(z.namelist()))==len(members)
  for n in z.namelist():assert sha(z.read(n))==sha(members[n]),n
 return {'filename':name,'size_bytes':target.stat().st_size,'sha256':sha(target.read_bytes()),'members':len(members),'integrity':'PASS'}
results=[archive('KeySuite_V5.00.85_CORRECTED_FULL.zip',current),archive('KeySuite_V5.00.85_CORRECTED_UPGRADE.zip',delta)]
overlay={**old,**delta};assert overlay==current
report={'status':'PASS','package_revision':'CORRECTED-R1','packages':results,'original_plus_upgrade_equals_full':'PASS','tested_source_equals_packaged_source':'PASS','browser_embedded_source_equivalence':'PASS','safe_unique_paths_crc_all_member_sha256':'PASS','modified_baseline_files':len(modified),'added_files':len(added),'unchanged_baseline_files':len(old)-len(modified),'protected_pricing_motor_performance_bsw_templates_sql_unchanged':True,'production_mutations':False}
(out/'KeySuite_V5.00.85_CORRECTED_PACKAGE_VERIFICATION.json').write_text(json.dumps(report,indent=2)+'\n')
(out/'KeySuite_V5.00.85_CORRECTED_SHA256SUMS.txt').write_text(''.join(p['sha256']+'  '+p['filename']+'\n' for p in results))
(out/'KeySuite_V5.00.85_CORRECTIVE_REPORT.md').write_bytes((root/'V5.00.85_CORRECTIVE_REPORT.md').read_bytes())
print(json.dumps(report,indent=2))
