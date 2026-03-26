export interface CiudadanoResponse {
  id: number;
  name: string;
  last_name_father: string;
  last_name_mother?: string;
  comment?: string;
  birth_date?: string;
  age?: number;
  phone?: string;
  address: string; // Se incluye en la respuesta la dirección del ciudadano
  occupation: string; // Se incluye en la respuesta la ocupación del ciudadano
  alternatePhone?: string; // Se incluye en la respuesta el teléfono alternativo del ciudadano
  marital_status: number;
  partner?: {
    id: number;
    name: string;
    last_name_father: string;
    last_name_mother?: string;
  } | null;
}

export interface CiudadanoListResponse extends CiudadanoResponse {
  visible?: boolean;
  deleted_at?: Date;
  services?: Array<{
    id: number;
    service_name: string;
    start_date: Date;
    end_date: Date;
    service_status: string;
    observations?: string;
  }>;
  candidatoACargo?: any;
}

export interface CiudadanoCreateResponse {
  message: string;
  data: CiudadanoResponse;
}

export interface CiudadanoUpdateResponse {
  message: string;
  data: CiudadanoResponse;
}
