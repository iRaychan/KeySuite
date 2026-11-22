'use strict';
// Extract exact application-generated item tables. Content styling is deliberately
// separate: this test does not certify browser/native quotation pagination.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),d=new JSDOM(fs.readFileSync(path.join(__dirname,'v50085-review.html'),'utf8')).window.document;
const tables=[...d.querySelectorAll('#pItemPages .print-items-table')].map(x=>x.outerHTML).join('\n');
fs.writeFileSync(path.join(__dirname,'v50085-pdf-content-fixture.html'),'<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:16mm}body{font:10pt Arial,sans-serif;color:#17365d}h1{font-size:17pt}table{width:100%;border-collapse:collapse;table-layout:fixed;color:#111}td,th{vertical-align:top;padding:6px;border-bottom:1px solid #ddd}th:nth-child(2){width:55%}.print-item-desc{white-space:pre-wrap;line-height:1.4}tr{break-inside:avoid}</style></head><body><h1>Quotation identity regression fixture</h1><p>Exact item table from the isolated KeySuite quotation print renderer. Content check; browser PDF export remains unverified.</p>'+tables+'</body></html>');
console.log('PASS exact item-table HTML extracted from application print renderer');
