import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface ConnectedSiteAttributes {
  id: number;
  name: string;
  domain: string;
  api_key_hash: string;
  niche: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ConnectedSiteCreationAttributes
  extends Optional<ConnectedSiteAttributes, 'id' | 'niche' | 'is_active' | 'created_at' | 'updated_at'> {}

export class ConnectedSite
  extends Model<ConnectedSiteAttributes, ConnectedSiteCreationAttributes>
  implements ConnectedSiteAttributes
{
  declare id: number;
  declare name: string;
  declare domain: string;
  declare api_key_hash: string;
  declare niche: string | null;
  declare is_active: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

ConnectedSite.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    api_key_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    niche: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'connected_sites',
    modelName: 'ConnectedSite',
    timestamps: true,
    underscored: true,
  },
);
