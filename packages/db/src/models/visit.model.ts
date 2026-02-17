import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface VisitAttributes {
  id: number;
  visitor_id: string;
  ambassador_id: string;
  source_url: string | null;
  landing_page: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface VisitCreationAttributes
  extends Optional<
    VisitAttributes,
    | 'id'
    | 'source_url'
    | 'landing_page'
    | 'ip_hash'
    | 'user_agent'
    | 'created_at'
  > {}

export class Visit
  extends Model<VisitAttributes, VisitCreationAttributes>
  implements VisitAttributes
{
  declare id: number;
  declare visitor_id: string;
  declare ambassador_id: string;
  declare source_url: string | null;
  declare landing_page: string | null;
  declare ip_hash: string | null;
  declare user_agent: string | null;
  declare created_at: Date;
}

Visit.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    visitor_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    ambassador_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    source_url: {
      type: DataTypes.STRING(2000),
      allowNull: true,
    },
    landing_page: {
      type: DataTypes.STRING(2000),
      allowNull: true,
    },
    ip_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(500),
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
    tableName: 'visits',
    modelName: 'Visit',
    timestamps: false,
    underscored: true,
  },
);
