import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TechnicianService } from '../../Services/technician.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Technician } from '../../models/technician.model';

interface Filters {
  name: string;
  job: string;
}

@Component({
  selector: 'app-technician-list',
  templateUrl: './technician-list.component.html',
  styleUrls: ['./technician-list.component.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class TechnicianListComponent implements OnInit {
  allTechnicians: Technician[] = [];
  technicians: Technician[] = [];
  isLoading: boolean = true;

  filters: Filters = {
    name: '',
    job: ''
  };

  constructor(
    private technicianService: TechnicianService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTechnicians();
  }

  loadTechnicians(): void {
    this.isLoading = true;
    this.technicianService.getAllTechnicians().subscribe({
      next: (technicians) => {
        this.allTechnicians = technicians;
        this.technicians = technicians;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load technicians:', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const name = this.filters.name.toLowerCase();
    const job = this.filters.job.toLowerCase();

    this.technicians = this.allTechnicians.filter(tech => {
      const matchesName = !name || tech.full_name?.toLowerCase().includes(name);
      const matchesJob = !job || tech.job?.toLowerCase().includes(job);
      return matchesName && matchesJob;
    });
  }

  resetFilters(): void {
    this.filters = {
      name: '',
      job: ''
    };
    this.applyFilters();
  }

  requestMaintenance(technician: Technician): void {
    this.router.navigate(['/tenant-dashboard/maintenance-request'], {
      state: {
        technician: technician,
        fromTechnicianList: true
      }
    });
  }
}
