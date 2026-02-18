import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface DisputeAttributes {
  id: number;
  conversion_id: number;
  user_id: string;
  type: 'refund' | 'attribution_error' | 'fraud' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'rejected';
  resolution_notes: string | null;
  admin_id: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DisputeCreationAttributes
  extends Optional<
    DisputeAttributes,
    | 'id'
    | 'status'
    | 'resolution_notes'
    | 'admin_id'
    | 'resolved_at'
    | 'created_at'
    | 'updated_at'
  > {}

export class Dispute
  extends Model<DisputeAttributes, DisputeCreationAttributes>
  implements DisputeAttributes
{
  declare id: number;
  declare conversion_id: number;
  declare user_id: string;
  declare type: 'refund' | 'attribution_error' | 'fraud' | 'other';
  declare description: string;
  declare status: 'open' | 'investigating' | 'resolved' | 'rejected';
  declare resolution_notes: string | null;
  declare admin_id: string | null;
  declare resolved_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;
}

Dispute.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    conversion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'conversions', key: 'id' },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    type: {
      type: DataTypes.ENUM('refund', 'attribution_error', 'fraud', 'other'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('open', 'investigating', 'resolved', 'rejected'),
      allowNull: false,
      defaultValue: 'open',
    },
    resolution_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    resolved_at: {
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
    tableName: 'disputes',
    modelName: 'Dispute',
    timestamps: true,
    underscored: true,
  },
);
