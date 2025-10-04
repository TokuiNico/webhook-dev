import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { sourceService } from '../sourceService'
import type {
  SourceCreate,
  SourceResponse,
  SourceListResponse,
  SourceUpdate,
  SourceFilterParams,
  AuthType
} from '../../types/source'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('SourceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSources', () => {
    it('should fetch sources list without filters', async () => {
      const mockResponse: SourceListResponse = {
        items: [
          {
            id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            name: 'github',
            auth_type: 'signature',
            auth_config: { signature_header: 'X-Hub-Signature-256' },
            created_at: '2024-01-01T10:00:00Z'
          },
          {
            id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
            name: 'stripe',
            auth_type: 'signature',
            created_at: '2024-01-02T10:00:00Z'
          }
        ],
        total: 2,
        skip: 0,
        limit: 100
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await sourceService.getSources()

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/manage/sources/', {})
      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
    })

    it('should fetch sources list with filters', async () => {
      const filters: SourceFilterParams = {
        name: 'github',
        auth_type: 'signature',
        skip: 0,
        limit: 10
      }

      const mockResponse: SourceListResponse = {
        items: [],
        total: 0,
        skip: 0,
        limit: 10
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await sourceService.getSources(filters)

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/manage/sources/', {
        params: filters
      })
      expect(result.data).toEqual(mockResponse)
    })

    it('should handle API errors', async () => {
      const errorMessage = 'Network Error'
      mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage))

      const result = await sourceService.getSources()

      expect(result).toEqual({
        data: undefined,
        loading: false,
        error: { message: errorMessage }
      })
    })
  })

  describe('getSource', () => {
    it('should fetch single source by id', async () => {
      const sourceId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
      const mockResponse: SourceResponse = {
        id: sourceId,
        name: 'github',
        auth_type: 'signature',
        auth_config: { signature_header: 'X-Hub-Signature-256' },
        created_at: '2024-01-01T10:00:00Z'
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await sourceService.getSource(sourceId)

      expect(mockedAxios.get).toHaveBeenCalledWith(`/api/v1/manage/sources/${sourceId}`)
      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
    })

    it('should handle 404 error for non-existent source', async () => {
      const sourceId = 'non-existent-id'
      const errorResponse = {
        response: {
          status: 404,
          data: { detail: '來源不存在' }
        }
      }
      mockedAxios.get.mockRejectedValueOnce(errorResponse)

      const result = await sourceService.getSource(sourceId)

      expect(result.error).toEqual({
        message: '來源不存在',
        code: '404',
        field: undefined
      })
    })
  })

  describe('createSource', () => {
    it('should create new source', async () => {
      const sourceData: SourceCreate = {
        name: 'github',
        secret: 'test-secret',
        auth_type: 'signature',
        auth_config: { signature_header: 'X-Hub-Signature-256' }
      }

      const mockResponse: SourceResponse = {
        id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        name: 'github',
        auth_type: 'signature',
        auth_config: { signature_header: 'X-Hub-Signature-256' },
        created_at: '2024-01-01T10:00:00Z'
      }

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse })

      const result = await sourceService.createSource(sourceData)

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/manage/sources/', sourceData)
      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
    })

    it('should handle validation errors', async () => {
      const sourceData: SourceCreate = {
        name: '',
        secret: 'test-secret',
        auth_type: 'signature'
      }

      const errorResponse = {
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ['body', 'name'],
                msg: 'field required',
                type: 'value_error.missing'
              }
            ]
          }
        }
      }
      mockedAxios.post.mockRejectedValueOnce(errorResponse)
      mockedAxios.post.mockRejectedValueOnce(errorResponse)

      const result = await sourceService.createSource(sourceData)

      expect(result.error).toEqual({
        message: [
          {
            loc: ['body', 'name'],
            msg: 'field required',
            type: 'value_error.missing'
          }
        ],
        code: '422',
        field: undefined
      })
    })
  })

  describe('updateSource', () => {
    it('should update existing source', async () => {
      const sourceId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
      const updateData: SourceUpdate = {
        name: 'github-updated',
        secret: 'new-secret'
      }

      const mockResponse: SourceResponse = {
        id: sourceId,
        name: 'github-updated',
        auth_type: 'signature',
        auth_config: { signature_header: 'X-Hub-Signature-256' },
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-02T10:00:00Z'
      }

      mockedAxios.put.mockResolvedValueOnce({ data: mockResponse })

      const result = await sourceService.updateSource(sourceId, updateData)

      expect(mockedAxios.put).toHaveBeenCalledWith(`/api/v1/manage/sources/${sourceId}`, updateData)
      expect(result.data).toEqual(mockResponse)
    })

    it('should handle partial updates', async () => {
      const sourceId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
      const updateData: SourceUpdate = {
        secret: 'new-secret-only'
      }

      const mockResponse: SourceResponse = {
        id: sourceId,
        name: 'github',
        auth_type: 'signature',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-02T10:00:00Z'
      }

      mockedAxios.put.mockResolvedValueOnce({ data: mockResponse })

      const result = await sourceService.updateSource(sourceId, updateData)

      expect(mockedAxios.put).toHaveBeenCalledWith(`/api/v1/manage/sources/${sourceId}`, updateData)
      expect(result.data).toEqual(mockResponse)
    })
  })

  describe('deleteSource', () => {
    it('should delete source successfully', async () => {
      const sourceId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'

      mockedAxios.delete.mockResolvedValueOnce({ status: 204 })

      const result = await sourceService.deleteSource(sourceId)

      expect(mockedAxios.delete).toHaveBeenCalledWith(`/api/v1/manage/sources/${sourceId}`)
      expect(result).toEqual({
        data: undefined,
        loading: false,
        error: undefined
      })
    })

    it('should handle delete errors', async () => {
      const sourceId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
      const errorResponse = {
        response: {
          status: 409,
          data: { detail: '無法刪除有相關主題的來源' }
        }
      }
      mockedAxios.delete.mockRejectedValueOnce(errorResponse)

      const result = await sourceService.deleteSource(sourceId)

      expect(result.error).toEqual({
        message: '無法刪除有相關主題的來源',
        code: '409',
        field: undefined
      })
    })
  })

  describe('getSourceStats', () => {
    it('should fetch source statistics', async () => {
      const mockStats = [
        {
          source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
          webhook_count: 150,
          topic_count: 5,
          last_activity: '2024-01-01T10:00:00Z'
        },
        {
          source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
          webhook_count: 75,
          topic_count: 3
        }
      ]

      mockedAxios.get.mockResolvedValueOnce({ data: { source_statistics: mockStats } })

      const result = await sourceService.getSourceStats()

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/stats/sources')
      expect(result.data?.source_statistics).toEqual(mockStats)
    })
  })

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'))

      const result = await sourceService.getSources()

      expect(result.error?.message).toBe('Network Error')
    })

    it('should handle server errors', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: { detail: '內部服務器錯誤' }
        }
      }
      mockedAxios.get.mockRejectedValueOnce(errorResponse)

      const result = await sourceService.getSources()

      expect(result.error?.message).toBe('內部服務器錯誤')
      expect(result.error?.code).toBe('500')
    })

    it('should handle authentication errors', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: { detail: '認證失敗' }
        }
      }
      mockedAxios.get.mockRejectedValueOnce(errorResponse)

      const result = await sourceService.getSources()

      expect(result.error?.message).toBe('認證失敗')
      expect(result.error?.code).toBe('401')
    })
  })
})
