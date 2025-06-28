import { Component, OnInit, signal } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MaintenanceTopbarComponent } from '../TopBar/maintenance-topbar/maintenance-topbar.component';
import { MaintenanceService } from '../../Services/maintenance.service';
export interface MaintenanceRequest {
  id: number;
  problemType?: string;
  description: string;
  status: 'Pending' | 'Approved' | 'In Progress' | 'Completed' | 'Rejected' | 'Pending Confirmation';
  createdAt: string;
  apartmentNumber: string;
  priority: 'Low' | 'Medium' | 'High';
  images?: string[];
  response?: string;
  technician_id?: number;
  proposedCost?: number;          // Add this
  proposedDuration?: string;      // Add this
  costConfirmed?: boolean;        // Add this
  scheduled_date?: string;        // Add if needed
}

@Component({
  selector: 'app-maintenance-center',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    FormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MaintenanceTopbarComponent
  ],
  templateUrl: './maintenance-center.component.html',
  styleUrls: ['./maintenance-center.component.css']
})
export class MaintenanceCenterComponent implements OnInit {
  userId = signal<string>('');
  maintenanceRequests = signal<MaintenanceRequest[]>([]);
  filteredRequests = signal<MaintenanceRequest[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');

  statusFilter = signal<string>('All');
  priorityFilter = signal<string>('All');
  problemTypeFilter = signal<string>('All');

  statusOptions = ['All', 'Pending', 'Approved', 'In Progress', 'Completed', 'Rejected'];
  priorityOptions = ['All', 'Low', 'Medium', 'High'];
  problemTypeOptions = ['All', 'plumbing', 'electrical', 'hvac', 'appliance', 'general'];

  constructor(
    private maintenanceService: MaintenanceService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  setStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.applyFilters();
  }

  ngOnInit(): void {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      this.userId.set(userId);
      this.fetchRequests();
    } else {
      this.error.set('Please login to view maintenance requests');
      this.loading.set(false);
      this.router.navigate(['/login']);
    }
  }

  truncateText(text: string, maxLength: number): string {
    return text?.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  fetchRequests(): void {
    this.loading.set(true);
    this.error.set('');

    this.http.get<any[]>(`http://localhost:5000/api/maintenance-requests?user_id=${this.userId()}`)
      .subscribe({
        next: (data) => {
          const safeData = data.map(request => ({
            ...request,
            apartmentNumber: request.apartment_id?.toString() || 'N/A',
            problemType: request.problem_type ?? 'general',
            createdAt: request.request_date ?? new Date().toISOString(),
            priority: request.priority ?? 'Medium',
            status: request.status ?? 'Pending',
            proposedCost: request.proposed_cost,
            proposedDuration: request.proposed_duration,
            costConfirmed: request.cost_confirmed === 1
          }));
          this.maintenanceRequests.set(safeData);
          this.applyFilters();
          this.loading.set(false);
        },
        error: (err) => {
          console.error('API error:', err);
          this.error.set(err.error?.message ?? 'Failed to load maintenance requests');
          this.loading.set(false);
        }
      });
  }

  applyFilters(): void {
    let filtered = this.maintenanceRequests();

    if (this.statusFilter() !== 'All') {
      filtered = filtered.filter(request => request.status === this.statusFilter());
    }
    if (this.priorityFilter() !== 'All') {
      filtered = filtered.filter(request => request.priority === this.priorityFilter());
    }
    if (this.problemTypeFilter() !== 'All') {
      filtered = filtered.filter(request => request.problemType?.toLowerCase() === this.problemTypeFilter().toLowerCase());
    }

    this.filteredRequests.set(filtered);
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.statusFilter.set('All');
    this.priorityFilter.set('All');
    this.problemTypeFilter.set('All');
    this.applyFilters();
  }

  viewRequestDetails(request: MaintenanceRequest): void {
    if (!request?.id) return;
    this.router.navigate(['/tenant-dashboard/maintenance-request', request.id], {
      state: { requestData: request }
    });
  }

  goToDetails(requestId: number): void {
    if (!requestId) return;
    this.router.navigate(['/tenant-dashboard/maintenance-request', requestId]);
  }

  getStatusClass(status?: string): string {
    if (!status) return 'status-unknown';
    return `status-${status.toLowerCase().replace(' ', '-')}`;
  }

  getRequestIcon(problemType?: string): string {
    if (!problemType) return 'handyman';
    const iconMap: Record<string, string> = {
      'plumbing': 'plumbing',
      'electrical': 'electrical_services',
      'hvac': 'ac_unit',
      'appliance': 'kitchen',
      'general': 'handyman'
    };
    return iconMap[problemType.toLowerCase().trim()] ?? 'handyman';
  }

  goToNewRequest(): void {
    this.router.navigate(['/tenant-dashboard/maintenance-request']);
  }

  refreshRequests(): void {
    this.fetchRequests();
  }

  getPriorityClass(priority?: string): string {
    return priority?.toLowerCase() ?? 'medium';
  }

  submitProposal(request: MaintenanceRequest): void {
    if (!request.proposedCost || !request.proposedDuration) {
      alert('يرجى تعبئة السعر والمدة');
      return;
    }

    this.http.put(`http://localhost:5000/api/maintenance-requests/${request.id}`, {
      proposedCost: request.proposedCost,
      proposedDuration: request.proposedDuration
    }).subscribe({
      next: () => {
        alert('✅ تم إرسال العرض بنجاح');
        this.refreshRequests();
      },
      error: (err) => {
        console.error('❌ فشل في إرسال العرض:', err);
      }
    });
  }
// In maintenance-center.component.ts

// Update the confirmProposal method
confirmProposal(request: MaintenanceRequest): void {
  if (!request.proposedCost || !request.proposedDuration) {
    alert('No proposal to confirm');
    return;
  }

  this.http.put(`http://localhost:5000/api/maintenance-requests/${request.id}`, {
    cost_confirmed: true,
    status: 'Approved',
    scheduled_date: request.scheduled_date || new Date().toISOString() // Add default date if needed
  }).subscribe({
    next: () => {
      alert('Proposal confirmed. Technician will contact you soon.');
      this.refreshRequests();
    },
    error: (err) => {
      console.error('Failed to confirm proposal:', err);
      alert('Failed to confirm proposal. Please try again.');
    }
  });
}

// Update the rejectProposal method
rejectProposal(request: MaintenanceRequest) {
  const reason = prompt('Please specify why you are rejecting this proposal:');
  if (reason === null) return; // User cancelled

  this.http.put(`http://localhost:5000/api/maintenance-requests/${request.id}`, {
    cost_confirmed: false,
    status: 'Pending',
    proposed_cost: null,
    proposed_duration: null,
    technician_id: null,
    response: reason || 'No reason provided'
  }).subscribe({
    next: () => {
      alert('Proposal rejected. The request has been returned to the pool for other technicians.');
      this.refreshRequests();
    },
    error: (err) => {
      console.error('Failed to reject proposal:', err);
      alert('Failed to reject proposal. Please try again.');
    }
  });
}
}
