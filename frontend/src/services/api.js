import axios from 'axios'

export const TOKEN_KEY = 'cubevision_jwt'
export const USER_KEY = 'cubevision_user'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 120000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Unexpected error'

    const err = new Error(message)
    err.status = error.response?.status
    err.data = error.response?.data
    return Promise.reject(err)
  }
)

export function saveSession({ token, user }) {
  if (!token || !user) {
    clearSession()
    throw new Error('Invalid login response from server')
  }

  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export async function registerUser(payload) {
  const { data } = await api.post('/auth/register', payload)

  if (!data?.success || !data?.token || !data?.user) {
    clearSession()
    throw new Error(data?.message || 'Registration failed')
  }

  saveSession(data)
  return data
}

export async function loginUser(payload) {
  const { data } = await api.post('/auth/login', payload)

  if (!data?.success || !data?.token || !data?.user) {
    clearSession()
    throw new Error(data?.message || 'Invalid email or password')
  }

  saveSession(data)
  return data
}

export async function getMe() {
  const { data } = await api.get('/auth/me')

  if (!data?.success || !data?.user) {
    clearSession()
    throw new Error('Session expired. Please login again.')
  }

  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  return data
}

export async function logoutUser() {
  try {
    await api.post('/auth/logout')
  } finally {
    clearSession()
  }
}

export async function uploadCubeImages(faceFiles) {
  const form = new FormData()
  Object.entries(faceFiles).forEach(([face, file]) => {
    form.append(`face_${face}`, file)
  })

  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data
}

export async function solveCube(cubeState, source = 'unknown') {
  const { data } = await api.post('/solve', {
    cube_state: cubeState,
    source,
  })

  return data
}

export async function validateCube(cubeState) {
  const { data } = await api.post('/solve/validate', {
    cube_state: cubeState,
  })

  return data
}

export async function getHistory({ page = 1, perPage = 20, search = '', minMoves, maxMoves } = {}) {
  const params = {
    page,
    per_page: perPage,
  }

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
