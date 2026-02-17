import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface PayoutAttributes {
  id: number;
  user_id: string;
  amount: number;
  type: 'ambassador' | 'cashback';
  method: 'stripe' | 'paypal' | 'bank';
  status: 'pending' | 'processing' | 'paid' | 'failed';
  reference: string | null;
  requested_at: Date;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PayoutCreationAttributes
  extends Optional<
    PayoutAttributes,
    | 'id'
    | 'status'
    | 'reference'
    | 'requested_at'
    | 'paid_at'
    | 'created_at'
    | 'updated_at'
  > {}

export class Payout
  extends Model<PayoutAttributes, PayoutCreationAttributes>
  implements PayoutAttributes
{
  declare id: number;
  declare user_id: string;
  declare amount: number;
  declare type: 'ambassador' | 'cashback';
  declare method: 'stripe' | 'paypal' | 'bank';
  declare status: 'pending' | 'processing' | 'paid' | 'failed';
  declare reference: string | null;
  declare requested_at: Date;
  declare paid_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;
}

Payout.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('ambassador', 'cashback'),
      allowNull: false,
    },
    method: {
      type: DataTypes.ENUM('stripe', 'paypal', 'bank'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'paid', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    reference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    requested_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    paid_at: {
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
    tableName: 'payouts',
    modelName: 'Payout',
    timestamps: true,
    underscored: true,
  },
);
