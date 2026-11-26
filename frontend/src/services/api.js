import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

export const ADMIN_TOKEN_KEY = 'evoting.auth.token'

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message

      if (typeof message === 'string') {
        error.message = message
      }
    }

    return Promise.reject(error)
  },
)

export default api

function unwrap(response) {
  const payload = response.data
  if (payload?.success === false) throw new Error(payload.message || 'Permintaan gagal.')
  return payload?.data ?? payload
}

export const electionApi = {
  async status() {
    try {
      return await api.get('/public/status').then(unwrap)
    } catch (error) {
      if (error.response?.status !== 404) throw error
      return { status: 'READY', school_name: null }
    }
  },
  async candidates() {
    const data = await api.get('/public/candidates').then(unwrap)
    return data?.candidates ?? []
  },
  schedule: () => api.get('/public/schedule').then(unwrap),
  turnout: () => api.get('/public/turnout').then(unwrap),
  results: () => api.get('/public/results').then(unwrap),
  checkDpt: (nisn, birthDate) => api.post('/public/check-dpt', { nisn, birth_date: birthDate }).then(unwrap),
  verifyVoter: (nisn, birthDate) => api.post('/voter/verify', { nisn, birth_date: birthDate }).then(unwrap),
  validateToken: (token) => api.post('/booth/validate-token', { token }).then(unwrap),
  castVote: (token, candidateId) => api.post('/booth/vote', { token, candidate_id: candidateId }).then(unwrap),
}

export const registrationApi = {
  config: () => api.get('/public/registration-config').then(unwrap),
  submit: (values) => api.post('/public/registrations', values).then(unwrap),
  check: (identifier) => api.get(`/public/registrations/${encodeURIComponent(identifier)}`).then(unwrap),
}

function candidateFormData(values) {
  const form = new FormData()
  for (const key of ['number', 'name', 'vision', 'mission', 'program']) {
    if (values[key] !== undefined && values[key] !== null) form.append(key, values[key])
  }
  if (values.photo) form.append('photo', values.photo)
  return form
}

export const adminApi = {
  login: (credentials) => api.post('/admin/login', credentials).then(unwrap),
  me: () => api.get('/admin/me').then(unwrap),
  logout: () => api.post('/admin/logout').then(unwrap),
  schoolStatus: () => api.get('/school/status').then(unwrap),
  registrations: () => api.get('/super/registrations').then(unwrap),
  progress: () => api.get('/super/progress').then(unwrap),
  toggleRegistration: (isOpen) => api.post('/super/registration-toggle', { is_open: isOpen }).then(unwrap),
  approveRegistration: (id) => api.post(`/super/registrations/${id}/approve`).then(unwrap),
  reissueCredentials: (id) => api.post(`/super/registrations/${id}/credentials`).then(unwrap),
  cleanup: (confirmationCode) => api.post('/super/cleanup', { confirmation_code: confirmationCode }).then(unwrap),
  voters: (params = {}) => api.get('/school/voters', { params }).then(unwrap),
  importVoters: (file) => {
    const form = new FormData()
    form.append('csv_file', file)
    return api.post('/school/voters/import', form).then(unwrap)
  },
  lockVoters: () => api.post('/school/voters/lock').then(unwrap),
  candidates: () => api.get('/school/candidates/manage').then(unwrap),
  createCandidate: (values) => api.post('/school/candidates', candidateFormData(values)).then(unwrap),
  updateCandidate: (id, values) => api.post(`/school/candidates/${id}`, candidateFormData(values)).then(unwrap),
  deleteCandidate: (id) => api.delete(`/school/candidates/${id}`).then(unwrap),
  lockCandidates: () => api.post('/school/candidates/lock').then(unwrap),
  schedule: () => api.get('/school/schedule').then(unwrap),
  saveSchedule: (values) => api.put('/school/schedule', values).then(unwrap),
  updateStatus: (status) => api.post('/school/status', { status }).then(unwrap),
  publishResults: () => api.post('/school/status/publish').then(unwrap),
  results: () => api.get('/school/results').then(unwrap),
  downloadReport: (format) => api.get(`/school/reports/export-${format}`, { responseType: 'blob' }),
}

export function normalizeCandidate(candidate) {
  const [chair = candidate.name || 'Kandidat', viceChair = ''] = String(candidate.name || '').split(/\s*&\s*|\s+dan\s+/i)
  const list = (value) => Array.isArray(value) ? value : String(value || '').split(/\r?\n/).map((item) => item.replace(/^[-•\d.)\s]+/, '').trim()).filter(Boolean)
  return {
    ...candidate,
    id: Number(candidate.id),
    number: Number(candidate.number),
    hue: Number(candidate.hue ?? (Number(candidate.number || 1) * 67) % 360),
    chair,
    viceChair,
    chairClass: candidate.chair_class || '',
    viceClass: candidate.vice_class || '',
    missions: list(candidate.mission),
    programs: list(candidate.program),
    vision: candidate.vision || 'Belum ada visi yang dipublikasikan.',
    photo_url: candidate.photo_url || null,
    votes: Number(candidate.votes) || 0,
  }
}
