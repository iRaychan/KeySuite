-- KeySuite V4.21.01 — CHC G1 V1.1 model reconciliation.
-- Sources:
--   Hydraulic: 004 - CHC G1 260831 - V1.1.xlsx
--   Price model master: 010 - CHC G1 (Pricelist) - 260831 - V1.1.xlsx
-- Preserves user-entered G1 prices while normalizing model names and source metadata.
-- Safe to rerun.
begin;

-- 1) Normalize the legacy A/B-style CHC 200 names in all G1 model tables.
do $$
declare r record;
begin
  for r in select * from (values
('CHC 200-1-B','CHC 200-1-0-1','CHC 200-10-B','CHC 200-10-0-1'),
('CHC 200-1-A','CHC 200-1-1','CHC 200-10-A','CHC 200-10-1'),
('CHC 200-2-2B','CHC 200-2-0-2','CHC 200-20-2B','CHC 200-20-0-2'),
('CHC 200-2-2A','CHC 200-2-2','CHC 200-20-2A','CHC 200-20-2'),
('CHC 200-2-A','CHC 200-2-1','CHC 200-20-A','CHC 200-20-1'),
('CHC 200-3-2B','CHC 200-3-0-2','CHC 200-30-2B','CHC 200-30-0-2'),
('CHC 200-3-A-B','CHC 200-3-1-1','CHC 200-30-A-B','CHC 200-30-1-1'),
('CHC 200-3-2A','CHC 200-3-2','CHC 200-30-2A','CHC 200-30-2'),
('CHC 200-3-B','CHC 200-3-0-1','CHC 200-30-B','CHC 200-30-0-1'),
('CHC 200-3-A','CHC 200-3-1','CHC 200-30-A','CHC 200-30-1'),
('CHC 200-4-2B','CHC 200-4-0-2','CHC 200-40-2B','CHC 200-40-0-2'),
('CHC 200-4-2A','CHC 200-4-2','CHC 200-40-2A','CHC 200-40-2'),
('CHC 200-4-A','CHC 200-4-1','CHC 200-40-A','CHC 200-40-1')
  ) as x(old_model,new_model,old_g2,new_g2) loop
    if to_regclass('public.ks_chc_generation_models_v41408') is not null then
      if exists(select 1 from public.ks_chc_generation_models_v41408 where generation_code='G1' and model_code=r.old_model)
         and not exists(select 1 from public.ks_chc_generation_models_v41408 where generation_code='G1' and model_code=r.new_model) then
        update public.ks_chc_generation_models_v41408
           set model_code=r.new_model,equivalent_model_code=r.new_g2,updated_at=now()
         where generation_code='G1' and model_code=r.old_model;
      elsif exists(select 1 from public.ks_chc_generation_models_v41408 where generation_code='G1' and model_code=r.old_model)
         and exists(select 1 from public.ks_chc_generation_models_v41408 where generation_code='G1' and model_code=r.new_model) then
        delete from public.ks_chc_generation_models_v41408 where generation_code='G1' and model_code=r.old_model;
      end if;
    end if;

    if to_regclass('public.ks_chc_g1_model_dimensions_v41408') is not null then
      if exists(select 1 from public.ks_chc_g1_model_dimensions_v41408 where generation_code='G1' and model_code=r.old_model)
         and not exists(select 1 from public.ks_chc_g1_model_dimensions_v41408 where generation_code='G1' and model_code=r.new_model) then
        update public.ks_chc_g1_model_dimensions_v41408 set model_code=r.new_model,updated_at=now()
         where generation_code='G1' and model_code=r.old_model;
      elsif exists(select 1 from public.ks_chc_g1_model_dimensions_v41408 where generation_code='G1' and model_code=r.old_model)
         and exists(select 1 from public.ks_chc_g1_model_dimensions_v41408 where generation_code='G1' and model_code=r.new_model) then
        delete from public.ks_chc_g1_model_dimensions_v41408 where generation_code='G1' and model_code=r.old_model;
      end if;
    end if;

    if to_regclass('public.ks_chc_g1_price_source_v41408') is not null then
      if exists(select 1 from public.ks_chc_g1_price_source_v41408 where generation_code='G1' and model_code=r.old_model)
         and not exists(select 1 from public.ks_chc_g1_price_source_v41408 where generation_code='G1' and model_code=r.new_model) then
        update public.ks_chc_g1_price_source_v41408 set model_code=r.new_model,updated_at=now()
         where generation_code='G1' and model_code=r.old_model;
      elsif exists(select 1 from public.ks_chc_g1_price_source_v41408 where generation_code='G1' and model_code=r.old_model)
         and exists(select 1 from public.ks_chc_g1_price_source_v41408 where generation_code='G1' and model_code=r.new_model) then
        update public.ks_chc_g1_price_source_v41408 n
           set chc_myr=coalesce(nullif(n.chc_myr,0),o.chc_myr),
               chcs_myr=coalesce(nullif(n.chcs_myr,0),o.chcs_myr),
               chcn_myr=coalesce(nullif(n.chcn_myr,0),o.chcn_myr),updated_at=now()
          from public.ks_chc_g1_price_source_v41408 o
         where n.generation_code='G1' and n.model_code=r.new_model
           and o.generation_code='G1' and o.model_code=r.old_model;
        delete from public.ks_chc_g1_price_source_v41408 where generation_code='G1' and model_code=r.old_model;
      end if;
    end if;

    if to_regclass('public.ks_products_chc_g1') is not null then
      if exists(select 1 from public.ks_products_chc_g1 where model=r.old_model)
         and not exists(select 1 from public.ks_products_chc_g1 where model=r.new_model) then
        update public.ks_products_chc_g1
           set id='G1:'||r.new_model,model=r.new_model,
               source_workbook='010 - CHC G1 (Pricelist) - 260831 - V1.1.xlsx',updated_at=now()
         where model=r.old_model;
      elsif exists(select 1 from public.ks_products_chc_g1 where model=r.old_model)
         and exists(select 1 from public.ks_products_chc_g1 where model=r.new_model) then
        update public.ks_products_chc_g1 n set
          chc_usd=coalesce(n.chc_usd,o.chc_usd),chcs_usd=coalesce(n.chcs_usd,o.chcs_usd),chcn_usd=coalesce(n.chcn_usd,o.chcn_usd),
          chc_rmb=coalesce(n.chc_rmb,o.chc_rmb),chcs_rmb=coalesce(n.chcs_rmb,o.chcs_rmb),chcn_rmb=coalesce(n.chcn_rmb,o.chcn_rmb),
          chc_myr=coalesce(n.chc_myr,o.chc_myr),chcs_myr=coalesce(n.chcs_myr,o.chcs_myr),chcn_myr=coalesce(n.chcn_myr,o.chcn_myr),
          chc_rarity_usd=o.chc_rarity_usd,chcs_rarity_usd=o.chcs_rarity_usd,chcn_rarity_usd=o.chcn_rarity_usd,
          chc_rarity_rmb=o.chc_rarity_rmb,chcs_rarity_rmb=o.chcs_rarity_rmb,chcn_rarity_rmb=o.chcn_rarity_rmb,
          chc_rarity_myr=o.chc_rarity_myr,chcs_rarity_myr=o.chcs_rarity_myr,chcn_rarity_myr=o.chcn_rarity_myr,
          source_workbook='010 - CHC G1 (Pricelist) - 260831 - V1.1.xlsx',updated_at=now()
        from public.ks_products_chc_g1 o where n.model=r.new_model and o.model=r.old_model;
        delete from public.ks_products_chc_g1 where model=r.old_model;
      end if;
    end if;
  end loop;
end $$;

-- 2) V1.1 removes the old separate 60 Hz-only price-list entry.
-- The normal CHC 5-6 remains because it is present in the attached V1.1 workbook.
do $$ begin
  if to_regclass('public.ks_products_chc_g1') is not null then
    delete from public.ks_products_chc_g1 where model='CHC 5-5 (60Hz)';
  end if;
  if to_regclass('public.ks_chc_g1_price_source_v41408') is not null then
    delete from public.ks_chc_g1_price_source_v41408 where generation_code='G1' and model_code='CHC 5-5 (60Hz)';
  end if;
end $$;

-- 3) Synchronize the independent G1 price model master to V1.1 without overwriting prices.
do $$ begin
  if to_regclass('public.ks_products_chc_g1') is null then
    raise exception 'ks_products_chc_g1 is missing. Run V41410_CHC_G1_INDEPENDENT_PRICELIST.sql first.';
  end if;
end $$;

alter table public.ks_products_chc_g1
  alter column source_workbook set default '010 - CHC G1 (Pricelist) - 260831 - V1.1.xlsx';

create temp table ks_v42101_g1_price_models(source_row integer primary key,model text unique) on commit drop;
insert into ks_v42101_g1_price_models(source_row,model) values
(5,'CHC 1-1'),
(6,'CHC 1-2'),
(7,'CHC 1-3'),
(8,'CHC 1-4'),
(9,'CHC 1-5'),
(10,'CHC 1-6'),
(11,'CHC 1-7'),
(12,'CHC 1-8'),
(13,'CHC 1-9'),
(14,'CHC 1-10'),
(15,'CHC 1-11'),
(16,'CHC 1-12'),
(17,'CHC 1-13'),
(18,'CHC 1-14'),
(19,'CHC 1-15'),
(20,'CHC 1-16'),
(21,'CHC 1-17'),
(22,'CHC 1-18'),
(23,'CHC 1-19'),
(24,'CHC 1-20'),
(25,'CHC 1-21'),
(26,'CHC 1-22'),
(27,'CHC 1-23'),
(28,'CHC 1-24'),
(29,'CHC 1-25'),
(30,'CHC 1-26'),
(31,'CHC 1-27'),
(32,'CHC 1-28'),
(33,'CHC 1-29'),
(34,'CHC 1-30'),
(35,'CHC 1-31'),
(36,'CHC 1-32'),
(37,'CHC 1-33'),
(38,'CHC 1-34'),
(39,'CHC 1-35'),
(40,'CHC 1-36'),
(41,'CHC 2-1'),
(42,'CHC 2-2'),
(43,'CHC 2-3'),
(44,'CHC 2-4'),
(45,'CHC 2-5'),
(46,'CHC 2-6'),
(47,'CHC 2-7'),
(48,'CHC 2-8'),
(49,'CHC 2-9'),
(50,'CHC 2-10'),
(51,'CHC 2-11'),
(52,'CHC 2-12'),
(53,'CHC 2-13'),
(54,'CHC 2-14'),
(55,'CHC 2-15'),
(56,'CHC 2-16'),
(57,'CHC 2-17'),
(58,'CHC 2-18'),
(59,'CHC 2-19'),
(60,'CHC 2-20'),
(61,'CHC 2-21'),
(62,'CHC 2-22'),
(63,'CHC 2-23'),
(64,'CHC 2-24'),
(65,'CHC 2-25'),
(66,'CHC 2-26'),
(67,'CHC 3-1'),
(68,'CHC 3-2'),
(69,'CHC 3-3'),
(70,'CHC 3-4'),
(71,'CHC 3-5'),
(72,'CHC 3-6'),
(73,'CHC 3-7'),
(74,'CHC 3-8'),
(75,'CHC 3-9'),
(76,'CHC 3-10'),
(77,'CHC 3-11'),
(78,'CHC 3-12'),
(79,'CHC 3-13'),
(80,'CHC 3-14'),
(81,'CHC 3-15'),
(82,'CHC 3-16'),
(83,'CHC 3-17'),
(84,'CHC 3-18'),
(85,'CHC 3-19'),
(86,'CHC 3-20'),
(87,'CHC 3-21'),
(88,'CHC 3-22'),
(89,'CHC 3-23'),
(90,'CHC 3-24'),
(91,'CHC 3-25'),
(92,'CHC 3-26'),
(93,'CHC 3-27'),
(94,'CHC 3-28'),
(95,'CHC 3-29'),
(96,'CHC 3-30'),
(97,'CHC 3-31'),
(98,'CHC 3-32'),
(99,'CHC 3-33'),
(100,'CHC 3-34'),
(101,'CHC 3-35'),
(102,'CHC 3-36'),
(103,'CHC 4-1'),
(104,'CHC 4-2'),
(105,'CHC 4-3'),
(106,'CHC 4-4'),
(107,'CHC 4-5'),
(108,'CHC 4-6'),
(109,'CHC 4-7'),
(110,'CHC 4-8'),
(111,'CHC 4-9'),
(112,'CHC 4-10'),
(113,'CHC 4-11'),
(114,'CHC 4-12'),
(115,'CHC 4-13'),
(116,'CHC 4-14'),
(117,'CHC 4-15'),
(118,'CHC 4-16'),
(119,'CHC 4-17'),
(120,'CHC 4-18'),
(121,'CHC 4-19'),
(122,'CHC 4-20'),
(123,'CHC 4-21'),
(124,'CHC 4-22'),
(125,'CHC 5-1'),
(126,'CHC 5-2'),
(127,'CHC 5-3'),
(128,'CHC 5-4'),
(129,'CHC 5-5'),
(130,'CHC 5-6'),
(131,'CHC 5-7'),
(132,'CHC 5-8'),
(133,'CHC 5-9'),
(134,'CHC 5-10'),
(135,'CHC 5-11'),
(136,'CHC 5-12'),
(137,'CHC 5-13'),
(138,'CHC 5-14'),
(139,'CHC 5-15'),
(140,'CHC 5-16'),
(141,'CHC 5-17'),
(142,'CHC 5-18'),
(143,'CHC 5-19'),
(144,'CHC 5-20'),
(145,'CHC 5-21'),
(146,'CHC 5-22'),
(147,'CHC 5-23'),
(148,'CHC 5-24'),
(149,'CHC 5-25'),
(150,'CHC 5-26'),
(151,'CHC 5-27'),
(152,'CHC 5-28'),
(153,'CHC 5-29'),
(154,'CHC 5-30'),
(155,'CHC 5-31'),
(156,'CHC 5-32'),
(157,'CHC 5-33'),
(158,'CHC 5-34'),
(159,'CHC 5-35'),
(160,'CHC 5-36'),
(161,'CHC 8-1'),
(162,'CHC 8-2'),
(163,'CHC 8-3'),
(164,'CHC 8-4'),
(165,'CHC 8-5'),
(166,'CHC 8-6'),
(167,'CHC 8-7'),
(168,'CHC 8-8'),
(169,'CHC 8-9'),
(170,'CHC 8-10'),
(171,'CHC 8-11'),
(172,'CHC 8-12'),
(173,'CHC 8-13'),
(174,'CHC 8-14'),
(175,'CHC 8-15'),
(176,'CHC 8-16'),
(177,'CHC 8-17'),
(178,'CHC 8-18'),
(179,'CHC 8-19'),
(180,'CHC 8-20'),
(181,'CHC 8-21'),
(182,'CHC 8-22'),
(183,'CHC 12-2'),
(184,'CHC 12-3'),
(185,'CHC 12-4'),
(186,'CHC 12-5'),
(187,'CHC 12-6'),
(188,'CHC 12-7'),
(189,'CHC 12-8'),
(190,'CHC 12-9'),
(191,'CHC 12-10'),
(192,'CHC 12-11'),
(193,'CHC 12-12'),
(194,'CHC 12-13'),
(195,'CHC 12-14'),
(196,'CHC 12-15'),
(197,'CHC 12-16'),
(198,'CHC 12-17'),
(199,'CHC 12-18'),
(200,'CHC 16-1'),
(201,'CHC 16-2'),
(202,'CHC 16-3'),
(203,'CHC 16-4'),
(204,'CHC 16-5'),
(205,'CHC 16-6'),
(206,'CHC 16-7'),
(207,'CHC 16-8'),
(208,'CHC 16-9'),
(209,'CHC 16-10'),
(210,'CHC 16-11'),
(211,'CHC 16-12'),
(212,'CHC 16-13'),
(213,'CHC 16-14'),
(214,'CHC 16-15'),
(215,'CHC 16-16'),
(216,'CHC 16-17'),
(217,'CHC 20-1'),
(218,'CHC 20-2'),
(219,'CHC 20-3'),
(220,'CHC 20-4'),
(221,'CHC 20-5'),
(222,'CHC 20-6'),
(223,'CHC 20-7'),
(224,'CHC 20-8'),
(225,'CHC 20-9'),
(226,'CHC 20-10'),
(227,'CHC 20-11'),
(228,'CHC 20-12'),
(229,'CHC 20-13'),
(230,'CHC 20-14'),
(231,'CHC 20-15'),
(232,'CHC 20-16'),
(233,'CHC 20-17'),
(234,'CHC 32-1-1'),
(235,'CHC 32-1'),
(236,'CHC 32-2-2'),
(237,'CHC 32-2'),
(238,'CHC 32-3-2'),
(239,'CHC 32-3'),
(240,'CHC 32-4-2'),
(241,'CHC 32-4'),
(242,'CHC 32-5-2'),
(243,'CHC 32-5'),
(244,'CHC 32-6-2'),
(245,'CHC 32-6'),
(246,'CHC 32-7-2'),
(247,'CHC 32-7'),
(248,'CHC 32-8-2'),
(249,'CHC 32-8'),
(250,'CHC 32-9-2'),
(251,'CHC 32-9'),
(252,'CHC 32-10-2'),
(253,'CHC 32-10'),
(254,'CHC 32-11-2'),
(255,'CHC 32-11'),
(256,'CHC 32-12-2'),
(257,'CHC 32-12'),
(258,'CHC 32-13-2'),
(259,'CHC 32-13'),
(260,'CHC 32-14-2'),
(261,'CHC 32-14'),
(262,'CHC 32-15-2'),
(263,'CHC 32-15'),
(264,'CHC 32-16-2'),
(265,'CHC 32-16'),
(266,'CHC 45-1-1'),
(267,'CHC 45-1'),
(268,'CHC 45-2-2'),
(269,'CHC 45-2'),
(270,'CHC 45-3-2'),
(271,'CHC 45-3'),
(272,'CHC 45-4-2'),
(273,'CHC 45-4'),
(274,'CHC 45-5-2'),
(275,'CHC 45-5'),
(276,'CHC 45-6-2'),
(277,'CHC 45-6'),
(278,'CHC 45-7-2'),
(279,'CHC 45-7'),
(280,'CHC 45-8-2'),
(281,'CHC 45-8'),
(282,'CHC 45-9-2'),
(283,'CHC 45-9'),
(284,'CHC 45-10-2'),
(285,'CHC 45-10'),
(286,'CHC 45-11-2'),
(287,'CHC 45-11'),
(288,'CHC 45-12-2'),
(289,'CHC 45-12'),
(290,'CHC 45-13-2'),
(291,'CHC 64-1-1'),
(292,'CHC 64-1'),
(293,'CHC 64-2-2'),
(294,'CHC 64-2-1'),
(295,'CHC 64-2'),
(296,'CHC 64-3-2'),
(297,'CHC 64-3-1'),
(298,'CHC 64-3'),
(299,'CHC 64-4-2'),
(300,'CHC 64-4-1'),
(301,'CHC 64-4'),
(302,'CHC 64-5-2'),
(303,'CHC 64-5-1'),
(304,'CHC 64-5'),
(305,'CHC 64-6-2'),
(306,'CHC 64-6-1'),
(307,'CHC 64-6'),
(308,'CHC 64-7-2'),
(309,'CHC 64-7-1'),
(310,'CHC 64-7'),
(311,'CHC 64-8-2'),
(312,'CHC 64-8-1'),
(313,'CHC 90-1-1'),
(314,'CHC 90-1'),
(315,'CHC 90-2-2'),
(316,'CHC 90-2'),
(317,'CHC 90-3-2'),
(318,'CHC 90-3'),
(319,'CHC 90-4-2'),
(320,'CHC 90-4'),
(321,'CHC 90-5-2'),
(322,'CHC 90-5'),
(323,'CHC 90-6-2'),
(324,'CHC 90-6'),
(325,'CHC 120-1'),
(326,'CHC 120-2-2'),
(327,'CHC 120-2-1'),
(328,'CHC 120-2'),
(329,'CHC 120-3-2'),
(330,'CHC 120-3-1'),
(331,'CHC 120-3'),
(332,'CHC 120-4-2'),
(333,'CHC 120-4-1'),
(334,'CHC 120-4'),
(335,'CHC 120-5-2'),
(336,'CHC 120-5-1'),
(337,'CHC 120-5'),
(338,'CHC 120-6-2'),
(339,'CHC 120-6-1'),
(340,'CHC 120-6'),
(341,'CHC 120-7-2'),
(342,'CHC 120-7-1'),
(343,'CHC 120-7'),
(344,'CHC 150-1-1'),
(345,'CHC 150-1'),
(346,'CHC 150-2-2'),
(347,'CHC 150-2-1'),
(348,'CHC 150-2'),
(349,'CHC 150-3-2'),
(350,'CHC 150-3-1'),
(351,'CHC 150-3'),
(352,'CHC 150-4-2'),
(353,'CHC 150-4-1'),
(354,'CHC 150-4'),
(355,'CHC 150-5-2'),
(356,'CHC 150-5-1'),
(357,'CHC 150-5'),
(358,'CHC 150-6-2'),
(359,'CHC 150-6-1'),
(360,'CHC 150-6'),
(361,'CHC 200-1-0-1'),
(362,'CHC 200-1-1'),
(363,'CHC 200-1'),
(364,'CHC 200-2-0-2'),
(365,'CHC 200-2-2'),
(366,'CHC 200-2-1'),
(367,'CHC 200-2'),
(368,'CHC 200-3-0-2'),
(369,'CHC 200-3-1-1'),
(370,'CHC 200-3-2'),
(371,'CHC 200-3-0-1'),
(372,'CHC 200-3-1'),
(373,'CHC 200-3'),
(374,'CHC 200-4-0-2'),
(375,'CHC 200-4-2'),
(376,'CHC 200-4-1'),
(377,'CHC 200-4');

insert into public.ks_products_chc_g1(id,model,source_row,source_workbook)
select 'G1:'||model,model,source_row,'010 - CHC G1 (Pricelist) - 260831 - V1.1.xlsx'
from ks_v42101_g1_price_models
on conflict (model) do update set
  source_row=excluded.source_row,
  source_workbook=excluded.source_workbook,
  updated_at=now();

-- Keep the legacy audit source aligned to V1.1 where the table exists.
do $$ begin
  if to_regclass('public.ks_chc_g1_price_source_v41408') is not null then
    update public.ks_chc_g1_price_source_v41408 p
       set source_row=v.source_row,updated_at=now()
      from ks_v42101_g1_price_models v
     where p.generation_code='G1' and p.model_code=v.model;
  end if;
end $$;

commit;
