# Hackaton IA 2026 - Connector Càritas Tarragona

Resumen técnico completo del repositorio, con estado real de arquitectura, seguridad, datos, flujos funcionales y operación en local/Codespaces/EC2.

## 1) Qué Es Este Proyecto

Plataforma de atención social asistida por IA para Càritas Diocesana de Tarragona.

Incluye:

- Backend Flask con autenticación por token y motor de matching social.
- Frontend Next.js App Router con panel interno, flujo de solicitud y mapa interactivo.
- Persistencia en SQLite como fuente principal de verdad.
- Espejo opcional en S3 para compatibilidad/histórico.
- Integración IA híbrida:
  - Gemini para análisis semántico y conversación guiada.
  - Endpoint externo de urgencia (HF Space) para scoring específico.
  - Analítica con Pandas en dashboard.

## 2) Stack Tecnológico

- Backend:
  - Flask, Flask-CORS
  - SQLite
  - boto3 (S3 opcional)
  - requests
  - pandas
- Frontend:
  - Next.js 15 (App Router)
  - React 19
  - Tailwind
  - Recharts
  - Leaflet + react-leaflet
- IA:
  - Google Gemini API
  - HuggingFace Space (urgency endpoint)

## 3) Scraping Funcional Del Repo (Mapa Real)

### Raíz

- README.md: guía principal (este documento).
- training_data.json: dataset base del proyecto.

### backend/

- app.py
  - Inicialización global.
  - Registro de blueprints.
  - Carga de catálogos a memoria (warmup).
  - Inicializa stores y cuentas admin automáticas.
- routes/
  - auth.py: registro/login/me con validación y rate limit.
  - match.py: matching estructurado, matching por texto libre y endpoint de urgencia.
  - chat.py: flujos conversacionales persona/voluntario con integración a matching.
  - dashboard.py: expedientes, dashboards por rol, analytics y catálogos.
- engine/
  - keyword_parser.py: extracción determinista de keywords.
  - gemini_analyst.py: análisis de caso con Gemini.
  - matcher.py: motor híbrido final (centro/recursos/voluntarios/organizaciones/empresas).
  - analytics.py: métricas agregadas con Pandas para dashboard.
- utils/
  - auth_tokens.py: firma/verificación de tokens; secret obligatorio.
  - auth_guard.py: autorización por roles.
  - db_core.py: conexión SQLite.
  - user_store.py: usuarios/admins.
  - partner_store.py: voluntarios/empresas y admins técnicos de partners.
  - expedient_store.py: persistencia de expedientes y relaciones.
  - catalog_cache.py: catálogos JSON precargados en RAM.
  - rate_limit.py, validation.py, volunteer_load.py, json_utils.py.
- db/
  - users.sqlite
  - catálogos JSON (centres, recursos, voluntaris, empreses, etc.).
  - generate_massive_db_data.py: generación masiva realista multi-origen.

### frontend/

- src/app/help-request-interface/
  - flujo de formularios por rol.
- src/app/internal-dashboard/
  - panel operativo interno (KPIs, expedientes, actividad, urgencias, cobertura, partners, mapa).
- src/app/support-locator/
  - localizador de puntos de atención con mapa Leaflet.
- src/lib/api.ts
  - cliente base para backend y auth headers.

### hf_space/

- app.py + Dockerfile para servicio de urgencia desplegable en Space.

## 4) Estado De Cambios Clave De Esta Iteración

### Arquitectura y escalabilidad

- Catálogos JSON ya no se leen por request.
- Preload de catálogos al arranque y acceso desde memoria.
- Analytics de dashboard con caché TTL para evitar recomputar Pandas en cada llamada.

### Seguridad y robustez

- Secret de auth obligatorio (fail-fast si falta AUTH_SECRET_KEY).
- Excepciones sanitizadas en endpoints críticos (sin leakage al cliente).
- Endpoint de urgencia soporta Bearer token HF_API_TOKEN.
- Llamada a Gemini endurecida:
  - API key en header, no en querystring.
  - errores internos sin exponer datos sensibles en respuestas.
- Debug y CORS controlados por entorno.

### IA y matching

- Matching híbrido operativo:
  - deterministic keyword parsing
  - Gemini analysis
  - asignación de centro/recursos/voluntarios/organizaciones/empresas
- Regla determinista de inclusión sensible en matcher:
  - casos de violencia/maltrato activan filtro women-only en voluntariado.

### Dashboard y UX

- Panels antes hardcodeados migrados a datos reales de DB.
- Mapa operativo interno incorporado con centros y expedientes geolocalizados.
- Soporte Leaflet movido a ciclo de cliente para evitar problemas de hidratación.

### Datos

- Script de generación masiva:
  - crea/ordena catálogos JSON,
  - puebla SQLite con miles de registros,
  - asigna created_by_user_id y resolved_by_user_id,
  - recalcula carga real de voluntariado.

### Administración

- Cuentas admin por rol autogeneradas al arranque:
  - AdminTreballador@caritas.org
  - AdminVoluntari@caritas.org
  - AdminEmpresa@caritas.org
  - password común por defecto: Admin1234!

## 5) Endpoints API (Resumen Operativo)

### Meta

- GET /health
- GET /

### Auth

- POST /auth/register
- POST /auth/login
- GET /auth/me

### Matching

- POST /match
- GET /match/test
- POST /match/text
- POST /urgency

### Chat

- POST /chat/persona
- POST /chat/voluntari
- GET /chat/test

### Dashboard y expedientes

- GET /expedients
- GET /expedients/mine
- POST /expedient
- GET /expedient/<id>
- PATCH /expedient/<id>/close
- GET /dashboard/analytics
- GET /catalog/centres
- GET /dashboard/voluntari/<id>
- GET /dashboard/empresa/<id>

## 6) Variables De Entorno

## Backend (obligatorias recomendadas)

- AUTH_SECRET_KEY (obligatoria)
- GOOGLE_API_KEY (si usas Gemini)
- HF_APP_ENDPOINT (si usas /urgency)

## Backend (opcionales)

- HF_API_TOKEN
- AWS_S3_BUCKET
- ANALYTICS_TTL_SECONDS (default 300)
- CORS_ALLOW_ALL (dev default 1)
- FRONTEND_ORIGINS (cuando CORS_ALLOW_ALL=0)
- FLASK_DEBUG
- PORT

## Admin defaults

- MASTER_ADMIN_EMAIL / MASTER_ADMIN_PASSWORD
- VOLUNTEER_ADMIN_EMAIL
- COMPANY_ADMIN_EMAIL
- ADMIN_SHARED_PASSWORD

## Frontend

- NEXT_PUBLIC_API_URL (default http://localhost:5000)

Ejemplo de backend/.env seguro:

AUTH_SECRET_KEY=pon_una_clave_larga_unica
GOOGLE_API_KEY=tu_key
HF_APP_ENDPOINT=https://tu-space.hf.space
HF_API_TOKEN=tu_token
AWS_S3_BUCKET=hackaton-bucket
CORS_ALLOW_ALL=0
FRONTEND_ORIGINS=https://tu-frontend.com

## 7) Arranque Local (Codespaces O Local)

### Backend

1. cd backend
2. python -m venv .venv
3. source .venv/Scripts/activate (Git Bash) o .\\.venv\\Scripts\\Activate.ps1 (PowerShell)
4. pip install -r requirements.txt
5. define AUTH_SECRET_KEY
6. python app.py

Notas:

- En Git Bash usa export AUTH_SECRET_KEY=... (no uses sintaxis de PowerShell).
- Si aparece ModuleNotFoundError: pandas, faltan dependencias del requirements.

### Frontend

1. cd frontend
2. npm install
3. npm run dev

## 8) Generación Masiva De Datos

Desde backend:

python db/generate_massive_db_data.py --expedients 5000 --voluntaris 900 --empreses 260

Opciones clave:

- --no-reset para no limpiar tablas existentes.
- --seed para reproducibilidad.
- --resolved-ratio para proporción de cerrados.

## 9) Despliegue En EC2 (Resumen)

- Backend con Gunicorn + systemd en 127.0.0.1:5000.
- Nginx como reverse proxy.
- TLS con certbot.
- Variables en EnvironmentFile (systemd) o .env protegido.
- No subir ni versionar secrets.

## 10) Checklist De Seguridad Antes De Producción

- Rotar inmediatamente cualquier API key que haya sido expuesta.
- Confirmar AUTH_SECRET_KEY fuerte y única.
- Desactivar CORS_ALLOW_ALL en producción.
- Configurar HF_API_TOKEN si endpoint de urgencia es privado.
- Limitar rate limits según tráfico real.
- Revisar logs y no devolver trazas al cliente.

## 11) Estado Funcional Actual

El repositorio está en estado funcional con:

- matching operativo,
- dashboard conectado a DB,
- mapa interactivo,
- admins por rol,
- seguridad reforzada,
- analytics cacheado,
- y scripts de seed masivo listos para demo o carga.

