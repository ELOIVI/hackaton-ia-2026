# Hackaton IA 2026 - Connector Càritas Tarragona

API + frontend para gestión social asistida por IA.

## Stack

- Backend: Flask
- Frontend: Next.js (App Router)
- Persistencia: SQLite (principal) + S3 (espejo opcional)
- IA: Gemini (análisis) + HF Space (urgencia)

## Variables De Entorno

Backend:

- GOOGLE_API_KEY
- HF_APP_ENDPOINT
- AWS_S3_BUCKET (opcional)
- AUTH_SECRET_KEY (recomendado en prod)
- MASTER_ADMIN_EMAIL (opcional, default admin@caritas.org)
- MASTER_ADMIN_PASSWORD (opcional, default Admin1234!)
- CORS_ALLOW_ALL (default 1 en dev)
- FRONTEND_ORIGINS (si CORS_ALLOW_ALL=0)

Frontend:

- NEXT_PUBLIC_API_URL (default http://localhost:5000)

## Arranque

Backend:

1. cd backend
2. pip install -r requirements.txt
3. python app.py

Frontend:

1. cd frontend
2. npm install
3. npm run dev

## Generacion Masiva De Datos (Todas Las BDs)

Script nuevo para poblar SQLite + JSONs de catalogo con datos sinteticos realistas y ordenados.

Ubicacion:

- backend/db/generate_massive_db_data.py

Que genera:

- SQLite: users, voluntaris, empreses, expedients, expedient_voluntaris, expedient_empreses
- JSONs: voluntaris.json, empreses.json, recursos.json, organitzacions.json, projectes_caritas.json
- Ordena catalogos por claves utiles (municipi/nom/id o similars)
- Incluye admin maestro y asigna created_by_user_id / resolved_by_user_id en expedients

Ejemplo rapido:

1. cd backend
2. python db/generate_massive_db_data.py --expedients 5000 --voluntaris 900 --empreses 260

Notas:

- Por defecto limpia tablas SQLite antes de regenerar. Usa --no-reset para mantener datos previos.
- Credenciales admin por defecto: admin@caritas.org / Admin1234!

## Cuenta Maestra Inicial

- Email: admin@caritas.org
- Password: Admin1234!
- Rol: treballador

Se crea automáticamente al arrancar backend si no existe.

## Endpoints API

### Salud y meta

- GET /health
- GET /

### Auth

- POST /auth/register
  - body: { email, password, role, nom?, companyName?, location? }
- POST /auth/login
  - body: { email, password }
- GET /auth/me
  - header: Authorization: Bearer <token>

### Matching

- POST /match
  - body: fitxa social JSON
- GET /match/test
- POST /match/text
  - body: { text }
- POST /urgency
  - body: { text }

### Chat

- POST /chat/persona
  - body: { history, message }
- POST /chat/voluntari
  - auth: voluntari o treballador
  - body: { history, message }
- GET /chat/test

### Dashboard y expedientes (treballador)

- GET /expedients
- GET /expedients/mine
- POST /expedient
  - body: { fitxa }
- GET /expedient/<id>
- PATCH /expedient/<id>/close

### Dashboards por rol

- GET /dashboard/voluntari/<id>
  - auth: voluntari o treballador
- GET /dashboard/empresa/<id>
  - auth: empresa o treballador

## Persistencia y relaciones (SQLite)

DB principal: backend/db/users.sqlite

Tablas:

- users
- voluntaris
- empreses
- expedients
- expedient_voluntaris (FK expedient -> voluntari)
- expedient_empreses (FK expedient -> empresa)

Relaciones implementadas:

- Expediente creado por trabajador: created_by_user_id
- Expediente asociado a voluntarios asignados (tabla puente)
- Expediente asociado a empresas recomendadas/asignadas (tabla puente)

## Validaciones Backend

- edad: 0..120
- menors_a_carrec: 0..20
- lat: -90..90
- lng: -180..180

Si hay error de validación, devuelve 400 con details.

## Notas

- S3 se mantiene como espejo opcional para compatibilidad.
- El matching de voluntarios y empresas ya usa SQLite (no JSON estático).
- Si el frontend muestra "Failed to fetch", revisar NEXT_PUBLIC_API_URL y backend activo.
