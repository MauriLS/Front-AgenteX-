// Helpers de mock de red para los tests E2E con Playwright.
// Interceptan cualquier llamada a /api/** sin depender del backend real.

export const ADMIN_USER = { id: 1, username: 'admin.demo', email: 'admin@agentex.test', role: 'ADMIN' };

export const AGENTS = [
  { instanceId: 1, templateId: 'bodega', name: 'Agente Bodega' },
  { instanceId: 2, templateId: 'ventas', name: 'Agente Ventas' },
];

export const STATS = [
  { agent_id: 'bodega', agent_name: 'Agente Bodega', total_sesiones: 4, total_preguntas: 12, total_tokens: 1500 },
  { agent_id: 'ventas', agent_name: 'Agente Ventas', total_sesiones: 2, total_preguntas: 5, total_tokens: 800 },
];

export const SESSIONS = [
  { id: 101, created_at: new Date().toISOString(), company_agents: { agent_template_id: 'bodega' } },
];

const json = (body) => ({ contentType: 'application/json', body: JSON.stringify(body) });

// Registra los handlers base que cualquier vista privada necesita al montar
// (sidebar, dashboard). Tests individuales pueden sobreescribir rutas puntuales
// llamando a page.route() de nuevo DESPUÉS de mockApi (la última definida gana).
export async function mockApi(page, { agents = AGENTS, stats = STATS, user = ADMIN_USER, sessions = SESSIONS } = {}) {
  await page.route('**/api/agents/my-agents', (route) =>
    route.fulfill(json({ success: true, agents }))
  );
  await page.route('**/api/sessions/stats', (route) =>
    route.fulfill(json({ success: true, stats }))
  );
  await page.route('**/api/users/me', (route) =>
    route.fulfill(json({ success: true, user }))
  );
  await page.route('**/api/sessions/*/messages', (route) =>
    route.fulfill(json({ success: true, messages: [] }))
  );
  await page.route('**/api/sessions', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill(json({ success: true, sessions }));
    }
    return route.fulfill(json({}));
  });
}

// Setea sesión ya autenticada en localStorage, evitando repetir el flujo de
// login en cada test que no lo necesita.
//
// OJO: no usar page.addInitScript aquí — se re-ejecuta en CADA navegación
// (incluida la redirección de window.location.href tras un logout o un 401),
// lo que re-inyectaría el token justo después de que la app lo borre.
// En su lugar, se navega una vez a un documento del mismo origen y se setea
// localStorage vía evaluate, que persiste pero no se reaplica solo.
export async function loginAsAdmin(page, { token = 'jwt-e2e-test', user = ADMIN_USER } = {}) {
  await page.goto('/login');
  await page.evaluate(([t, u]) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
  }, [token, user]);
}
