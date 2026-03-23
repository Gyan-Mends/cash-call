import mongoose, { Schema, Document } from "mongoose";

export interface IPhoneEntry {
  number: string;
  isVerified: boolean;
  isPrimary: boolean;
  verifiedAt?: Date;
}

export interface IUserRole {
  name: string;
  permissions: string[];
}

export const UserType = {
  STAFF: "staff",
  INTERN: "intern",
  NSP: "nsp",
  GRADUATE_TRAINEE: "graduate_trainee",
} as const;
export type UserTypeValue = (typeof UserType)[keyof typeof UserType];

export const UserStatus = {
  ACTIVE: "active",
  PENDING: "pending",
  INACTIVE: "inactive",
} as const;
export type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus];

export const Gender = {
  MALE: "male",
  FEMALE: "female",
} as const;
export type GenderValue = (typeof Gender)[keyof typeof Gender];

export const Locality = {
  IMPACTED: "impacted",
  LOCAL: "local",
  NATIONAL: "national",
  EXPAT: "expat",
} as const;
export type LocalityValue = (typeof Locality)[keyof typeof Locality];

export interface IUser extends Document {
  employeeId?: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  gender?: GenderValue;
  locality?: LocalityValue;
  phones: IPhoneEntry[];
  email?: string;
  department?: string;
  userType: UserTypeValue;
  status: UserStatusValue;
  password_hash: string;
  roles: IUserRole[];
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  fullName: string;
  primaryPhone: string | null;
}

const phoneEntrySchema = new Schema<IPhoneEntry>(
  {
    number: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    isPrimary: { type: Boolean, default: false },
    verifiedAt: { type: Date },
  },
  { _id: false }
);

const UserRoleSchema = new Schema(
  {
    name: { type: String, required: true },
    permissions: [{ type: String }],
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    otherNames: { type: String, trim: true },
    gender: {
      type: String,
      enum: Object.values(Gender),
    },
    locality: {
      type: String,
      enum: Object.values(Locality),
    },
    phones: {
      type: [phoneEntrySchema],
      required: true,
      validate: {
        validator: function (phones: IPhoneEntry[]) {
          return phones.length > 0;
        },
        message: "At least one phone number is required",
      },
    },
    email: { type: String, trim: true, lowercase: true },
    department: { type: String, trim: true },
    userType: {
      type: String,
      enum: Object.values(UserType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    password_hash: { type: String, required: true },
    roles: [UserRoleSchema],
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Indexes
UserSchema.index({ "phones.number": 1 });
UserSchema.index({ userType: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ gender: 1 });
UserSchema.index({ locality: 1 });
UserSchema.index({ firstName: "text", lastName: "text", otherNames: "text" });

// Virtuals
UserSchema.virtual("fullName").get(function () {
  const names = [this.firstName, this.otherNames, this.lastName].filter(Boolean);
  return names.join(" ");
});

UserSchema.virtual("primaryPhone").get(function () {
  if (!this.phones || !Array.isArray(this.phones)) return null;
  const primary = this.phones.find((p) => p.isPrimary);
  return primary?.number || this.phones[0]?.number || null;
});

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
