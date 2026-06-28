import axios from 'axios'

export const TOKEN_KEY = 'cubevision_jwt'
export const USER_KEY = 'cubevision_user'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 120000 })

api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  e => {
    const err = new Error(e.response?.data?.error || e.response?.data?.message || e.message || 'Unexpected error')
    err.status = e.response?.status
    err.data = e.response?.data
    return Promise.reject(err)
  }
)

export function saveSession({ token, user }) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') } catch { return null }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export async function registerUser(payload) {
  const { data } = await api.post('/auth/register', payload)
  saveSession(data)
  return data
}

export async function loginUser(payload) {
  const { data } = await api.post('/auth/login', payload)
  saveSession(data)
  return data
}

export async function getMe() {
  const { data } = await api.get('/auth/me')
  if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  return data
}

export async function logoutUser() {
  try { await api.post('/auth/logout') } finally { clearSession() }
}

export async function uploadCubeImages(faceFiles) {
  const form = new FormData()
  Object.entries(faceFiles).forEach(([face, file]) => form.append(`face_${face}`, file))
  const { data } = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data
}

export async function solveCube(cubeState, source='unknown') {
  const { data } = await api.post('/solve', { cube_state: cubeState, source })
  return data
}

export async function validateCube(cubeState) {
  const { data } = await api.post('/solve/validate', { cube_state: cubeState })
  return data
}

export async function getHistory({ page=1, perPage=20, search='', minMoves, maxMoves }={}) {
  const params = { page, per_page: perPage }
  if (search) params.search = search
  if (minMoves != null) params.min_moves = minMoves
  if (maxMoves != null) params.max_moves = maxMoves
  const { data } = await api.get('/history', { params })
  return data
}

export async function deleteRecord(id) {
  const { data } = await api.delete(`/history/${id}`)
  return data
}

export async function getStats() {
  const { data } = await api.get('/stats')
  return data
}
