-- Add to Supabase SQL Editor AFTER helpdesk_schema.sql.
-- SECURITY DEFINER runs with its owner privileges. Only service_role may execute.
create or replace function public.helpdesk_submit_ticket(
 p_name text,p_email text,p_phone text,p_category text,p_device text,p_description text,p_priority text
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_number bigint; v_recent integer;
begin
 select count(*) into v_recent from public.support_tickets
 where lower(customer_email)=lower(p_email) and created_at > now()-interval '1 hour';
 if v_recent >= 3 then raise exception 'Too many requests'; end if;
 insert into public.support_tickets(customer_name,customer_email,customer_phone,category,device,description,priority,source)
 values(p_name,p_email,nullif(p_phone,''),p_category,nullif(p_device,''),p_description,p_priority,'website')
 returning ticket_no into v_number;
 return v_number;
end $$;
revoke all on function public.helpdesk_submit_ticket(text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.helpdesk_submit_ticket(text,text,text,text,text,text,text) to service_role;
