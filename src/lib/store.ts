'use client'

import { create } from 'zustand'
import type { EstimateResult, MaterialPriceRow, LaborRateRow, ProjectData, RoomData } from '@/lib/calc/types'
import { computeEstimate } from '@/lib/calc/engine'
import type { ProjectOptions } from '@/lib/calc/types'

export type ProjectWithRooms = ProjectData & { rooms: RoomData[] }

interface AppState {
  loading: boolean
  loaded: boolean
  projects: ProjectWithRooms[]
  currentId: string | null
  project: ProjectData | null
  rooms: RoomData[]
  materials: MaterialPriceRow[]
  labor: LaborRateRow[]
  rates: Record<string, number>
  currency: string // moneda de afișare

  loadAll: () => Promise<void>
  selectProject: (id: string | null) => void
  setCurrency: (c: string) => void

  createProject: (data: Partial<ProjectData> & { name: string; withSampleRooms?: boolean }) => Promise<ProjectData | null>
  saveProject: (patch: Partial<ProjectData>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  duplicateProject: (id: string) => Promise<void>

  addRoom: (room: Partial<RoomData>) => Promise<void>
  updateRoom: (id: string, patch: Partial<RoomData>) => Promise<void>
  deleteRoom: (id: string) => Promise<void>

  updateMaterial: (id: string, patch: Partial<MaterialPriceRow>) => Promise<void>
  addMaterial: (data: Partial<MaterialPriceRow>) => Promise<void>
  deleteMaterial: (id: string) => Promise<void>

  updateLabor: (id: string, patch: Partial<LaborRateRow>) => Promise<void>

  saveRates: (rates: Record<string, number>) => Promise<void>
}

async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error(`API ${url} → ${res.status}`)
      return null
    }
    return (await res.json()) as T
  } catch (e) {
    console.error(`API ${url} failed`, e)
    return null
  }
}

const refreshProjects = async (set: (p: Partial<AppState>) => void, get: () => AppState) => {
  const projects = (await api<ProjectWithRooms[]>('/api/projects')) ?? []
  const cur = get().currentId
  const currentId = cur && projects.some((p) => p.id === cur) ? cur : (projects[0]?.id ?? null)
  const current = projects.find((p) => p.id === currentId) ?? null
  const { rooms: _r, ...project } = current ?? ({} as ProjectWithRooms)
  set({ projects, currentId, project: current ? (project as ProjectData) : null, rooms: current?.rooms ?? [] })
}

export const useApp = create<AppState>((set, get) => ({
  loading: true,
  loaded: false,
  projects: [],
  currentId: null,
  project: null,
  rooms: [],
  materials: [],
  labor: [],
  rates: { MDL: 1, EUR: 19.6, USD: 17.6, RON: 4.42 },
  currency: 'MDL',

  loadAll: async () => {
    set({ loading: true })
    const [projects, materials, labor, settings] = await Promise.all([
      api<ProjectWithRooms[]>('/api/projects'),
      api<MaterialPriceRow[]>('/api/materials'),
      api<LaborRateRow[]>('/api/labor'),
      api<{ currency_rates: Record<string, number> }>('/api/settings'),
    ])
    const currentId = projects?.[0]?.id ?? null
    const current = projects?.find((p) => p.id === currentId) ?? null
    const { rooms: _r, ...project } = current ?? ({} as ProjectWithRooms)
    set({
      loading: false,
      loaded: true,
      projects: projects ?? [],
      materials: materials ?? [],
      labor: labor ?? [],
      rates: settings?.currency_rates ?? { MDL: 1, EUR: 19.6, USD: 17.6, RON: 4.42 },
      currency: current?.currency ?? 'MDL',
      currentId,
      project: current ? (project as ProjectData) : null,
      rooms: current?.rooms ?? [],
    })
  },

  selectProject: (id) => {
    const { projects } = get()
    const p = projects.find((x) => x.id === id)
    if (!p) {
      set({ currentId: null, project: null, rooms: [] })
      return
    }
    const { rooms, ...project } = p
    set({ currentId: id, project: project as ProjectData, rooms, currency: p.currency })
  },

  setCurrency: (c) => set({ currency: c }),

  createProject: async (data) => {
    const created = await api<ProjectWithRooms>('/api/projects', { method: 'POST', body: JSON.stringify(data) })
    if (!created) return null
    await refreshProjects(set, get)
    get().selectProject(created.id)
    return created
  },

  saveProject: async (patch) => {
    const { currentId, projects, rooms } = get()
    if (!currentId) return
    // optimistic
    set((s) => ({ project: s.project ? { ...s.project, ...patch } : s.project }))
    await api(`/api/projects/${currentId}`, { method: 'PATCH', body: JSON.stringify(patch) })
    const updated = await api<ProjectWithRooms>(`/api/projects/${currentId}`)
    if (updated) {
      const { rooms: r, ...project } = updated
      set({
        project: project as ProjectData,
        rooms: r,
        projects: projects.map((p) => (p.id === currentId ? updated : p)),
      })
    } else {
      // restore
      set((s) => ({ project: s.project }))
      void rooms
    }
  },

  deleteProject: async (id) => {
    await api(`/api/projects/${id}`, { method: 'DELETE' })
    const rest = get().projects.filter((p) => p.id !== id)
    set({ projects: rest })
    get().selectProject(rest[0]?.id ?? null)
  },

  duplicateProject: async (id) => {
    const copy = await api<ProjectData>(`/api/projects/${id}/duplicate`, { method: 'POST' })
    if (!copy) return
    await refreshProjects(set, get)
    get().selectProject(copy.id)
  },

  addRoom: async (room) => {
    const { currentId } = get()
    if (!currentId) return
    const created = await api<RoomData>(`/api/projects/${currentId}/rooms`, { method: 'POST', body: JSON.stringify(room) })
    if (created) set((s) => ({ rooms: [...s.rooms, created] }))
  },

  updateRoom: async (id, patch) => {
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
    const updated = await api<RoomData>(`/api/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
    if (updated) set((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? updated : r)) }))
  },

  deleteRoom: async (id) => {
    set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) }))
    await api(`/api/rooms/${id}`, { method: 'DELETE' })
  },

  updateMaterial: async (id, patch) => {
    set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)) }))
    const updated = await api<MaterialPriceRow>(`/api/materials/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
    if (updated) set((s) => ({ materials: s.materials.map((m) => (m.id === id ? updated : m)) }))
  },

  addMaterial: async (data) => {
    const created = await api<MaterialPriceRow>('/api/materials', { method: 'POST', body: JSON.stringify(data) })
    if (created) set((s) => ({ materials: [...s.materials, created] }))
  },

  deleteMaterial: async (id) => {
    set((s) => ({ materials: s.materials.filter((m) => m.id !== id) }))
    await api(`/api/materials/${id}`, { method: 'DELETE' })
  },

  updateLabor: async (id, patch) => {
    set((s) => ({ labor: s.labor.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
    const updated = await api<LaborRateRow>(`/api/labor/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
    if (updated) set((s) => ({ labor: s.labor.map((l) => (l.id === id ? updated : l)) }))
  },

  saveRates: async (rates) => {
    set({ rates })
    await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ currency_rates: rates }) })
  },
}))

/** Deviz calculat din starea curentă (memoizat prin apelant). */
export function computeCurrentEstimate(state: Pick<AppState, 'project' | 'rooms' | 'materials' | 'labor'>): EstimateResult | null {
  if (!state.project) return null
  return computeEstimate({
    project: state.project,
    rooms: state.rooms,
    materials: state.materials,
    labor: state.labor,
  })
}

export function defaultOptions(): ProjectOptions {
  return { extDoors: 1, floorHeating: true, boiler: false, transport: 6000, utilaj: 8000, deseuri: 4500, imprevizitePct: 0, reservePct: 3 }
}
