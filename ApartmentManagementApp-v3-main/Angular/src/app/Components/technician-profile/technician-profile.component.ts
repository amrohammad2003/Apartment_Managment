import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Add FormsModule here
import { TechnicianService } from '../../Services/technician.service';
import { AuthService } from '../../Services/auth.service';

@Component({
  selector: 'app-technician-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './technician-profile.component.html',
  styleUrls: ['./technician-profile.component.scss']
})
export class TechnicianProfileComponent implements OnInit {
  name = signal<string>('Loading...');
  email = signal<string>('N/A');
  phone = signal<string>('N/A');
  avatar = signal<string>('assets/default-tech-avatar.png');
  job = signal<string>('Technician');
  technicianId = signal<number | null>(null);
  totalRequests = signal<number>(0);
  completedRequests = signal<number>(0);

  // Editable field values
  nameValue = '';
  emailValue = '';
  phoneValue = '';

  // Edit state per field
  editing = {
    name: false,
    email: false,
    phone: false
  };

  originalValues = {
    name: '',
    email: '',
    phone: ''
  };

  // Password section
  isPasswordEditing = false;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordError = '';
  passwordSuccess = '';

  constructor(
    private technicianService: TechnicianService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const userString = localStorage.getItem('currentUser');
    if (userString) {
      const user = JSON.parse(userString);
      this.name.set(user.full_name || user.name || 'Technician');
      this.email.set(user.email || 'N/A');
      this.phone.set(user.phone_number || 'N/A');
      this.job.set(user.job || 'Technician');
      if (user.avatar) this.avatar.set(user.avatar);

      this.technicianId.set(user.id);

      this.nameValue = this.name();
      this.emailValue = this.email();
      this.phoneValue = this.phone();

      if (user.id) {
        this.fetchStats(user.id);
      }
    }
  }

  fetchStats(technicianId: number): void {
    this.technicianService.getTechnicianStats(technicianId).subscribe({
      next: (stats: any) => {
        this.totalRequests.set(stats.total || 0);
        this.completedRequests.set(stats.completed || 0);
      },
      error: () => {
        console.error('Failed to load technician stats');
      }
    });
  }

  startEditing(field: 'name' | 'email' | 'phone') {
    this.editing[field] = true;
    this.originalValues[field] = this[`${field}Value`];
  }

  cancelEditing(field: 'name' | 'email' | 'phone') {
    this.editing[field] = false;
    this[`${field}Value`] = this.originalValues[field];
  }

  saveProfileField(field: 'name' | 'email' | 'phone') {
    const id = this.technicianId();
    if (!id) return;

    const payload: any = {};
    if (field === 'name') {
      if (this.nameValue.trim().length < 2) {
        alert('Name must be at least 2 characters');
        return;
      }
      payload.full_name = this.nameValue.trim();
    } else if (field === 'email') {
      if (!this.emailValue.includes('@')) {
        alert('Invalid email');
        return;
      }
      payload.email = this.emailValue.trim();
    } else if (field === 'phone') {
      if (this.phoneValue.trim().length < 5) {
        alert('Phone number must be at least 5 characters');
        return;
      }
      payload.phone_number = this.phoneValue.trim();
    }

    this.technicianService.updateTechnicianProfile(id, payload).subscribe({
      next: (response: any) => {
        if (field === 'name') {
          const updated = response.full_name || response.technician?.full_name;
          this.name.set(updated);
        }
        if (field === 'email') {
          const updated = response.email || response.technician?.email;
          this.email.set(updated);
        }
        if (field === 'phone') {
          const updated = response.phone_number || response.technician?.phone_number;
          this.phone.set(updated);
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...payload }));

        this.editing[field] = false;
      },
      error: (err) => {
        alert('Failed to update field');
        console.error(err);
      }
    });
  }

  togglePasswordEdit(): void {
    this.isPasswordEditing = !this.isPasswordEditing;
    this.passwordError = '';
    this.passwordSuccess = '';
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  updatePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Please fill in all fields.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'New passwords do not match.';
      return;
    }

    this.technicianService.updateTechnicianPassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.passwordSuccess = 'Password updated successfully.';
        this.togglePasswordEdit();
      },
      error: () => {
        this.passwordError = 'Failed to update password. Please check current password.';
      }
    });
  }
}
