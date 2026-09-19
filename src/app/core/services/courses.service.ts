import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Course, CourseModule, Lesson } from '../models/academic.model';

@Injectable({ providedIn: 'root' })
export class CoursesService {
  constructor(private http: HttpClient) {}

  listPublished() {
    return this.http.get<Course[]>(`${environment.apiUrl}/courses`);
  }

  getCourse(id: string) {
    return this.http.get<Course>(`${environment.apiUrl}/courses/${id}`);
  }

  listModules(courseId: string) {
    return this.http.get<CourseModule[]>(`${environment.apiUrl}/modules`, {
      params: { courseId },
    });
  }

  getModule(id: string) {
    return this.http.get<CourseModule>(`${environment.apiUrl}/modules/${id}`);
  }

  listLessons(moduleId: string) {
    return this.http.get<Lesson[]>(`${environment.apiUrl}/lessons`, { params: { moduleId } });
  }
}
