// 观微 · 应用路由（HashRouter，兼容 GitHub Pages 静态托管）
// 路由表：
//   /           首页（含 #home-arts / #home-fa 锚点）
//   /about      缘起
//   /classics   古籍（列表 / 详情 :id）
//   /academy    学馆（列表 / 课程 :id）
//   /history    历史（列表 / 详情 :id）
//   /art/:artId 九术模块（进入滚动置顶；切换保留状态）
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Backdrop from '@/components/Backdrop';
import InkVein from '@/components/InkVein';
import { SongDialogProvider } from '@/components/SongDialog';
import ErrorBoundary from '@/components/ErrorBoundary';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/AboutPage';
import ModulePage from '@/pages/ModulePage';
import DemoPage from '@/pages/DemoPage';
import ClassicsPage from '@/pages/ClassicsPage';
import AcademyPage from '@/pages/AcademyPage';
import HistoryPage from '@/pages/HistoryPage';
import AuthPage from '@/pages/AuthPage';
import SpreadEditorPage from '@/pages/SpreadEditorPage';

// 进入九术模块视图时滚动置顶（instant，无动画）
function ScrollTopOnArt() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.startsWith('/art/')) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <SongDialogProvider>
      <ScrollTopOnArt />
      <Backdrop />
      <InkVein />
      <SiteNav />
      <main>
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/classics" element={<ClassicsPage />} />
          <Route path="/classics/:id" element={<ClassicsPage />} />
          <Route path="/academy" element={<AcademyPage />} />
          <Route path="/academy/:id" element={<AcademyPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<HistoryPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/spread-editor" element={<SpreadEditorPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/art/:artId" element={<ModulePage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
        </ErrorBoundary>
      </main>
      <SiteFooter />
      </SongDialogProvider>
    </HashRouter>
  );
}