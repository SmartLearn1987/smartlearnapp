import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import AppHeader from "@/components/AppHeader";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SubjectsPage from "./pages/SubjectsPage";
import CoursesPage from "./pages/CoursesPage";
import LessonsPage from "./pages/LessonsPage";
import LessonDetailPage from "./pages/LessonDetailPage";
import UploadPage from "./pages/UploadPage";
import ImportPage from "./pages/ImportPage";
import TeacherPage from "./pages/TeacherPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";
import AdminContentPage from "./pages/AdminContentPage";
import ProverbManagePage from "./pages/ProverbManagePage";
import GamePage from "./pages/GamePage";
import VuaTiengVietManagePage from "./pages/VuaTiengVietManagePage";
import DictationManagePage from "./pages/DictationManagePage";
import DictationPlayPage from "./pages/DictationPlayPage";
import PictogramManagePage from "./pages/PictogramManagePage";
import PictogramPlayPage from "./pages/PictogramPlayPage";
import ProverbPlayPage from "./pages/ProverbPlayPage";
import VuaTiengVietPlayPage from "./pages/VuaTiengVietPlayPage";
import LearningManagePage from "./pages/LearningManagePage";
import LearningCategoryQuestionsPage from "./pages/LearningCategoryQuestionsPage";
import ProfilePage from "./pages/ProfilePage";
import SchedulePage from "./pages/SchedulePage";
import LearningGamePlayPage from "./pages/LearningGamePlayPage";
import NhanhNhuChopManagePage from "./pages/NhanhNhuChopManagePage";
import NhanhNhuChopPlayPage from "./pages/NhanhNhuChopPlayPage";
import ContactPage from "./pages/ContactPage";

import QuizletPage from "./pages/QuizletPage";
import CreateQuizletPage from "./pages/CreateQuizletPage";
import EditQuizletPage from "./pages/EditQuizletPage";
import QuizListPage from "./pages/QuizListPage";
import QuizFormPage from "./pages/QuizFormPage";
import QuizTakePage from "./pages/QuizTakePage";
import QuizResultPage from "./pages/QuizResultPage";
import StaticPage from "./pages/StaticPage";


import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppHeader />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />


            {/* Protected – any logged-in user */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/subjects" element={<ProtectedRoute><SubjectsPage /></ProtectedRoute>} />
            <Route path="/quizlet" element={<ProtectedRoute><QuizletPage /></ProtectedRoute>} />
            <Route path="/quizlet/create" element={<ProtectedRoute><CreateQuizletPage /></ProtectedRoute>} />
            <Route path="/quizlet/:id" element={<ProtectedRoute><EditQuizletPage /></ProtectedRoute>} />
            <Route path="/quizlet/edit/:id" element={<ProtectedRoute><EditQuizletPage /></ProtectedRoute>} />
            
            {/* Quizzes */}
            <Route path="/quizzes" element={<ProtectedRoute><QuizListPage /></ProtectedRoute>} />
            <Route path="/quizzes/create" element={<ProtectedRoute><QuizFormPage /></ProtectedRoute>} />
            <Route path="/quizzes/edit/:id" element={<ProtectedRoute><QuizFormPage /></ProtectedRoute>} />
            <Route path="/quizzes/:id/take" element={<ProtectedRoute><QuizTakePage /></ProtectedRoute>} />
            <Route path="/quizzes/result" element={<ProtectedRoute><QuizResultPage /></ProtectedRoute>} />


            <Route path="/subjects/:subjectId" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />

            <Route path="/courses/:courseId" element={<ProtectedRoute><LessonsPage /></ProtectedRoute>} />
            <Route path="/lessons/:lessonId" element={<ProtectedRoute><LessonDetailPage /></ProtectedRoute>} />
            <Route path="/games/dictation/play" element={<ProtectedRoute><DictationPlayPage /></ProtectedRoute>} />
            <Route path="/games/pictogram/play" element={<ProtectedRoute><PictogramPlayPage /></ProtectedRoute>} />
            <Route path="/games/proverbs/play" element={<ProtectedRoute><ProverbPlayPage /></ProtectedRoute>} />
            <Route path="/games/vuatiengviet/play" element={<ProtectedRoute><VuaTiengVietPlayPage /></ProtectedRoute>} />
            <Route path="/games/nhanhnhuchop/play" element={<ProtectedRoute><NhanhNhuChopPlayPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
            <Route path="/games/learning/play/:categoryId" element={<ProtectedRoute><LearningGamePlayPage /></ProtectedRoute>} />

            {/* Admin and Teacher */}
            <Route path="/teacher" element={<ProtectedRoute requiredRole={["admin", "teacher"]}><TeacherPage /></ProtectedRoute>} />
            {/* Admin only */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />
            <Route path="/admin/content" element={<ProtectedRoute requiredRole="admin"><AdminContentPage /></ProtectedRoute>} />
            <Route path="/games" element={<ProtectedRoute requiredRole="admin"><GamePage /></ProtectedRoute>} />
            <Route path="/games/proverbs" element={<ProtectedRoute requiredRole="admin"><ProverbManagePage /></ProtectedRoute>} />
            <Route path="/games/vuatiengviet" element={<ProtectedRoute requiredRole="admin"><VuaTiengVietManagePage /></ProtectedRoute>} />
            <Route path="/games/nhanhnhuchop" element={<ProtectedRoute requiredRole="admin"><NhanhNhuChopManagePage /></ProtectedRoute>} />
            <Route path="/games/dictation" element={<ProtectedRoute requiredRole="admin"><DictationManagePage /></ProtectedRoute>} />
            <Route path="/games/pictogram" element={<ProtectedRoute requiredRole="admin"><PictogramManagePage /></ProtectedRoute>} />
            <Route path="/games/learning" element={<ProtectedRoute requiredRole="admin"><LearningManagePage /></ProtectedRoute>} />
            <Route path="/games/learning/:categoryId" element={<ProtectedRoute requiredRole="admin"><LearningCategoryQuestionsPage /></ProtectedRoute>} />

            <Route path="/p/:slug" element={<StaticPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
