import { courses as mockCourses, subjects as mockSubjects } from "@/data/mockData";
import { getCustomCourses } from "@/lib/courseStorage";
import type { Course, Subject } from "@/data/mockData";

export function getAllCourses(): Course[] {
  return [...mockCourses, ...getCustomCourses()];
}

export function getAllSubjects(): Subject[] {
  const custom = getCustomCourses();
  return mockSubjects.map((s) => ({
    ...s,
    courseCount: mockCourses.filter((c) => c.subjectId === s.id).length +
      custom.filter((c) => c.subjectId === s.id).length,
  }));
}

export function findCourse(courseId: string): Course | undefined {
  return getAllCourses().find((c) => c.id === courseId);
}

export function findCoursesBySubject(subjectId: string): Course[] {
  return getAllCourses().filter((c) => c.subjectId === subjectId);
}
