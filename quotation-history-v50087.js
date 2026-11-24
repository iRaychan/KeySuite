/* KeySuite V5.00.87 — bounded summary reads; no legacy bulk-list fallback. */
(()=>{'use strict';
class QuotationHistory {
 constructor(context){this.context=context;this.state={rows:[],recent:[],facets:{years:[],users:[]},metrics:{count:0,value:0},next_cursor:null};this.serial=Promise.resolve();this.generation=0;this.documents=new Map();this.scope='';}
 identity(){const c=this.context();return `${c.company}|${c.email}`;}
 async rpc(name,args){const c=this.context();if(!c.client)throw Error('Secure quotation connection is unavailable.');const result=await c.client.rpc(name,{p_company_id:c.company,...args});if(result.error){if(/schema cache|does not exist|not found/i.test(result.error.message||''))throw Error('V5.00.87 quotation history migration is required. '+result.error.message);throw result.error;}return result.data;}
 load(filters={},cursor=null){const generation=++this.generation,scope=this.identity();if(this.scope!==scope){this.scope=scope;this.documents.clear();this.state={rows:[],recent:[],facets:{years:[],users:[]},metrics:{count:0,value:0},next_cursor:null};}
 const task=this.serial.catch(()=>{}).then(async()=>{if(generation!==this.generation)return null;const data=await this.rpc('keysuite_history_page_v50087',{p_search:filters.search||'',p_customer:filters.customer||'',p_user:filters.user||'',p_periods:filters.periods||[],p_cursor:cursor,p_limit:50});if(generation!==this.generation||scope!==this.identity())return null;if(!data||!Array.isArray(data.rows))throw Error('Invalid quotation summary response.');this.state={...this.state,...data,facets:data.facets||this.state.facets,metrics:data.metrics||this.state.metrics,recent:data.recent||this.state.recent};return this.state;});this.serial=task;return task;
 }
 document(id,no=''){const key=`${this.identity()}|${id}|${no}`;if(this.documents.has(key))return this.documents.get(key);const scope=this.identity(),task=this.rpc('keysuite_history_document_v50087',{p_id:String(id),p_no:no}).then(data=>{if(scope!==this.identity())throw Error('The signed-in quotation account changed.');return data;}).finally(()=>this.documents.delete(key));this.documents.set(key,task);return task;}
 async matching(search){const scope=this.identity();let cursor=null,rows=[],seen=new Set();do{if(scope!==this.identity())throw Error('The signed-in quotation account changed.');const data=await this.rpc('keysuite_history_page_v50087',{p_search:search,p_cursor:cursor,p_limit:100});if(scope!==this.identity())throw Error('The signed-in quotation account changed.');rows.push(...data.rows);cursor=data.next_cursor;if(cursor&&seen.has(cursor))throw Error('Quotation pagination did not advance.');if(cursor)seen.add(cursor);}while(cursor);return rows;}
}
window.KeySuiteQuotationHistoryV50087=QuotationHistory;
})();
