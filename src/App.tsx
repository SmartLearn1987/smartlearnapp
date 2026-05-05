import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import AppHeader from "@/components/AppHeader";
import ProtectedRoute from "@/components/ProtectedRoute";
const Index = React.lazy(() => import("./pages/Index"));
const SubjectsPage = React.lazy(() => import("./pages/SubjectsPage"));
const CoursesPage = React.lazy(() => import("./pages/CoursesPage"));
const LessonsPage = React.lazy(() => import("./pages/LessonsPage"));
const LessonDetailPage = React.lazy(() => import("./pages/LessonDetailPage"));
// Lazy-load UploadPage để tách pdfjs-dist ra khỏi bundle ban đầu,
// tránh lỗi "TypeError: Illegal constructor" khi pdfjs khởi tạo sớm.
const UploadPage = React.lazy(() => import("./pages/UploadPage"));
const ImportPage = React.lazy(() => import("./pages/ImportPage"));
const TeacherPage = React.lazy(() => import("./pages/TeacherPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const RegisterPage = React.lazy(() => import("./pages/RegisterPage"));
const AdminPage = React.lazy(() => import("./pages/AdminPage"));
const AdminContentPage = React.lazy(() => import("./pages/AdminContentPage"));
const StatisticsPage = React.lazy(() => import("./pages/StatisticsPage"));
const ProverbManagePage = React.lazy(() => import("./pages/ProverbManagePage"));
const GamePage = React.lazy(() => import("./pages/GamePage"));
const VuaTiengVietManagePage = React.lazy(() => import("./pages/VuaTiengVietManagePage"));
const DictationManagePage = React.lazy(() => import("./pages/DictationManagePage"));
const DictationPlayPage = React.lazy(() => import("./pages/DictationPlayPage"));
const PictogramManagePage = React.lazy(() => import("./pages/PictogramManagePage"));
const PictogramPlayPage = React.lazy(() => import("./pages/PictogramPlayPage"));
const ProverbPlayPage = React.lazy(() => import("./pages/ProverbPlayPage"));
const VuaTiengVietPlayPage = React.lazy(() => import("./pages/VuaTiengVietPlayPage"));
const LearningManagePage = React.lazy(() => import("./pages/LearningManagePage"));
const LearningCategoryQuestionsPage = React.lazy(() => import("./pages/LearningCategoryQuestionsPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const SchedulePage = React.lazy(() => import("./pages/SchedulePage"));
const LearningGamePlayPage = React.lazy(() => import("./pages/LearningGamePlayPage"));
const NhanhNhuChopManagePage = React.lazy(() => import("./pages/NhanhNhuChopManagePage"));
const NhanhNhuChopPlayPage = React.lazy(() => import("./pages/NhanhNhuChopPlayPage"));
const PlanManagePage = React.lazy(() => import("./pages/PlanManagePage"));
const ContactPage = React.lazy(() => import("./pages/ContactPage"));
const PremiumPage = React.lazy(() => import("./pages/PremiumPage"));
const QuizletPage = React.lazy(() => import("./pages/QuizletPage"));
const CreateQuizletPage = React.lazy(() => import("./pages/CreateQuizletPage"));
const EditQuizletPage = React.lazy(() => import("./pages/EditQuizletPage"));
const QuizListPage = React.lazy(() => import("./pages/QuizListPage"));
const QuizFormPage = React.lazy(() => import("./pages/QuizFormPage"));
const QuizTakePage = React.lazy(() => import("./pages/QuizTakePage"));
const QuizResultPage = React.lazy(() => import("./pages/QuizResultPage"));
const StaticPage = React.lazy(() => import("./pages/StaticPage"));
const QuizRepositoryPage = React.lazy(() => import("./pages/QuizRepositoryPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppHeader />
          <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
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
              <Route path="/admin/statistics" element={<ProtectedRoute requiredRole="admin"><StatisticsPage /></ProtectedRoute>} />
              <Route path="/games" element={<ProtectedRoute requiredRole="admin"><GamePage /></ProtectedRoute>} />
              <Route path="/games/proverbs" element={<ProtectedRoute requiredRole="admin"><ProverbManagePage /></ProtectedRoute>} />
              <Route path="/games/vuatiengviet" element={<ProtectedRoute requiredRole="admin"><VuaTiengVietManagePage /></ProtectedRoute>} />
              <Route path="/games/nhanhnhuchop" element={<ProtectedRoute requiredRole="admin"><NhanhNhuChopManagePage /></ProtectedRoute>} />
              <Route path="/games/dictation" element={<ProtectedRoute requiredRole="admin"><DictationManagePage /></ProtectedRoute>} />
              <Route path="/games/pictogram" element={<ProtectedRoute requiredRole="admin"><PictogramManagePage /></ProtectedRoute>} />
              <Route path="/games/learning" element={<ProtectedRoute requiredRole="admin"><LearningManagePage /></ProtectedRoute>} />
              <Route path="/games/learning/:categoryId" element={<ProtectedRoute requiredRole="admin"><LearningCategoryQuestionsPage /></ProtectedRoute>} />
              <Route path="/admin/plans" element={<ProtectedRoute requiredRole="admin"><PlanManagePage /></ProtectedRoute>} />
              <Route path="/admin/quiz-repository" element={<ProtectedRoute requiredRole={["admin", "teacher"]}><QuizRepositoryPage /></ProtectedRoute>} />


              {/* Các route dùng UploadPage bọc trong Suspense vì lazy-loaded */}
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <UploadPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/p/:slug" element={<StaticPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/premium" element={<PremiumPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
