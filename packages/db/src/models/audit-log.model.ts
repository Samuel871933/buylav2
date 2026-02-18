import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface AuditLogAttributes {
  id: number;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: object | null;
  new_values: object | null;
  ip_address: string | null;
  created_at: Date;
}

export interface AuditLogCreationAttributes
  extends Optional<
    AuditLogAttributes,
    'id' | 'entity_id' | 'old_values' | 'new_values' | 'ip_address' | 'created_at'
  > {}

export class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  declare id: number;
  declare admin_id: string;
  declare action: string;
  declare entity_type: string;
  declare entity_id: string | null;
  declare old_values: object | null;
  declare new_values: object | null;
  declare ip_address: string | null;
  declare created_at: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    modelName: 'AuditLog',
    timestamps: false,
    underscored: true,
  },
);
