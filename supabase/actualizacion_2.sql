-- AURA — actualización 2 del esquema (ejecutar una vez en el SQL Editor, después de actualizacion_1.sql)
-- Asistente en línea: cuenta las preguntas diarias de cada usuario para limitar el uso de la API

create table if not exists public.asistente_uso (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  n integer not null default 0,
  primary key (user_id, dia)
);
-- Sin políticas: nadie lee ni escribe la tabla directamente, solo la función de abajo
alter table public.asistente_uso enable row level security;

-- Suma una pregunta al usuario de la sesión y devuelve el total del día, o null si ya alcanzó el límite
create or replace function public.asistente_consumir(limite integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer;
begin
  if auth.uid() is null then
    raise exception 'sin sesión';
  end if;
  insert into public.asistente_uso as u (user_id, dia, n)
  values (auth.uid(), (now() at time zone 'utc')::date, 1)
  on conflict (user_id, dia) do update set n = u.n + 1 where u.n < limite
  returning n into total;
  return total;
end;
$$;

revoke all on function public.asistente_consumir(integer) from public, anon;
grant execute on function public.asistente_consumir(integer) to authenticated;
