import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { subscriptionService } from '../subscriptionService'
import type {
  SubscriptionCreate,
  SubscriptionResponse,
  SubscriptionListResponse,
  SubscriptionUpdate,
  SubscriptionFilterParams,
  BulkSubscriptionOperation,
  BulkOperationResponse
} from '../../types/subscription'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock authService
vi.mock('../authService', () => ({
  authService: {
    getCurrentToken: vi.fn().mockReturnValue('mock-token')
  }
}))

describe('SubscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSubscriptions', () => {
    it('should fetch subscriptions list without filters', async () => {
      const mockResponse: SubscriptionListResponse = {
        items: [
          {
            id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
            subscriber_name: 'my-service',
            target_url: 'https://api.example.com/webhook',
            is_active: true,
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:00:00Z'
          },
          {
            id: '01ARZ3NDEKTSV4RRFFQ69G5FAX',
            topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAY',
            subscriber_name: 'notification-service',
            target_url: 'https://notify.example.com/webhook',
            is_active: false,
            created_at: '2024-01-02T10:00:00Z',
            updated_at: '2024-01-02T10:00:00Z'
          }
        ],
        total: 2,
        skip: 0,
        limit: 100
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await subscriptionService.getSubscriptions()

      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/subscriptions', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer undefined',
          'Content-Type': 'application/json',
        },
        params: undefined
      })
    })

    it('should fetch subscriptions list with filters', async () => {
      const filters: SubscriptionFilterParams = {
        topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
        is_active: true,
        skip: 0,
        limit: 10
      }

      const mockResponse: SubscriptionListResponse = {
        items: [
          {
            id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
            subscriber_name: 'my-service',
            target_url: 'https://api.example.com/webhook',
            is_active: true,
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:00:00Z'
          }
        ],
        total: 1,
        skip: 0,
        limit: 10
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await subscriptionService.getSubscriptions(filters)

      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/subscriptions', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer undefined',
          'Content-Type': 'application/json',
        },
        params: filters
      })
    })

    it('should handle API errors', async () => {
      const errorMessage = 'Failed to fetch subscriptions'
      mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage))

      const result = await subscriptionService.getSubscriptions()

      expect(result).toEqual({
        data: undefined,
        loading: false,
        error: {
          message: '載入訂閱列表失敗',
          code: undefined,
          field: undefined
        }
      })
    })
  })

  describe('getSubscription', () => {
    it('should fetch single subscription', async () => {
      const mockResponse: SubscriptionResponse = {
        id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
        subscriber_name: 'my-service',
        target_url: 'https://api.example.com/webhook',
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await subscriptionService.getSubscription('01ARZ3NDEKTSV4RRFFQ69G5FAV')

      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/subscriptions/01ARZ3NDEKTSV4RRFFQ69G5FAV', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer undefined',
          'Content-Type': 'application/json',
        },
      })
    })
  })

  describe('createSubscription', () => {
    it('should create new subscription', async () => {
      const subscriptionData: SubscriptionCreate = {
        topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
        subscriber_name: 'my-service',
        target_url: 'https://api.example.com/webhook',
        is_active: true
      }

      const mockResponse: SubscriptionResponse = {
        id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
        subscriber_name: 'my-service',
        target_url: 'https://api.example.com/webhook',
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      }

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse })

      const result = await subscriptionService.createSubscription(subscriptionData)

      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
      expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:8000/api/v1/subscriptions', subscriptionData, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer undefined',
          'Content-Type': 'application/json',
        },
      })
    })
  })

  describe('updateSubscription', () => {
    it('should update subscription', async () => {
      const updateData: SubscriptionUpdate = {
        subscriber_name: 'updated-service',
        target_url: 'https://updated-api.example.com/webhook'
      }

      const mockResponse: SubscriptionResponse = {
        id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
        subscriber_name: 'updated-service',
        target_url: 'https://updated-api.example.com/webhook',
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T11:00:00Z'
      }

      mockedAxios.put.mockResolvedValueOnce({ data: mockResponse })

      const result = await subscriptionService.updateSubscription('01ARZ3NDEKTSV4RRFFQ69G5FAV', updateData)

      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
      expect(mockedAxios.put).toHaveBeenCalledWith('http://localhost:8000/api/v1/subscriptions/01ARZ3NDEKTSV4RRFFQ69G5FAV', updateData, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer undefined',
          'Content-Type': 'application/json',
        },
      })
    })
  })

  describe('deactivateSubscription', () => {
    it('should deactivate subscription', async () => {
      mockedAxios.delete.mockResolvedValueOnce({})

      const result = await subscriptionService.deactivateSubscription('01ARZ3NDEKTSV4RRFFQ69G5FAV')

      expect(result).toEqual({
        data: undefined,
        loading: false,
        error: undefined
      })
      expect(mockedAxios.delete).toHaveBeenCalledWith('http://localhost:8000/api/v1/subscriptions/01ARZ3NDEKTSV4RRFFQ69G5FAV', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer undefined',
          'Content-Type': 'application/json',
        },
      })
    })
  })

  describe('activateSubscription', () => {
    it('should activate subscription', async () => {
      mockedAxios.post.mockResolvedValueOnce({})

      const result = await subscriptionService.activateSubscription('01ARZ3NDEKTSV4RRFFQ69G5FAV')

      expect(result).toEqual({
        data: undefined,
        loading: false,
        error: undefined
      })
      expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:8000/api/v1/subscriptions/01ARZ3NDEKTSV4RRFFQ69G5FAV/activate', {}, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer undefined',
          'Content-Type': 'application/json',
        },
      })
    })
  })

  describe('bulkOperateSubscriptions', () => {
    it('should perform bulk activate operation', async () => {
      const operation: BulkSubscriptionOperation = {
        subscription_ids: ['01ARZ3NDEKTSV4RRFFQ69G5FAV', '01ARZ3NDEKTSV4RRFFQ69G5FAX'],
        operation: 'activate'
      }

      const mockResponse: BulkOperationResponse = {
        success_count: 2,
        failure_count: 0,
        results: [
          {
            subscription_id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            success: true
          },
          {
            subscription_id: '01ARZ3NDEKTSV4RRFFQ69G5FAX',
            success: true
          }
        ]
      }

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse })

      const result = await subscriptionService.bulkOperateSubscriptions(operation)

      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
      expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:8000/api/v1/subscriptions/bulk-activate', {
        subscription_ids: operation.subscription_ids
      }, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer undefined',
          'Content-Type': 'application/json',
        },
      })
    })

    it('should perform bulk deactivate operation', async () => {
      const operation: BulkSubscriptionOperation = {
        subscription_ids: ['01ARZ3NDEKTSV4RRFFQ69G5FAV'],
        operation: 'deactivate'
      }

      const mockResponse: BulkOperationResponse = {
        success_count: 1,
        failure_count: 0,
        results: [
          {
            subscription_id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            success: true
          }
        ]
      }

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse })

      const result = await subscriptionService.bulkOperateSubscriptions(operation)

      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
      expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:8000/api/v1/subscriptions/bulk-deactivate', {
        subscription_ids: operation.subscription_ids
      }, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer undefined',
          'Content-Type': 'application/json',
        },
      })
    })
  })
})
