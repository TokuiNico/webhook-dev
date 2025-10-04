import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Layout } from '../components/Layout'
import { LoginForm } from '../components/LoginForm'
import { SubscriptionList } from '../components/SubscriptionList'
import { SubscriptionDetail } from '../components/SubscriptionDetail'
import { SubscriptionForm } from '../components/SubscriptionForm'
import { SubscriptionEdit } from '../components/SubscriptionEdit'
import { TopicList } from '../components/TopicList'
import { TopicForm } from '../components/TopicForm'
import { TopicDetail } from '../components/TopicDetail'
import { TopicEdit } from '../components/TopicEdit'
import { SourceList } from '../components/SourceList'
import { SourceForm } from '../components/SourceForm'
import { SourceDetail } from '../components/SourceDetail'
import { SourceEdit } from '../components/SourceEdit'
import { StatsOverviewChart } from '../components/StatsOverviewChart'
import { ActivityChart } from '../components/ActivityChart'
import { SourceStatsChart } from '../components/SourceStatsChart'
import { LogViewer } from '../components/LogViewer'
import { LogDetail } from '../components/LogDetail'

const AppRouter = () => {
  return (
    <Routes>
      {/* 公開路由 */}
      <Route path="/login" element={<LoginForm />} />

      {/* 受保護路由 - 使用佈局元件 */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route
                  path="/"
                  element={
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">歡迎來到 Webhook Gateway 管理介面</h1>
                        <p className="mt-2 text-sm text-gray-600">
                          這是一個強大的 Webhook Gateway 系統，讓您能夠輕鬆管理 webhook 來源、主題和訂閱。
                        </p>
                      </div>
                      <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">快速開始</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="mx-auto h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                              </svg>
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">來源管理</h3>
                            <p className="mt-1 text-sm text-gray-500">設定 webhook 來源和驗證</p>
                          </div>
                          <div className="text-center">
                            <div className="mx-auto h-12 w-12 bg-green-500 rounded-lg flex items-center justify-center">
                              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">主題管理</h3>
                            <p className="mt-1 text-sm text-gray-500">組織和管理主題</p>
                          </div>
                          <div className="text-center">
                            <div className="mx-auto h-12 w-12 bg-purple-500 rounded-lg flex items-center justify-center">
                              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">訂閱管理</h3>
                            <p className="mt-1 text-sm text-gray-500">管理事件訂閱者</p>
                          </div>
                          <div className="text-center">
                            <div className="mx-auto h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center">
                              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">日誌檢視</h3>
                            <p className="mt-1 text-sm text-gray-500">查看事件日誌</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">儀表板</h1>
                        <p className="mt-2 text-sm text-gray-600">系統統計數據和監控資訊</p>
                      </div>
                      <StatsOverviewChart />
                    </div>
                  }
                />
                <Route
                  path="/sources"
                  element={<SourceList />}
                />
                <Route
                  path="/sources/create"
                  element={<SourceForm />}
                />
                <Route
                  path="/sources/:sourceId"
                  element={<SourceDetail />}
                />
                <Route
                  path="/sources/:sourceId/edit"
                  element={<SourceEdit />}
                />
                <Route
                  path="/topics"
                  element={<TopicList />}
                />
                <Route
                  path="/topics/create"
                  element={<TopicForm />}
                />
                <Route
                  path="/topics/:topicId"
                  element={<TopicDetail />}
                />
                <Route
                  path="/topics/:topicId/edit"
                  element={<TopicEdit />}
                />
                <Route
                  path="/subscriptions"
                  element={<SubscriptionList />}
                />
                <Route
                  path="/subscriptions/create"
                  element={<SubscriptionForm />}
                />
                <Route
                  path="/subscriptions/:subscriptionId"
                  element={<SubscriptionDetail />}
                />
                <Route
                  path="/subscriptions/:subscriptionId/edit"
                  element={<SubscriptionEdit />}
                />
                <Route
                  path="/stats"
                  element={
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">統計分析</h1>
                        <p className="mt-2 text-sm text-gray-600">詳細的統計數據視覺化和分析</p>
                      </div>
                      <StatsOverviewChart />
                      <ActivityChart />
                      <SourceStatsChart />
                    </div>
                  }
                />
                <Route
                  path="/logs"
                  element={
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">日誌檢視</h1>
                        <p className="mt-2 text-sm text-gray-600">查看和分析 webhook 事件日誌</p>
                      </div>
                      <LogViewer displayType="unified" />
                    </div>
                  }
                />
                <Route
                  path="/logs/:logId"
                  element={
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">日誌詳情</h1>
                        <p className="mt-2 text-sm text-gray-600">查看單個日誌項目的詳細信息</p>
                      </div>
                      <LogDetail />
                    </div>
                  }
                />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default AppRouter
