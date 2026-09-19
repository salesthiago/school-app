export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  studentId: string | { id: string; name: string };
  courseId: string;
  rating: number;
  comment?: string;
  status: ReviewStatus;
  rejectionReason?: string;
  createdAt: string;
}

/** `eligible` é decidido pelo backend (aluno matriculado + percentual mínimo do curso concluído). */
export interface ReviewEligibility {
  eligible: boolean;
  percentage: number;
  threshold: number;
}

export interface ReviewSummary {
  average: number;
  count: number;
}

export interface CourseReviewsOverview {
  summary: ReviewSummary;
  reviews: Review[];
}

export interface MyReview {
  review: Review | null;
  eligibility: ReviewEligibility;
}
