/* KeySuite V5.00.26 — verified BGF 350M/350E hydraulic data. */
(()=>{'use strict';
  const flow=[0,1.11,2.02,3.04,4.13,5.08,6.15,7.18,8.16,9.25,10.28,11.32];
  const head=[64.39,62.73,61.17,59.88,57.47,54.15,51.76,49.58,47.84,42.86,36.59,27.09];
  const efficiency=[0,20,26.6520467836,36.3742690058,43.1286549708,46.7543859649,47.1929824561,50.7456140351,51.1988304094,47.7777777778,42.3,35.3];
  const npshr=[3,3.05,3.1,3.2,3.3,3.4,3.5,3.65,3.8,3.95,4.1,4.5];
  const dimensions={L:470,W:330,H:430};
  const common={series:'BGF 350',stages:1,fullImpellers:1,smallImpellers:0,smallestImpellers:0,connection:'DN40 (G1½) x DN32 (G1¼)',max_operating_pressure_bar:10,weight_kg:null,dimensions};
  const data={base_hz:50,curves:{'BGF 350':{flow,head_per_stage:head,efficiency,npshr,shutoff_power_per_impeller_kw:{full:.68,medium:null,small:null},speed_rpm:2900,pump_length_mm:dimensions.L,pump_width_mm:dimensions.W}},models:[
    {id:'BGF:BGF 350M',model:'BGF 350M',drive_type:'Motor',motor_kw:2.2,motor_hp:3,...common},
    {id:'BGF:BGF 350E',model:'BGF 350E',drive_type:'Engine',motor_kw:3.7,motor_hp:5,...common}
  ],source:'004 - BGF 261030 - V1.0.xlsx',database_version:'261030-V1.0',app_version:'5.00.26',generation_code:'BGF'};
  globalThis.KeySuiteKVData=Object.freeze(data);
})();
