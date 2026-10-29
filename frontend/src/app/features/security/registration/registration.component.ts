import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ApiService, AuthResponse } from '../../../api.service';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.css'
})
export class RegistrationComponent {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  @Output() registered = new EventEmitter<AuthResponse>();
  @Output() navigateToLogin = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    acceptTerms: [false, Validators.requiredTrue]
  }, { validators: [this.passwordMatchValidator] });

  submitted = false;
  isSubmitting = false;
  submitError = '';
  showPassword = false;
  showConfirmPassword = false;

  get passwordLength(): number {
    return this.form.controls.password.value.length;
  }

  get passwordMeetsMinimumLength(): boolean {
    return this.passwordLength >= 8;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get confirmPasswordMissing(): boolean {
    const control = this.form.controls.confirmPassword;
    return !control.value && (control.touched || this.submitted);
  }

  get confirmPasswordMismatch(): boolean {
    const confirmation = this.form.controls.confirmPassword;
    return !!this.form.errors?.['passwordMismatch']
      && (confirmation.dirty || confirmation.touched || this.submitted);
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value ?? '';
    const confirmPassword = group.get('confirmPassword')?.value ?? '';

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  fieldHasError(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.get(controlName);
    if (!control) return false;
    return control.invalid && (control.touched || control.dirty || this.submitted);
  }

  submitRegistration(): void {
    if (this.isSubmitting) return;
    this.submitted = true;
    this.submitError = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.isSubmitting = true;

    this.api.register({ name: name.trim(), email: email.trim(), password }).subscribe({
      next: response => {
        this.isSubmitting = false;
        this.form.reset({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          acceptTerms: false
        });
        this.submitted = false;
        this.showPassword = false;
        this.showConfirmPassword = false;
        this.registered.emit(response);
      },
      error: error => {
        this.isSubmitting = false;
        this.submitError = this.api.errorMessage(error);
      }
    });
  }

  goToLogin(): void {
    this.navigateToLogin.emit();
  }
}
