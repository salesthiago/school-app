import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CourseReviewsOverview, MyReview, Review } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  constructor(private http: HttpClient) {}

  /** Envia (ou reenvia) a avaliação; volta a ficar pendente de aprovação do professor. */
  upsert(courseId: string, payload: { rating: number; comment?: string }) {
    return this.http.post<Review>(`${environment.apiUrl}/reviews/courses/${courseId}`, payload);
  }

  mine(courseId: string) {
    return this.http.get<MyReview>(`${environment.apiUrl}/reviews/courses/${courseId}/mine`);
  }

  publicOverview(courseId: string) {
    return this.http.get<CourseReviewsOverview>(`${environment.apiUrl}/reviews/courses/${courseId}`);
  }
}
