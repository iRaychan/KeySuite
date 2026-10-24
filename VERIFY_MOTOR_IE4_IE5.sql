-- KeySuite V4.26.01 Motor IE4/IE5 verification
-- Expected exact active master coverage: IE4 2P=31, IE4 4P=31, IE5 2P=26, IE5 4P=27.

select efficiency_class, pole, count(*) as active_model_count, min(hp) as min_hp, max(hp) as max_hp
from public.ks_products_motor
where upper(efficiency_class) in ('IE4','IE5')
  and pole in (2,4)
  and coalesce(active,true)=true
group by efficiency_class,pole
order by efficiency_class,pole;

-- The live table must retain both production uniqueness rules.
select model, count(*)
from public.ks_products_motor
group by model
having count(*)>1;

select efficiency_class,hp,pole,count(*)
from public.ks_products_motor
group by efficiency_class,hp,pole
having count(*)>1;
