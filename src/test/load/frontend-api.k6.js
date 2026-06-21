// Carga (k6) — exploración de concurrencia en los endpoints del frontend
//
// A diferencia de un único stage de carga, este script explora varios
// niveles de concurrencia como escenarios independientes y secuenciales:
//
//   1. 10 usuarios concurrentes  · 1 minuto
//   2. 50 usuarios concurrentes  · 1 minuto
//   3. 100 usuarios concurrentes · 1 minuto
//   4. Estrés: rampa hasta 200 usuarios — se ABORTA automáticamente apenas
//      la tasa de error de ESE escenario supera 5% sostenido 5s (eso es,
//      en la práctica, "correr hasta que aparezcan errores")
//
// Cada iteración simula un usuario real: login (Auth) → Dashboard →
// Historial → Settings. El endpoint /api/chat/message se excluye a
// propósito: cada llamada de chat dispara una consulta REAL y PAGADA al
// LLM (DeepSeek) vía el microservicio de IA, sin importar si el backend
// corre en local o en producción. Medir su rendimiento bajo carga con un
// ramp de cientos de VUs implicaría un gasto de IA no controlado. Si se
// necesita medir latencia de chat, hacerlo aparte con un puñado de
// llamadas puntuales (ver README.md de esta carpeta).

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';
const EMAIL    = __ENV.K6_EMAIL    || 'admin@agentex.test';
const PASSWORD = __ENV.K6_PASSWORD || '123456';

export const options = {
  scenarios: {
    escenario_10: {
      executor: 'constant-vus',
      exec:     'flujoUsuario',
      vus:      10,
      duration: '1m',
      startTime: '0s',
    },
    escenario_50: {
      executor: 'constant-vus',
      exec:     'flujoUsuario',
      vus:      50,
      duration: '1m',
      startTime: '1m10s',
    },
    escenario_100: {
      executor: 'constant-vus',
      exec:     'flujoUsuario',
      vus:      100,
      duration: '1m',
      startTime: '2m20s',
    },
    escenario_estres: {
      executor: 'ramping-vus',
      exec:     'flujoUsuario',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50  },
        { duration: '30s', target: 100 },
        { duration: '30s', target: 150 },
        { duration: '30s', target: 200 },
        { duration: '2m',  target: 200 },
      ],
      startTime: '3m30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],

    // Por sección — GET simples, sin LLM de por medio
    'http_req_duration{group:::Auth}':      ['p(95)<300'],
    'http_req_duration{group:::Dashboard}': ['p(95)<300'],
    'http_req_duration{group:::Historial}': ['p(95)<300'],
    'http_req_duration{group:::Settings}':  ['p(95)<300'],

    // Estrés: corta la corrida apenas el escenario "escenario_estres" cruza
    // 5% de error sostenido 5s. Esto define dónde está el punto de quiebre
    // sin tener que esperar a que termine la rampa completa hasta 200 VUs.
    'http_req_failed{scenario:escenario_estres}': [
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '5s' },
    ],
  },
};

export function flujoUsuario() {
  let token = null;

  group('Auth', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: EMAIL, password: PASSWORD }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    check(res, { 'POST /api/auth/login → 200': (r) => r.status === 200 });
    token = res.status === 200 ? res.json('token') : null;
  });

  // Sin token no tiene sentido seguir — el login es justamente lo que se
  // está midiendo en este escenario; un fallo aquí ya quedó registrado arriba.
  if (!token) {
    sleep(1);
    return;
  }

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  group('Dashboard', () => {
    const stats  = http.get(`${BASE_URL}/api/sessions/stats`,   { headers });
    const agents = http.get(`${BASE_URL}/api/agents/my-agents`, { headers });
    const me     = http.get(`${BASE_URL}/api/users/me`,         { headers });

    check(stats,  { 'GET /api/sessions/stats → 200':  (r) => r.status === 200 });
    check(agents, { 'GET /api/agents/my-agents → 200': (r) => r.status === 200 });
    check(me,     { 'GET /api/users/me → 200':         (r) => r.status === 200 });
  });

  group('Historial', () => {
    const list = http.get(`${BASE_URL}/api/sessions`, { headers });
    check(list, { 'GET /api/sessions → 200': (r) => r.status === 200 });

    const sessions  = list.status === 200 ? (list.json('sessions') || []) : [];
    const sessionId = sessions[0]?.id;
    if (sessionId) {
      const detail = http.get(`${BASE_URL}/api/sessions/${sessionId}/messages`, { headers });
      check(detail, { 'GET /api/sessions/:id/messages → 200': (r) => r.status === 200 });
    }
  });

  group('Settings', () => {
    const profile   = http.get(`${BASE_URL}/api/users/me`,          { headers });
    const company   = http.get(`${BASE_URL}/api/company`,           { headers });
    const agentsCfg = http.get(`${BASE_URL}/api/agents`,            { headers });
    const templates = http.get(`${BASE_URL}/api/agents/templates`,  { headers });

    check(profile,   { 'GET /api/users/me (settings) → 200': (r) => r.status === 200 });
    check(company,   { 'GET /api/company → 200':             (r) => r.status === 200 });
    check(agentsCfg, { 'GET /api/agents → 200':               (r) => r.status === 200 });
    check(templates, { 'GET /api/agents/templates → 200':     (r) => r.status === 200 });
  });

  sleep(1);
}