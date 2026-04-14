import { useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Layers, HelpCircle, Youtube, ImageIcon } from "lucide-react";
import { LessonContentTab } from "@/components/lesson-tabs/LessonContentTab";
import { FlashcardTab } from "@/components/lesson-tabs/FlashcardTab";
import { QuizTab } from "@/components/lesson-tabs/QuizTab";
import { VideoTab } from "@/components/lesson-tabs/VideoTab";
import { SummaryTab } from "@/components/lesson-tabs/SummaryTab";

export default function LessonDetailPage() {
  const { lessonId } = useParams();
  const isTeacher = true; // Replace with your auth context check

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chi tiết bài học</h1>
        <p className="text-gray-500 text-sm mt-1">Quản lý nội dung bài học</p>
      </div>

      <Tabs defaultValue="content">
        <TabsList className="grid grid-cols-5 w-full mb-6">
          <TabsTrigger value="content" className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" /><span className="hidden sm:inline">Nội dung</span>
          </TabsTrigger>
          <TabsTrigger value="flashcard" className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" /><span className="hidden sm:inline">Flashcard</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" /><span className="hidden sm:inline">Trắc nghiệm</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-1.5">
            <Youtube className="w-4 h-4" /><span className="hidden sm:inline">Video</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" /><span className="hidden sm:inline">Tổng kết</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <LessonContentTab lessonId={lessonId!} isTeacher={isTeacher} />
        </TabsContent>
        <TabsContent value="flashcard">
          <FlashcardTab lessonId={lessonId!} isTeacher={isTeacher} />
        </TabsContent>
        <TabsContent value="quiz">
          <QuizTab lessonId={lessonId!} isTeacher={isTeacher} />
        </TabsContent>
        <TabsContent value="video">
          <VideoTab lessonId={lessonId!} isTeacher={isTeacher} />
        </TabsContent>
        <TabsContent value="summary">
          <SummaryTab lessonId={lessonId!} isTeacher={isTeacher} />
        </TabsContent>
      </Tabs>
    </div>
  );
}