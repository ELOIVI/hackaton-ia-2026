# Connector Càritas Tarragona — Hackathon IA 2026

> Plataforma d'atenció social assistida per IA que connecta persones vulnerables amb recursos, voluntaris i organitzacions de Càritas Diocesana de Tarragona.

🌐 **Demo en viu:** [hackaton-ia-2026.vercel.app](https://hackaton-ia-2026.vercel.app)  
⚙️ **API pública:** [each-kings-thinking-losses.trycloudflare.com](https://each-kings-thinking-losses.trycloudflare.com)  
🤖 **Model IA:** [huggingface.co/ELOIVI/caritas-urgency-classifier](https://huggingface.co/ELOIVI/caritas-urgency-classifier)

---

## Què és aquest projecte

Càritas Diocesana de Tarragona atén cada any més de 9.800 persones en situació de vulnerabilitat a través de 78 centres parroquials i 1.177 voluntaris. El repte era construir una eina que, donada la situació d'una persona, trobés automàticament els recursos, voluntaris i projectes més adequats.

La solució és un motor de matching híbrid en tres capes que combina regles deterministes, anàlisi contextual amb IA generativa i un classificador de machine learning propi, tot integrat en una interfície multirol accessible des del navegador.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                     │
│              Next.js 15 · React 19 · Tailwind            │
│                                                          │
│  Persona atesa  │  Voluntari  │  Empresa  │  Treballador │
│  Chatbot guiat  │  Dashboard  │ Dashboard │  Expedients  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (Cloudflare Tunnel)
┌────────────────────────▼────────────────────────────────┐
│                  BACKEND (EC2 · Flask)                   │
│                                                          │
│  Auth JWT  │  Rate Limiting  │  CORS configurable        │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              MOTOR HÍBRID IA (3 capes)          │    │
│  │                                                  │    │
│  │  1. Keyword Parser  →  Keywords deterministes   │    │
│  │  2. Gemini Analyst  →  Anàlisi contextual       │    │
│  │  3. Matcher         →  Cruça amb BBDDs locals   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  SQLite (expedients · usuaris · voluntaris · empreses)   │
└─────────────┬──────────────────────────┬────────────────┘
              │                          │
┌─────────────▼──────────┐  ┌────────────▼───────────────┐
│  Google Gemini 2.5     │  │  HuggingFace Space         │
│  Flash (Free Tier)     │  │  DistilBERT fine-tuned     │
│  · Conversa guiada     │  │  40.000 casos sintètics    │
│  · Anàlisi semàntica   │  │  89% accuracy              │
│  · Fallback automàtic  │  │  4 classes d'urgència      │
└────────────────────────┘  └────────────────────────────┘
```

---

## Motor Híbrid IA — Detall

El cor del projecte és el motor de matching en tres passes seqüencials:

### Pas 1 — Keyword Parser (determinista)
Extreu keywords socials de la fitxa estructurada: habitatge, situació laboral, ingressos, ciutadania, menors a càrrec, addiccions, maltractament, discapacitat. És ràpid, transparent i funciona sempre sense dependre de cap API externa.

### Pas 2 — Gemini Analyst (IA generativa)
Envia la fitxa, les keywords i el catàleg de projectes reals de Càritas a Gemini. Rep un JSON estructurat amb urgència, necessitats prioritàries, projectes recomanats i justificació. Si Gemini no està disponible (quota esgotada, timeout), el sistema continua amb un fallback determinista basat en les keywords.

### Pas 3 — Matcher (cruça amb BBDDs)
Creua les necessitats detectades amb les bases de dades locals:
- Centre per municipi exacte o distància haversine
- Recursos per keyword overlap + bonus dels tipus recomanats per Gemini
- Voluntaris per habilitats, disponibilitat, distància i capacitat màxima
- Regla especial: casos de violència de gènere assignen exclusivament voluntàries dones
- Organitzacions i empreses per keyword overlap

### Classificador d'urgència (model propi)
Model DistilBERT multilingüe fine-tuned sobre 40.000 casos sintètics balancejats generats a partir dels patrons reals de Càritas. Classifica text lliure en quatre nivells: baixa, mitjana, alta, crítica. 89% d'accuracy en test.

---

## Stack tecnològic

| Component | Tecnologia |
|---|---|
| Backend | Flask, SQLite, Pandas, boto3 |
| Frontend | Next.js 15, React 19, Tailwind, Recharts, Leaflet |
| IA generativa | Google Gemini 2.5 Flash |
| ML propi | DistilBERT multilingüe (HuggingFace) |
| Auth | JWT (itsdangerous), bcrypt |
| Deploy backend | AWS EC2 t3.micro + Nginx + Cloudflare Tunnel |
| Deploy frontend | Vercel |
| Dades | SQLite + catàlegs JSON + S3 mirror opcional |

---

## Fluxos per rol

**Persona atesa** — Chatbot guiat per Gemini que fa preguntes adaptades a cada situació fins tenir prou context per fer el matching. No requereix login. Retorna recursos, centre més proper i urgència classificada.

**Voluntari** — Login o registre. Chatbot que recull disponibilitat, habilitats i motivació. Assigna el projecte més compatible. Dashboard amb casos actius, hores contribuïdes i projectes ordenats per compatibilitat.

**Empresa** — Login corporatiu. Dashboard amb impacte real: persones beneficiades, distribució de recursos, evolució mensual.

**Treballador** — Login restringit. Accés a tots els expedients ordenats per urgència. Formulari de nova fitxa social que passa pel motor de matching automàticament.

---

## Endpoints API

```
GET  /health                          — Estat del servidor
POST /auth/register                   — Registre d'usuari
POST /auth/login                      — Login (retorna JWT)
GET  /auth/me                         — Usuari autenticat

POST /match                           — Matching amb fitxa estructurada
POST /match/text                      — Matching amb text lliure
POST /urgency                         — Classificació d'urgència (HuggingFace)

POST /chat/persona                    — Chatbot persona atesa (públic)
POST /chat/voluntari                  — Chatbot voluntari (requereix token)

GET  /expedients                      — Llista expedients (treballador)
POST /expedient                       — Crear expedient amb matching IA
GET  /expedient/<id>                  — Detall d'expedient
PATCH /expedient/<id>/close           — Tancar expedient

GET  /dashboard/voluntari/<id>        — Dashboard voluntari
GET  /dashboard/empresa/<id>          — Dashboard empresa
GET  /dashboard/analytics             — Analítiques agregades
```

---

## Decisions tècniques rellevants

**SQLite en lloc de PostgreSQL** — Per a un hackathon amb un sol servidor, SQLite és suficient, zero configuració i amb WAL mode aguanta desenes de connexions concurrents. La migració a PostgreSQL seria trivial.

**Fallback determinista per a Gemini** — La free tier de Gemini té 5 RPM i 20 RPD. Quan s'esgota, el sistema continua funcionant amb el keyword parser sol. L'usuari rep una resposta menys rica però sempre rep una resposta.

**Model propi vs Gemini per a urgència** — Gemini és excel·lent per a conversa però impredictible per a classificació repetible. El model DistilBERT propi és determinista, auditables i funciona sense quota. El jurat pot veure exactament com es pren la decisió.

**Catàlegs en RAM** — Els 60 centres, 260 recursos, 180 organitzacions i 140 projectes es carreguen a memòria a l'arrencada. Cada request de matching és O(n) sobre dades locals sense cap query a base de dades.

**JWT en lloc de sessions** — L'arquitectura és stateless, el que facilita el deploy i l'escalat horitzontal futur.

---

## Seguretat implementada

- AUTH_SECRET_KEY obligatòria (fail-fast si falta)
- ADMIN_SHARED_PASSWORD obligatòria
- Bearer token parsing estricte amb regex
- Rate limiting per endpoint (20 req/min chat, 10 req/min auth)
- CORS configurable per entorn (CORS_ALLOW_ALL=0 en producció)
- Input validation: text màx 2000 chars, fitxa fields màx 500 chars, HTTP 413 si excedit
- Prompt injection hardening: longitud acotada i neutralització de tags HTML
- Gemini circuit breaker: 5 RPM / 20 RPD tracking local
- Errors sanititzats: cap stack trace arriba al client
- PII en logs: fitxes socials no es registren mai als logs

---

## Instal·lació local

### Backend
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt

# Crea backend/.env amb:
# AUTH_SECRET_KEY=clau_llarga_unica
# ADMIN_SHARED_PASSWORD=Admin1234!
# GOOGLE_API_KEY=la_teva_key
# HF_APP_ENDPOINT=https://eloivi-caritas-urgency-api.hf.space
# GEMINI_MODEL=gemini-2.5-flash

python app.py
```

### Frontend
```bash
cd frontend
npm install
# Crea frontend/.env.local amb:
# NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev
```

### Generar dades de demo
```bash
cd backend
python db/generate_massive_db_data.py --expedients 500 --voluntaris 100 --empreses 50
```

---

## Credencials demo

| Rol | Email | Password |
|---|---|---|
| Treballador | AdminTreballador@caritas.org | Admin1234! |
| Voluntari | AdminVoluntari@caritas.org | Admin1234! |
| Empresa | AdminEmpresa@caritas.org | Admin1234! |

---

## Limitacions conegudes

El circuit breaker de Gemini és per procés. Si es despleguen múltiples workers Flask, el comptador no es comparteix entre ells. Per a producció real caldria un comptador en Redis. Per a la demo amb un sol worker no és un problema.

El Cloudflare Tunnel gratuït (`trycloudflare.com`) canvia la URL en cada reinici. Per a producció caldria un túnel named amb compte Cloudflare o un domini propi.

SQLite no aguanta centenars d'escriptures concurrents. Per a escala real, la migració a PostgreSQL és directa ja que tots els accessos van per `expedient_store.py`.

---

## Equip

Hackathon IA 2026 — URV × T-Systems  
Càritas Diocesana de Tarragona