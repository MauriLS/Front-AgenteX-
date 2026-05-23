// src/lib/apiFetch.js
//
// Wrapper sobre fetch que intercepta automáticamente respuestas 401.
// Cuando el JWT expira, el servidor devuelve 401 — este interceptor
// limpia el localStorage y redirige al login sin que el usuario vea
// un error genérico.
//
// Uso: igual que fetch, pero con el token inyectado automáticamente.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('token');

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    };

    const response = await fetch(`${API_URL}${path}`, config);

    // Token expirado o inválido — limpiar sesión y redirigir
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sesión expirada. Redirigiendo al login...');
    }

    return response;
}