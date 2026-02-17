import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface CommissionTierAttributes {
  id: number;
  name: string;
  min_sales: number;
  ambassador_rate_affiliate: number;
  ambassador_rate_dropship: number;
  sponsor_rate: number;
  created_at: Date;
  updated_at: Date;
}

export interface CommissionTierCreationAttributes
  extends Optional<CommissionTierAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class CommissionTier
  extends Model<CommissionTierAttributes, CommissionTierCreationAttributes>
  implements CommissionTierAttributes
{
  declare id: number;
  declare name: string;
  declare min_sales: number;
  declare ambassador_rate_affiliate: number;
  declare ambassador_rate_dropship: number;
  declare sponsor_rate: number;
  declare created_at: Date;
  declare updated_at: Date;
}

CommissionTier.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    min_sales: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ambassador_rate_affiliate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    ambassador_rate_dropship: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    sponsor_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
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
    tableName: 'commission_tiers',
    modelName: 'CommissionTier',
    timestamps: true,
    underscored: true,
  },
);
