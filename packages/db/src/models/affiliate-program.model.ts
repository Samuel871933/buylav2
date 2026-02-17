import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface AffiliateProgramAttributes {
  id: number;
  name: string;
  display_name: string;
  network: 'direct' | 'awin' | 'affilae' | 'cj' | 'amazon' | 'custom';
  base_url: string | null;
  url_template: string;
  sub_id_param: string | null;
  sub_id_format: string | null;
  cookie_duration_days: number;
  avg_commission_rate: number;
  buyer_cashback_rate: number;
  postback_url: string | null;
  postback_secret: string | null;
  api_key: string | null;
  reconciliation_method: 'postback' | 'csv_import' | 'api_manual' | 'api_scheduled' | 'stripe';
  csv_import_config: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AffiliateProgramCreationAttributes
  extends Optional<
    AffiliateProgramAttributes,
    | 'id'
    | 'base_url'
    | 'sub_id_param'
    | 'sub_id_format'
    | 'cookie_duration_days'
    | 'avg_commission_rate'
    | 'buyer_cashback_rate'
    | 'postback_url'
    | 'postback_secret'
    | 'api_key'
    | 'csv_import_config'
    | 'is_active'
    | 'notes'
    | 'created_at'
    | 'updated_at'
  > {}

export class AffiliateProgram extends Model<AffiliateProgramAttributes, AffiliateProgramCreationAttributes> implements AffiliateProgramAttributes {
  declare id: number;
  declare name: string;
  declare display_name: string;
  declare network: 'direct' | 'awin' | 'affilae' | 'cj' | 'amazon' | 'custom';
  declare base_url: string | null;
  declare url_template: string;
  declare sub_id_param: string | null;
  declare sub_id_format: string | null;
  declare cookie_duration_days: number;
  declare avg_commission_rate: number;
  declare buyer_cashback_rate: number;
  declare postback_url: string | null;
  declare postback_secret: string | null;
  declare api_key: string | null;
  declare reconciliation_method: 'postback' | 'csv_import' | 'api_manual' | 'api_scheduled' | 'stripe';
  declare csv_import_config: string | null;
  declare is_active: boolean;
  declare notes: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

AffiliateProgram.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    display_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    network: {
      type: DataTypes.ENUM('direct', 'awin', 'affilae', 'cj', 'amazon', 'custom'),
      allowNull: false,
    },
    base_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    url_template: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sub_id_param: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    sub_id_format: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    cookie_duration_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    avg_commission_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    buyer_cashback_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10,
    },
    postback_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    postback_secret: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    api_key: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    reconciliation_method: {
      type: DataTypes.ENUM('postback', 'csv_import', 'api_manual', 'api_scheduled', 'stripe'),
      allowNull: false,
    },
    csv_import_config: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notes: {
      type: DataTypes.TEXT,
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
    tableName: 'affiliate_programs',
    modelName: 'AffiliateProgram',
    timestamps: true,
    underscored: true,
  },
);
