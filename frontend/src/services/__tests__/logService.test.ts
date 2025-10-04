import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { logService } from '../logService'
import type {
  EventLog,
  DispatchLog,
  EventLogListResponse,
  DispatchLogListResponse,
  EventLogFilterParams,
  DispatchLogFilterParams,
  UnifiedLogListResponse
} from '../../types/log'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock axios.isAxiosError
mockedAxios.isAxiosError = vi.fn((error: any) => {
  return error && error.isAxiosError === true
})

// Mock authService
vi.mock('../authService', () => ({
  authService: {
    getCurrentToken: vi.fn(() => 'mock-token')
  }
}))

describe('LogService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getEventLogs', () => {
    it('should fetch event logs with filters', async () => {
      const mockResponse: EventLogListResponse = {
        items: [
          {
            id: '01K4AN2JMK0SS161X6G5F30QSD',
            topic_id: '01K4AN2JKWCDJSBXAW1DDHRTMJ',
            source_ip: '127.0.0.1',
            headers: { 'Content-Type': 'application/json' },
            content_type: 'application/json',
            payload: '{"event": "test"}',
            status: 'QUEUED',
            received_at: '2024-01-01T10:00:00Z'
          }
        ],
        total: 1,
        skip: 0,
        limit: 10
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const filters: EventLogFilterParams = {
        topic_id: '01K4AN2JKWCDJSBXAW1DDHRTMJ',
        status: 'QUEUED',
        skip: 0,
        limit: 10
      }

      const result = await logService.getEventLogs(filters)

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/logs/events/', {
        params: filters,
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        }
      })
      expect(result.data).toEqual(mockResponse)
    })
  })

  describe('getEventLog', () => {
    it('should fetch single event log', async () => {
      const mockEventLog: EventLog = {
        id: '01K4AN2JMK0SS161X6G5F30QSD',
        topic_id: '01K4AN2JKWCDJSBXAW1DDHRTMJ',
        source_ip: '127.0.0.1',
        headers: { 'Content-Type': 'application/json' },
        content_type: 'application/json',
        payload: '{"event": "test"}',
        status: 'QUEUED',
        received_at: '2024-01-01T10:00:00Z'
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockEventLog })

      const result = await logService.getEventLog('01K4AN2JMK0SS161X6G5F30QSD')

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/logs/events/01K4AN2JMK0SS161X6G5F30QSD', {
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        }
      })
      expect(result.data).toEqual(mockEventLog)
    })
  })

  describe('getDispatchLogs', () => {
    it('should fetch dispatch logs with filters', async () => {
      const mockResponse: DispatchLogListResponse = {
        items: [
          {
            id: '01K4AN2JMK0SS161X6G5F30QSE',
            event_log_id: '01K4AN2JMK0SS161X6G5F30QSD',
            subscription_id: '01K4AN2JM7Z4S4CRRC086F8BQF',
            attempt: 1,
            status: 'SUCCESS',
            response_status_code: 200,
            dispatched_at: '2024-01-01T10:00:00Z'
          }
        ],
        total: 1,
        skip: 0,
        limit: 10
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const filters: DispatchLogFilterParams = {
        event_log_id: '01K4AN2JMK0SS161X6G5F30QSD',
        status: 'SUCCESS',
        skip: 0,
        limit: 10
      }

      const result = await logService.getDispatchLogs(filters)

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/logs/dispatches/', {
        params: filters,
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        }
      })
      expect(result.data).toEqual(mockResponse)
    })
  })

  describe('getDispatchLog', () => {
    it('should fetch single dispatch log', async () => {
      const mockDispatchLog: DispatchLog = {
        id: '01K4AN2JMK0SS161X6G5F30QSE',
        event_log_id: '01K4AN2JMK0SS161X6G5F30QSD',
        subscription_id: '01K4AN2JM7Z4S4CRRC086F8BQF',
        attempt: 1,
        status: 'SUCCESS',
        response_status_code: 200,
        response_body: '{"success": true}',
        dispatched_at: '2024-01-01T10:00:00Z'
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockDispatchLog })

      const result = await logService.getDispatchLog('01K4AN2JMK0SS161X6G5F30QSE')

      expect(result.data).toEqual(mockDispatchLog)
    })
  })

  describe('getUnifiedLogs', () => {
    it('should combine and sort event and dispatch logs', async () => {
      const mockEventLogs: EventLogListResponse = {
        items: [
          {
            id: '01K4AN2JMK0SS161X6G5F30QSD',
            topic_id: '01K4AN2JKWCDJSBXAW1DDHRTMJ',
            source_ip: '127.0.0.1',
            headers: {},
            content_type: 'application/json',
            payload: '{"event": "test"}',
            status: 'QUEUED',
            received_at: '2024-01-01T10:00:00Z'
          }
        ],
        total: 1,
        skip: 0,
        limit: 10
      }

      const mockDispatchLogs: DispatchLogListResponse = {
        items: [
          {
            id: '01K4AN2JMK0SS161X6G5F30QSE',
            event_log_id: '01K4AN2JMK0SS161X6G5F30QSD',
            subscription_id: '01K4AN2JM7Z4S4CRRC086F8BQF',
            attempt: 1,
            status: 'SUCCESS',
            response_status_code: 200,
            dispatched_at: '2024-01-01T10:01:00Z'
          }
        ],
        total: 1,
        skip: 0,
        limit: 10
      }

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockEventLogs })
        .mockResolvedValueOnce({ data: mockDispatchLogs })

      const result = await logService.getUnifiedLogs({ skip: 0, limit: 20 })

      expect(result.data?.items).toHaveLength(2)
      expect(result.data?.items[0].type).toBe('dispatch') // Should be sorted by timestamp desc
      expect(result.data?.items[1].type).toBe('event')
    })
  })

  describe('searchLogs', () => {
    it('should search logs by query', async () => {
      const mockUnifiedLogs: UnifiedLogListResponse = {
        items: [
          {
            id: '01K4AN2JMK0SS161X6G5F30QSD',
            type: 'event',
            timestamp: '2024-01-01T10:00:00Z',
            status: 'QUEUED',
            topic_id: '01K4AN2JKWCDJSBXAW1DDHRTMJ',
            source_ip: '127.0.0.1'
          }
        ],
        total: 1,
        skip: 0,
        limit: 10
      }

      // Mock the getUnifiedLogs method
      vi.spyOn(logService, 'getUnifiedLogs').mockResolvedValue({
        data: mockUnifiedLogs,
        loading: false
      })

      const result = await logService.searchLogs('QUEUED')

      expect(result.data?.items).toHaveLength(1)
      expect(result.data?.items[0].status).toBe('QUEUED')
    })

    it('should return empty results when no matches found', async () => {
      const mockUnifiedLogs: UnifiedLogListResponse = {
        items: [
          {
            id: '01K4AN2JMK0SS161X6G5F30QSD',
            type: 'event',
            timestamp: '2024-01-01T10:00:00Z',
            status: 'QUEUED',
            topic_id: '01K4AN2JKWCDJSBXAW1DDHRTMJ',
            source_ip: '127.0.0.1'
          }
        ],
        total: 1,
        skip: 0,
        limit: 10
      }

      vi.spyOn(logService, 'getUnifiedLogs').mockResolvedValue({
        data: mockUnifiedLogs,
        loading: false
      })

      const result = await logService.searchLogs('nonexistent')

      expect(result.data?.items).toHaveLength(0)
    })
  })
})
