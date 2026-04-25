export class ApiConfig {
  id!: string;
  name!: string;
  target_system!: string;
  protocol!: string;
  url!: string;
  method?: string | null;
  is_active?: boolean | null;
  description?: string | null;
  request_payload?: any | null;
  created_at!: Date;
  updated_at!: Date;
  created_by!: string;
  updated_by?: string | null;

  constructor(partial: Partial<ApiConfig>) {
    Object.assign(this, partial);
  }
}
