"""Render exact print item tables; verify PDF identity text, not native browser export."""
from weasyprint import HTML, URLFetcher
from pathlib import Path
import fitz,json
root=Path(__file__).resolve().parent
out=root/'v50085-quotation-content.pdf'
HTML(filename=str(root/'v50085-pdf-content-fixture.html'),base_url=str(root.parent)+'/',url_fetcher=URLFetcher(allowed_protocols=['file','data'])).write_pdf(out)
pdf=fitz.open(out);text='\n'.join(p.get_text() for p in pdf)
models=['VMS 10-4','VMS 150-2-1','BM5-2','F90','BP-90']
for model in models:assert model in text,model
for brand in ['VEC','Future Brand','TESK']:assert brand in text,brand
assert 'B.G.Reich Vertical Multistage Pump Model: VMS' not in text
result={'status':'PASS','renderer':'WeasyPrint 70 of exact application item-table HTML with content-test styling','pages':len(pdf),'browserExportTested':False,'models':models,'mixedComponentsVerified':True}
(root/'v50085-pdf-results.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
