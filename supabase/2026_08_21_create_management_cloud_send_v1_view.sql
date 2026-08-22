-- Create a management view that mirrors the current cloud_posts view.
-- This does not copy or mutate source rows; it only exposes the same columns
-- under a Korean admin-facing name.

drop view if exists public."관리_구름보내기_V1";

create view public."관리_구름보내기_V1" as
select *
from public.cloud_posts;
