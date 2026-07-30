export interface AppHealthResponse {
  status: 'ok';
  service: 'cadista-nest';
}

export interface DatabaseHealthResponse {
  status: 'ok';
  database: 'ok';
}
