export interface AppHealthResponse {
  status: 'ok';
  service: 'cadisk-nest';
}

export interface DatabaseHealthResponse {
  status: 'ok';
  database: 'ok';
}
