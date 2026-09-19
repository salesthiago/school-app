import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Lesson } from '../models/academic.model';

@Injectable({ providedIn: 'root' })
export class LessonsService {
  constructor(private http: HttpClient) {}

  /** Aulas avulsas do curso (sem módulo). */
  listByCourse(courseId: string) {
    return this.http.get<Lesson[]>(`${environment.apiUrl}/lessons`, { params: { courseId } });
  }

  getLesson(id: string) {
    return this.http.get<Lesson>(`${environment.apiUrl}/lessons/${id}`);
  }
}
