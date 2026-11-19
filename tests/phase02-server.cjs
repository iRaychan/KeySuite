const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const fixture=fs.readFileSync(path.join(__dirname,'v50079/fixture.cjs'),'utf8')
 .replace("path.resolve(__dirname, '../build_v50077')","path.resolve(__dirname, '..')")
 .replace('.listen(8777','.listen(8800')
 .replace("fixture+'</body>'","fixture+'<script>'+fs.readFileSync(path.join(__dirname,'phase02.js'),'utf8')+'</script></body>'");
vm.runInNewContext(fixture,{require,__dirname,console,URL});
