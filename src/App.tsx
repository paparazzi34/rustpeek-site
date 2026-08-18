import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { SiteLayout } from './layout/SiteLayout'
import { LandingPage } from './features/landing/LandingPage'
import { ServersPage } from './features/servers/ServersPage'
import { ServerDetailPage } from './features/servers/ServerDetailPage'
import { PlayersPage } from './features/players/PlayersPage'
import { WatchlistPage } from './features/watchlist/WatchlistPage'
import { RustPlusPage } from './features/rustplus/RustPlusPage'

export default function App() {
  return (
    <Routes>
      {/* Лендинг — своя оболочка: без вкладок приложения */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* Приложение */}
      <Route element={<AppShell />}>
        <Route path="/servers" element={<ServersPage />} />
        <Route path="/servers/:id" element={<ServerDetailPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/rustplus" element={<RustPlusPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
