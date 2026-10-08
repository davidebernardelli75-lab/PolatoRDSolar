alter table public.quote_requests
  alter column series set default 'FV';

update public.quote_requests
set series = 'FV'
where series = 'F';
