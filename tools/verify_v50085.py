"""Run isolated application/data regression tests. No network or production writes."""
from pathlib import Path
import subprocess,os,json,sys
root=Path(__file__).resolve().parents[1]
logdir=root/'tests/v50085-logs';logdir.mkdir(exist_ok=True)
commands=[['node','tests/commercial-identity.cjs'],['node','tests/v50085.cjs'],['node','tests/v50085-bsw.cjs'],['node','tests/v50084-brands.cjs'],['node','tests/v50083.cjs'],['node','tests/v50082/verify.cjs']]
results=[]
for command in commands:
 r=subprocess.run(command,cwd=root,capture_output=True,text=True)
 name=Path(command[-1]).name
 (logdir/(name+'.log')).write_text(r.stdout+r.stderr)
 results.append({'command':command,'status':'PASS' if r.returncode==0 else 'FAIL','exit_code':r.returncode})
 print(results[-1],flush=True)
(root/'tests/v50085-executed-tests.json').write_text(json.dumps(results,indent=2)+'\n')
if any(x['status']=='FAIL' for x in results):sys.exit(1)
