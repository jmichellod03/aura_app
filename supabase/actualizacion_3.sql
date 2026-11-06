-- AURA — actualización 3 del esquema (ejecutar una vez en el SQL Editor, después de actualizacion_2.sql)
-- Acceso solo para los correos autorizados (como la bodega de productos).
-- Para dar acceso a otra persona: Table Editor > correos_autorizados > Insert row, con su correo en minúsculas.
-- Para quitarlo: borrar su fila. El cambio rige de inmediato, sin volver a publicar la app.

-- 1. Lista de correos con acceso
create table if not exists public.correos_autorizados (
  email   text primary key check (email = lower(btrim(email)) and email like '%_@_%'),
  nota    text,
  agregado timestamptz not null default now()
);
-- Sin políticas: la página no puede leer ni modificar la lista, solo preguntar por su propio correo
alter table public.correos_autorizados enable row level security;

insert into public.correos_autorizados (email, nota) values
  ('jmichellod03@gmail.com', 'administrador')
  -- , ('otra.persona@gmail.com', 'nombre')
on conflict (email) do nothing;

-- 2. ¿El usuario de la sesión está autorizado? (correo confirmado y en la lista)
create or replace function public.acceso_autorizado()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.correos_autorizados c on c.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.acceso_autorizado() from public, anon;
grant execute on function public.acceso_autorizado() to authenticated;

-- 3. Proyectos: además de ser propios, el usuario debe estar autorizado
drop policy if exists "proyectos_select_propios" on public.proyectos;
drop policy if exists "proyectos_insert_propios" on public.proyectos;
drop policy if exists "proyectos_update_propios" on public.proyectos;
drop policy if exists "proyectos_delete_propios" on public.proyectos;
create policy "proyectos_select_propios" on public.proyectos for select to authenticated
  using (auth.uid() = user_id and public.acceso_autorizado());
create policy "proyectos_insert_propios" on public.proyectos for insert to authenticated
  with check (auth.uid() = user_id and public.acceso_autorizado());
create policy "proyectos_update_propios" on public.proyectos for update to authenticated
  using (auth.uid() = user_id and public.acceso_autorizado())
  with check (auth.uid() = user_id and public.acceso_autorizado());
create policy "proyectos_delete_propios" on public.proyectos for delete to authenticated
  using (auth.uid() = user_id and public.acceso_autorizado());

-- 4. Figuras de las memorias: lo mismo
drop policy if exists "figuras_select_propias" on storage.objects;
drop policy if exists "figuras_insert_propias" on storage.objects;
drop policy if exists "figuras_update_propias" on storage.objects;
drop policy if exists "figuras_delete_propias" on storage.objects;
create policy "figuras_select_propias" on storage.objects for select to authenticated
  using (bucket_id = 'figuras' and (storage.foldername(name))[1] = auth.uid()::text and public.acceso_autorizado());
create policy "figuras_insert_propias" on storage.objects for insert to authenticated
  with check (bucket_id = 'figuras' and (storage.foldername(name))[1] = auth.uid()::text and public.acceso_autorizado());
create policy "figuras_update_propias" on storage.objects for update to authenticated
  using (bucket_id = 'figuras' and (storage.foldername(name))[1] = auth.uid()::text and public.acceso_autorizado());
create policy "figuras_delete_propias" on storage.objects for delete to authenticated
  using (bucket_id = 'figuras' and (storage.foldername(name))[1] = auth.uid()::text and public.acceso_autorizado());

-- 5. Asistente: solo usuarios autorizados (la función del asistente ya llama a asistente_consumir)
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
  if not public.acceso_autorizado() then
    raise exception 'correo no autorizado';
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

-- 6. (Opcional) No crear cuentas de correos que no estén en la lista.
-- Activar en Authentication > Hooks > "Before User Created" > Postgres, función public.antes_de_crear_usuario.
-- Sin el hook la app igual bloquea el acceso (pasos 2 a 5); con él, ni siquiera queda la cuenta creada.
create or replace function public.antes_de_crear_usuario(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.correos_autorizados where email = lower(event->'user'->>'email')) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Este correo no está autorizado para usar AURA. Pídale al administrador que lo agregue.'));
end;
$$;
revoke all on function public.antes_de_crear_usuario(jsonb) from public, anon, authenticated;
grant execute on function public.antes_de_crear_usuario(jsonb) to supabase_auth_admin;
grant select on public.correos_autorizados to supabase_auth_admin;
