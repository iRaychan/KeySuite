"""Generate the runtime release label from RELEASE.json before packaging."""
import json
import re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'RELEASE.json').read_text())['version']
assert re.fullmatch(r'\d+\.\d{2}\.\d{2}',version)
(root/'release-version.js').write_text(
    '/* Generated from RELEASE.json by tools/sync-release-version.py. */\n'
    f"window.KEYSUITE_VERSION='{version}';window.KEYSUITE_BUILD='V'+window.KEYSUITE_VERSION;\n"
)
index=root/'index.html'
s=index.read_text()
s=re.sub(r'<title>KeySuite V\d+\.\d+\.\d+</title>',f'<title>KeySuite V{version}</title>',s,count=1)
s=re.sub(r'(<div class="auth-brand">KeySuite<small>)V\d+\.\d+\.\d+',rf'\g<1>V{version}',s,count=1)
s=re.sub(r'(<div class="brand">KeySuite<small>Full Suite )V\d+\.\d+\.\d+',rf'\g<1>V{version}',s,count=1)
s=re.sub(r'(<div class="suite-version">KeySuite )V\d+\.\d+\.\d+',rf'\g<1>V{version}',s,count=1)
index.write_text(s)
manifest=root/'manifest.json'
m=json.loads(manifest.read_text());m['name']=f'KeySuite V{version}';manifest.write_text(json.dumps(m,indent=2)+'\n')
print('Synchronized release version',version)
