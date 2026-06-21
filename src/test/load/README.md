# Test de carga (k6) — frontend-api.k6.js

Explora la concurrencia real que soportan los endpoints del backend
Node/Express que consume el frontend (no archivos estáticos de Vite),
simulando un usuario típico: **login → Dashboard → Historial → Settings**.

A diferencia de un único ramp, el script define **4 escenarios secuenciales**
de concurrencia creciente:

1. **10 usuarios concurrentes** · 1 minuto
2. **50 usuarios concurrentes** · 1 minuto
3. **100 usuarios concurrentes** · 1 minuto
4. **Estrés**: rampa hasta 200 usuarios — se **aborta automáticamente** si la
   tasa de error de este escenario supera 5% sostenido 5s (en la práctica,
   "corre hasta que aparezcan errores")

El endpoint `/api/chat/message` se **excluye a propósito**: cada llamada de
chat dispara una consulta real y pagada al LLM (DeepSeek) vía el
microservicio de IA, sin importar si el backend corre en local o en
producción. Medir su rendimiento con cientos de VUs implicaría un gasto de
IA no controlado. Si se necesita medir latencia de chat, hacerlo aparte con
un puñado de llamadas puntuales, no con este script.

## ⚠️ Requisito crítico: correr el backend con `NODE_ENV=development`

El backend tiene un rate-limiter global (`express-rate-limit`) de
**100 requests/minuto por IP** sobre TODAS las rutas `/api/*`
(`app.js` → `generalLimiter`, `app.use('/api', generalLimiter)`). Con
decenas de VUs concurrentes desde la misma IP (tu máquina), ese cupo se
agota en menos de un segundo y la inmensa mayoría de los requests recibe
`429 Demasiadas solicitudes` — **no es un fallo del backend, es el
rate-limiter haciendo su trabajo**, pero hace inútil medir la capacidad
real del servidor.

El limiter tiene `skip: (req) => process.env.NODE_ENV === 'development'`,
así que para medir la capacidad real del backend (sin el limiter de por
medio) hay que arrancarlo forzando esa variable:

```bash
# En el directorio del backend (ej. C:\Users\<usuario>\Documents\proyectos_Dev\backend-AgenteX)

# Bash / Git Bash:
NODE_ENV=development npm run dev

# PowerShell (¡"VAR=valor cmd" NO funciona en PowerShell, es sintaxis de Bash!):
$env:NODE_ENV='development'; npm run dev
```

Verificar que tomó efecto antes de correr el test:

```bash
curl -s -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agentex.test","password":"123456"}'
```

- Si la respuesta **NO** trae headers `RateLimit-*` → el limiter está
  desactivado, el test medirá la capacidad real del servidor. ✅
- Si la respuesta trae `RateLimit-Limit: 100`, `RateLimit-Policy: 100;w=60`,
  etc. → `NODE_ENV=development` no se aplicó (revisa la sintaxis del shell
  que usaste) y el test va a medir el techo del rate-limiter, no del backend.

## Requisitos

1. Backend corriendo en `http://localhost:3000` (o la URL que pases en
   `K6_BASE_URL`), **con `NODE_ENV=development`** (ver arriba).
2. Un usuario de prueba ya existente en la base de datos, con rol que tenga
   acceso a `/api/company`, `/api/agents`, `/api/admin/companies` si aplica
   (ADMIN). No se crea ningún usuario durante el test.
3. [k6](https://k6.io/docs/get-started/installation/) instalado (`k6 version`).

## Uso

```bash
# 1. Levantar el backend con el rate-limiter desactivado (ver sección de arriba)
# 2. Correr el test con las credenciales reales del usuario de prueba:
k6 run src/test/load/frontend-api.k6.js \
  --env K6_EMAIL=admin@agentex.test \
  --env K6_PASSWORD=123456

# O con el script de npm (usa los defaults del script: admin@agentex.test / 123456):
npm run test:load

# Apuntando a otra URL / usuario:
k6 run src/test/load/frontend-api.k6.js \
  --env K6_BASE_URL=http://localhost:3000 \
  --env K6_EMAIL=otro-admin@empresa.test \
  --env K6_PASSWORD=otra-clave
```

La corrida completa (los 4 escenarios) toma **~8 minutos**.

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `K6_BASE_URL` | `http://localhost:3000` | URL base del backend |
| `K6_EMAIL` | `admin@agentex.test` | Email del usuario de prueba (debe existir ya en la DB) |
| `K6_PASSWORD` | `123456` | Password del usuario de prueba |

## Thresholds

- **Global**: `p(95)<500ms`.
- **Auth / Dashboard / Historial / Settings**: `p(95)<300ms` — son lecturas
  directas sin LLM de por medio, deberían responder rápido.
- **Estrés**: aborta la corrida si `http_req_failed{scenario:escenario_estres}`
  supera 5% sostenido 5s — define el punto de quiebre sin esperar a que
  termine la rampa completa hasta 200 VUs.

## Resultado de referencia (corrida real, 2026-06-20)

Con `NODE_ENV=development` (sin rate-limiter), backend local, Supabase real:

- **9,771 flujos de usuario completos** · 97,720 requests · **99.99% de
  éxito** (solo 3 fallos de 97,720, picos puntuales de timeout)
- El escenario de estrés llegó a **200 VUs sin abortar** (0.00% de error,
  muy por debajo del umbral de aborto de 5%) → **el backend no se cae con
  alta concurrencia**
- Pero la **latencia degrada bajo carga** — todos los thresholds de p95
  fallaron: Auth p95=1.11s, Dashboard p95=1.05s, Historial p95=857ms,
  Settings p95=578ms (objetivo: <300ms en todos)
- **Conclusión**: la API es estable (no hay cascada de errores ni caídas
  hasta 200 usuarios concurrentes), pero el tiempo de respuesta se degrada
  significativamente por encima del SLA objetivo a partir de ~50-100
  usuarios concurrentes — es un hallazgo de **performance**, no de
  **estabilidad**.

## Nota sobre efectos secundarios

El test es de **solo lectura** sobre la base de datos (no crea, modifica ni
borra nada — login + GETs). Aun así, no correr contra una base de datos de
producción: cada login real queda registrado en los logs del backend.