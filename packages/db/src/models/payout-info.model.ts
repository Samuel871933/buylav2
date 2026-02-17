import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface PayoutInfoAttributes {
  id: number;
  user_id: string;
  method: 'stripe' | 'paypal' | 'bank';
  stripe_account_id: string | null;
  paypal_email: string | null;
  iban_encrypted: string | null;
  bic: string | null;
  bank_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PayoutInfoCreationAttributes
  extends Optional<
    PayoutInfoAttributes,
    | 'id'
    | 'method'
    | 'stripe_account_id'
    | 'paypal_email'
    | 'iban_encrypted'
    | 'bic'
    | 'bank_name'
    | 'created_at'
    | 'updated_at'
  > {}

export class PayoutInfo
  extends Model<PayoutInfoAttributes, PayoutInfoCreationAttributes>
  implements PayoutInfoAttributes
{
  declare id: number;
  declare user_id: string;
  declare method: 'stripe' | 'paypal' | 'bank';
  declare stripe_account_id: string | null;
  declare paypal_email: string | null;
  declare iban_encrypted: string | null;
  declare bic: string | null;
  declare bank_name: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

PayoutInfo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
    },
    method: {
      type: DataTypes.ENUM('stripe', 'paypal', 'bank'),
      allowNull: false,
      defaultValue: 'bank',
    },
    stripe_account_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    paypal_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    iban_encrypted: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    bic: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    bank_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
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
    tableName: 'payout_info',
    modelName: 'PayoutInfo',
    timestamps: true,
    underscored: true,
  },
);
