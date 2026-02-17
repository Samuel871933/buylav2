import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface RedirectPortalAttributes {
  id: number;
  affiliate_program_id: number;
  merchant_slug: string;
  display_name: string;
  logo_url: string | null;
  description: string | null;
  redirect_url_template: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface RedirectPortalCreationAttributes
  extends Optional<
    RedirectPortalAttributes,
    | 'id'
    | 'logo_url'
    | 'description'
    | 'redirect_url_template'
    | 'is_active'
    | 'sort_order'
    | 'created_at'
    | 'updated_at'
  > {}

export class RedirectPortal
  extends Model<RedirectPortalAttributes, RedirectPortalCreationAttributes>
  implements RedirectPortalAttributes
{
  declare id: number;
  declare affiliate_program_id: number;
  declare merchant_slug: string;
  declare display_name: string;
  declare logo_url: string | null;
  declare description: string | null;
  declare redirect_url_template: string | null;
  declare is_active: boolean;
  declare sort_order: number;
  declare created_at: Date;
  declare updated_at: Date;
}

RedirectPortal.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    affiliate_program_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'affiliate_programs', key: 'id' },
    },
    merchant_slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    display_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    redirect_url_template: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'redirect_portals',
    modelName: 'RedirectPortal',
    timestamps: true,
    underscored: true,
  },
);
