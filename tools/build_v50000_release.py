#!/usr/bin/env python3
"""Build and verify deterministic KeySuite V5.00.00 full and upgrade archives."""
import hashlib, json, pathlib, shutil, tempfile, zipfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
BASELINE=ROOT.parent/'KeyHQ_V42926_Amendment'
OUTPUT=ROOT.parents[1]/'outputs'/'KeySuite_V5.00.00'
FULL=OUTPUT/'KeySuite_V5.00.00_FULL_CLEAN_GitHub.zip'
UPGRADE=OUTPUT/'KeySuite_V5.00.00_UPGRADE.zip'
MANIFEST=ROOT/'UPGRADE_MANIFEST_V50000.json'
INTEGRITY=ROOT/'INTEGRITY_V50000.json'
SUMS=ROOT/'SHA256SUMS_V50000.txt'
CHANGED=[
    'CHANGELOG_V50000.md','INTEGRITY_V50000.json','KEYHQ_RELEASE.json','MODIFIED_FILES_V50000.md',
    'QA_V50000.md','README.md','README_UPGRADE_V50000.md','RELEASE.json','REQUIREMENTS_STATUS_V50000.md',
    'SHA256SUMS_V50000.txt','UPGRADE_MANIFEST_V50000.json','VERSION.txt','index.html','keyhq/index.html',
    'keyhq-launcher.js','keyhq-messenger.js','keyhq-social.js','manifest.json','sw.js',
    'tests/v50000/messenger-host.html','tests/v50000/messenger.cjs','tests/v50000/version-lock.cjs',
    'tools/apply_v50000_upgrade.py','tools/build_v50000_release.py','v50000-version-lock.js'
]
GENERATED={MANIFEST.name,INTEGRITY.name,SUMS.name}

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def files():
    return sorted(path for path in ROOT.rglob('*') if path.is_file() and '.temp' not in path.parts and path.name!='.DS_Store')
def write_json(path,value):path.write_text(json.dumps(value,indent=2,sort_keys=True)+'\n')
def zip_paths(destination,paths):
    with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for path in paths:
            info=zipfile.ZipInfo(path.as_posix(),(2026,10,26,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            archive.writestr(info,(ROOT/path).read_bytes())
def verify(destination,expected):
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip() is not None:raise SystemExit('CRC failure: '+str(destination))
        names=archive.namelist()
        if names!=[path.as_posix() for path in expected]:raise SystemExit('Archive content mismatch: '+str(destination))

manifest={'from':'KeySuite V4.29.26 consolidated amendment','to':'KeySuite V5.00.00','new_database_migration_required':False,'files':{}}
for name in CHANGED:
    if name in GENERATED:continue
    current=ROOT/name
    prior=BASELINE/name
    manifest['files'][name]={'sha256':sha(current),'baseline_sha256':[sha(prior)] if prior.is_file() else [],'required_in_baseline':prior.is_file()}
write_json(MANIFEST,manifest)

integrity_paths=[path for path in files() if path.name not in GENERATED]
write_json(INTEGRITY,{'release':'KeySuite V5.00.00','files':{str(path.relative_to(ROOT)):sha(path) for path in integrity_paths}})

# Add the non-recursive integrity artifact to the guarded package, then finalize the manifest.
manifest['files']['INTEGRITY_V50000.json']={'sha256':sha(INTEGRITY),'baseline_sha256':[],'required_in_baseline':False}
write_json(MANIFEST,manifest)

# Record all package source hashes except this self-referential checksum list.
all_paths=[path for path in files() if path!=SUMS]
SUMS.write_text(''.join(f'{sha(path)}  {path.relative_to(ROOT)}\n' for path in all_paths))

OUTPUT.mkdir(parents=True,exist_ok=True)
full_paths=[path.relative_to(ROOT) for path in files()]
upgrade_paths=sorted(pathlib.Path(name) for name in CHANGED)
zip_paths(FULL,full_paths);zip_paths(UPGRADE,upgrade_paths)
verify(FULL,full_paths);verify(UPGRADE,upgrade_paths)
(OUTPUT/'SHA256SUMS.txt').write_text(f'{sha(FULL)}  {FULL.name}\n{sha(UPGRADE)}  {UPGRADE.name}\n')
print(FULL);print(sha(FULL));print(UPGRADE);print(sha(UPGRADE));print('Verified archive CRC and exact file lists.')
