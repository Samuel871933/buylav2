import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface CommissionBoostAttributes {
  id: number;
  user_id: string | null;
  type: 'ambassador_rate' | 'buyer_cashback' | 'sponsor_rate';
  boost_value: number;
  reason: string | null;
  start_date: Date;
  end_date: Date | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CommissionBoostCreationAttributes
  extends Optional<
    CommissionBoostAttributes,
    | 'id'
    | 'user_id'
    | 'reason'
    | 'end_date'
    | 'max_uses'
    | 'current_uses'
    | 'is_active'
    | 'created_at'
    | 'updated_at'
  > {}

export class CommissionBoost
  extends Model<CommissionBoostAttributes, CommissionBoostCreationAttributes>
  implements CommissionBoostAttributes
{
  declare id: number;
  declare user_id: string | null;
  declare type: 'ambassador_rate' | 'buyer_cashback' | 'sponsor_rate';
  declare boost_value: number;
  declare reason: string | null;
  declare start_date: Date;
  declare end_date: Date | null;
  declare max_uses: number | null;
  declare current_uses: number;
  declare is_active: boolean;
  declare created_by: string;
  declare created_at: Date;
  declare updated_at: Date;
}

CommissionBoost.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    type: {
      type: DataTypes.ENUM('ambassador_rate', 'buyer_cashback', 'sponsor_rate'),
      allowNull: false,
    },
    boost_value: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    max_uses: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    current_uses: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
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
    tableName: 'commission_boosts',
    modelName: 'CommissionBoost',
    timestamps: true,
    underscored: true,
  },
);
