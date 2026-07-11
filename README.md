# Ventas AIS · Locatel Restrepo

Plataforma web para el registro y seguimiento de ventas y afiliaciones del equipo. Construida en React (JSX) para desplegarse en Netlify, con base de datos y autenticación en Supabase (ambos con plan gratuito).

## Qué incluye

- **Login con roles** — administrador y empleado, cada uno ve solo lo que le corresponde.
- **Registro diario de ventas** — Autoliquidable, Oferta de la semana, Marca propia y Producto adicional, con edición del día ya registrado y anillo de progreso hacia la meta.
- **Afiliaciones** — registro diario personal y tabla de cumplimiento del equipo.
- **Dashboard** — KPIs, comparativo contra el período anterior, gráficos por día, por departamento y por categoría.
- **Ranking** — posiciones con medallas por período (mes, semana, trimestre, año).
- **Mi desempeño** — progreso personal frente a metas de ventas y afiliaciones.
- **Administración** — crear/editar/eliminar empleados con sus metas, y crear usuarios vinculados.
- **Diseño responsive** — funciona bien en celular, que es donde el equipo suele registrar.

---

## Paso 1 · Crear la base de datos en Supabase (10 minutos)

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un proyecto nuevo (elige una contraseña de base de datos y guárdala).
3. En el menú lateral abre **SQL Editor** → **New query**.
4. Copia TODO el contenido del archivo `supabase/schema.sql` de este proyecto, pégalo y presiona **Run**. Esto crea las tablas (empleados, ventas, afiliaciones, perfiles) y las reglas de seguridad.
5. Crea tu usuario administrador:
   - Ve a **Authentication → Users → Add user → Create new user**.
   - Email: `admin@locatel-restrepo.app` · Contraseña: la que quieras (mínimo 8 caracteres).
   - Marca **Auto Confirm User** y crea el usuario.
   - Vuelve al **SQL Editor** y ejecuta:
     ```sql
     update public.profiles set role = 'admin' where username = 'admin';
     ```
6. Desactiva la confirmación por correo (los usuarios del equipo no usan correos reales):
   - **Authentication → Sign In / Providers → Email** → desactiva **Confirm email** → guarda.
7. Copia tus claves: **Project Settings → API** → guarda el **Project URL** y la **anon public key**. Las necesitas en el paso siguiente.

## Paso 2 · Probar en tu computador (opcional)

Necesitas [Node.js](https://nodejs.org) instalado.

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
# Edita .env y pega tu URL y tu anon key de Supabase
npm run dev
```

Abre `http://localhost:5173` e ingresa con el usuario `admin` y tu contraseña.

## Paso 3 · Publicar en Netlify (gratis)

**Opción recomendada — desde GitHub:**

1. Sube esta carpeta a un repositorio de GitHub.
2. En [netlify.com](https://netlify.com) → **Add new site → Import an existing project** → conecta tu repositorio.
3. Netlify detecta la configuración automáticamente (`netlify.toml` ya está incluido).
4. Antes de desplegar, ve a **Site configuration → Environment variables** y agrega:
   - `VITE_SUPABASE_URL` = tu Project URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon public key
5. Presiona **Deploy**. En un par de minutos tendrás una URL tipo `https://tu-sitio.netlify.app` (puedes cambiarle el nombre o conectar un dominio propio).

**Opción rápida — sin GitHub:** ejecuta `npm run build` con tu `.env` configurado y arrastra la carpeta `dist` a [app.netlify.com/drop](https://app.netlify.com/drop). (Con esta opción, cada actualización requiere volver a subir la carpeta.)

## Paso 4 · Configurar tu equipo

Ya dentro de la plataforma como administrador:

1. **Empleados** → crea a cada persona con su cargo, departamento y metas.
2. **Usuarios** → crea la cuenta de cada uno (ej. `maria.gomez` + contraseña inicial) y vincúlala a su empleado.
3. Entrégale a cada persona su usuario y contraseña; cada quien puede cambiarla luego desde **Mi perfil**.

---

## Estructura del proyecto

```
├── netlify.toml            Configuración de despliegue en Netlify
├── supabase/schema.sql     Esquema de base de datos (ejecutar en Supabase)
├── src/
│   ├── lib/                Cliente de Supabase, sesión y constantes
│   ├── components/         Layout, KPIs, anillo de meta, insignias…
│   └── pages/              Dashboard, Registrar ventas, Ranking,
│                           Desempeño, Afiliaciones, Perfil, Admin
```

## Notas de seguridad

- La seguridad real está en la base de datos (políticas RLS de Supabase): un empleado solo puede registrar o editar **sus propias** ventas y afiliaciones, aunque manipule el navegador. Solo el administrador puede crear/editar empleados y usuarios.
- La `anon key` de Supabase es pública por diseño; las reglas RLS son las que protegen los datos.
- Los usuarios ingresan con nombre de usuario; internamente se usa el formato `usuario@locatel-restrepo.app` porque Supabase requiere correos. No es necesario que sean correos reales.
