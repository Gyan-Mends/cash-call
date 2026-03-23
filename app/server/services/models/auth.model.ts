export namespace AuthModel {
  export interface loginBody {
    phone: string;
  }

  export interface loginResponse {
    access_token: string;
    token_type: string;
    expires_in?: number | null;
    user: {
      id: string | number;
      name: string;
      email: string;
      phone?: string | null;
      status?: string | null;
    };
    permissions?: string[];
    roles?: string[];
  }

  export interface verifyResponse {
    user: {
      id: string | number;
      name: string;
      email: string;
      phone?: string | null;
      status?: string | null;
    };
    permissions: string[];
    roles: string[];
  }

  export interface sendOtpResponse {
    message: string;
    expires_at: string;
    phone: string;
  }

  export interface messageResponse {
    message: string;
  }
}
