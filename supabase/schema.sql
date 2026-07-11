-- ============================================================
-- VENTAS LOCATEL RESTREPO · Esquema de base de datos (Supabase)
-- Ejecutar UNA VEZ en: Supabase > SQL Editor > New query > Run
-- ============================================================

-- ── 1. Perfiles (rol de cada usuario) ───────────────────────
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text unique not null,
  role       text not null default 'empleado' check (role in ('admin', 'empleado')),
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando se registra un usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'empleado')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. Empleados ─────────────────────────────────────────────
create table public.employees (
  id                bigint generated always as identity primary key,
  name              text not null,
  position          text,
  department        text,
  goal              integer not null default 300,
  meta_afiliaciones integer not null default 50,
  user_id           uuid unique references auth.users on delete set null,
  created_at        timestamptz not null default now()
);

-- ── 3. Ventas diarias ────────────────────────────────────────
create table public.sales (
  id             bigint generated always as identity primary key,
  employee_id    bigint not null references public.employees on delete cascade,
  date           date not null,
  autoliquidable integer not null default 0,
  oferta         integer not null default 0,
  marca          integer not null default 0,
  adicional      integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (employee_id, date)
);

-- ── 4. Afiliaciones diarias ──────────────────────────────────
create table public.afiliaciones (
  id          bigint generated always as identity primary key,
  employee_id bigint not null references public.employees on delete cascade,
  fecha       date not null,
  cantidad    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (employee_id, fecha)
);

-- ── 5. Función auxiliar: ¿el usuario actual es admin? ────────
create or replace function public.is_admin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── 6. Seguridad a nivel de fila (RLS) ───────────────────────
alter table public.profiles     enable row level security;
alter table public.employees    enable row level security;
alter table public.sales        enable row level security;
alter table public.afiliaciones enable row level security;

-- Perfiles: cada quien ve el suyo; el admin ve y edita todos
create policy "perfil propio o admin (leer)"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "admin edita perfiles"
  on public.profiles for update
  using (public.is_admin());

-- Empleados: todos los autenticados leen; solo admin modifica
create policy "leer empleados"
  on public.employees for select
  using (auth.role() = 'authenticated');

create policy "admin crea empleados"
  on public.employees for insert
  with check (public.is_admin());

create policy "admin edita empleados"
  on public.employees for update
  using (public.is_admin());

create policy "admin elimina empleados"
  on public.employees for delete
  using (public.is_admin());

-- Ventas: todos leen (ranking/dashboard); cada quien registra las suyas
create policy "leer ventas"
  on public.sales for select
  using (auth.role() = 'authenticated');

create policy "registrar ventas propias"
  on public.sales for insert
  with check (
    public.is_admin() or
    employee_id in (select id from public.employees where user_id = auth.uid())
  );

create policy "editar ventas propias"
  on public.sales for update
  using (
    public.is_admin() or
    employee_id in (select id from public.employees where user_id = auth.uid())
  );

create policy "admin elimina ventas"
  on public.sales for delete
  using (public.is_admin());

-- Afiliaciones: mismas reglas que ventas
create policy "leer afiliaciones"
  on public.afiliaciones for select
  using (auth.role() = 'authenticated');

create policy "registrar afiliaciones propias"
  on public.afiliaciones for insert
  with check (
    public.is_admin() or
    employee_id in (select id from public.employees where user_id = auth.uid())
  );

create policy "editar afiliaciones propias"
  on public.afiliaciones for update
  using (
    public.is_admin() or
    employee_id in (select id from public.employees where user_id = auth.uid())
  );

create policy "admin elimina afiliaciones"
  on public.afiliaciones for delete
  using (public.is_admin());

-- ── 7. Mantener updated_at al día en ventas ──────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sales_touch
  before update on public.sales
  for each row execute function public.touch_updated_at();

-- ============================================================
-- DESPUÉS de ejecutar este script:
-- 1. Ve a Authentication > Users > Add user > Create new user
--    Email:    admin@locatel-restrepo.app
--    Password: (una contraseña segura)
--    ✔ Auto Confirm User
-- 2. Vuelve al SQL Editor y ejecuta:
--    update public.profiles set role = 'admin'
--    where username = 'admin';
-- 3. Ve a Authentication > Sign In / Up > Email y DESACTIVA
--    "Confirm email" (los usuarios del equipo no usan correos reales).
-- ============================================================
