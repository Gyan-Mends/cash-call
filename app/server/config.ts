export const config = {
  databaseUrl: process.env.DATABASE_URL!,
  jwt: {
    secret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
  sms: {
    apiUrl: process.env.SMS_API_URL ?? "",
    apiKey: process.env.SMS_API_KEY ?? "",
    senderId: process.env.SMS_SENDER_ID ?? "CASHCALL",
    prefix: process.env.SMS_PREFIX ?? "Cash Call",
  },
};
