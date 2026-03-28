const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://arc-engine-z9p3.onrender.com'

async function request(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'API error')
  }
  return res.json()
}

// ── Teams ──────────────────────────────────────────────────────────────────
export const createTeam = (body: object, token: string) =>
  request('/teams', { method: 'POST', body: JSON.stringify(body) }, token)

export const getTeam = (teamId: string, token: string) =>
  request(`/teams/${teamId}`, {}, token)

export const getTeamDashboard = (teamId: string, token: string) =>
  request(`/teams/${teamId}/dashboard`, {}, token)

// ── Roster ─────────────────────────────────────────────────────────────────
export const invitePlayer = (teamId: string, body: object, token: string) =>
  request(`/teams/${teamId}/invite`, { method: 'POST', body: JSON.stringify(body) }, token)

// ── GPS Upload ─────────────────────────────────────────────────────────────
export const uploadGPS = async (teamId: string, files: { gps: File; wellness?: File; playerDetails?: File }, token: string) => {
  const form = new FormData()
  form.append('team_id', teamId)
  form.append('gps_file', files.gps)
  if (files.wellness) form.append('wellness_file', files.wellness)
  if (files.playerDetails) form.append('player_details_file', files.playerDetails)

  const res = await fetch(`${BASE}/upload/gps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Upload failed') }
  return res.json()
}

// ── Invite ─────────────────────────────────────────────────────────────────
export const getInviteInfo = (token: string) =>
  request(`/invite/${token}`)

export const acceptInvite = (inviteToken: string, authToken: string) =>
  request(`/invite/${inviteToken}/accept`, { method: 'POST' }, authToken)

// ── Player ─────────────────────────────────────────────────────────────────
export const getMyReport = (token: string) =>
  request('/me/report', {}, token)

export const getMyTrend = (token: string, days = 30) =>
  request(`/me/trend?days=${days}`, {}, token)

export const getMyPlan = (token: string) =>
  request('/me/plan', {}, token)

export const getMyProfile = (token: string) =>
  request('/me', {}, token)

export const checkSurveyToday = (token: string) =>
  request('/survey/today', {}, token)

export const submitSurvey = (body: object, token: string) =>
  request('/survey', { method: 'POST', body: JSON.stringify(body) }, token)

export const getMyConfirmations = (token: string) =>
  request('/me/confirmations', {}, token)

export const confirmGPS = (id: string, token: string) =>
  request(`/confirmations/${id}/confirm`, { method: 'POST' }, token)

export const rejectGPS = (id: string, token: string) =>
  request(`/confirmations/${id}/reject`, { method: 'POST' }, token)

export const respondToConfirmation = (id: string, confirmed: boolean, token: string) =>
  confirmed ? confirmGPS(id, token) : rejectGPS(id, token)

export const getTodaySurvey = (token: string) =>
  request('/survey/today', {}, token)

// ── Coach Player Detail ─────────────────────────────────────────────────────
export const getPlayerReport = (playerId: string, token: string) =>
  request(`/coach/player/${playerId}`, {}, token)

export const getTeamRoster = (teamId: string, token: string) =>
  request(`/teams/${teamId}/roster`, {}, token)

// ── Engine ─────────────────────────────────────────────────────────────────
export const runEngineForTeam = (teamId: string, token: string) =>
  request(`/engine/run/team/${teamId}`, { method: 'POST' }, token)

export const runEngineForPlayer = (playerId: string, token: string) =>
  request(`/engine/run/player/${playerId}`, { method: 'POST' }, token)
