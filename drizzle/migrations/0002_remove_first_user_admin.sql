CREATE OR REPLACE FUNCTION public.bootstrap_role()
 RETURNS app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare assigned app_role;
begin
  select role into assigned from public.user_roles where user_id = auth.uid()
    order by case role when 'admin' then 0 when 'technician' then 1 else 2 end limit 1;
  if assigned is not null then return assigned; end if;
  assigned := 'submitter';
  insert into public.user_roles(user_id, role) values (auth.uid(), assigned) on conflict do nothing;
  return assigned;
end;
$function$;