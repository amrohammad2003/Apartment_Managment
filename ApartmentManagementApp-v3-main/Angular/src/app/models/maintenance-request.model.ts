// src/app/models/maintenance-request.model.ts
export interface MaintenanceRequest {
  id: number;
  apartment_id?: number;  // Changed from apartmentId
  user_id?: number;       // Changed from userId
  technician_id?: number; // Changed from technicianId
  problem_type?: string;  // Changed from problemType
  description: string;
  status: 'Pending' | 'Pending Confirmation' | 'Approved' | 'In Progress' | 'Completed' | 'Rejected';
  request_date?: string;  // Changed from requestDate
  apartmentNumber?: string;
  priority?: 'Low' | 'Medium' | 'High';
  images?: string[];
  response?: string;
  proposedCost?: number;
  proposedDuration?: string;
  costConfirmed?: boolean;
  scheduled_date?: string;
  user?: {               // Added user object
    id?: number;
    name?: string;
    phone?: string;
  };
  technician?: {         // Added technician object
    id?: number;
    name?: string;
  };
}