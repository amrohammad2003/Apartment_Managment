// src/app/models/technician.model.ts
export interface Technician {
  id: number;
  full_name: string;
  job: string;  // Make sure this is required (not optional)
  email: string;
  phone_number: string;
  is_verified: boolean;
  rating?: number;
  reviews_count?: number;
  created_at: string;
  facebook_link?: string;
}