const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(__dirname+'/v50079/fixture.cjs','utf8').replace("path.resolve(__dirname, '../build_v50077')",JSON.stringify(root)).replace('.listen(8777','.listen(8802').replace("fixture+'</body>'","fixture+'<script>'+fs.readFileSync(__dirname+'/v50081-browser.js','utf8')+'</script></body>'");
vm.runInNewContext(source,{require,__dirname,console,URL});
