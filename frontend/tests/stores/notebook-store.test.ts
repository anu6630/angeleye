import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useNotebookStore } from '@/stores/notebook-store'
import { apiClient } from '@/lib/api-client'

// Mock apiClient
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    createNotebook: vi.fn(),
    updateNotebook: vi.fn(),
    getNotebook: vi.fn(),
  },
}))

describe('notebook-store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useNotebookStore.getState().reset()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('has correct initial state', () => {
    const state = useNotebookStore.getState()
    expect(state.cells).toEqual([])
    expect(state.title).toBe('Untitled Notebook')
    expect(state.notebookId).toBeNull()
    expect(state.isSaving).toBe(false)
    expect(state.isPublished).toBe(false)
  })

  it('sets title', () => {
    const state = useNotebookStore.getState()
    state.setTitle('My Notebook')

    expect(useNotebookStore.getState().title).toBe('My Notebook')
  })

  it('sets notebook ID', () => {
    const state = useNotebookStore.getState()
    state.setNotebookId(123)

    expect(useNotebookStore.getState().notebookId).toBe(123)
  })

  it('sets published status', () => {
    const state = useNotebookStore.getState()
    state.setPublished(true)

    expect(useNotebookStore.getState().isPublished).toBe(true)
  })

  it('adds code cell by default', () => {
    const state = useNotebookStore.getState()
    state.addCell()

    const newState = useNotebookStore.getState()
    expect(newState.cells).toHaveLength(1)
    expect(newState.cells[0].cell_type).toBe('code')
    expect(newState.cells[0].content).toBe('')
    expect(newState.cells[0].isRunning).toBe(false)
  })

  it('adds markdown cell', () => {
    const state = useNotebookStore.getState()
    state.addCell('markdown')

    const newState = useNotebookStore.getState()
    expect(newState.cells).toHaveLength(1)
    expect(newState.cells[0].cell_type).toBe('markdown')
  })

  it('updates cell code', () => {
    const state = useNotebookStore.getState()
    state.addCell()
    const cellId = useNotebookStore.getState().cells[0].id

    state.updateCellCode(cellId, 'print("hello")')

    const newState = useNotebookStore.getState()
    expect(newState.cells[0].content).toBe('print("hello")')
    expect(newState.cells[0].output).toBeUndefined()
    expect(newState.cells[0].error).toBeUndefined()
  })

  it('deletes cell', () => {
    const state = useNotebookStore.getState()
    state.addCell()
    state.addCell()
    const cellId = useNotebookStore.getState().cells[0].id

    state.deleteCell(cellId)

    const newState = useNotebookStore.getState()
    expect(newState.cells).toHaveLength(1)
  })

  it('saves new notebook', async () => {
    const mockResponse = { id: 123, title: 'Test Notebook' }
    vi.mocked(apiClient.createNotebook).mockResolvedValue(mockResponse)

    const state = useNotebookStore.getState()
    state.setTitle('Test Notebook')
    await state.saveNotebook()

    const newState = useNotebookStore.getState()
    expect(newState.notebookId).toBe(123)
    expect(newState.isSaving).toBe(false)
    expect(apiClient.createNotebook).toHaveBeenCalledWith({
      title: 'Test Notebook',
      cells: [],
    })
  })

  it('saves existing notebook', async () => {
    const mockResponse = { id: 123, title: 'Updated Notebook' }
    vi.mocked(apiClient.updateNotebook).mockResolvedValue(mockResponse)

    const state = useNotebookStore.getState()
    state.setNotebookId(123)
    state.setTitle('Updated Notebook')
    await state.saveNotebook()

    expect(apiClient.updateNotebook).toHaveBeenCalledWith(123, { title: 'Updated Notebook' })
  })

  it('publishes notebook', async () => {
    vi.mocked(apiClient.updateNotebook).mockResolvedValue({ id: 123 })

    const state = useNotebookStore.getState()
    state.setNotebookId(123)
    await state.publishNotebook()

    const newState = useNotebookStore.getState()
    expect(newState.isPublished).toBe(true)
    expect(apiClient.updateNotebook).toHaveBeenCalledWith(123, { is_published: true })
  })

  it('loads notebook', async () => {
    const mockNotebook = {
      id: 123,
      title: 'Loaded Notebook',
      is_published: true,
      cells: [
        { cell_type: 'code', content: 'print("test")', order_index: 0 },
        { cell_type: 'markdown', content: '# Test', order_index: 1 },
      ],
    }
    vi.mocked(apiClient.getNotebook).mockResolvedValue(mockNotebook)

    const state = useNotebookStore.getState()
    await state.loadNotebook(123)

    const newState = useNotebookStore.getState()
    expect(newState.notebookId).toBe(123)
    expect(newState.title).toBe('Loaded Notebook')
    expect(newState.isPublished).toBe(true)
    expect(newState.cells).toHaveLength(2)
    expect(newState.cells[0].cell_type).toBe('code')
    expect(newState.cells[1].cell_type).toBe('markdown')
  })

  it('resets state', () => {
    const state = useNotebookStore.getState()
    state.setTitle('Custom Title')
    state.setNotebookId(123)
    state.setPublished(true)
    state.addCell()

    state.reset()

    const newState = useNotebookStore.getState()
    expect(newState.cells).toEqual([])
    expect(newState.title).toBe('Untitled Notebook')
    expect(newState.notebookId).toBeNull()
    expect(newState.isSaving).toBe(false)
    expect(newState.isPublished).toBe(false)
  })
})
