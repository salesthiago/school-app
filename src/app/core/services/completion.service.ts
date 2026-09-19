import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CompletionStatus {
  completed: boolean;
  certificateId?: string;
}

/**
 * Dispara os checks de conclusão/certificado — nada no backend chama isso sozinho, então
 * precisa ser acionado do app depois de qualquer evento que possa ter completado alguma
 * coisa (assistir aula até o fim).
 */
@Injectable({ providedIn: 'root' })
export class CompletionService {
  constructor(private http: HttpClient) {}

  checkModule(moduleId: string) {
    return this.http.get<CompletionStatus>(`${environment.apiUrl}/completion/module/${moduleId}`);
  }

  checkCourseTrack(courseId: string) {
    return this.http.get<CompletionStatus>(`${environment.apiUrl}/completion/course/${courseId}`);
  }
}
