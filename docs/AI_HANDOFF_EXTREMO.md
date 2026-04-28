# AI Handoff Extremo - Hackaton IA 2026

Fecha: 2026-03-21
Objetivo: contexto completo y accionable para que otra IA continúe el proyecto sin perder estado.

## 1) Estado General Del Proyecto

Monorepo con tres bloques:

- backend: API Flask con motor hibrido de matching social + chatbots + persistencia en S3.
- frontend: Next.js (App Router) con flujo multirol (voluntario, empresa, trabajador, persona atendida).
- hf_space: API FastAPI para clasificacion de sentimiento usada como apoyo de urgencia.

## 2) Mapa De Arquitectura (Con Ficheros Clave)

### Backend (Flask)

- Entrada de app: backend/app.py
- Blueprints registrados:
- routes/match.py
- routes/chat.py
- routes/dashboard.py

Motor de matching (3 pasos):

- backend/engine/keyword_parser.py: keywords deterministas desde fitxa.
- backend/engine/gemini_analyst.py: analisis contextual con Gemini y salida JSON estructurada.
- backend/engine/matcher.py: cruza necesidades con BBDD locales (centres, recursos, voluntaris, organitzacions, empreses).

Capa LLM:

- backend/gemini_call.py: llamada HTTP a gemini-2.0-flash leyendo GOOGLE_API_KEY.

BBDD local (JSON):

- backend/db/centres.json
- backend/db/recursos.json
- backend/db/voluntaris.json
- backend/db/organitzacions.json
- backend/db/empreses.json
- backend/db/projectes_caritas.json

### Frontend (Next.js)

Ruta raiz:

- frontend/src/app/page.tsx redirige a /help-request-interface.

Flujo principal:

- frontend/src/app/help-request-interface/page.tsx monta AppLayout + HelpRequestFlow.
- frontend/src/app/help-request-interface/HelpRequestFlow.tsx decide vista por rol y estado local.

Pantallas de rol:

- AttendedForm.tsx
- VolunteerForm.tsx
- CompanyForm.tsx
- WorkerForm.tsx
- VolunteerDashboard.tsx
- CompanyDashboard.tsx
- WorkerDashboard.tsx

Dashboard interno:

- frontend/src/app/internal-dashboard/page.tsx y componentes KPI/expedientes/charts.

Cliente API frontend:

- frontend/src/lib/api.ts

### HF Space (FastAPI)

- hf_space/app.py expone /predict y /health.
- Carga modelo desde Hugging Face (MODEL_REPO_ID, por defecto ELOIVI/sentiment-model).

## 3) Catalogo De Endpoints Backend

### Core

- GET /health
- GET /

### Matching

- POST /match
- Body esperado: fitxa social directa (request.json), no wrapper obligatorio.
- Respuesta: objeto con perfil_resum, urgencia, centro, recursos, voluntarios, etc.

- GET /match/test
- Demo fija de matching.

- POST /match/text
- Body: { text: string }
- Flujo: Gemini extrae fitxa estructurada -> motor de matching.
- Devuelve tambien fitxa_extreta.

- POST /urgency
- Body: { text: string }
- Llama HF_APP_ENDPOINT/predict.

### Chatbot

- POST /chat/persona
- Body: { history: [{ role, content }], message: string }
- Si respuesta contiene [READY_TO_MATCH], ejecuta matching y devuelve match.
- Side effect: intenta guardar expedient en S3 (expedients/{id}.json).

- POST /chat/voluntari
- Body: { history: [{ role, content }], message: string }
- Si [READY_TO_MATCH], devuelve match para voluntariado.

- GET /chat/test

### Registros y dashboards

- POST /register/voluntari
- POST /register/empresa
- GET /dashboard/voluntari/<voluntari_id>
- GET /dashboard/empresa/<empresa_id>
- GET /expedients
- POST /expedient
- GET /expedient/<exp_id>

## 4) Persistencia Y Datos

Persistencia runtime en S3 (bucket por AWS_S3_BUCKET, default hackaton-bucket):

- voluntaris/{id}.json
- empreses/{id}.json
- expedients/{id}.json

Notas:

- dashboard.py tiene wrappers s3_put, s3_get, s3_list.
- errores de S3 suelen capturarse y devolver vacio/False para no romper flujo.

Datos base:

- JSON locales en backend/db usados por matcher.
- training_data.json en raiz para clasificacion de urgencia.

## 5) Logica De Negocio (Resumen Preciso)

### Paso 1 - Keywords deterministas

keyword_parser.py mapea campos codificados (habitatge, situacio_laboral, ingressos, ciutadania, etc.) a keywords sociales. Tambien agrega reglas por edad, menores a cargo y banderas de riesgo.

### Paso 2 - Analisis con Gemini

gemini_analyst.py construye prompt con:

- fitxa original
- keywords detectadas
- contexto de projectes_caritas.json

Solicita JSON con urgencia, necesidades, proyectos recomendados, tipos de recursos y cantidades.
Si falla parseo/LLM: fallback heuristico.

### Paso 3 - Matcher

matcher.py:

- Centro: municipio exacto o minimo por distancia (haversine).
- Recursos: keyword overlap + bonus por tipo recomendado por Gemini.
- Voluntarios: filtra capacidad maxima y puntua por habilidades + distancia.
- Organizaciones/empresas: overlap por keywords.
- Limita top resultados (recursos 4, voluntarios 3, organizaciones 3, empresas 2).

## 6) Estado Real Del Frontend (Muy Importante)

La ruta /help-request-interface actualmente SI usa HelpRequestFlow.

HelpRequestFlow:

- Guarda sesion en localStorage key caritasUser.
- Si role es voluntari -> VolunteerDashboard.
- Si role es empresa -> CompanyDashboard.
- Si role es treballador -> WorkerDashboard.
- Sin login: menu de seleccion de perfil.

Credenciales demo hardcodeadas:

- Voluntario: voluntari@caritas.org / 1234 (y otras demos)
- Empresa: empresa@caritas.org / 1234
- Trabajador: admin@caritas.org / 1234

## 7) Variables De Entorno Detectadas

Backend:

- GOOGLE_API_KEY
- HF_APP_ENDPOINT
- AWS_S3_BUCKET

Frontend:

- NEXT_PUBLIC_API_URL
- fallback detectado en varios componentes: http://54.163.22.58:5000 o http://localhost:5000 segun archivo

HF Space:

- MODEL_REPO_ID
- PORT

## 8) Riesgos Tecnicos Detectados

- No hay autenticacion real (solo demo credentials en cliente).
- localStorage guarda objeto usuario en claro.
- Parseo de JSON de Gemini es fragil (bloques markdown, formato libre).
- Sin rate limiting en endpoints de chat.
- CORS global abierto en backend (CORS(app)).
- KPIs del dashboard interno combinan datos reales con valores hardcoded en algunas tarjetas.
- Inconsistencia de fallback API URL entre componentes frontend.

## 9) Comandos De Arranque

Backend:

- cd backend
- pip install -r requirements.txt
- python app.py

Frontend:

- cd frontend
- npm install
- npm run dev

HF Space local:

- cd hf_space
- pip install -r requirements.txt
- python app.py

## 10) Prompt Recomendado Para Otra IA

Usa este prompt como primera instruccion para otra IA:

"""
Eres una IA de continuacion de desarrollo. Trabajas sobre el repo hackaton-ia-2026.
Primero lee AI_HANDOFF_EXTREMO.md y AI_HANDOFF_SNAPSHOT.json completos.
Prioriza:
1) robustez de parseo Gemini (salida JSON estricta y validada),
2) seguridad basica (auth real o hardening inmediato),
3) unificacion de NEXT_PUBLIC_API_URL en frontend,
4) reducir hardcodes en dashboards,
5) tests minimos para rutas criticas /chat/persona, /match, /expedient.
No replantees arquitectura sin justificar coste/beneficio.
"""

## 11) Ultimo Cambio Funcional Relevante

Se conecto la pagina principal del modulo help-request-interface para renderizar HelpRequestFlow, por lo que las modificaciones de VolunteerDashboard ya se reflejan en la UI.

## 12) Correcciones Aplicadas En Esta Iteracion

- Backend: CORS configurable por FRONTEND_ORIGINS en lugar de CORS global abierto.
- Backend: rate limiting in-memory aplicado en endpoints sensibles de chat, matching, registro y creacion de expediente.
- Backend: parseo robusto de JSON de Gemini centralizado en backend/utils/json_utils.py para soportar respuestas con markdown o texto extra.
- Frontend: NEXT_PUBLIC_API_URL unificada via frontend/src/lib/api.ts; eliminados fallbacks inconsistentes por componente.
- Frontend: flujo trabajador mejorado para abrir directamente alta de expediente sin pasar obligatoriamente por dashboard general.
- Frontend: sesion en localStorage validada (rol permitido + expiracion) y almacenamiento minimizado del payload de usuario.
- Frontend: DashboardKPIs sin hardcodes inflados; ahora prioriza datos reales de expedientes y marca N/D cuando no hay metrica integrada.

## 13) Pendientes Importantes (No Cerrados Aun)

- Tests automatizados de auth y autorizacion por rol en rutas protegidas.

## 14) Auth Real Minima Implementada

- Persistencia de usuarios en SQLite: backend/db/users.sqlite.
- Endpoints nuevos:
- POST /auth/register
- POST /auth/login
- GET /auth/me (Bearer token)
- Password hashing con Werkzeug.
- Token firmado con itsdangerous (12h de validez por defecto).
- Frontend conectado a auth real en formularios de voluntario, empresa y trabajador.
- Credenciales demo eliminadas del frontend de acceso.
- Rutas backend sensibles protegidas por rol con Bearer token (dashboards, expedients, chat voluntari).
- Incremento de persones_actuals en voluntaris.json al asignar voluntarios en nuevos expedientes.
- Endpoint de cierre de expediente con decremento de carga: PATCH /expedient/<id>/close.
