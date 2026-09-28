update public.quote_requests
set source = case
  when regexp_replace(upper(trim(source)), '^(REFERENZA|REFERENZE|REF\\.?)[[:space:]]*', '', 'i') = ''
    then 'REF.'
  else 'REF. ' || regexp_replace(upper(trim(source)), '^(REFERENZA|REFERENZE|REF\\.?)[[:space:]]*', '', 'i')
end
where source is not null
  and upper(trim(source)) ~ '^(REFERENZA|REFERENZE|REF\\.?)';
