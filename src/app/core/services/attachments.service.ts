import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Attachment } from '../models/academic.model';

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  constructor(private http: HttpClient) {}

  listByLesson(lessonId: string) {
    return this.http.get<Attachment[]>(`${environment.apiUrl}/attachments`, {
      params: { lessonId },
    });
  }
}
