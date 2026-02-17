import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface SettingAttributes {
  id: number;
  key: string;
  value: string;
  type: 'number' | 'string' | 'boolean' | 'json';
  label: string;
  description: string | null;
  category: 'payouts' | 'cashback' | 'general' | 'limits';
  updated_at: Date;
  updated_by: string | null;
}

export interface SettingCreationAttributes
  extends Optional<SettingAttributes, 'id' | 'description' | 'updated_at' | 'updated_by'> {}

export class Setting
  extends Model<SettingAttributes, SettingCreationAttributes>
  implements SettingAttributes
{
  declare id: number;
  declare key: string;
  declare value: string;
  declare type: 'number' | 'string' | 'boolean' | 'json';
  declare label: string;
  declare description: string | null;
  declare category: 'payouts' | 'cashback' | 'general' | 'limits';
  declare updated_at: Date;
  declare updated_by: string | null;
}

Setting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('number', 'string', 'boolean', 'json'),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM('payouts', 'cashback', 'general', 'limits'),
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
  },
  {
    sequelize,
    tableName: 'settings',
    modelName: 'Setting',
    timestamps: true,
    underscored: true,
    createdAt: false,
  },
);
