import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Enrollment, ModuleProgressSummary } from '../models/academic.model';

@Injectable({ providedIn: 'root' })
export class EnrollmentsService {
  constructor(private http: HttpClient) {}

  /**
   * Descarta matrículas órfãs: se o curso foi apagado, o populate do backend devolve courseId null
   * e nenhuma tela consegue exibir/abrir essa matrícula.
   */
  myEnrollments() {
    return this.http
      .get<Enrollment[]>(`${environment.apiUrl}/enrollments/mine`)
      .pipe(map((enrollments) => enrollments.filter((e) => !!e.courseId)));
  }

  /** Informe moduleId (matrícula no módulo) OU courseId (matrícula na trilha de aulas avulsas). */
  enroll(target: { moduleId?: string; courseId?: string }) {
    return this.http.post<Enrollment>(`${environment.apiUrl}/enrollments/enroll`, target);
  }

  lessonProgress(lessonId: string) {
    return this.http.get<{ watchedSeconds: number; percentage: number; completed: boolean }>(
      `${environment.apiUrl}/progress/lesson/${lessonId}`,
    );
  }

  moduleProgress(moduleId: string) {
    return this.http.get<ModuleProgressSummary>(`${environment.apiUrl}/progress/module/${moduleId}`);
  }

  courseTrackProgress(courseId: string) {
    return this.http.get<ModuleProgressSummary>(`${environment.apiUrl}/progress/course/${courseId}`);
  }

  /** Ausente moduleId = progresso de aula avulsa. */
  recordProgress(lessonId: string, watchedSeconds: number, moduleId?: string) {
    return this.http.post(`${environment.apiUrl}/progress`, { lessonId, moduleId, watchedSeconds });
  }
}
