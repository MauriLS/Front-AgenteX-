#!/usr/bin/env node
// Falla el build/CI si `npm audit` reporta vulnerabilidades high o critical
// que no estén en la lista de riesgos aceptados de ALLOWED_ADVISORIES.
//
// Riesgos aceptados documentados (ver CONTEXTO_TESTING_AGENTEX.md, Capa 5):
// - GHSA-g7r4-m6w7-qqqr (esbuild, low): arbitrary file read en el dev server
//   de Vite en Windows. Sin fix disponible — esbuild está fijado por la
//   versión exacta de Vite instalada. No afecta el build de producción
//   (esbuild solo corre en dev/build time, nunca en el bundle servido).

import { execSync } from 'node:child_process';

const ALLOWED_ADVISORIES = new Set([
  'https://github.com/advisories/GHSA-g7r4-m6w7-qqqr',
]);

const FAIL_ON_SEVERITIES = new Set(['high', 'critical']);

let report;
try {
  const raw = execSync('npm audit --json', { encoding: 'utf-8' });
  report = JSON.parse(raw);
} catch (err) {
  // npm audit sale con código != 0 cuando ENCUENTRA vulnerabilidades —
  // igual necesitamos parsear su stdout, no tratarlo como fallo del script.
  if (err.stdout) {
    report = JSON.parse(err.stdout);
  } else {
    console.error('No se pudo ejecutar npm audit:', err.message);
    process.exit(1);
  }
}

const vulnerabilities = Object.values(report.vulnerabilities ?? {});
const blocking = [];

for (const vuln of vulnerabilities) {
  if (!FAIL_ON_SEVERITIES.has(vuln.severity)) continue;

  const advisoryUrls = (vuln.via ?? [])
    .filter((v) => typeof v === 'object' && v.url)
    .map((v) => v.url);

  const allAllowed = advisoryUrls.length > 0 && advisoryUrls.every((url) => ALLOWED_ADVISORIES.has(url));
  if (allAllowed) continue;

  blocking.push({ name: vuln.name, severity: vuln.severity, advisoryUrls });
}

const { low = 0, moderate = 0, high = 0, critical = 0, total = 0 } = report.metadata?.vulnerabilities ?? {};
console.log(`npm audit: ${total} vulnerabilidades (low: ${low}, moderate: ${moderate}, high: ${high}, critical: ${critical})`);

if (blocking.length > 0) {
  console.error('\nVulnerabilidades high/critical SIN excepción documentada:');
  for (const b of blocking) {
    console.error(`  - ${b.name} [${b.severity}] ${b.advisoryUrls.join(', ')}`);
  }
  console.error('\nResuelve con `npm audit fix` o documenta la excepción en ALLOWED_ADVISORIES (scripts/check-audit.js) con su justificación.');
  process.exit(1);
}

console.log('OK — sin vulnerabilidades high/critical sin excepción documentada.');