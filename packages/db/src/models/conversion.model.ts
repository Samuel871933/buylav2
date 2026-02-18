import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface ConversionAttributes {
  id: number;
  ambassador_id: string;
  sponsor_id: string | null;
  buyer_user_id: string | null;
  product_id: number | null;
  outbound_click_id: number | null;
  affiliate_program_id: number;
  type: 'affiliate' | 'dropship';
  order_ref: string | null;
  amount: number;
  commission_total: number;
  ambassador_share: number;
  sponsor_share: number;
  buyer_share: number;
  platform_share: number;
  applied_ambassador_rate: number | null;
  applied_sponsor_rate: number | null;
  applied_buyer_rate: number | null;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  attribution_method: string | null;
  attribution_confidence: 'high' | 'medium' | 'low' | null;
  confirmed_at: Date | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ConversionCreationAttributes
  extends Optional<
    ConversionAttributes,
    | 'id'
    | 'sponsor_id'
    | 'buyer_user_id'
    | 'product_id'
    | 'outbound_click_id'
    | 'order_ref'
    | 'sponsor_share'
    | 'buyer_share'
    | 'applied_ambassador_rate'
    | 'applied_sponsor_rate'
    | 'applied_buyer_rate'
    | 'status'
    | 'attribution_method'
    | 'attribution_confidence'
    | 'confirmed_at'
    | 'paid_at'
    | 'created_at'
    | 'updated_at'
  > {}

export class Conversion
  extends Model<ConversionAttributes, ConversionCreationAttributes>
  implements ConversionAttributes
{
  declare id: number;
  declare ambassador_id: string;
  declare sponsor_id: string | null;
  declare buyer_user_id: string | null;
  declare product_id: number | null;
  declare outbound_click_id: number | null;
  declare affiliate_program_id: number;
  declare type: 'affiliate' | 'dropship';
  declare order_ref: string | null;
  declare amount: number;
  declare commission_total: number;
  declare ambassador_share: number;
  declare sponsor_share: number;
  declare buyer_share: number;
  declare platform_share: number;
  declare applied_ambassador_rate: number | null;
  declare applied_sponsor_rate: number | null;
  declare applied_buyer_rate: number | null;
  declare status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  declare attribution_method: string | null;
  declare attribution_confidence: 'high' | 'medium' | 'low' | null;
  declare confirmed_at: Date | null;
  declare paid_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;
}

Conversion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ambassador_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    sponsor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    buyer_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    outbound_click_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'outbound_clicks', key: 'id' },
    },
    affiliate_program_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'affiliate_programs', key: 'id' },
    },
    type: {
      type: DataTypes.ENUM('affiliate', 'dropship'),
      allowNull: false,
    },
    order_ref: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    commission_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    ambassador_share: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    sponsor_share: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    buyer_share: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    platform_share: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    applied_ambassador_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    applied_sponsor_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    applied_buyer_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'paid', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    attribution_method: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    attribution_confidence: {
      type: DataTypes.ENUM('high', 'medium', 'low'),
      allowNull: true,
    },
    confirmed_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'conversions',
    modelName: 'Conversion',
    timestamps: false,
    underscored: true,
  },
);
