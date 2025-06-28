import { Component, OnInit, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MaintenanceTopbarComponent } from "../TopBar/maintenance-topbar/maintenance-topbar.component";

export interface MaintenanceRequest {
  id: number;
  apartment_id?: number;
  user_id?: number;
  technician_id?: number;
  problem_type?: string;
  description: string;
  status: 'Pending' | 'Pending Confirmation' | 'Approved' | 'In Progress' | 'Completed' | 'Rejected';
  request_date?: string;
  apartmentNumber?: string;
  priority?: 'Low' | 'Medium' | 'High';
  images?: string[] | string;
  response?: string;
  proposed_cost?: number;
  proposed_duration?: string;
  cost_confirmed?: boolean;
  scheduled_date?: string;
  user?: {
    id?: number;
    name?: string;
    phone?: string;
  };
  technician?: {
    id?: number;
    name?: string;
  };
}

interface FilterOptions {
  problemType: string;
  dateRange: string;
  searchTerm: string;
}

@Component({
  selector: 'app-technician-assignments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MaintenanceTopbarComponent
  ],
  templateUrl: './technician-assignments.component.html',
  styleUrls: ['./technician-assignments.component.css']
})
export class TechnicianAssignmentsComponent implements OnInit {
  assignments = signal<MaintenanceRequest[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  technicianId = signal<string | null>(null);
  processingRequests = signal<number[]>([]);

  selectedImage = signal<string | null>(null);
  showImageModal = signal(false);

  filters = signal<FilterOptions>({
    problemType: '',
    dateRange: '',
    searchTerm: ''
  });

  private API_BASE_URL = 'http://localhost:5000/api';

  constructor(private http: HttpClient, private router: Router) {
    effect(() => {
      const savedFilters = localStorage.getItem('tech_assignments_filters');
      if (savedFilters) {
        this.filters.set(JSON.parse(savedFilters));
      }
    });

    effect(() => {
      localStorage.setItem('tech_assignments_filters', JSON.stringify(this.filters()));
    });
  }

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    const techId = localStorage.getItem('technician_id');

    if (!token || !techId) {
      console.warn('Missing token or technician ID. Redirecting to login.');
      this.router.navigate(['/login']);
      return;
    }

    this.technicianId.set(techId);
    this.loadAssignments(Number(techId));
  }

  hasActiveFilters(): boolean {
    const f = this.filters();
    return f.problemType !== '' || f.dateRange !== '' || f.searchTerm !== '';
  }

  truncateText(text: string, limit = 100): string {
    return text?.length <= limit ? text : text.substring(0, limit) + '...';
  }

  getIcon(problemType?: string): string {
    const iconMap: Record<string, string> = {
      'Plumbing': 'fas fa-faucet',
      'Electrical': 'fas fa-bolt',
      'HVAC': 'fas fa-fan',
      'default': 'fas fa-tools'
    };
    return iconMap[problemType || 'default'] || iconMap['default'];
  }

  openImageModal(imageUrl: string): void {
    let finalUrl = imageUrl;
    if (imageUrl.startsWith('["') && imageUrl.endsWith('"]')) {
      finalUrl = imageUrl.slice(2, -2);
    }
    if (!finalUrl.startsWith('http')) {
      finalUrl = `http://localhost:5000/static/${finalUrl.replace(/^\/?maintenance\//, '')}`;
    }
    this.selectedImage.set(finalUrl);
    this.showImageModal.set(true);
  }

  closeImageModal(): void {
    this.showImageModal.set(false);
    this.selectedImage.set(null);
  }

  getSanitizedImages(images: any): string[] {
    if (!images) return [];
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images);
      } catch {
        images = [images];
      }
    }
    return images.map((img: string) => {
      if (img.startsWith('http')) return img;
      const cleanImg = img.replace(/^\[?"|"\]?$/g, '');
      return `http://localhost:5000/static/${cleanImg.replace(/^\/?maintenance\//, '')}`;
    });
  }

  contactUser(userId?: number, requestId?: number): void {
    if (!userId || !requestId) return;
    const isLoggedIn = !!localStorage.getItem('user_id');
    if (isLoggedIn) {
      this.router.navigate([`/contact-tenant/${userId}/${requestId}`]);
    } else {
      this.router.navigate(['/login'], {
        queryParams: { redirectTo: `/contact-tenant/${userId}/${requestId}` }
      });
    }
  }

  getDateRangeLabel(dateRange: string): string {
    switch (dateRange) {
      case 'today': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      default: return '';
    }
  }

  loadAssignments(technicianId: number): void {
    this.loading.set(true);
    this.error.set(null);
    const token = localStorage.getItem('token');

    if (!technicianId || !token) {
      this.router.navigate(['/login']);
      return;
    }

    this.http.get<MaintenanceRequest[]>(
      `${this.API_BASE_URL}/technician/${technicianId}/requests`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (data: MaintenanceRequest[]) => {
        const processedData = data.map(request => ({
          ...request,
          images: this.getSanitizedImages(request.images),
          request_date: request.request_date ? new Date(request.request_date).toISOString() : undefined
        }));
        const pendingRequests = processedData.filter(req => req.status === 'Pending');
        this.assignments.set(pendingRequests);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading assignments:', err);
        if (err.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('technician_id');
          this.router.navigate(['/login']);
        } else {
          this.error.set(err.status === 404 ? 'No assignments found' : 'Failed to load assignments. Please try again.');
        }
        this.loading.set(false);
      }
    });
  }

  getCardClass(problemType?: string): string {
    const classMap: Record<string, string> = {
      'Plumbing': 'plumbing-card',
      'Electrical': 'electrical-card',
      'HVAC': 'hvac-card',
      'default': 'default-card'
    };
    return classMap[problemType || 'default'] || classMap['default'];
  }

  isProcessing(requestId: number): boolean {
    return this.processingRequests().includes(requestId);
  }

  get filteredAssignments() {
    return this.assignments().filter(assignment => {
      const filters = this.filters();

      if (filters.problemType && assignment.problem_type !== filters.problemType) return false;

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matches =
          assignment.description?.toLowerCase().includes(term) ||
          assignment.apartment_id?.toString().includes(term) ||
          assignment.user?.name?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      if (filters.dateRange && assignment.request_date) {
        const requestDate = new Date(assignment.request_date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));

        if (filters.dateRange === 'today' && diffDays > 0) return false;
        if (filters.dateRange === 'week' && diffDays > 7) return false;
        if (filters.dateRange === 'month' && diffDays > 30) return false;
      }

      return true;
    });
  }

  get uniqueProblemTypes(): string[] {
    return [...new Set(this.assignments()
      .map(a => a.problem_type)
      .filter((pt): pt is string => !!pt)
    )].sort();
  }

  get uniquePriorities(): string[] {
    return [...new Set(this.assignments().map(a => a.priority || '').filter(p => p !== ''))].sort();
  }

  updateFilter<K extends keyof FilterOptions>(key: K, value: FilterOptions[K]): void {
    this.filters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  resetFilters(): void {
    this.filters.set({
      problemType: '',
      dateRange: '',
      searchTerm: ''
    });
  }
  getTechnicianIdNumber(): number {
  return Number(this.technicianId());
}


  viewDetails(requestId: number): void {
    const techId = this.technicianId();
    if (techId) {
      this.router.navigate(['/technician', techId, 'assignment-details', requestId]);
    }
  }

 // In technician-assignments.component.ts
submitProposal(request: MaintenanceRequest) {
  console.log('[submitProposal] Start', request);

  if (!request.proposed_cost || !request.proposed_duration) {
    alert('Please fill both cost and duration');
    console.warn('[submitProposal] Missing cost or duration');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    alert("Unauthorized. Please log in again.");
    console.error('[submitProposal] No token found in localStorage');
    return;
  }

  this.processingRequests.update(reqs => [...reqs, request.id]);
  console.log(`[submitProposal] Sending PUT request for request ID ${request.id}`);

  const url = `${this.API_BASE_URL}/maintenance-requests/${request.id}/propose`;
  const payload = {
    proposed_cost: request.proposed_cost,
    proposed_duration: request.proposed_duration
  };

  console.log('[submitProposal] PUT URL:', url);
  console.log('[submitProposal] Payload:', payload);

  this.http.put(
    url,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  ).subscribe({
    next: (response) => {
      console.log('[submitProposal] Success response:', response);
      alert('Proposal submitted successfully');
      const techId = this.technicianId();
      if (techId) this.loadAssignments(Number(techId));
      this.processingRequests.update(reqs => reqs.filter(id => id !== request.id));
    },
    error: (err) => {
      console.error('[submitProposal] ❌ Failed to submit proposal:', err);
      this.error.set('Failed to submit proposal. Please try again.');

      if (err.status === 400) {
        console.error('[submitProposal] 💡 Likely validation error in request body or data types.');
      } else if (err.status === 500) {
        console.error('[submitProposal] 💥 Internal Server Error - check Flask backend logs.');
      } else {
        console.warn('[submitProposal] Unknown error status:', err.status);
      }

      this.processingRequests.update(reqs => reqs.filter(id => id !== request.id));
    }
  });
}


formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date', e);
      return 'Invalid date';
    }
  }

 
  respondToRequest(requestId: number, response: 'Accepted' | 'Rejected', event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    this.processingRequests.update(reqs => [...reqs, requestId]);
    const newStatus = response === 'Accepted' ? 'In Progress' : 'Rejected';

    this.http.patch(
      `${this.API_BASE_URL}/maintenance-requests/${requestId}`,
      { status: newStatus }
    ).subscribe({
      next: () => {
        this.processingRequests.update(reqs => reqs.filter(id => id !== requestId));
        this.assignments.update(requests => requests.filter(req => req.id !== requestId));
      },
      error: (err) => {
        console.error('Error responding to request:', err);
        this.processingRequests.update(reqs => reqs.filter(id => id !== requestId));
        this.error.set('Failed to update request status. Please try again.');
      }
    });
  }

  trackByRequestId(index: number, request: MaintenanceRequest): number {
    return request.id;
  }
}
