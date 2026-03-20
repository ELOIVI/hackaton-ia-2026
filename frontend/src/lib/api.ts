// Punt central de connexió amb el backend de Connector Càritas.
// Totes les crides a l'API passen per aquí per facilitar
// el canvi d'URL entre desenvolupament i producció.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://54.163.22.58:5000';

export async function matchText(text: string) {
  const res = await fetch(`${API_BASE}/match/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Error connectant amb el servidor');
  return res.json();
}

export async function matchFitxa(fitxa: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fitxa),
  });
  if (!res.ok) throw new Error('Error connectant amb el servidor');
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
