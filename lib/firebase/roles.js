export const USER_ROLES = Object.freeze({
  PATIENT: 'patient',
  HOSPITAL_ADMIN: 'hospital_admin',
  HOSPITAL_DOCTOR: 'hospital_doctor',
  HOSPITAL_COORDINATOR: 'hospital_coordinator',
  CAREATLAS_COORDINATOR: 'careatlas_coordinator',
  CAREATLAS_OPERATIONS: 'careatlas_operations',
  CAREATLAS_ADMIN: 'careatlas_admin',
  SUPER_ADMIN: 'super_admin'
});

export const HOSPITAL_ROLES = Object.freeze([
  USER_ROLES.HOSPITAL_ADMIN,
  USER_ROLES.HOSPITAL_DOCTOR,
  USER_ROLES.HOSPITAL_COORDINATOR
]);

export const CAREATLAS_STAFF_ROLES = Object.freeze([
  USER_ROLES.CAREATLAS_COORDINATOR,
  USER_ROLES.CAREATLAS_OPERATIONS,
  USER_ROLES.CAREATLAS_ADMIN,
  USER_ROLES.SUPER_ADMIN
]);
