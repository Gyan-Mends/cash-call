import jwt from "jsonwebtoken";
import { config } from "~/server/config";
import { User } from "~/server/db/models/User";
import { connectDB } from "~/server/db/connection";
import type { AuthModel } from "~/server/services/models/auth.model";

interface JwtPayload {
  userId: string;
  name: string;
  email: string;
  phone: string;
}

// In-memory OTP store: phone -> { code, expiresAt }
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// Brute-force protection: phone -> { count, lockedUntil }
const otpFailedAttempts = new Map<string, { count: number; lockedUntil: number }>();

// Send-OTP cooldown: phone -> lastSentAt (ms)
const otpSendTimestamps = new Map<string, number>();

const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds between sends

export abstract class AuthService {
  /**
   * Send OTP to phone number
   */
  static async sendOtp(phone: string): Promise<AuthModel.sendOtpResponse> {
    await connectDB();

    // Enforce send cooldown to prevent OTP flooding
    const lastSent = otpSendTimestamps.get(phone);
    if (lastSent && Date.now() - lastSent < OTP_RESEND_COOLDOWN_MS) {
      const remaining = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
      throw new Error(`Please wait ${remaining} seconds before requesting a new OTP`);
    }

    const user = await User.findOne({ "phones.number": phone });
    if (!user) {
      throw new Error("Invalid phone number");
    }

    if (user.status !== "active") {
      throw new Error("Account is not active");
    }

    // Clear failed attempts when a new OTP is requested
    otpFailedAttempts.delete(phone);

    // Generate 4-digit OTP
    const code = (
      Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * 9000) + 1000
    ).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(phone, { code, expiresAt });
    otpSendTimestamps.set(phone, Date.now());

    // Log the OTP to the terminal (replace with SMS in production)
    console.log(`\n========================================`);
    console.log(`  OTP for ${phone}: ${code}`);
    console.log(`  User: ${user.fullName}`);
    console.log(`  Expires in 5 minutes`);
    console.log(`========================================\n`);

    return {
      message: "OTP sent successfully",
      phone,
      expires_at: new Date(expiresAt).toISOString(),
    };
  }

  /**
   * Verify OTP and return auth token
   */
  static async verifyOtp(
    phone: string,
    code: string
  ): Promise<AuthModel.loginResponse> {
    await connectDB();

    // Check lockout before attempting verification
    const failRecord = otpFailedAttempts.get(phone);
    if (failRecord && Date.now() < failRecord.lockedUntil) {
      const remaining = Math.ceil((failRecord.lockedUntil - Date.now()) / 60000);
      throw new Error(
        `Account temporarily locked due to too many failed attempts. Try again in ${remaining} minute(s).`
      );
    }

    const entry = otpStore.get(phone);
    if (!entry) {
      throw new Error("No OTP found for this phone number. Please request a new one.");
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(phone);
      throw new Error("OTP has expired. Please request a new one.");
    }

    if (entry.code !== code) {
      const current = otpFailedAttempts.get(phone) ?? { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= MAX_OTP_ATTEMPTS) {
        current.lockedUntil = Date.now() + OTP_LOCKOUT_MS;
        otpStore.delete(phone);
        otpFailedAttempts.set(phone, current);
        throw new Error(
          "Too many failed attempts. Your account has been locked for 15 minutes."
        );
      }
      otpFailedAttempts.set(phone, current);
      const remaining = MAX_OTP_ATTEMPTS - current.count;
      throw new Error(`Invalid OTP code. ${remaining} attempt(s) remaining.`);
    }

    // OTP is valid — clear it and reset failed attempts
    otpStore.delete(phone);
    otpFailedAttempts.delete(phone);

    const user = await User.findOne({ "phones.number": phone });
    if (!user) {
      throw new Error("User not found");
    }

    const permissions = user.roles.flatMap((r: { permissions: string[] }) => r.permissions);
    const roles = user.roles.map((r: { name: string }) => r.name);
    const payload: JwtPayload = {
      userId: user._id.toString(),
      name: user.fullName,
      email: user.email || "",
      phone,
    };
    const token = jwt.sign(
      payload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    return {
      access_token: token,
      token_type: "Bearer",
      expires_in: null,
      user: {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email || "",
        phone,
        status: user.status,
      },
      permissions,
      roles,
    };
  }

  /**
   * Verify a JWT token and return user data
   */
  static async verifyToken(token: string): Promise<AuthModel.verifyResponse> {
    await connectDB();

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const permissions = user.roles.flatMap((r: { permissions: string[] }) => r.permissions);
    const roles = user.roles.map((r: { name: string }) => r.name);

    return {
      user: {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email || "",
        phone: user.primaryPhone || "",
        status: user.status,
      },
      permissions,
      roles,
    };
  }

  /**
   * Logout — no-op for local auth (token is stateless JWT)
   */
  static async logout(_token: string): Promise<AuthModel.messageResponse> {
    return { message: "Logged out successfully" };
  }
}
