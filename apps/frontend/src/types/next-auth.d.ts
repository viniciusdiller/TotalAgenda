import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    accessToken: string;
    tenantId: string;
    role: "OWNER" | "PROFESSIONAL";
    professionalId?: string;
  }

  interface Session {
    accessToken: string;
    user: {
      tenantId: string;
      role: "OWNER" | "PROFESSIONAL";
      professionalId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    tenantId: string;
    role: "OWNER" | "PROFESSIONAL";
    professionalId?: string;
  }
}
