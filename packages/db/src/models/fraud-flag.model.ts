import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface FraudFlagAttributes {
  id: number;
  user_id: string;
  type: 'self_buy' | 'click_spam' | 'fake_account' | 'self_referral' | 'cashback_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: object | null;
  status: 'pending' | 'reviewed' | 'confirmed' | 'dismissed';
  admin_notes: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface FraudFlagCreationAttributes
  extends Optional<
    FraudFlagAttributes,
    | 'id'
    | 'severity'
    | 'details'
    | 'status'
    | 'admin_notes'
    | 'reviewed_at'
    | 'created_at'
    | 'updated_at'
  > {}

export class FraudFlag
  extends Model<FraudFlagAttributes, FraudFlagCreationAttributes>
  implements FraudFlagAttributes
{
  declare id: number;
  declare user_id: string;
  declare type: 'self_buy' | 'click_spam' | 'fake_account' | 'self_referral' | 'cashback_abuse';
  declare severity: 'low' | 'medium' | 'high' | 'critical';
  declare details: object | null;
  declare status: 'pending' | 'reviewed' | 'confirmed' | 'dismissed';
  declare admin_notes: string | null;
  declare reviewed_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;
}

FraudFlag.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    type: {
      type: DataTypes.ENUM('self_buy', 'click_spam', 'fake_account', 'self_referral', 'cashback_abuse'),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'reviewed', 'confirmed', 'dismissed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
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
    tableName: 'fraud_flags',
    modelName: 'FraudFlag',
    timestamps: true,
    underscored: true,
  },
);
