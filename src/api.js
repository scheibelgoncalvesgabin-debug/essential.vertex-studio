// Client API centralisé — pointe vers le backend Render
const BASE = import.meta.env.VITE_API_URL || ''

let _token = localStorage.getItem('vtx_token') || ''

export const getToken  = () => _token
export const setToken  = (t) => { _token = t; localStorage.setItem('vtx_token', t) }
export const clearAuth = () => {
  _token = ''
  localStorage.removeItem('vtx_token')
  localStorage.removeItem('vtx_user')
}

const headers = () => ({
  'Content-Type': 'application/json',
  ...(_token ? { Authorization: `Bearer ${_token}` } : {})
})

async function req(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
  return data
}

export const api = {
  login:    (email, password) => req('POST', '/api/auth/login', { email, password }),
  register: (username, email, password) => req('POST', '/api/auth/register', { username, email, password }),
  me:       () => req('GET', '/api/auth/me'),

  servers: {
    list:       () => req('GET', '/api/servers'),
    create:     (name) => req('POST', '/api/servers', { name }),
    update:     (uuid, data) => req('PATCH', `/api/servers/${uuid}`, data),
    delete:     (uuid) => req('DELETE', `/api/servers/${uuid}`),
    regenKey:   (uuid) => req('POST', `/api/servers/${uuid}/regen-key`),
    saveConfigs:(uuid, configs) => req('POST', `/api/servers/${uuid}/configs`, configs),
    createAfk:  (uuid, data) => req('POST', `/api/servers/${uuid}/afk-zones`, data),
    deleteAfk:  (uuid, zoneUuid) => req('DELETE', `/api/servers/${uuid}/afk-zones/${zoneUuid}`),
    createReward: (uuid, data) => req('POST', `/api/servers/${uuid}/rewards`, data),
    deleteReward: (uuid, rwUuid) => req('DELETE', `/api/servers/${uuid}/rewards/${rwUuid}`),
    createChannel:(uuid, data) => req('POST', `/api/servers/${uuid}/channels`, data),
    deleteChannel:(uuid, chUuid) => req('DELETE', `/api/servers/${uuid}/channels/${chUuid}`),
    createAiDoc:  (uuid, data) => req('POST', `/api/servers/${uuid}/ai-docs`, data),
    deleteAiDoc:  (uuid, docUuid) => req('DELETE', `/api/servers/${uuid}/ai-docs/${docUuid}`),
    // Members
    getMembers:   (uuid) => req('GET', `/api/servers/${uuid}/members`),
    addMember:    (uuid, email, role) => req('POST', `/api/servers/${uuid}/members`, { email, role }),
    removeMember: (uuid, memberId) => req('DELETE', `/api/servers/${uuid}/members/${memberId}`),
  },

  chatbot: (message, opts = {}) => req('POST', '/api/chatbot', { message, ...opts }),
}
