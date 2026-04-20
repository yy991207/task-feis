import ConfigProvider from 'antd/es/config-provider'
import zhCN from 'antd/es/locale/zh_CN'
import TaskListPage from '@/pages/TaskList'

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <TaskListPage />
    </ConfigProvider>
  )
}
