import { Component, OnInit } from '@angular/core';
import { TechnicianService } from '../../Services/technician.service';
import { AuthService } from '../../Services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-technician-edit-profile',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './technician-edit-profile.component.html',
})
export class TechnicianEditProfileComponent implements OnInit {
  name = '';      // This will map to full_name in the backend
  email = '';
  avatar = '';
  phone_number = '';
  job = '';
  facebook_link = '';
  error = '';
  success = '';
  technicianId!: number;
  isLoading = false;

  constructor(
    private technicianService: TechnicianService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const userString = localStorage.getItem('currentUser');
    if (!userString) {
      this.router.navigate(['/login']);
      return;
    }

    const user = JSON.parse(userString);
    if (user.role !== 'Technician') {
      this.router.navigate(['/access-denied']);
      return;
    }

    this.technicianId = user.id;
    this.loadProfile();
  }

loadProfile() {
  this.isLoading = true;
  this.technicianService.getTechnicianProfile(this.technicianId).subscribe({
    next: (data: any) => {
      this.name = data.full_name;
      this.email = data.email;
      this.avatar = data.avatar || '/assets/default-tech-avatar.png'; // Default fallback
      this.phone_number = data.phone_number || '';
      this.job = data.job || '';
      this.facebook_link = data.facebook_link || '';
      this.isLoading = false;
    },
    error: (err) => {
      console.error('Profile load error:', err);
      this.error = 'Failed to load profile';
      this.isLoading = false;
    }
  });
}

 updateProfile() {
  this.isLoading = true;
  this.error = '';
  this.success = '';

  // Prepare the update payload
  const updateData = {
    full_name: this.name,
    email: this.email,
    avatar: this.avatar,
    phone_number: this.phone_number,
    job: this.job,
    facebook_link: this.facebook_link
  };

  console.log('Attempting to update profile:', updateData);

  this.technicianService.updateTechnicianProfile(this.technicianId, updateData)
    .subscribe({
      next: (response) => {
        console.log('Update successful:', response);
        this.success = 'Profile updated successfully';
        this.isLoading = false;
        
        // Update local storage if email or name changed
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser) {
          if (this.email !== currentUser.email || this.name !== currentUser.full_name) {
            currentUser.email = this.email;
            currentUser.full_name = this.name;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
          }
        }

        setTimeout(() => {
          this.router.navigate(['/technician-dashboard/profile']);
        }, 1500);
      },
      error: (err) => {
        console.error('Update failed:', err);
        this.error = err.message || 'Failed to update profile';
        if (err.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        this.isLoading = false;
      }
    });
}
}