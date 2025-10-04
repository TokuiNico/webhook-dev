import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { topicService } from '../topicService'
import type {
  TopicCreate,
  TopicResponse,
  TopicListResponse,
  TopicUpdate,
  TopicFilterParams
} from '../../types/topic'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('TopicService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getTopics', () => {
    it('should fetch topics list without filters', async () => {
      const mockResponse: TopicListResponse = {
        items: [
          {
            id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            name: 'github.push',
            source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAQ',
            description: 'GitHub push events',
            ingest_url: 'http://localhost:8000/api/v1/ingest/01ARZ3NDEKTSV4RRFFQ69G5FAV',
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:00:00Z'
          }
        ],
        total: 1,
        skip: 0,
        limit: 100
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await topicService.getTopics()

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/manage/topics/', {})
      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
    })

    it('should fetch topics list with source filter', async () => {
      const filters: TopicFilterParams = {
        source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAQ',
        skip: 0,
        limit: 10
      }

      const mockResponse: TopicListResponse = {
        items: [],
        total: 0,
        skip: 0,
        limit: 10
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await topicService.getTopics(filters)

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/manage/topics/', {
        params: filters
      })
      expect(result.data).toEqual(mockResponse)
    })
  })

  describe('getTopic', () => {
    it('should fetch single topic by id', async () => {
      const topicId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
      const mockResponse: TopicResponse = {
        id: topicId,
        name: 'github.push',
        source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAQ',
        description: 'GitHub push events',
        ingest_url: 'http://localhost:8000/api/v1/ingest/01ARZ3NDEKTSV4RRFFQ69G5FAV',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await topicService.getTopic(topicId)

      expect(mockedAxios.get).toHaveBeenCalledWith(`/api/v1/manage/topics/${topicId}`)
      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
    })

    it('should handle 404 error for non-existent topic', async () => {
      const topicId = 'non-existent-id'
      const errorResponse = {
        response: {
          status: 404,
          data: { detail: '主題不存在' }
        }
      }
      mockedAxios.get.mockRejectedValueOnce(errorResponse)

      const result = await topicService.getTopic(topicId)

      expect(result.error).toEqual({
        message: '主題不存在',
        code: '404',
        field: undefined
      })
    })
  })

  describe('createTopic', () => {
    it('should create new topic', async () => {
      const topicData: TopicCreate = {
        name: 'github.push',
        source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAQ',
        description: 'GitHub push events'
      }

      const mockResponse: TopicResponse = {
        id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        name: 'github.push',
        source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAQ',
        description: 'GitHub push events',
        ingest_url: 'http://localhost:8000/api/v1/ingest/01ARZ3NDEKTSV4RRFFQ69G5FAV',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      }

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse })

      const result = await topicService.createTopic(topicData)

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/manage/topics/', topicData)
      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
    })

    it('should handle validation errors', async () => {
      const topicData: TopicCreate = {
        name: '',
        source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAQ'
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

      const result = await topicService.createTopic(topicData)

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

  describe('updateTopic', () => {
    it('should update existing topic', async () => {
      const topicId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
      const updateData: TopicUpdate = {
        name: 'github.pull_request',
        description: 'Updated description'
      }

      const mockResponse: TopicResponse = {
        id: topicId,
        name: 'github.pull_request',
        source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAQ',
        description: 'Updated description',
        ingest_url: 'http://localhost:8000/api/v1/ingest/01ARZ3NDEKTSV4RRFFQ69G5FAV',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-02T10:00:00Z'
      }

      mockedAxios.put.mockResolvedValueOnce({ data: mockResponse })

      const result = await topicService.updateTopic(topicId, updateData)

      expect(mockedAxios.put).toHaveBeenCalledWith(`/api/v1/manage/topics/${topicId}`, updateData)
      expect(result.data).toEqual(mockResponse)
    })

    it('should handle partial updates', async () => {
      const topicId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
      const updateData: TopicUpdate = {
        description: 'Only update description'
      }

      const mockResponse: TopicResponse = {
        id: topicId,
        name: 'github.push',
        source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAQ',
        description: 'Only update description',
        ingest_url: 'http://localhost:8000/api/v1/ingest/01ARZ3NDEKTSV4RRFFQ69G5FAV',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-02T10:00:00Z'
      }

      mockedAxios.put.mockResolvedValueOnce({ data: mockResponse })

      const result = await topicService.updateTopic(topicId, updateData)

      expect(mockedAxios.put).toHaveBeenCalledWith(`/api/v1/manage/topics/${topicId}`, updateData)
      expect(result.data).toEqual(mockResponse)
    })
  })

  describe('deleteTopic', () => {
    it('should delete topic successfully', async () => {
      const topicId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'

      mockedAxios.delete.mockResolvedValueOnce({ status: 204 })

      const result = await topicService.deleteTopic(topicId)

      expect(mockedAxios.delete).toHaveBeenCalledWith(`/api/v1/manage/topics/${topicId}`)
      expect(result).toEqual({
        data: undefined,
        loading: false,
        error: undefined
      })
    })

    it('should handle delete errors', async () => {
      const topicId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
      const errorResponse = {
        response: {
          status: 409,
          data: { detail: '無法刪除有相關訂閱的主題' }
        }
      }
      mockedAxios.delete.mockRejectedValueOnce(errorResponse)

      const result = await topicService.deleteTopic(topicId)

      expect(result.error).toEqual({
        message: '無法刪除有相關訂閱的主題',
        code: '409',
        field: undefined
      })
    })
  })

  describe('getTopicStats', () => {
    it('should fetch topic statistics', async () => {
      const mockStats = [
        {
          topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
          webhook_count: 150,
          subscription_count: 3,
          last_activity: '2024-01-01T10:00:00Z',
          source_name: 'github'
        }
      ]

      mockedAxios.get.mockResolvedValueOnce({ data: { topic_statistics: mockStats } })

      const result = await topicService.getTopicStats()

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/stats/topics')
      expect(result.data?.topic_statistics).toEqual(mockStats)
    })
  })

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'))

      const result = await topicService.getTopics()

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

      const result = await topicService.getTopics()

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

      const result = await topicService.getTopics()

      expect(result.error?.message).toBe('認證失敗')
      expect(result.error?.code).toBe('401')
    })
  })
})
