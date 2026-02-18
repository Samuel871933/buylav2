import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface UserAttributes {
  id: string;
  email: string;
  password_hash: string | null;
  firstname: string;
  lastname: string;
  role: 'ambassador' | 'buyer' | 'admin';
  referral_code: string;
  referred_by: string | null;
  tier: 'beginner' | 'active' | 'performer' | 'expert' | 'elite';
  total_sales: number;
  cashback_balance: number;
  is_active: boolean;
  stripe_account_id: string | null;
  avatar_url: string | null;
  locale: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'id'
    | 'password_hash'
    | 'referred_by'
    | 'tier'
    | 'total_sales'
    | 'cashback_balance'
    | 'is_active'
    | 'stripe_account_id'
    | 'avatar_url'
    | 'locale'
    | 'created_at'
    | 'updated_at'
  > {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare password_hash: string | null;
  declare firstname: string;
  declare lastname: string;
  declare role: 'ambassador' | 'buyer' | 'admin';
  declare referral_code: string;
  declare referred_by: string | null;
  declare tier: 'beginner' | 'active' | 'performer' | 'expert' | 'elite';
  declare total_sales: number;
  declare cashback_balance: number;
  declare is_active: boolean;
  declare stripe_account_id: string | null;
  declare avatar_url: string | null;
  declare locale: string;
  declare created_at: Date;
  declare updated_at: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    firstname: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    lastname: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('ambassador', 'buyer', 'admin'),
      allowNull: false,
      defaultValue: 'buyer',
    },
    referral_code: {
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true,
    },
    referred_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    tier: {
      type: DataTypes.ENUM('beginner', 'active', 'performer', 'expert', 'elite'),
      allowNull: false,
      defaultValue: 'beginner',
    },
    total_sales: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    cashback_balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    stripe_account_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    locale: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: 'fr',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
    timestamps: true,
    underscored: true,
  },
);
