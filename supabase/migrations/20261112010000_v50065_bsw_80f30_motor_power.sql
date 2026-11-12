-- Correct only the BSW 80F30-2 source catalogue motor power; no price or history changes.
update public.ks_products_bsw set motor_kw = 2.2, motor_hp = 3
where id = 'bsw:bsw-80f30-2' and model = 'BSW 80F30-2'
  and motor_kw = 22 and motor_hp = 30;
