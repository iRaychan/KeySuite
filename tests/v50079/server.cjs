// Isolated review only: synthetic data and in-memory RPC; no production connections.
const fs=require('node:fs'),vm=require('node:vm');
const template=fs.readFileSync(__dirname+'/fixture.cjs','utf8')
 .replace("path.resolve(__dirname, '../build_v50077')", "path.resolve(__dirname, '../..')")
 .replace('.listen(8777', '.listen(8790')
 .replace("fixture+'</body>'", "fixture+'<script>'+fs.readFileSync(__dirname+'/verify-browser.js','utf8')+'</script></body>'");
vm.runInNewContext(template,{require,__dirname,console,URL});
