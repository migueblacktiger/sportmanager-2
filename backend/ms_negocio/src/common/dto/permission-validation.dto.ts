export interface PermissionValidationRequestDto {
  url: string;
  method: string;
}

export interface PermissionValidationResponseDto {
  allowed: boolean;
}
